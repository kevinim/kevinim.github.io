'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const batch=require('../data/tea-allen-mckinney-campus-qa-2026.json');
const catalog=require('../tea-ratings-2026.json').data;
const categories=['black','hispanic','white','native','asian','pacific','multi'];
const ids=Object.keys(batch.campuses);
test('Allen 23 and McKinney 33 are exactly the current catalog ID set',()=>{
 const expected=catalog.filter(r=>/^04390(?:1|7)\d{3}$/.test(r.id)).map(r=>r.id).sort();
 assert.equal(ids.length,56);assert.deepEqual(ids,expected);
 assert.equal(ids.filter(id=>id.startsWith('043901')).length,23);
 assert.equal(ids.filter(id=>id.startsWith('043907')).length,33);
});
test('2025-26 PEIMS official published, suppressed, unlisted cells are mutually exclusive',()=>{
 const tally={published:0,suppressed:0,'not-listed':0};let full=0;
 for(const [id,c] of Object.entries(batch.campuses)){
  assert.match(id,/^\d{9}$/);assert.equal(c.districtId,id.slice(0,6));
  assert.equal(c.peims.schoolYear,'2025-26');assert.equal(c.peims.enrollment,null);
  assert.equal(c.peims.percentages,null);assert.equal(new URL(c.peims.source).hostname,'rptsvr1.tea.texas.gov');
  assert.deepEqual(Object.keys(c.peims.counts).sort(),[...categories].sort());
  const cells=Object.values(c.peims.counts);
  if(cells.every(v=>v.status==='published'))full++;
  for(const v of cells){
   assert.ok(Object.hasOwn(tally,v.status),'unknown state '+v.status);tally[v.status]++;
   if(v.status==='published'){assert.ok(Number.isSafeInteger(v.count)&&v.count>=0);assert.equal(v.publishedMask,undefined)}
   if(v.status==='suppressed'){assert.match(v.publishedMask,/^<\d+$/);assert.equal(v.count,undefined)}
   if(v.status==='not-listed'){assert.equal(v.count,undefined);assert.equal(v.publishedMask,undefined)}
  }
 }
 assert.deepEqual(tally,{published:240,suppressed:102,'not-listed':50});
 assert.equal(full,batch.summary.sevenPublishedCampuses);
 assert.equal(batch.summary.sourceCampuses,56);
});
test('2026 official campus summary and STAAR source audits only apply to independently checked campuses',()=>{
 const catalogMap=new Map(catalog.map(r=>[r.id,r]));
 const verified=new Set(['043901001','043907002']);
 let notRated=0,reviewed=0;
 for(const [id,c] of Object.entries(batch.campuses)){
  const old=catalogMap.get(id);assert.ok(old);
  assert.equal(c.accountability.year,2026);
  assert.equal(c.accountability.rating,old.rating);
  assert.equal(c.accountability.score,old.score);
  if(c.accountability.rating==='Not Rated')notRated++;
  if(verified.has(id)){
   reviewed++;
   assert.equal(c.accountability.verification,'2026-official-campus-summary-source-crosschecked');
   assert.equal(c.domains.status,'official-verified');
   assert.equal(c.domains.year,2026);
   assert.equal(c.domains.scoreType,'official-scaled-accountability-domain-scores');
   assert.equal(c.staar.status,'official-verified');
   assert.equal(c.staar.year,2026);
   assert.equal(c.staar.metric,'All Students — percent of tests at Meets Grade Level standard or above');
   assert.equal(c.analysis.status,'score-backed-noncausal');
   for(const [subject,value] of Object.entries(c.staar)){
    if(['reading','math','science','socialStudies'].includes(subject))assert.ok(Number.isInteger(value)&&value>=0&&value<=100);
   }
   for(const url of [c.accountability.source,c.domains.source,c.staar.source]){
    const parsed=new URL(url);
    assert.equal(parsed.hostname,'rptsvr1.tea.texas.gov');
    assert.equal(parsed.searchParams.get('id'),id);
    assert.equal(parsed.searchParams.get('ccyy'),'2026');
   }
  }else{
   assert.equal(c.accountability.verification,'existing-catalog-not-independently-rechecked');
   assert.equal(c.domains.status,'source-not-yet-verified');
   assert.equal(c.staar.status,'source-not-yet-verified');
   assert.equal(c.analysis.status,'awaiting-verified-component-and-staar-scores');
   assert.deepEqual(c.analysis.strengths,[]);
   assert.deepEqual(c.analysis.improvementAreas,[]);
  }
 }
 assert.equal(notRated,4);
 assert.equal(reviewed,2);
 assert.equal(batch.summary.newlyAcademicSourceVerified,2);
 assert.equal(batch.summary.awaiting2026ComponentsAndStaar,54);
 assert.equal(batch.summary.fullyAuditedProfiles,0);
});
test('crosschecked scaled domains and exact all-student Meets rates match official 2026 campus reports',()=>{
 const a=batch.campuses['043901001'],m=batch.campuses['043907002'];
 assert.deepEqual([a.domains.studentAchievement,a.domains.schoolProgress,a.domains.closingTheGaps,a.domains.closingTheGapsUnscaledComponent],[88,80,93,81]);
 assert.deepEqual([a.staar.reading,a.staar.math,a.staar.science,a.staar.socialStudies],[75,85,43,86]);
 assert.deepEqual([m.domains.studentAchievement,m.domains.schoolProgress,m.domains.closingTheGaps,m.domains.closingTheGapsUnscaledComponent],[93,91,94,85]);
 assert.deepEqual([m.staar.reading,m.staar.math,m.staar.science,m.staar.socialStudies],[61,58,72,73]);
 assert.match(a.analysis.strengths[0],/Social Studies: 86%/);
 assert.match(a.analysis.improvementAreas[0],/Science: 43%/);
 assert.match(m.analysis.strengths[0],/Social Studies: 73%/);
 assert.match(m.analysis.improvementAreas[0],/Mathematics: 58%/);
});
test('source sentinel rows match the public TEA aggregate CSV',()=>{
 assert.equal(batch.campuses['043901001'].peims.counts.asian.count,1426);
 assert.equal(batch.campuses['043901001'].peims.counts.white.count,1900);
 assert.equal(batch.campuses['043907118'].peims.counts.hispanic.count,232);
 assert.equal(batch.campuses['043907118'].peims.counts.native.status,'suppressed');
});
