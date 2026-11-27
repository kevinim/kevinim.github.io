'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {plan}=require('../features/school-reference-preview.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../prosper-attendance-2026.geojson'),'utf8'));
const registry={PROSPER:{currency:'always',official:'https://www.prosper-isd.net/'}};
const run=features=>plan({district:'PROSPER',status:'current',features},registry,x=>x);
const sample=(patch={})=>{
 const p={school:'Christie Elementary',gradeLevel:'elementary',sourceDistrict:'PROSPER',
  current:true,sourceYearConfirmed:true,sourceVintage:'2026–27',schoolYear:'2026–27',
  campusId:'043912117',schoolCode:'117',...patch};
 return {type:'Feature',properties:p,
  geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}};
};
test('all 31 pinned official Prosper source school identities are accepted as reference only',()=>{
 assert.equal(source.features.length,31);
 const levels={elementary:0,middle:0,high:0};
 for(const f of source.features){
  const result=run([f]);
  assert.equal(result.kind,'reference-only',f.properties.school);
  assert.equal(result.candidates[0].campusId,f.properties.campusId);
  assert.equal(result.candidates[0].schoolCode,f.properties.schoolCode);
  assert.match(result.warning,/실제 주소별 배정학교가 아닙니다/);
  levels[f.properties.gradeLevel]++;
 }
 assert.deepEqual(levels,{elementary:20,middle:7,high:4});
});
test('missing, malformed, contradictory or stale code never displays a Prosper candidate',()=>{
 assert.equal(run([sample()]).kind,'reference-only');
 assert.ok(run([sample()]).notices.some(n=>n.includes('Christie')));
 for(const patch of [
  {campusId:undefined},{campusId:null},{schoolCode:undefined},
  {schoolCode:'118'},{campusId:'043907117'},
  {gradeLevel:'middle'},{sourceYearConfirmed:false},
  {schoolYear:'2025–26'}, {school:'JUDY RUCKER EL'}
 ]) assert.equal(run([sample(patch)]).kind,'unavailable',JSON.stringify(patch));
});
test('swapped school names or grade labels are rejected across the entire official catalog',()=>{
 for(const f of source.features){
  const other=source.features.find(x=>x.properties.gradeLevel===f.properties.gradeLevel&&
   x.properties.schoolCode!==f.properties.schoolCode);
  assert.ok(other);
  const swapped={...f,properties:{...f.properties,school:other.properties.school}};
  assert.equal(run([swapped]).kind,'unavailable',f.properties.campusId);
  const otherGrade=f.properties.gradeLevel==='middle'?'high':'middle';
  const wrongGrade={...f,properties:{...f.properties,gradeLevel:otherGrade}};
  assert.equal(run([wrongGrade]).kind,'unavailable',f.properties.campusId);
 }
});
test('capacity warning must never be attached to a different campus despite a valid ID syntax',()=>{
 const spoof=sample({school:'JUDY RUCKER EL'});
 const invalid=run([spoof]);
 assert.equal(invalid.kind,'unavailable');
 assert.deepEqual(invalid.candidates,[]);
 assert.equal(invalid.capacityNoticeUrl,undefined);
 assert.equal(run([sample()]).capacityNoticeUrl,
  'https://www.prosper-isd.net/page/closed-to-enrollment');
});
