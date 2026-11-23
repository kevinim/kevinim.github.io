#!/usr/bin/env node
'use strict';

// SEC-04: reconcile the EXACT sanitized public build with pinned source
// evidence. No grants, no provider calls, no source writes, no deploy.
// The itemized list is local/gitignored; CI receives counts only.
const fs=require('node:fs');
const path=require('node:path');
const {audit}=require('./audit-public-data-rights.cjs');
const {assess,validateManifest}=require('./audit-sec04-education-gis-evidence.cjs');

const CANDIDATES=new Set(['tea_education_candidate','school_gis_candidate']);
const OUTPUT='artifacts/security';

function metadataSignal(file){
 // A key name is a triage hint, NOT a verified source/rights determination.
 if(!/\.json$|\.geojson$/i.test(file))return 'non_json';
 const stat=fs.statSync(file);
 if(stat.size>5_000_000)return 'uninspected_oversize';
 try{
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!data||typeof data!=='object'||Array.isArray(data))return 'no_structured_source_fields';
  const keys=Object.keys(data).map(x=>x.toLowerCase());
  return keys.some(x=>/^(?:source|sources|sourceurl|sourceurls|publisher|attribution|license|metadata|provenance|origin|citation|retrievedfrom|rawsources|sourcedata)$/.test(x))
   ? 'source_shaped_field_present_unverified':'no_structured_source_fields';
 }catch{return 'invalid_json_or_unreadable'}
}
function reconcile(root,bundleDir,registry,manifest){
 validateManifest(manifest);
 const rights=audit(bundleDir,registry);
 const pinned=assess(root,manifest,path.relative(root,bundleDir));
 const all=rights.local.itemizedPaths;
 const candidates=all.filter(x=>CANDIDATES.has(x.reviewLane));
 const byPath=new Map(manifest.records.map(x=>[x.path,x]));
 const laneCounts={
  tea_education_candidate:{total:0,pinned:0,notPinned:0},
  school_gis_candidate:{total:0,pinned:0,notPinned:0},
 };
 const signals={
  source_shaped_field_present_unverified:0,
  no_structured_source_fields:0,
  non_json:0,
  uninspected_oversize:0,
  invalid_json_or_unreadable:0,
 };
 const unpinnedSignals=Object.fromEntries(Object.keys(signals).map(x=>[x,0]));
 let byteIdentical=0,transformed=0,pinnedCount=0;
 const localQueue=candidates.map(item=>{
  const rec=byPath.get(item.path);
  const lane=laneCounts[item.reviewLane];
  lane.total++;
  const pinnedSource=Boolean(rec);
  let sourceByteIdentity='not_checked';
  if(pinnedSource){
   lane.pinned++;pinnedCount++;
   const sourceBytes=fs.readFileSync(path.join(root,item.path));
   const builtBytes=fs.readFileSync(path.join(bundleDir,item.path));
   if(sourceBytes.equals(builtBytes)){
    byteIdentical++;sourceByteIdentity='identical';
   }else{
    transformed++;sourceByteIdentity='transformed';
   }
  }else lane.notPinned++;
  const signal=metadataSignal(path.join(bundleDir,item.path));
  signals[signal]++;
  if(!pinnedSource)unpinnedSignals[signal]++;
  return {
   relativeBuildPath:item.path,
   reviewLane:item.reviewLane,
   extension:item.extension,
   sourceReviewState:pinnedSource?'PINNED_SOURCE_RECORD_NOT_RIGHTS_APPROVED':'NEEDS_INDEPENDENT_SOURCE_RECORD',
   nextReviewPriority:pinnedSource?'P2_SOURCE_PINNED_LICENSE_PENDING':
    signal==='no_structured_source_fields'?'P0_MISSING_SOURCE_METADATA':
    signal==='source_shaped_field_present_unverified'?'P1_VALIDATE_SOURCE_METADATA':
    'P0_SOURCE_FILE_MANUAL_INSPECTION',
   embeddedSourceKeySignal:signal,
   rightsDecision:item.decision,
   redistributionPermissionEstablished:false,
   sourceByteIdentity
  };
 });
 const evidenceRecordsMissingFromBuild=manifest.records.filter(rec=>!all.some(item=>item.path===rec.path)).length;
 const status='BLOCKED_EVIDENCE_AND_RIGHTS_REVIEW';
 const summary={
  schemaVersion:1,
  status,
  scope:'CURRENT_SANITIZED_BUILD_TEACHING_AND_SCHOOL_GIS_FILENAME_CANDIDATES',
  allDistributedDataMedia:all.length,
  candidateCount:candidates.length,
  reviewLaneTotals:laneCounts,
  sourceEvidenceRecordCount:manifest.records.length,
  pinnedSourcesPresentInBuild:pinned.presentInSanitizedPreview,
  pinnedCandidateCount:pinnedCount,
  pinnedSourcesOutsideCandidateLanes:pinned.presentInSanitizedPreview-pinnedCount,
  pinnedRecordsNotInBuild:evidenceRecordsMissingFromBuild,
  pinnedCandidateByteIdentical:byteIdentical,
  pinnedCandidateByteTransformed:transformed,
  candidatesWithoutPinnedEvidence:candidates.length-pinnedCount,
  embeddedSourceFieldSignals:signals,
  unpinnedCandidateMetadataSignals:unpinnedSignals,
  rightsDecisions:rights.summary.rightsDecisions,
  redistributionRightsVerified:0,
  publicProductionApproved:false,
  reviewStatus:'source_metadata_keys_and_github_blob_hashes_are_not_reuse_licenses',
  limitations:[
   'filename_categories_not_verified_publishers',
   'structural_source_fields_not_validated_origins_or_licenses',
   'pinned_source_provenance_not_independent_license_clearance',
   'source_file_byte_identity_does_not_grant_republication',
   'dynamic_provider_fetch_and_embedded_html_js_data_not_in_inventory'
  ]
 };
 if(summary.pinnedSourcesOutsideCandidateLanes<0||
    byteIdentical+transformed!==pinnedCount||
    Object.values(laneCounts).reduce((a,x)=>a+x.total,0)!==candidates.length||
    Object.values(signals).reduce((a,x)=>a+x,0)!==candidates.length||
    Object.values(unpinnedSignals).reduce((a,x)=>a+x,0)!==candidates.length-pinnedCount||
    !all.every(x=>x.decision==='pending')||
    rights.summary.status!=='BLOCKED_RIGHTS_REVIEW_REQUIRED')
  throw Error('SEC04_CROSSWALK_INVARIANT_FAILED');
 return {summary,local:{schemaVersion:1,reviewQueue:localQueue,
  pinnedSourceRecordsNotInSanitizedBuild:evidenceRecordsMissingFromBuild}};
}
function main(root=process.cwd()){
 const registry=JSON.parse(fs.readFileSync(path.join(root,'deploy/public-data-rights.json'),'utf8'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'deploy/sec04-education-gis-evidence.json'),'utf8'));
 const result=reconcile(root,path.join(root,'dist/public-preview'),registry,manifest);
 const out=path.join(root,OUTPUT);
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'sec04-education-gis-crosswalk-summary.json'),
  JSON.stringify(result.summary,null,2)+'\n');
 fs.writeFileSync(path.join(out,'sec04-education-gis-crosswalk-local.json'),
  JSON.stringify(result.local,null,2)+'\n',{mode:0o600});
 // Explicitly redact filenames, human-input values, URLs and license text.
 console.log('SEC04_EDUCATION_GIS_CROSSWALK '+JSON.stringify({
  status:result.summary.status,
  total:result.summary.candidateCount,
  pinned:result.summary.pinnedCandidateCount,
  needsEvidence:result.summary.candidatesWithoutPinnedEvidence,
  unpinnedSourceSignals:result.summary.unpinnedCandidateMetadataSignals,
  lanes:result.summary.reviewLaneTotals,
  bytes:{identical:result.summary.pinnedCandidateByteIdentical,
    transformed:result.summary.pinnedCandidateByteTransformed},
  approved:result.summary.redistributionRightsVerified,
  publicProductionApproved:false
 }));
 return result;
}
if(require.main===module){
 try{main()}catch{
  console.error('SEC04_EDUCATION_GIS_CROSSWALK blocked: inspect local evidence and build');
  process.exitCode=2;
 }
}
module.exports={CANDIDATES,metadataSignal,reconcile,main};
