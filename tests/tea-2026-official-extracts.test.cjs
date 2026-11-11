'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validate,load}=require('../scripts/verify-tea-2026-extracts.cjs');
const {domain,staar,ratings}=load();
const sample='043901001'; // Public TEA campus ID; this is not a student record.
function check(d=domain,s=staar,r=ratings){return validate(d,s,r);}
test('2,282 public 2026 campus ratings join full official source, with separate domain Not Rated',()=>{
  const c=check();assert.equal(c.inventory,2282);assert.equal(c.accountabilityRows,9105);assert.equal(c.accountabilityJoined,2282);
  assert.deepEqual(domain.coverage.domain.studentAchievement,{reported:2101,notRated:181,suppressed:0,unavailable:0});
  assert.deepEqual(domain.coverage.domain.schoolProgress,{reported:2082,notRated:200,suppressed:0,unavailable:0});
  assert.deepEqual(domain.coverage.domain.closingTheGaps,{reported:2063,notRated:219,suppressed:0,unavailable:0});
  assert.equal(domain.coverage.outOfScope,6823);assert.equal(domain.coverage.missingInventory,0);
});
test('official STAAR subjects are exact All Students Meets rates, not manufactured completions',()=>{
  const c=check();assert.equal(c.staarSourceRows,8569);
  const expect={reading:[2103,39,30,110],math:[2079,55,38,110],science:[1931,50,191,110],socialStudies:[840,34,1298,110]};
  for(const [subject,nums] of Object.entries(expect)){
    const s=c.staar[subject];assert.deepEqual([s.reported,s.suppressed,s.unavailable,s.notInSource],nums);
    assert.equal(nums.reduce((a,b)=>a+b,0),2282);
  }
  assert.equal(staar.source.groups.D1_STAAR1.matchedInventory,2172);
  assert.equal(staar.source.groups.D1_STAAR2.matchedInventory,2172);
  assert.equal(staar.source.groups.D1_STAAR3.matchedInventory,2172);
  assert.equal(staar.schoolYear,'2025-26');
});
test('individual campus values and exact 9-digit joins have no borough or ZIP inferred replacements',()=>{
  check();
  const x=domain.campuses[sample],y=staar.campuses[sample];
  assert.equal(x.districtId,sample.slice(0,6));
  assert.ok(x.studentAchievement.score>=0&&x.studentAchievement.score<=100);
  assert.equal(y.reading.value,75);assert.equal(y.math.value,85);
  assert.equal(y.science.value,43);assert.equal(y.socialStudies.value,86);
  assert.equal(domain.source.sourceColumns.studentAchievementScore,'CD1S');
  assert.equal(domain.source.sourceColumns.schoolProgressScore,'CD2S');
  assert.equal(domain.source.sourceColumns.closingTheGapsScore,'CD3S');
  assert.equal(staar.source.fieldMap.reading.rateVariable,'CDA00AR01226R');
});
test('unknown and lost campus IDs cannot masquerade as matched records',()=>{
  const d=structuredClone(domain);delete d.campuses[sample];assert.throws(()=>check(d),/not fully joined/);
  const s=structuredClone(staar);s.campuses['999999999']={...s.campuses[sample]};assert.throws(()=>check(domain,s),/not fully joined/);
  const mismatch=structuredClone(domain);mismatch.campuses[sample].districtId='000000';assert.throws(()=>check(mismatch),/identity failure/);
});
test('suppression, score validity and Not Rated semantics fail closed',()=>{
  const s=structuredClone(staar);const masked=Object.keys(s.campuses).find(id=>s.campuses[id].reading.status==='suppressed');
  assert.ok(masked);
  s.campuses[masked].reading.value=0;assert.throws(()=>check(domain,s),/remain null/);
  const s2=structuredClone(staar);s2.campuses[masked].reading.sourceMarker='-999';assert.throws(()=>check(domain,s2),/Suppression marker/);
  const d=structuredClone(domain);d.campuses[sample].studentAchievement.score=101;assert.throws(()=>check(d),/Invalid scaled score/);
  const nd=structuredClone(domain);const unrated=Object.keys(nd.campuses).find(id=>nd.campuses[id].schoolProgress.status==='not-rated');
  assert.ok(unrated);nd.campuses[unrated].schoolProgress.score=0;assert.throws(()=>check(nd),/must be null/);
});
test('reject tampered year, non-TEA URLs, mislabelled variables and coverage',()=>{
  const d=structuredClone(domain);d.schoolYear='2024-25';assert.throws(()=>check(d),/Wrong tested school year/);
  const bad=structuredClone(domain);bad.source.url=bad.source.url.replace('rptsvr1.tea.texas.gov','tea.texas.gov.evil.example');
  assert.throws(()=>check(bad),/Non-official/);
  const s=structuredClone(staar);s.source.fieldMap.math.rateVariable='fakeRate';assert.throws(()=>check(domain,s),/mapping mismatch/);
  const s2=structuredClone(staar);s2.coverage.socialStudies.unavailable++;assert.throws(()=>check(domain,s2),/coverage mismatch/);
});
test('the two official data batches contain campus aggregates only, and no PII',()=>{
  const str=JSON.stringify({domain,staar}).toLowerCase();
  for(const forbidden of ['student_id','student name','first_name','last_name','date_of_birth','social_security_number','ssn','home_address'])
    assert.equal(str.includes(forbidden),false,'Prohibited student-level field: '+forbidden);
  assert.deepEqual(Object.keys(domain.campuses).sort(),Object.keys(staar.campuses).sort());
  assert.equal(domain.retrievedDate,'2026-11-11');
  assert.equal(staar.retrievedDate,'2026-11-11');
});
