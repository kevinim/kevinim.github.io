'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const inventory=require('../tea-ratings-2026.json').data;
const ledger=require('../data/tea-cfb-lisd-campus-qa-ledger-2026.json');
const TARGET=new Set(['CFB','LISD']);
const RACES=['black','hispanic','white','native','asian','pacific','multi'];
const ACADEMIC=['studentAchievement','schoolProgress','closingTheGaps','reading','mathematics','science','socialStudies'];
const records=inventory.filter(c=>TARGET.has(c.district));
const validTEA=(value)=>{try{const u=new URL(value);return u.protocol==='https:'&&['rptsvr1.tea.texas.gov','tea.texas.gov','txschools.gov'].includes(u.hostname);}catch{return false;}};
test('CFB 35 + Lewisville 57 campus IDs match current inventory exactly',()=>{
 assert.equal(ledger.schemaVersion,1);
 assert.equal(ledger.accountabilityYear,2026);
 assert.equal(ledger.peimsSchoolYear,'2025-26');
 assert.equal(records.length,92);
 assert.equal(records.filter(c=>c.district==='CFB').length,35);
 assert.equal(records.filter(c=>c.district==='LISD').length,57);
 assert.deepEqual(Object.keys(ledger.campuses).sort(),records.map(c=>c.id).sort());
 assert.equal(new Set(records.map(c=>c.id)).size,92);
 const lookup=new Map(records.map(c=>[c.id,c]));
 for(const [id,row] of Object.entries(ledger.campuses)){
  const source=lookup.get(id);
  assert.match(id,/^\\d{9}$/);
  assert.ok(source);
  assert.equal(row.district,source.district);
  assert.equal(row.campusName,source.officialName||source.name);
  assert.equal(row.accountabilityRating2026,source.rating);
  assert.ok(validTEA(row.officialProfile));
  assert.equal(new URL(row.officialProfile).searchParams.get('id'),id);
  assert.equal(id.slice(0,6),row.district==='CFB'?'057903':'061902');
 }
});
test('92 academic records are explicitly unverified until original 2026 exports are checked',()=>{
 const d=ledger.summary;
 assert.equal(d.accountabilityRated,88);
 assert.equal(d.accountabilityNotRated,4);
 assert.equal(d.independentlyVerified2026AcademicDomains,0);
 assert.equal(d.independentlyVerified2026STAARSubjects,0);
 assert.equal(d.newlyWrittenMetricBasedNarratives,0);
 assert.equal(d.fullyVerifiedAcademicAndDemographicCampuses,0);
 assert.ok(validTEA(ledger.provenance.teAAccountabilityDownloads));
 for(const campus of Object.values(ledger.campuses)){
  assert.equal(campus.academic2026.status,'not-independently-verified');
  assert.deepEqual(Object.keys(campus.academic2026.domainAndSubjectScores).sort(),ACADEMIC.slice().sort());
  for(const value of Object.values(campus.academic2026.domainAndSubjectScores))assert.equal(value,null,'no grade-to-domain inference');
  assert.equal(campus.academic2026.officialComponentSourceRow,null);
  assert.equal(campus.academic2026.officialSTAARSourceRow,null);
  assert.equal(campus.academic2026.analysisGenerated,false);
  assert.equal(campus.residenceAssignmentReviewed,false);
 }
});
test('PR #232 campus joins were audited without republishing or guessing protected counts',()=>{
 const totals={published:0,suppressed:0,unlisted:0};let matched=0,complete=0;
 for(const campus of Object.values(ledger.campuses)){
  const e=campus.peims2025_26;
  assert.equal(e.idJoinToStagedPR232,'matched');matched++;
  assert.equal(e.studentEnrollmentTotal,null);
  assert.equal(e.enrollmentTotalSourceVerified,false);
  assert.equal(e.rawTEAExportCrosscheck,'pending');
  assert.equal(e.publishedGroupCells+e.suppressedGroupCells+e.unlistedGroupCells,7);
  totals.published+=e.publishedGroupCells;
  totals.suppressed+=e.suppressedGroupCells;
  totals.unlisted+=e.unlistedGroupCells;
  if(e.publishedGroupCells===7)complete++;
 }
 assert.equal(matched,92);
 assert.deepEqual(totals,{published:393,suppressed:180,unlisted:71});
 assert.equal(complete,0);
 assert.equal(ledger.summary.independentlyCrosscheckedPEIMSSourceRows,0);
 assert.equal(ledger.summary.independentlyVerifiedEnrollmentTotals,0);
 assert.equal(ledger.summary.peimsCompleteSevenGroupCampuses,0);
 assert.ok(validTEA(ledger.provenance.teAPEIMSCFB));
 assert.ok(validTEA(ledger.provenance.teAPEIMSLewisville));
});
test('when PR #232 lands, independent cohort audit must match actual staged status cells',t=>{
 const file=path.join(__dirname,'../data/tea-ethnicity-2025-26-priority.json');
 if(!fs.existsSync(file)){t.diagnostic('PR #232 staged file not yet on this independent main-based branch; crosscheck pending merge');return;}
 const source=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(source.schoolYear,'2025-26');
 assert.deepEqual(Object.keys(source.campuses).sort(),Object.keys(ledger.campuses).sort());
 for(const [id,row] of Object.entries(ledger.campuses)){
  const actual=source.campuses[id];
  assert.equal(actual.district,row.district);
  const status={published:0,suppressed:0,'not-listed':0};
  for(const key of RACES){
   const c=actual.counts[key];assert.ok(c);
   assert.ok(Object.hasOwn(status,c.status));
   status[c.status]++;
   if(c.status==='published'){assert.ok(Number.isSafeInteger(c.count)&&c.count>=0);assert.equal(Object.hasOwn(c,'publishedMask'),false);}
   else {assert.equal(Object.hasOwn(c,'count'),false);}
  }
  assert.deepEqual([status.published,status.suppressed,status['not-listed']],[row.peims2025_26.publishedGroupCells,row.peims2025_26.suppressedGroupCells,row.peims2025_26.unlistedGroupCells]);
 }
});
