'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const audit=require('../data/tea-peims-2025-26-gender-parity-audit-1343.json');
const inventory=require('../tea-ratings-2026.json').data;
const other=require('../data/tea-peims-2025-26-enrollment-total-audit-allen-mckinney.json');
const allowed=new Set(inventory.map(x=>x.id));
const FIVE={'043901001':5127,'057912046':753,'057912123':756,'061911001':2806,'061911007':2997};
test('official gender aggregation covers exactly 1,343 real same-year campus IDs and 23 districts',()=>{
 assert.equal(audit.schoolYear,'2025-26');
 assert.equal(audit.ethnicitySourceReview.headBlobSha,'0ee23f207fb217875f695d08230a4b02c5f9cdc8');
 const entries=Object.entries(audit.campuses);
 assert.equal(entries.length,1343);
 assert.equal(Object.keys(audit.genderSourceUrls).length,23);
 for(const [id,c] of entries){
  assert.match(id,/^\d{9}$/);assert.ok(allowed.has(id));
  assert.equal(c.districtId,id.slice(0,6));
  assert.ok(Object.hasOwn(audit.genderSourceUrls,c.districtId));
  assert.ok(audit.genderSourceUrls[c.districtId].startsWith('https://rptsvr1.tea.texas.gov/cgi/sas/broker?'));
  assert.ok(audit.genderSourceUrls[c.districtId].includes('key='+c.districtId));
  assert.ok(audit.genderSourceUrls[c.districtId].includes('grouping=s'));
  assert.ok(audit.genderSourceUrls[c.districtId].includes('endyear=26'));
 }
});
test('public total vs privacy-protected total status is complete, no protected denominator copied',()=>{
 let pub=0,masked=0,full=0,eligible=0;
 for(const [id,c] of Object.entries(audit.campuses)){
  assert.ok(['published','suppressed'].includes(c.genderEnrollmentStatus));
  assert.ok(['all-published','incomplete-protected'].includes(c.ethnicitySevenGroupsStatus));
  if(c.genderEnrollmentStatus==='published')pub++;else masked++;
  if(c.ethnicitySevenGroupsStatus==='all-published')full++;
  if(c.verifiedFullShareEligible){
   eligible++;
   assert.equal(c.genderEnrollmentStatus,'published');
   assert.equal(c.ethnicitySevenGroupsStatus,'all-published');
   assert.equal(c.verifiedPeimsEnrollment,FIVE[id]);
   assert.ok(Number.isSafeInteger(c.verifiedPeimsEnrollment));
  }else{
   assert.equal(Object.hasOwn(c,'verifiedPeimsEnrollment'),false,
    'must not leak denominator for masked/incomplete ethnicity '+id);
  }
 }
 assert.deepEqual({pub,masked,full,eligible},{pub:1259,masked:84,full:5,eligible:5});
 assert.equal(audit.summary.ethnicityStatusCellsIndependentlyMatched,9401);
 assert.equal(audit.summary.sourceCountMismatches,0);
 assert.equal(audit.summary.sourceKnownRaceExceedsGenderTotal,0);
});
test('Allen High 2025-26 TEA PEIMS gender total matches all seven race counts, but different product total remains flagged',()=>{
 assert.equal(audit.campuses['043901001'].verifiedPeimsEnrollment,5127);
 assert.equal(other.campuses['043901001'].officialEnrollment,5126);
 assert.equal(other.campuses['043901001'].reconciliationStatus,'public-group-sum-exceeds-total');
 assert.equal(audit.summary.fullyPublishedAndGenderReconciled,5);
});
test('denominator QA keeps masking, student PII and derived suppressed values out of public artifact',()=>{
 const s=JSON.stringify(audit);
 for(const key of ['first_name','last_name','date_of_birth','student_id','estimatedSuppressedCount','maskedDifference'])assert.equal(s.includes('"'+key+'"'),false);
 assert.ok(audit.privacyPolicy.includes('never derive suppressed counts'));
});
