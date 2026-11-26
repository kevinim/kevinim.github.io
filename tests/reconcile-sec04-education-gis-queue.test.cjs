'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {reconcile,metadataSignal,metadataGapSubtype,GAP_SUBTYPES}=require('../scripts/reconcile-sec04-education-gis-queue.cjs');
const {gitBlobSha}=require('../scripts/audit-sec04-education-gis-evidence.cjs');

function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tx-sec04-candidate-crosswalk-'));
 const build=path.join(root,'dist/public-preview');
 try{
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.mkdirSync(path.join(build,'data'),{recursive:true});
  fs.writeFileSync(path.join(build,'index.html'),'<!doctype html>');
  const files={
   'data/tea-accountability.json':'{"publisher":"Texas Education Agency","source":"official dataset"}',
   'data/dfw-school-gis.geojson':'{"source":"district GIS source","type":"FeatureCollection","features":[]}',
   'data/tea-unreviewed.json':'{"campuses":[]}',
   'data/allen-school-more.geojson':'{"metadata":{"foo":1}}',
   'data/unrelated.json':'{"generic":true}'
  };
  for(const [name,body] of Object.entries(files)){
   fs.writeFileSync(path.join(root,name),body);
   fs.writeFileSync(path.join(build,name),body);
  }
  // Synthetic preview transformation must remain observable.
  fs.writeFileSync(path.join(build,'data','dfw-school-gis.geojson'),
   '{"source":"district GIS source","type":"FeatureCollection","features":[1]}');
  const makeRecord=(p,group,marker)=>({
   path:p,sourceBlobSha:gitBlobSha(Buffer.from(files[p])),group,
   metadataMarker:marker,sourcePage:'https://example.invalid/origin',
   termsPage:null,evidenceLevel:'synthetic-test-evidence',
   rightsDecision:'pending',fileMatchedToIndependentlyLicensedDataset:false
  });
  const doc={schemaVersion:1,defaultDecision:'pending',records:[
   makeRecord('data/tea-accountability.json','tea','Texas Education Agency'),
   makeRecord('data/dfw-school-gis.geojson','gis','district GIS source')
  ]};
  const registry={schemaVersion:1,defaultDecision:'pending',assets:{}};
  return fn({root,build,doc,registry,files});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('exact bundle candidates are reconciled against pinned evidence with no release approval',()=>fixture(({root,build,doc,registry})=>{
 const r=reconcile(root,build,registry,doc);
 assert.equal(r.summary.allDistributedDataMedia,5);
 assert.equal(r.summary.candidateCount,4);
 assert.deepEqual(r.summary.reviewLaneTotals,{
  tea_education_candidate:{total:2,pinned:1,notPinned:1},
  school_gis_candidate:{total:2,pinned:1,notPinned:1}
 });
 assert.equal(r.summary.sourceEvidenceRecordCount,2);
 assert.equal(r.summary.pinnedCandidateCount,2);
 assert.equal(r.summary.candidatesWithoutPinnedEvidence,2);
 assert.equal(Object.values(r.summary.unpinnedCandidateMetadataSignals).reduce((a,b)=>a+b,0),2);
 assert.equal(r.summary.unpinnedCandidateMetadataSignals.no_structured_source_fields,1);
 assert.equal(Object.values(r.summary.unpinnedMetadataGapSubtypes).reduce((a,b)=>a+b,0),1);
 assert.equal(r.summary.unpinnedMetadataGapSubtypes.no_source_key_found_manual_review,1);
 assert.equal(GAP_SUBTYPES.length,Object.keys(r.summary.unpinnedMetadataGapSubtypes).length);
 assert.equal(r.summary.unpinnedCandidateMetadataSignals.source_shaped_field_present_unverified,1);
 assert.equal(r.summary.pinnedCandidateByteIdentical,1);
 assert.equal(r.summary.pinnedCandidateByteTransformed,1);
 assert.equal(r.summary.pinnedSourcesOutsideCandidateLanes,0);
 assert.equal(r.summary.pinnedRecordsNotInBuild,0);
 assert.equal(r.summary.redistributionRightsVerified,0);
 assert.equal(r.summary.publicProductionApproved,false);
 assert.equal(r.summary.rightsDecisions.pending,5);
 assert.ok(!JSON.stringify(r.summary).includes('tea-accountability.json'));
 assert.ok(!JSON.stringify(r.summary).includes('example.invalid'));
 assert.equal(r.local.reviewQueue.length,4);
 assert.equal(r.local.reviewQueue.filter(x=>x.sourceReviewState==='NEEDS_INDEPENDENT_SOURCE_RECORD').length,2);
 assert.equal(r.local.reviewQueue.filter(x=>x.nextReviewPriority==='P0_MISSING_SOURCE_METADATA').length,1);
 assert.equal(r.local.reviewQueue.filter(x=>x.nextReviewPriority==='P1_VALIDATE_SOURCE_METADATA').length,1);
 assert.equal(r.local.reviewQueue.filter(x=>x.nextReviewPriority==='P2_SOURCE_PINNED_LICENSE_PENDING').length,2);
 assert.ok(r.local.reviewQueue.every(x=>x.redistributionPermissionEstablished===false));
}));
test('top-level source-key presence is a structural hint, not provenance clearance',()=>fixture(({build})=>{
 const p=name=>path.join(build,'data',name);
 assert.equal(metadataSignal(p('tea-accountability.json')),'source_shaped_field_present_unverified');
 assert.equal(metadataSignal(p('tea-unreviewed.json')),'no_structured_source_fields');
 assert.equal(metadataSignal(p('allen-school-more.geojson')),'source_shaped_field_present_unverified');
}));
test('any rights approved without independent evidence blocks this crosswalk',()=>fixture(({root,build,doc,registry})=>{
 registry.assets['data/tea-accountability.json']={
  decision:'approved',publisher:'synthetic test',
  licenseScope:'synthetic fictional reuse',attribution:'synthetic',
  reviewer:'test',reviewedAt:'2026-11-23',retrievedAt:'2026-11-23',
  sourceUrl:'https://example.invalid/synthetic-source',
  termsUrl:'https://example.invalid/synthetic',
  dataVintage:'synthetic-year',geographicScope:'synthetic',
  permissionBasis:'publisher-license',
  permissions:{publicDisplay:true,redistribution:true,browserCaching:true,modification:false}
 };
 assert.throws(()=>reconcile(root,build,registry,doc),/SEC04_CROSSWALK_INVARIANT_FAILED/);
}));
test('source blob drift and missing provenance marker refuse to recycle stale evidence',()=>fixture(({root,build,doc,registry})=>{
 fs.appendFileSync(path.join(root,'data/tea-accountability.json'),' ');
 assert.throws(()=>reconcile(root,build,registry,doc),/source_blob_changed_review_required/);
 fs.writeFileSync(path.join(root,'data/tea-accountability.json'),
  '{"publisher":"Texas Education Agency","source":"official dataset"}');
 const broken=structuredClone(doc);
 broken.records[0].metadataMarker='never seen source marker';
 assert.throws(()=>reconcile(root,build,registry,broken),/source_provenance_marker_changed/);
}));
test('unpublished pinned record is reported separately and not mistaken for candidate coverage',()=>fixture(({root,build,doc,registry})=>{
 fs.rmSync(path.join(build,'data/dfw-school-gis.geojson'));
 const r=reconcile(root,build,registry,doc);
 assert.equal(r.summary.pinnedSourceRecordsMissingFromBuild,undefined);
 assert.equal(r.summary.pinnedRecordsNotInBuild,1);
 assert.equal(r.summary.pinnedCandidateCount,1);
 assert.equal(r.summary.candidatesWithoutPinnedEvidence,2);
 assert.equal(r.summary.pinnedSourcesOutsideCandidateLanes,0);
}));
test('unexpected added build candidate cannot be covered by an old evidence snapshot',()=>fixture(({root,build,doc,registry})=>{
 fs.writeFileSync(path.join(build,'data','tea-new-campus.json'),'{"campuses":[]}\n');
 const r=reconcile(root,build,registry,doc);
 assert.equal(r.summary.candidateCount,5);
 assert.equal(r.summary.candidatesWithoutPinnedEvidence,3);
 assert.equal(r.summary.publicProductionApproved,false);
}));

test('metadata gap subtypes distinguish arrays, GeoJSON feature properties, nested source keys and unknowns without granting rights',()=>fixture(({root,build,doc,registry})=>{
 const p=name=>path.join(build,'data',name);
 const change=(name,body)=>fs.writeFileSync(p(name),body);
 change('tea-unreviewed.json','[{"campus":"fictional"}]');
 assert.equal(metadataGapSubtype(p('tea-unreviewed.json')),'root_array_manual_review');
 change('tea-unreviewed.json','{"campuses":[{"meta":{"source":"fictional"}}]}');
 assert.equal(metadataGapSubtype(p('tea-unreviewed.json')),'nested_source_key_unverified');
 change('tea-unreviewed.json','{"campuses":[{"name":"fictional"}]}');
 assert.equal(metadataGapSubtype(p('tea-unreviewed.json')),'no_source_key_found_manual_review');
 change('allen-school-more.geojson','{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"source":"fictional"},"geometry":null}]}');
 assert.equal(metadataGapSubtype(p('allen-school-more.geojson')),'geojson_feature_property_source_key_unverified');
 let r=reconcile(root,build,registry,doc);
 assert.equal(r.summary.unpinnedCandidateMetadataSignals.no_structured_source_fields,2);
 assert.equal(r.summary.unpinnedMetadataGapSubtypes.geojson_feature_property_source_key_unverified,1);
 assert.equal(r.summary.unpinnedMetadataGapSubtypes.no_source_key_found_manual_review,1);
 assert.equal(r.summary.redistributionRightsVerified,0);
 assert.equal(r.summary.publicProductionApproved,false);
 assert.ok(!JSON.stringify(r.summary).includes('fictional'));
 const local=r.local.reviewQueue.find(x=>x.relativeBuildPath==='data/allen-school-more.geojson');
 assert.equal(local.rightsDecision,'pending');
 assert.equal(local.redistributionPermissionEstablished,false);
 change('allen-school-more.geojson','{"type":"FeatureCollection","features":[{"properties":{"campus":"fictional"}}]}');
 assert.equal(metadataGapSubtype(p('allen-school-more.geojson')),'geojson_feature_properties_need_review');
 change('tea-unreviewed.json','not-json');
 assert.equal(metadataGapSubtype(p('tea-unreviewed.json')),'not_inspectable_manual_review');
}));
