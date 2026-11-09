#!/usr/bin/env node
'use strict';
// Joins actual per-campus, per-session polygon audit with the broad TEA region inventory.
// A live source failure is INCONCLUSIVE, not a permanent boundary deficit.
// All school names are from public school directory; never use residential addresses.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
function joinRuntime(matrix,runtime){
 if(!matrix||matrix.schemaVersion!==1||!Array.isArray(matrix.districts)||
   !runtime||!Array.isArray(runtime.schools)||!runtime.byDistrict||
   !runtime.coverage)throw Error('invalid_runtime_linkage_join');
 const aliases=new Map();
 for(const d of matrix.districts){
  for(const k of [d.code,...d.sourceDistrictAliases,d.parentGuidance.registryKey].filter(Boolean)){
   if(aliases.has(k)&&aliases.get(k)!==d.code)throw Error('conflicting_tea_code_alias_'+k);
   aliases.set(k,d.code);
  }
 }
 const districts=[],campusMissing=[],ignoredOutsideScope=[];
 const observed=new Map();
 for(const d of matrix.districts)observed.set(d.code,[]);
 for(const s of runtime.schools){
  if(!s||typeof s.district!=='string'||typeof s.school!=='string'||
    typeof s.category!=='string')throw Error('invalid_school_reason_record');
  const code=aliases.get(s.district);
  if(!code){ignoredOutsideScope.push(s.district);continue}
  observed.get(code).push(s);
  if(s.category!=='matched')
   campusMissing.push({districtCode:code,sourceAlias:s.district,
    school:s.school,type:s.type,reason:s.category,
    severity:s.severity,sourceMode:s.sourceMode});
 }
 const aggregate={measuredDirectoryCampuses:0,matched:0,unmatched:0,
  districtsWithAnyLoadedSchool:0,districtsWithSourceFetchFailure:0};
 for(const d of matrix.districts){
  const rows=observed.get(d.code);
  const counts={};
  for(const row of rows)counts[row.category]=(counts[row.category]||0)+1;
  const linked=counts.matched||0,unmatched=rows.length-linked;
  const sourceFailed=(counts['source-fetch-failed']||0)>0;
  if(rows.length)aggregate.districtsWithAnyLoadedSchool++;
  if(sourceFailed)aggregate.districtsWithSourceFetchFailure++;
  aggregate.measuredDirectoryCampuses+=rows.length;
  aggregate.matched+=linked;aggregate.unmatched+=unmatched;
  const percent=rows.length&&!sourceFailed?Math.round(linked*1000/rows.length)/10:null;
  const matchedRows=rows.length?{loadedDirectoryCampuses:rows.length,linked,
    unmatched,matchRateLoadedPercent:percent,missingReasonCounts:counts,
    sourceOutage:sourceFailed,status:sourceFailed?'INCONCLUSIVE_SOURCE_FAILURE':'MEASURED_SESSION_ONLY'}:
   {loadedDirectoryCampuses:null,linked:null,unmatched:null,
    matchRateLoadedPercent:null,missingReasonCounts:{},sourceOutage:false,
    status:'NOT_LOADED_IN_BROWSER'};
  districts.push({code:d.code,name:d.name,countyOfRecord:d.countyOfRecord,
   teaCampusRecords:d.teaCampusRecords,priority:d.priority,officialGuidance:d.parentGuidance,
   referenceGeometry:d.geometry,session:matchedRows});
 }
 assert.equal(aggregate.matched+aggregate.unmatched,aggregate.measuredDirectoryCampuses);
 assert.equal(campusMissing.length,aggregate.unmatched);
 return {
  schemaVersion:1,purpose:'Live loaded dashboard school directory matches vs existing polygons; not certified address attendance',
  geographicDefinition:matrix.geographicDefinition,
  reproducibleMatrixGeneratedOn:matrix.generatedOn,
  runtimeStatus:runtime.status,
  browserLoaded:runtime.status!=='INCONCLUSIVE_SOURCE_AVAILABILITY',
  runMode:runtime.runMode,
  scope:'TEA districtCounty-derived 11-county region; district aliases reconciled by campus-ID prefix',
  denominator:'schools loaded into browser in this session; cannot substitute for 2182 TEA records or current-year verified student assignment',
  aggregate,
  districts,
  campusMissing,
  unknownOutsideScopeDistrictAliases:[...new Set(ignoredOutsideScope)].sort(),
  limitations:[
   'Unloaded school records are NULL, not zero. A map source fetch failure is inconclusive.',
   'A matched polygon can be historical, mixed-vintage or unconfirmed for the current school year.',
   'Special/choice/charter schools may not have a default neighborhood attendance zone.',
   'An unmatched name or campus ID does not prove an official district polygon is unavailable.',
   'School marker location, ZIP, city limits and TEA rating are not exact address assignment.'
  ]
 };
}
function main(){
 const root=path.resolve(__dirname,'..');
 const matrix=JSON.parse(fs.readFileSync(path.join(root,'data/dfw-school-coverage-matrix-2026.json'),'utf8'));
 const audit=JSON.parse(fs.readFileSync(path.join(root,'artifacts/school-linkage/school-polygon-linkage-census.json'),'utf8'));
 const report=joinRuntime(matrix,audit);
 const folder=path.join(root,'artifacts/dfw-school-coverage');
 fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'runtime-district-linkage.json'),JSON.stringify(report,null,2)+'\n');
 process.stdout.write('DFW_SESSION_LINKAGE '+JSON.stringify({status:report.runtimeStatus,
  measured:report.aggregate.measuredDirectoryCampuses,linked:report.aggregate.matched,
  missing:report.aggregate.unmatched,missingBySchool:report.campusMissing.length,
  affectedByOutages:report.aggregate.districtsWithSourceFetchFailure})+'\n');
}
if(require.main===module)try{main()}catch(e){console.error('DFW_LINKAGE_JOIN_FAILED '+e.message);process.exitCode=1}
module.exports={joinRuntime};
