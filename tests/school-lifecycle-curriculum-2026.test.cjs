'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {isRetiredCampus,RETIRED_CAMPUSES_2026}=require('../school-lifecycle.js');
const transitions=JSON.parse(fs.readFileSync('data/dfw-noncfb-campus-transition-evidence-2026.json','utf8')).entries;
const tea=JSON.parse(fs.readFileSync('tea-ratings-2026.json','utf8')).data;
test('2026–27 repurposed and consolidated TEA campuses are omitted from active school markers',()=>{
 const retired=transitions.filter(x=>x.presentInTea2026Snapshot&&x.regularAssignmentCampus2026_27===false);
 assert.equal(retired.length,3);
 for(const entry of retired){
  const rating=tea.find(r=>r.id===entry.campusId);
  assert.ok(rating,entry.campusId);
  assert.equal(rating.name,entry.schoolNameFromTEA);
  assert.equal(isRetiredCampus({...rating,district:entry.districtCode}),true,entry.schoolNameFromTEA);
  const lifecycle=RETIRED_CAMPUSES_2026.find(x=>x.id===entry.campusId&&x.district===entry.districtCode);
  assert.ok(lifecycle,entry.campusId);
  assert.equal(lifecycle.retiredFrom,'2026-27');
  assert.equal(lifecycle.source,entry.source);
 }
});
test('friendly school labels and machine TEA IDs both retire, without hiding unrelated districts',()=>{
 for(const [district,id,short,friendly] of [
 ['061901','061901120','PALOMA CREEK EL','Paloma Creek Elementary'],
 ['220906','220906103','DOVE EL','Dove Elementary'],
 ['220906','220906108','BRANSFORD EL','Bransford Elementary']
 ]){
  assert.equal(isRetiredCampus({district,name:short}),true);
  assert.equal(isRetiredCampus({district,name:friendly}),true);
  assert.equal(isRetiredCampus({district,id,name:'wrong-campus-name'}),true);
  assert.equal(isRetiredCampus({district:'043905',name:friendly}),false);
 }
});
test('2027–28 Durham closure is future only; do not erase 2026–27 active campus',()=>{
 const durham=transitions.find(x=>x.campusId==='220919106');
 assert.ok(durham);
 assert.equal(durham.effectiveAcademicYear,'2027-28');
 assert.equal(durham.regularAssignmentCampus2026_27,true);
 assert.equal(isRetiredCampus({district:'220919',id:durham.campusId,name:durham.schoolNameFromTEA}),false);
 assert.equal(isRetiredCampus({district:'220919',name:'Durham Intermediate School'}),false);
 assert.equal(isRetiredCampus({district:'220919',id:'220919102',name:'CARROLL EL'}),false);
});
