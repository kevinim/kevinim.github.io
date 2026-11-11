'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const batch=require('../data/tea-allen-mckinney-campus-qa-2026.json');
const catalog=require('../tea-ratings-2026.json').data;
const categories=['black','hispanic','white','native','asian','pacific','multi'];
const ids=Object.keys(batch.campuses);
test('Allen 23 and McKinney 33 are exactly the current catalog ID set',()=>{
 const expected=catalog.filter(r=>/^04390(?:1|7)\\d{3}$/.test(r.id)).map(r=>r.id).sort();
 assert.equal(ids.length,56);assert.deepEqual(ids,expected);
 assert.equal(ids.filter(id=>id.startsWith('043901')).length,23);
 assert.equal(ids.filter(id=>id.startsWith('043907')).length,33);
});
test('2025-26 PEIMS official published, suppressed, unlisted cells are mutually exclusive',()=>{
 const tally={published:0,suppressed:0,'not-listed':0};let full=0;
 for(const [id,c] of Object.entries(batch.campuses)){
  assert.match(id,/^\\d{9}$/);assert.equal(c.districtId,id.slice(0,6));
  assert.equal(c.peims.schoolYear,'2025-26');assert.equal(c.peims.enrollment,null);
  assert.equal(c.peims.percentages,null);assert.equal(new URL(c.peims.source).hostname,'rptsvr1.tea.texas.gov');
  assert.deepEqual(Object.keys(c.peims.counts).sort(),[...categories].sort());
  const cells=Object.values(c.peims.counts);
  if(cells.every(v=>v.status==='published'))full++;
  for(const v of cells){
   assert.ok(Object.hasOwn(tally,v.status),'unknown state '+v.status);tally[v.status]++;
   if(v.status==='published'){assert.ok(Number.isSafeInteger(v.count)&&v.count>=0);assert.equal(v.publishedMask,undefined)}
   if(v.status==='suppressed'){assert.match(v.publishedMask,/^<\\d+$/);assert.equal(v.count,undefined)}
   if(v.status==='not-listed'){assert.equal(v.count,undefined);assert.equal(v.publishedMask,undefined)}
  }
 }
 assert.deepEqual(tally,{published:240,suppressed:102,'not-listed':50});
 assert.equal(full,batch.summary.sevenPublishedCampuses);
 assert.equal(batch.summary.sourceCampuses,56);
});
test('ratings remain catalog-only and cannot be misrepresented as 2026 source-audited domains',()=>{
 const map=new Map(catalog.map(r=>[r.id,r]));
 let notRated=0;
 for(const [id,c] of Object.entries(batch.campuses)){
  const old=map.get(id);assert.ok(old);
  assert.equal(c.accountability.year,2026);
  assert.equal(c.accountability.rating,old.rating);
  assert.equal(c.accountability.score,old.score);
  assert.equal(c.accountability.verification,'existing-catalog-not-independently-rechecked');
  if(c.accountability.rating==='Not Rated')notRated++;
  assert.equal(c.domains.status,'source-not-yet-verified');assert.equal(c.staar.status,'source-not-yet-verified');
  assert.equal(c.analysis.status,'awaiting-verified-component-and-staar-scores');
  assert.deepEqual(c.analysis.strengths,[]);assert.deepEqual(c.analysis.improvementAreas,[]);
 }
 assert.equal(notRated,4);assert.equal(batch.summary.fullyAuditedProfiles,0);
});
test('source sentinel rows match the public TEA aggregate CSV',()=>{
 assert.equal(batch.campuses['043901001'].peims.counts.asian.count,1426);
 assert.equal(batch.campuses['043901001'].peims.counts.white.count,1900);
 assert.equal(batch.campuses['043907118'].peims.counts.hispanic.count,232);
 assert.equal(batch.campuses['043907118'].peims.counts.native.status,'suppressed');
});
