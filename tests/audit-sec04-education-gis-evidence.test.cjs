'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {gitBlobSha,validateManifest,assess}=require('../scripts/audit-sec04-education-gis-evidence.cjs');
const ROOT=path.resolve(__dirname,'..');
const actual=JSON.parse(fs.readFileSync(path.join(ROOT,'deploy/sec04-education-gis-evidence.json'),'utf8'));
function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tx-sec04-source-evidence-'));
 try{
  fs.mkdirSync(path.join(root,'data'));
  fs.mkdirSync(path.join(root,'dist','public-preview','data'),{recursive:true});
  const tea=Buffer.from('{"publisher":"Texas Education Agency","values":[]}\n');
  const gis=Buffer.from('{"source":"district official attendance maps","features":[]}\n');
  fs.writeFileSync(path.join(root,'data','tea.json'),tea);
  fs.writeFileSync(path.join(root,'data','gis.geojson'),gis);
  fs.writeFileSync(path.join(root,'dist','public-preview','data','tea.json'),tea);
  const record=(p,bytes,group,marker,termsPage)=>({
   path:p,sourceBlobSha:gitBlobSha(bytes),group,metadataMarker:marker,
   sourcePage:'https://example.invalid/publisher',termsPage,
   evidenceLevel:'test-only-synthetic',rightsDecision:'pending',
   fileMatchedToIndependentlyLicensedDataset:false
  });
  const doc={schemaVersion:1,defaultDecision:'pending',records:[
   record('data/tea.json',tea,'tea','Texas Education Agency','https://example.invalid/terms'),
   record('data/gis.geojson',gis,'gis','district official attendance maps',null)
  ]};
  return fn(root,doc);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
}
test('actual reviewed source manifest pins a nonempty TEA/GIS subset with zero assumed approvals',()=>{
 assert.doesNotThrow(()=>validateManifest(actual));
 assert.equal(actual.records.length,15);
 assert.equal(actual.records.filter(x=>x.group==='tea').length,7);
 assert.equal(actual.records.filter(x=>x.group==='gis').length,8);
 for(const rec of actual.records){
  const bytes=fs.readFileSync(path.join(ROOT,rec.path));
  assert.equal(gitBlobSha(bytes),rec.sourceBlobSha,rec.path);
  assert.ok(bytes.toString('utf8').includes(rec.metadataMarker),rec.path);
  assert.equal(rec.rightsDecision,'pending');
  assert.equal(rec.fileMatchedToIndependentlyLicensedDataset,false);
 }
});
test('counts local source and actual preview intersection but never publishes names',()=>fixture((root,doc)=>{
 const result=assess(root,doc);
 assert.equal(result.reviewedSourceRecords,2);
 assert.deepEqual(result.selectedSourceGroupCounts,{tea:1,gis:1});
 assert.equal(result.presentInSanitizedPreview,1);
 assert.equal(result.rightsPending,2);
 assert.equal(result.redistributionApproved,0);
 assert.equal(result.publicProductionApproved,false);
 assert.equal(result.status,'REVIEW_REQUIRED_NOT_REDISTRIBUTION_APPROVAL');
 assert.doesNotMatch(JSON.stringify(result),/tea\.json|gis\.geojson|example\.invalid|Texas Education Agency/);
}));
test('publisher URLs and assumed license approvals cannot silently authorize assets',()=>fixture((root,doc)=>{
 const rec=doc.records[0];
 for(const key of ['rightsDecision','fileMatchedToIndependentlyLicensedDataset']){
  const other=structuredClone(doc);
  other.records[0][key]=key==='rightsDecision'?'approved':true;
  assert.throws(()=>assess(root,other),/invalid_or_unauthorized_evidence_record/);
 }
 const corrupt=structuredClone(doc);corrupt.records[0].sourcePage='javascript:alert(1)';
 assert.throws(()=>assess(root,corrupt),/invalid_or_unauthorized_evidence_record/);
}));
test('source modification, metadata drift and duplicate source entries fail closed',()=>fixture((root,doc)=>{
 const modified=structuredClone(doc);modified.records[0].metadataMarker='old source not in file';
 assert.throws(()=>assess(root,modified),/source_provenance_marker_changed/);
 const duplicate=structuredClone(doc);duplicate.records.push({...duplicate.records[0]});
 assert.throws(()=>assess(root,duplicate),/invalid_or_unauthorized_evidence_record/);
 fs.appendFileSync(path.join(root,'data','tea.json'),' ');
 assert.throws(()=>assess(root,doc),/source_blob_changed_review_required/);
}));
test('symlinked source paths and symlinked preview assets are rejected',()=>fixture((root,doc)=>{
 const target=path.join(root,'data','tea.json');
 fs.symlinkSync(target,path.join(root,'data','alias.json'));
 const other=structuredClone(doc);
 other.records[0].path='data/alias.json';
 assert.throws(()=>assess(root,other),/unsafe_source_file/);
 const copied=path.join(root,'dist','public-preview','data','tea.json');
 fs.rmSync(copied);fs.symlinkSync(target,copied);
 assert.throws(()=>assess(root,doc),/unsafe_preview_source/);
}));
