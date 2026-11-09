'use strict';
// Independent, read-only analysis of the dashboard's own matching results.
// Integrity/coverage is not a proof of legal school enrollment.
const CORE=['FISD','PISD','AISD','LISD','PROSPER','CFB'];
const MODES={
 FISD:'official-2026-27-live-feed',
 PISD:'official-finder-linked-layer-year-not-confirmed',
 AISD:'historical-2019-2023-reference',
 LISD:'official-finder-linked-mixed-vintages',
 PROSPER:'official-2026-27-pinned-local',
 CFB:'resident-finder-only-no-dashboard-polygons',
 '043907':'live-official-finder-only'
};
const CATEGORIES=['matched','special-campus-no-standard-zone','no-source-configured',
 'source-fetch-failed','no-loaded-polygon-source','no-grade-polygon-source',
 'possible-id-linkage-gap','possible-name-linkage-gap','school-not-found-in-source',
 'not-a-zoned-campus','unknown-match-status'];
const SEVERITIES={
 matched:'linked',
 'special-campus-no-standard-zone':'explained-exception',
 'no-source-configured':'missing-dashboard-data',
 'source-fetch-failed':'unverified-upstream',
 'no-loaded-polygon-source':'missing-loaded-data',
 'no-grade-polygon-source':'missing-grade-data',
 'possible-id-linkage-gap':'possible-match-pipeline-defect',
 'possible-name-linkage-gap':'possible-match-pipeline-defect',
 'school-not-found-in-source':'unresolved-source-coverage',
 'not-a-zoned-campus':'nonstandard-school',
 'unknown-match-status':'unverified'
};
const EMPTY=()=>Object.fromEntries(CATEGORIES.map(k=>[k,0]));
const count=n=>Number.isInteger(n)&&n>=0&&n<=100000;
function normalizeRow(row){
 if(!row||typeof row!=='object'||typeof row.school!=='string'||!row.school.trim()||
  typeof row.district!=='string'||!row.district.trim()||
  !['elementary','middle','high'].includes(row.type)||
  !count(row.polygonCount)||!count(row.eligiblePolygonCount)||
  !['matched','special-campus-no-standard-zone','no-district-polygon-source',
    'no-grade-polygon-source','school-not-in-polygon-source','not-a-zoned-campus'].includes(row.matchStatus))
  throw Error('invalid_school_linkage_record');
 return {school:row.school,district:row.district,type:row.type,
  matchStatus:row.matchStatus,polygonCount:row.polygonCount,
  eligiblePolygonCount:row.eligiblePolygonCount,
  idEvidence:row.idEvidence===true,nameEvidence:row.nameEvidence===true,
  sourceLoadError:row.sourceLoadError===true,sourceConfigured:row.sourceConfigured!==false,
  sourceMode:MODES[row.district]||'unclassified',
  liveFinderConfirmed:row.liveFinderConfirmed===true};
}
function classify(row){
 const r=normalizeRow(row);
 if(r.sourceLoadError)return 'source-fetch-failed';
 if(r.matchStatus==='matched')return 'matched';
 if(r.matchStatus==='special-campus-no-standard-zone')return r.matchStatus;
 if(!r.sourceConfigured)return 'no-source-configured';
 if(r.polygonCount===0)return 'no-loaded-polygon-source';
 if(r.matchStatus==='not-a-zoned-campus')return 'not-a-zoned-campus';
 if(r.eligiblePolygonCount===0)return 'no-grade-polygon-source';
 if(r.idEvidence)return 'possible-id-linkage-gap';
 if(r.nameEvidence)return 'possible-name-linkage-gap';
 if(r.matchStatus==='school-not-in-polygon-source')return 'school-not-found-in-source';
 return 'unknown-match-status';
}
function sourceState(state){
 if(!state||typeof state!=='object'||typeof state.district!=='string'||
   !count(state.polygonCount)||typeof state.sourceConfigured!=='boolean')
  throw Error('invalid_district_source_record');
 return {
  district:state.district,sourceKey:String(state.sourceKey||state.district),
  polygonCount:state.polygonCount,sourceConfigured:state.sourceConfigured,
  sourceLoadError:state.sourceLoadError===true,
  liveFinderConfirmed:state.liveFinderConfirmed===true,
  sourceMode:MODES[state.district]||'unclassified',
  gradeCounts:state.gradeCounts&&typeof state.gradeCounts==='object'?{
   elementary:Number(state.gradeCounts.elementary)||0,
   middle:Number(state.gradeCounts.middle)||0,
   high:Number(state.gradeCounts.high)||0,
   senior:Number(state.gradeCounts.senior)||0
  }:{elementary:0,middle:0,high:0,senior:0}
 };
}
function renderCheck(check){
 if(!check||typeof check.district!=='string'||typeof check.school!=='string'||
  !['passed','failed','not-tested'].includes(check.status))throw Error('invalid_render_check');
 return {district:check.district,school:check.school,status:check.status,
  actualLayers:check.actualLayers??null,reason:check.reason||null};
}
function auditLinkage({rows=[],sources=[],renderChecks=[],markerChecks=[],browserLoaded=true,runMode='isolated-pr'}={}){
 if(!Array.isArray(rows)||!Array.isArray(sources)||!Array.isArray(renderChecks)||!Array.isArray(markerChecks)||
    typeof browserLoaded!=='boolean')throw Error('invalid_audit_payload');
 const sourceByDistrict=new Map(sources.map(s=>{
  const normalized=sourceState(s);
  return [normalized.district,normalized];
 }));
 if(sourceByDistrict.size!==sources.length)throw Error('duplicate_district_source');
 const classified=rows.map(row=>{
  const r=normalizeRow(row),category=classify(r);
  return {school:r.school,district:r.district,type:r.type,
   category,severity:SEVERITIES[category],sourceMode:r.sourceMode,
   polygonCount:r.polygonCount,eligiblePolygonCount:r.eligiblePolygonCount};
 });
 const districts=[...new Set([...CORE,...sources.map(s=>s.district),...rows.map(r=>r.district)])];
 const byDistrict={};
 for(const d of districts){
  const records=classified.filter(s=>s.district===d),counts=EMPTY();
  for(const r of records)counts[r.category]++;
  const source=sourceByDistrict.get(d)||null;
  const linked=counts.matched,missing=records.length-linked;
  const unknown=counts['source-fetch-failed']+counts['unknown-match-status'];
  byDistrict[d]={
   totalLoadedDirectory:records.length,
   linked,unmatched:missing,unverified:unknown,
   matchRateLoadedPercent:records.length?Math.round(linked/records.length*1000)/10:null,
   statusCounts:Object.fromEntries(Object.entries(counts).filter(([,v])=>v)),
   source,limitation:source?.sourceMode||MODES[d]||'unclassified'
  };
 }
 const total=classified.length,matched=classified.filter(r=>r.category==='matched').length;
 const unknown=classified.filter(r=>['source-fetch-failed','unknown-match-status'].includes(r.category)).length;
 const ambiguous=classified.filter(r=>r.severity==='possible-match-pipeline-defect').length;
 const tests=renderChecks.map(renderCheck);
 const failures=tests.filter(c=>c.status==='failed');
 const markerSamples=markerChecks.map(c=>{
  if(!c||typeof c.district!=='string'||
     !['passed','failed','not-tested'].includes(c.status)||
     !count(c.eligibleSchoolLocations)||!count(c.expectedVisible)||
     !count(c.matchedMarkers)||!Array.isArray(c.missingNames)||
     c.missingNames.some(n=>typeof n!=='string'))
    throw Error('invalid_school_marker_check');
  return {district:c.district,status:c.status,
   eligibleSchoolLocations:c.eligibleSchoolLocations,
   expectedVisible:c.expectedVisible,matchedMarkers:c.matchedMarkers,
   missingNames:c.missingNames};
 });
 const markerFailures=markerSamples.filter(c=>c.status==='failed');
 const matchedWithoutSource=classified.filter(r=>r.category==='matched'&&r.polygonCount===0);
 const hasOfflineBlockers=failures.length>0||markerFailures.length>0||matchedWithoutSource.length>0;
 const sourceErrors=Object.values(byDistrict).filter(d=>d.source?.sourceLoadError).length;
 const coverage={
  totalLoadedDirectory:total,matched,unmatched:total-matched,
  matchRateLoadedPercent:total?Math.round(matched/total*1000)/10:null,
  unverified:unknown,
  possibleMatchPipelineDefects:ambiguous,
  sampledRenderChecks:tests.length,sampledRenderFailures:failures.length,
  sampledMarkerChecks:markerSamples.length,sampledMarkerFailures:markerFailures.length
 };
 const status=hasOfflineBlockers?'REVIEW_REQUIRED':
   sourceErrors>0||!browserLoaded?'INCONCLUSIVE_SOURCE_AVAILABILITY':'PASS_WITH_SOURCE_LIMITATIONS';
 const topSix=CORE.reduce((x,d)=>{
  x.totalLoadedDirectory+=byDistrict[d].totalLoadedDirectory;
  x.matched+=byDistrict[d].linked;
  x.unmatched+=byDistrict[d].unmatched;
  return x;
 },{districts:CORE,totalLoadedDirectory:0,matched:0,unmatched:0});
 topSix.matchRateLoadedPercent=topSix.totalLoadedDirectory?
  Math.round(topSix.matched/topSix.totalLoadedDirectory*1000)/10:null;
 return {
  status,runMode,
  auditMeaning:'Every loaded school-directory row checked against polygons present in this browser session. Not districtwide student assignment coverage.',
  denominator:'loaded elementary/middle/high directory, not all official active schools',
  coverage,topSix,byDistrict,
  reasons:Object.fromEntries(CATEGORIES.map(k=>[k,classified.filter(r=>r.category===k).length]).filter(([,n])=>n)),
  schools:classified,renderChecks:tests,markerChecks:markerSamples,
  blocked:hasOfflineBlockers,
  warnings:[
   ...(sourceErrors?['Source load failures affect '+sourceErrors+' district(s); unavailable source cannot be called missing polygons.']:[]),
   ...(ambiguous?[ambiguous+' ID/name hints require review; none proves a code defect.']:[]),
   'Matched polygons may be historical or finder-linked with an unconfirmed source year.',
   'School marker visibility and exact address enrollment are independent checks.'
  ],
  limitations:[
   'Live feed outages can change session totals.',
   'A school name mismatch alone cannot prove a polygon is absent.',
   'Special campuses may have no standard neighborhood attendance boundary.',
   'No user home addresses or geocoding requests are included.'
  ]
 };
}
if(require.main===module){
 const fs=require('node:fs');
 const filename=process.argv[2];
 if(!filename)throw Error('Pass a local JSON capture path');
 const report=auditLinkage(JSON.parse(fs.readFileSync(filename,'utf8')));
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(report.blocked)process.exitCode=1;
}
module.exports={CORE,MODES,CATEGORIES,classify,auditLinkage,normalizeRow};
