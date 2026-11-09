#!/usr/bin/env node
'use strict';
// Dallas published school GIS -> TEA crosswalk. Read-only, geometry is not saved.
// Names and campus IDs are school public records, never residential addresses.
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('../dallas-attendance-live.js');
const TEA_PREFIX='057905';
function normalizeName(v){
 return String(v||'').toUpperCase().normalize('NFKD')
  .replace(/\bELEM(?:ENTARY)?\b/g,'ELEMENTARY')
  .replace(/\bEL\b/g,'ELEMENTARY')
  .replace(/\bH\s*S\b/g,'HIGH SCHOOL')
  .replace(/\bHIGHSCHOOL\b/g,'HIGH SCHOOL')
  .replace(/\bMS\b/g,'MIDDLE SCHOOL')
  .replace(/\bMID\b/g,'MIDDLE')
  .replace(/\bSCH\b/g,'SCHOOL')
  // Strip only common type words, NOT distinct school, program or person names.
  // Short names and true campus renames remain distinct and require review.
  .replace(/\b(?:ELEMENTARY|MIDDLE|HIGH|SCHOOL)\b/g,'')
  .replace(/[^A-Z0-9]/g,'').trim();
}
function compareCampusIdentities(features,ratings){
 if(!Array.isArray(features)||!Array.isArray(ratings))throw Error('missing public campuses');
 const tea=new Map(ratings.filter(r=>typeof r.id==='string'&&r.id.startsWith(TEA_PREFIX))
  .map(r=>[r.id,r]));
 const seen=new Map(),byLevel={elementary:{polygons:0,mappedById:0,unmatchedId:0,nameDisagreements:0},middle:{polygons:0,mappedById:0,unmatchedId:0,nameDisagreements:0},high:{polygons:0,mappedById:0,unmatchedId:0,nameDisagreements:0}};
 const missing=[],different=[],duplicate=[];
 for(const f of features){
  const p=f?.properties||{};
  const id=p.campusId,level=p.gradeLevel;
  if(!Object.hasOwn(byLevel,level)||!/^057905\d{3}$/.test(id||''))throw Error('invalid level or GIS school ID');
  byLevel[level].polygons++;
  if(seen.has(id))duplicate.push({campusId:id,otherLevel:seen.get(id),level});
  else seen.set(id,level);
  const r=tea.get(id);
  if(!r){byLevel[level].unmatchedId++;missing.push({campusId:id,level,gisSchool:p.school});continue;}
  byLevel[level].mappedById++;
  if(normalizeName(p.school)!==normalizeName(r.officialName||r.name)){
   byLevel[level].nameDisagreements++;
   different.push({campusId:id,level,gisSchool:p.school,teaSchool:r.officialName||r.name});
  }
 }
 const totals=Object.values(byLevel).reduce((a,b)=>{
  for(const k of Object.keys(a))a[k]+=b[k];return a;
 },{polygons:0,mappedById:0,unmatchedId:0,nameDisagreements:0});
 return {schemaVersion:1,sourceDistrict:TEA_PREFIX,sourceType:'Dallas ISD publisher-hosted GIS, last edited July 2026',
  teaType:'2026 preliminary campus accountability snapshot (not enrollment directory)',
  byLevel,totals,duplicates:duplicate,unmatchedIds:missing,nameDisagreements:different,
  distinctCampusIds:seen.size,
  schoolYearOfGISConfirmed:false,officialAddressFinderIndependentlyVerified:false,
  legalAssignmentCertified:false,readyForProduction:false,
  note:'ID equality is not proof of 2026-27 boundaries. Different names can be a rename, split, closure or mistaken ID; review manually. No residential observations or geometry are persisted.'};
}
async function main(){
 const data=await load(fetch);
 const ratings=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../tea-ratings-2026.json'),'utf8')).data;
 const report=compareCampusIdentities(data.features,ratings);
 if(report.totals.polygons!==187||report.totals.polygons!==data.features.length||data.summary.length!==3)
  throw Error('Dallas source structure/count unexpectedly changed');
 if(report.duplicates.length)throw Error('Dallas GIS school ID occurs more than once across grades');
 // Report must not contain households or raw polygon geometry. Persist only inside CI artifact.
 const dest=path.resolve(process.env.RUNNER_TEMP||'/tmp','dallas-campus-id-crosswalk-audit.json');
 fs.writeFileSync(dest,JSON.stringify({...report,sourceSummaries:data.summary},null,2)+'\n');
 console.log(JSON.stringify({file:dest,counts:report.totals,
  byLevel:report.byLevel,distinctCampusIds:report.distinctCampusIds,
  unmatchedSamples:report.unmatchedIds.slice(0,12),nameDifferenceSamples:report.nameDisagreements.slice(0,12),
  currentYearAssignmentVerified:false,readyForProduction:false},null,2));
 if(report.totals.unmatchedId||report.totals.nameDisagreements)
  console.log('REVIEW_REQUIRED: unmatched/mismatched Dallas GIS vs TEA campus identities; no 2026-27 certification');
 else console.log('IDENTITY_LINKS_OK: all district-provided IDs match preliminary TEA names; year/address still NOT verified');
}
if(require.main===module)main().catch(e=>{console.error('DALLAS_TEACROSSWALK_PROBE_FAILED:',String(e));process.exitCode=1;});
module.exports={normalizeName,compareCampusIdentities};
