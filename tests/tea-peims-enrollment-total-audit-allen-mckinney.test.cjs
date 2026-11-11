'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const audit=require('../data/tea-peims-2025-26-enrollment-total-audit-allen-mckinney.json');
const inventory=require('../tea-ratings-2026.json').data;
const ids=new Set(inventory.filter(x=>['043901','043907'].includes(x.id.slice(0,6))).map(x=>x.id));
test('official 2025-26 source cohort identities are exactly 56 real 9-digit campuses',()=>{
 const records=Object.entries(audit.campuses);
 assert.equal(records.length,56);assert.equal(ids.size,56);assert.equal(audit.year,'2025-26');
 assert.equal(records.filter(([id])=>id.startsWith('043901')).length,23);
 assert.equal(records.filter(([id])=>id.startsWith('043907')).length,33);
 for(const [id,c] of records){
  assert.match(id,/^\d{9}$/);assert.ok(ids.has(id));assert.equal(c.districtId,id.slice(0,6));
  assert.equal(c.schoolYear,'2025-26');assert.equal(c.ethnicitySourceUrl.includes('key='+c.districtId),true);
  assert.equal(c.ethnicitySourceUrl.includes('endyear=26'),true);
  assert.ok(c.ethnicitySourceUrl.startsWith('https://rptsvr1.tea.texas.gov/'));
  const x=c.publishedCellSummary;
  assert.equal(x.exactPublished+x.suppressed+x.notListed,7);
  assert.ok(Number.isSafeInteger(x.knownPublishedGroupSum)&&x.knownPublishedGroupSum>=0);
 }
});
test('independent total enrollment sources and arithmetic flags pass',()=>{
 let cells={published:0,suppressed:0,missing:0},enroll=0,unavailable=0,conflicts=0,seven=0,full=0;
 for(const [id,c] of Object.entries(audit.campuses)){
  const x=c.publishedCellSummary;cells.published+=x.exactPublished;cells.suppressed+=x.suppressed;cells.missing+=x.notListed;
  seven+=Number(c.allSevenGroupsPublic);full+=Number(c.verifiedSevenGroupShares);
  if(c.officialEnrollment===null){unavailable++;assert.equal(c.officialEnrollmentEvidence,null);assert.equal(c.reconciliationStatus,'total-unavailable');continue;}
  enroll++;assert.ok(Number.isSafeInteger(c.officialEnrollment)&&c.officialEnrollment>=0);
  assert.ok(c.officialEnrollmentEvidence.url.startsWith('https://'));
  assert.ok(c.officialEnrollmentEvidence.url.includes('id='+id));
  if(x.knownPublishedGroupSum>c.officialEnrollment){conflicts++;assert.equal(c.reconciliationStatus,'public-group-sum-exceeds-total');assert.equal(c.verifiedSevenGroupShares,false);}
  if(c.verifiedSevenGroupShares){assert.equal(x.exactPublished,7);assert.equal(x.knownPublishedGroupSum,c.officialEnrollment);}
 }
 assert.deepEqual(cells,{published:240,suppressed:102,missing:50});
 assert.equal(enroll,56);assert.equal(unavailable,0);assert.equal(enroll+unavailable,56);
 assert.equal(conflicts,8);assert.equal(seven,1);assert.equal(full,0);
 assert.equal(audit.summary.officialEnrollmentPublished,enroll);
 assert.equal(audit.summary.totalDisagreements,8);
});
test('Allen High is seven-category public but not enrollment-reconciled',()=>{
 const c=audit.campuses['043901001'];
 assert.equal(c.publishedCellSummary.exactPublished,7);
 assert.equal(c.publishedCellSummary.knownPublishedGroupSum,5127);
 assert.equal(c.officialEnrollment,5126);
 assert.equal(c.reconciliationStatus,'public-group-sum-exceeds-total');
 assert.equal(c.verifiedSevenGroupShares,false);
});
test('never infer individual student identity, suppressed totals or race shares',()=>{
 const blob=JSON.stringify(audit);
 for(const k of ['student_id','first_name','last_name','date_of_birth','estimated_masked_count','race_percentages'])assert.equal(blob.includes('"'+k+'"'),false);
 assert.equal(Object.values(audit.campuses).every(x=>!x.verifiedSevenGroupShares),true);
});
