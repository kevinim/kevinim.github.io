'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const audit=require('../data/tea-peims-2025-26-statewide-parity-audit-2282.json');
const inventory=require('../tea-ratings-2026.json').data;
const earlier=require('../data/tea-peims-2025-26-gender-parity-audit-1343.json');
const crossProduct=require('../data/tea-peims-2025-26-enrollment-total-audit-allen-mckinney.json');
const full={'220912002':3033,'043901001':5127,'057912046':753,'057912123':756,'061911001':2806,'061911007':2997};
test('statewide 2025-26 source reconciliation pins scope and exact public publisher URLs',()=>{
 assert.equal(audit.schoolYear,'2025-26');
 assert.equal(audit.reviewedUpstream.prNumber,245);
 assert.equal(audit.reviewedUpstream.headBlobSha,'10166ec14ff1458377aa68c1419d95435da1d28c');
 for(const [group,url] of Object.entries(audit.sourceUrls)){
  assert.ok(['statewideEthnicityCsv','statewideGenderCsv'].includes(group));
  const src=new URL(url);
  assert.equal(src.protocol,'https:');
  assert.equal(src.hostname,'rptsvr1.tea.texas.gov');
  assert.equal(src.pathname,'/cgi/sas/broker');
  assert.equal(src.searchParams.get('_program'),'adhoc.addispatch.sas');
  assert.equal(src.searchParams.get('endyear'),'26');
  assert.equal(src.searchParams.get('selsumm'),'sc');
  assert.equal(src.searchParams.get('format'),'c');
  assert.equal(src.searchParams.get('grouping'),group==='statewideEthnicityCsv'?'e':'s');
 }
 assert.deepEqual(
  {raceRows:audit.summary.officialStatewideEthnicityRows,genderRows:audit.summary.officialStatewideGenderRows},
  {raceRows:48971,genderRows:18021}
 );
});
test('all 2,282 dashboard inventory campuses have status-only gender parity results',()=>{
 const ids=new Set(inventory.map(x=>x.id));
 assert.equal(ids.size,2282);
 const entries=Object.entries(audit.campuses);
 assert.equal(entries.length,ids.size);
 const districts=new Set();
 let pub=0,masked=0,verified=0;
 for(const [id,c] of entries){
  assert.match(id,/^\d{9}$/);
  assert.ok(ids.has(id),id);
  districts.add(id.slice(0,6));
  assert.ok(['both-public','one-or-more-protected'].includes(c.genderSourceStatus));
  assert.ok(['full-seven-verified','partial-counts-only'].includes(c.raceShareStatus));
  pub+=Number(c.genderSourceStatus==='both-public');
  masked+=Number(c.genderSourceStatus==='one-or-more-protected');
  if(c.raceShareStatus==='full-seven-verified'){
    verified++;
    assert.equal(c.genderSourceStatus,'both-public');
    assert.equal(c.officialPeimsEnrollment,full[id]);
  }else{
    assert.equal(Object.hasOwn(c,'officialPeimsEnrollment'),false,
     'partial ethnicity rows must not carry a denominator that facilitates masking reversal: '+id);
  }
 }
 assert.equal(districts.size,181);
 assert.deepEqual({pub,masked,verified},{pub:2126,masked:156,verified:6});
 assert.equal(audit.summary.officialEthnicityRowsForInventory,13418);
 assert.equal(audit.summary.officialGenderRowsForInventory,4521);
 assert.equal(audit.summary.totalInventoryCampuses,2282);
 assert.equal(audit.summary.distinctCampusDistricts,181);
});
test('official public source parity has 15,974 cells and preserves all FERPA protection states',()=>{
 assert.deepEqual({
  slots:audit.summary.raceSlots,
  public:audit.summary.exactPublishedRaceCells,
  masked:audit.summary.suppressedRaceCells,
  omitted:audit.summary.notListedRaceCells,
  matched:audit.summary.exactRawRaceCellMatches,
  mismatch:audit.summary.rawRaceCellMismatches,
  duplicates:audit.summary.duplicateOfficialGroupRows,
  missingRace:audit.summary.missingRaceCampusRows,
  missingGender:audit.summary.missingGenderCampusRows,
  exceeds:audit.summary.knownPublishedRaceSumExceedsPublicGenderTotal
 },{slots:15974,public:8277,masked:5141,omitted:2556,matched:15974,
    mismatch:0,duplicates:0,missingRace:0,missingGender:0,exceeds:0});
 assert.equal(audit.summary.allSevenRaceGroupsPublished,6);
 assert.equal(audit.summary.fullShareGenderReconciled,6);
 assert.equal(audit.summary.genderTotalExact,2126);
 assert.equal(audit.summary.genderTotalProtected,156);
});
test('six fully published campuses exactly reconcile to PEIMS gender, with Allen cross-product warning intact',()=>{
 assert.equal(audit.allSevenVerifiedCampuses.length,6);
 const six=new Set();
 for(const row of audit.allSevenVerifiedCampuses){
  assert.match(row.campusId,/^\d{9}$/);
  assert.equal(row.officialPeimsEnrollment,full[row.campusId]);
  assert.equal(audit.campuses[row.campusId].raceShareStatus,'full-seven-verified');
  assert.ok(!six.has(row.campusId));
  six.add(row.campusId);
 }
 assert.equal(audit.campuses['043901001'].officialPeimsEnrollment,5127);
 assert.equal(crossProduct.campuses['043901001'].officialEnrollment,5126);
 for(const [id,c] of Object.entries(earlier.campuses)){
  assert.equal(audit.campuses[id].genderSourceStatus,c.genderEnrollmentStatus==='published'?'both-public':'one-or-more-protected');
  if(c.verifiedFullShareEligible)assert.equal(audit.campuses[id].officialPeimsEnrollment,c.verifiedPeimsEnrollment);
 }
});
test('manifest contains no protected-category inferred counts, student PII or hidden denominators',()=>{
 const s=JSON.stringify(audit);
 for(const forbidden of ['student_id','first_name','last_name','date_of_birth','estimatedSuppressedCount','suppressedCountEstimate']) {
  assert.equal(s.includes('"'+forbidden+'"'),false);
 }
 assert.match(audit.privacyPolicy,/never infer masked counts/);
 assert.equal(audit.allSevenVerifiedCampuses.length,6);
});
