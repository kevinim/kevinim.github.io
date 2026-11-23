#!/usr/bin/env node
'use strict';
// SEC-04 independent source provenance review guard, never a license approval.
// Read-only source verification; writes only a redacted aggregate local artifact.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const SAFE=/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[A-Za-z0-9_./-]+$/;
const SHA=/^[0-9a-f]{40}$/;
const HTTPS=/^https:\/\/[^<>"'\s]+$/;
const GROUPS=['tea','gis'];
const REPORT='artifacts/security/sec04-education-gis-summary.json';
function gitBlobSha(bytes){
 return crypto.createHash('sha1')
  .update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
}
function validateManifest(doc){
 if(!doc||Array.isArray(doc)||doc.schemaVersion!==1||
   doc.defaultDecision!=='pending'||!Array.isArray(doc.records)||!doc.records.length)
  throw Error('invalid_evidence_manifest_schema');
 const unique=new Set();
 for(const r of doc.records){
  if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.path!=='string'||
     !SAFE.test(r.path)||!/\.(?:json|geojson)$/.test(r.path)||
     !r.path.startsWith('data/')||unique.has(r.path)||
     !GROUPS.includes(r.group)||!SHA.test(r.sourceBlobSha||'')||
     typeof r.metadataMarker!=='string'||r.metadataMarker.length<8||
     typeof r.sourcePage!=='string'||!HTTPS.test(r.sourcePage)||
     (r.termsPage!==null&&!HTTPS.test(r.termsPage||''))||
     typeof r.evidenceLevel!=='string'||!r.evidenceLevel||
     r.rightsDecision!=='pending'||r.fileMatchedToIndependentlyLicensedDataset!==false)
   throw Error('invalid_or_unauthorized_evidence_record');
  unique.add(r.path);
 }
 return doc;
}
function assess(root,doc,preview='dist/public-preview'){
 validateManifest(doc);
 const previewRoot=path.resolve(root,preview);
 if(!fs.existsSync(previewRoot)||!fs.lstatSync(previewRoot).isDirectory()||
     fs.lstatSync(previewRoot).isSymbolicLink())
  throw Error('preview_build_required');
 const groups={tea:0,gis:0};
 let matches=0,previewMatched=0,termsLinked=0,publisherOnly=0;
 for(const record of doc.records){
  const full=path.resolve(root,record.path);
  if(!full.startsWith(path.resolve(root)+path.sep))throw Error('source_outside_repository');
  const st=fs.lstatSync(full);
  if(!st.isFile()||st.isSymbolicLink())throw Error('unsafe_source_file');
  const bytes=fs.readFileSync(full);
  if(gitBlobSha(bytes)!==record.sourceBlobSha)
   throw Error('source_blob_changed_review_required');
  const body=bytes.toString('utf8');
  try{JSON.parse(body)}catch{throw Error('invalid_source_json')}
  if(!body.includes(record.metadataMarker))throw Error('source_provenance_marker_changed');
  groups[record.group]++;matches++;
  if(record.termsPage)termsLinked++;else publisherOnly++;
  const candidate=path.join(previewRoot,record.path);
  if(fs.existsSync(candidate)){
   const target=fs.lstatSync(candidate);
   if(!target.isFile()||target.isSymbolicLink())throw Error('unsafe_preview_source');
   previewMatched++;
  }
 }
 return {
  schemaVersion:1,
  status:'REVIEW_REQUIRED_NOT_REDISTRIBUTION_APPROVAL',
  reviewedSourceRecords:matches,
  selectedSourceGroupCounts:groups,
  presentInSanitizedPreview:previewMatched,
  sourceRecordsWithPolicyLink:termsLinked,
  sourceRecordsWithoutPolicyLink:publisherOnly,
  evidenceType:'PINNED_GIT_BLOB_PLUS_RECORDED_OFFICIAL_SOURCE_PAGE',
  redistributionApproved:0,
  rightsPending:matches,
  publicProductionApproved:false,
  limitations:[
   'this_subset_is_not_all_filename_triaged_education_and_school_gis_candidates',
   'git_blob_and_url_presence_do_not_establish_rights_to_redistribute',
   'terms_links_may_apply_to_sites_not_exact_transformed_data_files',
   'sources_not_in_sanitized_preview_are_not_counted_as_shipped_assets',
   'manual_publisher_and_license_review_still_required'
  ]
 };
}
function main(root=process.cwd()){
 const doc=JSON.parse(fs.readFileSync(path.join(root,'deploy/sec04-education-gis-evidence.json'),'utf8'));
 const summary=assess(root,doc);
 const target=path.join(root,REPORT);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,JSON.stringify(summary,null,2)+'\n',{mode:0o600});
 // Counts only. Never log paths, source URLs, student data, or raw source bodies.
 console.log('SEC04_EDUCATION_GIS_EVIDENCE '+JSON.stringify({
  status:summary.status,reviewed:summary.reviewedSourceRecords,
  groups:summary.selectedSourceGroupCounts,
  presentInSanitizedPreview:summary.presentInSanitizedPreview,
  rightsPending:summary.rightsPending,redistributionApproved:0,
  publicProductionApproved:false
 }));
 return summary;
}
if(require.main===module){
 try{main()}catch(e){
  console.error('SEC04_EDUCATION_GIS_EVIDENCE blocked: source_changed_or_invalid');
  process.exitCode=1;
 }
}
module.exports={gitBlobSha,validateManifest,assess,main};
