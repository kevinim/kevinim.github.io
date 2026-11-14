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

test('McKinney 2026–27 repurposed schools have historical TEA ratings but no active-school pins',()=>{
 const ids=['043907113','043907117','043907116'];
 const official='https://www.mckinneyisd.net/article/2532090';
 const knownNames=['C T EDDINS EL','ARTHUR H MCNEIL EL','EARL & LOTTIE WOLFORD EL'];
 for(let i=0;i<ids.length;i++){
  const rec=tea.find(r=>r.id===ids[i]&&r.district==='043907');
  assert.ok(rec,'McKinney official TEA campus '+ids[i]+' should exist');
  assert.ok(['A','C'].includes(rec.rating));
  assert.equal(isRetiredCampus(rec),true,'Historical 2026 TEA snapshot cannot become active marker');
  assert.equal(isRetiredCampus({district:'043907',name:knownNames[i]}),true);
  const row=RETIRED_CAMPUSES_2026.find(x=>x.id===ids[i]);
  assert.ok(row);
  assert.equal(row.source,official);
  assert.equal(row.retiredFrom,'2026-27');
 }
 assert.equal(isRetiredCampus({district:'043907',name:'ROY LEE WALKER EL',id:'043907115'}),false,
  'Currently zoned A-rated Walker must not be hidden');
 assert.equal(isRetiredCampus({district:'043907',name:'DEAN AND MILDRED BENNETT EL',id:'043907120'}),false);
 assert.equal(isRetiredCampus({district:'043905',name:'Wolford Elementary'}),false);
});
