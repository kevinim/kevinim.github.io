'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadSources,attachReferenceIDs}=require('../scripts/agent01-irving-tea-crosswalk.cjs');
const {manifest,tea}=loadSources();
const rows=()=>manifest.records.map(r=>({type:'Feature',geometry:{type:'Polygon',coordinates:[]},properties:{
 gradeLevel:r.grade,school:r.sourceSchoolName,campusId:null,sourceYearVerified:false,campusIdCrosswalkVerified:false,independentFinderVerified:false}}));
test('all 28 GIS grade/name entries match explicit unique TEA preliminary campus IDs, not enrollment',()=>{
 const {features,audit}=attachReferenceIDs(rows(),manifest,tea);
 assert.equal(manifest.records.length,28);
 assert.equal(audit.matchingPreliminaryTEAReferenceRows,28);
 assert.equal(new Set(features.map(x=>x.properties.provisionalTEAReferenceId)).size,28);
 assert.equal(audit.release,'NO_GO');assert.equal(audit.currentYearZoneVerified,false);
 for(const f of features){
  assert.equal(f.properties.campusId,null);
  assert.equal(f.properties.campusIdCrosswalkVerified,false);
  assert.equal(f.properties.independentFinderVerified,false);
  assert.match(f.properties.provisionalTEAReferenceId,/^057912\d{3}$/);
 }
});
test('high school stable IDs and middle-school legacy alias are explicit',()=>{
 const index=new Map(manifest.records.map(r=>[r.grade+':'+r.sourceSchoolName,r.teaCampusId]));
 assert.equal(index.get('high:Irving HS'),'057912002');
 assert.equal(index.get('high:Macarthur HS'),'057912003');
 assert.equal(index.get('high:Nimitz HS'),'057912004');
 assert.equal(index.get('middle:Johnson MS'),'057912050');
 assert.equal(index.has('middle:Dezavala MS'),false);
});
test('fail closed for unexpected source names, missing grades, duplicates and certification spoofing',()=>{
 const a=rows();a[0].properties.school='Unknown';assert.throws(()=>attachReferenceIDs(a,manifest,tea),/not_in_explicit_aliases/);
 const b=rows();b.splice(-1);assert.throws(()=>attachReferenceIDs(b,manifest,tea),/incomplete/);
 const c=rows();c[0].properties.campusId='057912101';assert.throws(()=>attachReferenceIDs(c,manifest,tea),/misrepresented/);
 const d=rows();d[0].properties.sourceYearVerified=true;assert.throws(()=>attachReferenceIDs(d,manifest,tea),/misrepresented/);
 assert.throws(()=>attachReferenceIDs(rows(),{...manifest,currentYearReleaseReady:true},tea),/untrusted/);
});
