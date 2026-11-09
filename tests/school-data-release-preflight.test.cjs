'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');
const {gitBlobSha,safeRelative,polygonDiagnostic,inspectAsset,audit}=require('../scripts/school-data-release-preflight.cjs');

const currentFeature={
 type:'Feature',properties:{school:'Sample',current:true,sourceYearConfirmed:true,sourceVintage:'2026–27'},
 geometry:{type:'Polygon',coordinates:[[[-96.6,33],[-96.5,33],[-96.5,33.1],[-96.6,33.1],[-96.6,33]]]}
};
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'school-data-release-test-'));
 const dir=path.join(root,'data');fs.mkdirSync(dir);
 const data=Buffer.from(JSON.stringify({type:'FeatureCollection',metadata:{year:'2026–27'},features:[currentFeature]}));
 fs.writeFileSync(path.join(dir,'current.geojson'),data);
 const manifest={
  schemaVersion:1,validationMode:'local-files-only',createdForSchoolYear:'2026–27',
  knownLimitations:[{district:'AISD',code:'historical-polygons'}],
  assets:[{path:'data/current.geojson',gitBlobSha:gitBlobSha(data),kind:'features',
    district:'PROSPER',assurance:'2026-27-current-confirmed',expectedCount:1}]
 };
 return {root,manifest,filename:path.join(dir,'current.geojson')};
}
test('Git blob integrity hash uses the same SHA-1 framing as Git',()=>{
 const example=Buffer.from('hello world\n');
 assert.equal(gitBlobSha(example),'3b18e512dba79e4c8300dd08aeb37f8e728b8dad');
});
test('manifest paths reject traversal and symlink escapes',()=>{
 const f=fixture();
 try{
  for(const value of ['../private.json','/etc/passwd','./data/current.geojson','data\\a.json','data//a.json'])
   assert.throws(()=>safeRelative(f.root,value),/unsafe_manifest_path/);
  fs.symlinkSync(path.join(f.root,'data/current.geojson'),path.join(f.root,'data/link.json'));
  assert.throws(()=>safeRelative(f.root,'data/link.json'),/symlink_not_allowed/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('simple, explicitly current-year polygon can be checked deterministically',()=>{
 const f=fixture();
 try{
  const report=audit(f.root,f.manifest);
  assert.equal(report.status,'PASS_WITH_KNOWN_SOURCE_LIMITATIONS');
  assert.equal(report.pinnedCount,1);
  assert.equal(report.currentYearConfirmedSnapshotCount,1);
  assert.equal(report.errors.length,0);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('modifying pinned source without reviewing the manifest blocks release',()=>{
 const f=fixture();
 try{
  fs.appendFileSync(f.filename,'\n');
  const report=audit(f.root,f.manifest);
  assert.equal(report.status,'BLOCKED');
  assert.ok(report.errors.some(e=>e.reason==='unreviewed_data_change'));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('malformed JSON fails without exposing raw source text',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(f.filename,'{"address":"Private Residence, Plano TX","invalid":');
  const report=audit(f.root,f.manifest);
  assert.equal(report.status,'BLOCKED');
  assert.equal(JSON.stringify(report).includes('Private Residence'),false);
  assert.ok(report.errors.some(e=>e.reason==='invalid_json'));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('historical or partial reference polygons cannot claim current=true',()=>{
 const f=fixture();
 try{
  const source=JSON.parse(fs.readFileSync(f.filename,'utf8'));
  f.manifest.assets[0].assurance='historical-only';
  f.manifest.assets[0].gitBlobSha=gitBlobSha(Buffer.from(JSON.stringify(source)));
  const report=audit(f.root,f.manifest);
  assert.equal(report.status,'BLOCKED');
  assert.ok(report.errors.some(e=>/unsafe_current_flag/.test(e.reason)));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('current GIS polygons must declare matching school year and official confirmation',()=>{
 const f=fixture();
 try{
  const altered=structuredClone(currentFeature);
  altered.properties.sourceYearConfirmed=false;
  const data=Buffer.from(JSON.stringify({type:'FeatureCollection',metadata:{year:'2026'},features:[altered]}));
  fs.writeFileSync(f.filename,data);
  f.manifest.assets[0].gitBlobSha=gitBlobSha(data);
  const report=audit(f.root,f.manifest);
  assert.equal(report.status,'BLOCKED');
  assert.ok(report.errors.some(e=>/current_year_unconfirmed_feature_count/.test(e.reason)));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('polygon basic structural and closure issues are detected',()=>{
 const g=currentFeature.geometry;
 assert.deepEqual(polygonDiagnostic(g),{valid:true,unclosed:0});
 assert.equal(polygonDiagnostic({type:'Point',coordinates:[-96,33]}).valid,false);
 const bad=structuredClone(g);bad.coordinates[0][4]=[-96.5,33];
 assert.equal(polygonDiagnostic(bad).unclosed,1);
});
test('point schemas distinguish school [lat,lon] from polygon [lon,lat]',()=>{
 const spec={path:'sample.json',kind:'points-data',district:'FISD',assurance:'2026-campus-points',expectedCount:1};
 const valid=Buffer.from(JSON.stringify({data:[{name:'Example',ll:[33.16,-96.8]}]}));
 assert.deepEqual(inspectAsset(valid,spec).errors,[]);
 const bad=Buffer.from(JSON.stringify({data:[{name:'Example',ll:['33.16',-96.8]}]}));
 assert.ok(inspectAsset(bad,spec).errors.some(e=>e.startsWith('invalid_school_coordinates_count')));
});
test('duplicate tracked paths and invalid manifest types block execution',()=>{
 const f=fixture();
 try{
  f.manifest.assets.push({...f.manifest.assets[0]});
  assert.throws(()=>audit(f.root,f.manifest),/duplicate_manifest_path/);
  f.manifest.assets=[{...f.manifest.assets[0],kind:'database'}];
  assert.throws(()=>audit(f.root,f.manifest),/invalid_manifest_asset_type/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('official source limitations remain explicit, never silently inferred from local file counts',()=>{
 const f=fixture();
 try{
  const report=audit(f.root,f.manifest);
  assert.deepEqual(report.limitations,[{district:'AISD',code:'historical-polygons'}]);
  assert.match(report.note,/do not verify a specific home address/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('real tracked school datasets match the reviewed source lock and are structurally readable',()=>{
 const root=process.cwd();
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/school-data-release-lock.json'),'utf8'));
 const report=audit(root,manifest);
 assert.equal(report.assetCount,16);
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 assert.equal(report.pinnedCount,16);
 assert.equal(report.status,'PASS_WITH_KNOWN_SOURCE_LIMITATIONS');
});
