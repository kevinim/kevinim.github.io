'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const inventory=require('../tea-ratings-2026.json').data;
const ledger=require('../data/tea-cfb-lisd-campus-qa-ledger-2026.json');
const academic=require('../data/tea-cfb-lisd-academic-2026-verified-batch01.json');
const TARGET=new Set(['CFB','LISD']);
const RACES=['black','hispanic','white','native','asian','pacific','multi'];
const ACADEMIC=['studentAchievement','schoolProgress','closingTheGaps','reading','math','science','socialStudies'];
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
  assert.match(id,/^\d{9}$/);
  assert.ok(source);
  assert.equal(row.district,source.district);
  assert.equal(row.campusName,source.officialName||source.name);
  assert.equal(row.accountabilityRating2026,source.rating);
  assert.ok(validTEA(row.officialProfile));
  assert.equal(new URL(row.officialProfile).searchParams.get('id'),id);
  assert.equal(id.slice(0,6),row.district==='CFB'?'057903':'061902');
 }
});
test('six official 2026 campus domain and STAAR reports are exact-ID linked; 86 remain missing',()=>{
 const d=ledger.summary;
 const all=ledger.campuses;
 const audited=academic.campuses;
 const ids=Object.keys(audited).sort();
 assert.equal(d.accountabilityRated,88);
 assert.equal(d.accountabilityNotRated,4);
 assert.equal(ids.length,6);
 assert.deepEqual(ids,['057903122','061902047','061902118','061902134','061902140','061902142']);
 assert.equal(d.independentlyVerified2026AcademicDomains,6);
 assert.equal(d.independentlyVerified2026STAARSubjects,6);
 assert.equal(d.newlyWrittenMetricBasedNarratives,3);
 assert.equal(d.fullyVerifiedAcademicAndDemographicCampuses,0);
 assert.equal(academic.accountabilityYear,2026);
 assert.equal(academic.summary.CFB,1);
 assert.equal(academic.summary.LISD,5);
 assert.equal(academic.summary.newIndependentMetricAnalyses,3);
 assert.ok(validTEA(ledger.provenance.teAAccountabilityDownloads));
 let valid=0,missing=0,narratives=0;
 for(const [id,campus] of Object.entries(all)){
  assert.equal(campus.residenceAssignmentReviewed,false);
  assert.deepEqual(Object.keys(campus.academic2026.domainAndSubjectScores).sort(),ACADEMIC.slice().sort());
  if(!Object.hasOwn(audited,id)){
    missing++;
    assert.equal(campus.academic2026.status,'not-independently-verified');
    for(const value of Object.values(campus.academic2026.domainAndSubjectScores))assert.equal(value,null,'no grade-to-domain inference');
    assert.equal(campus.academic2026.officialComponentSourceRow,null);
    assert.equal(campus.academic2026.officialSTAARSourceRow,null);
    assert.equal(campus.academic2026.analysisGenerated,false);
    continue;
  }
  valid++;
  const verified=audited[id];
  const scores=campus.academic2026.domainAndSubjectScores;
  assert.equal(campus.academic2026.status,'independently-verified-official-2026-report');
  assert.equal(campus.district,verified.district);
  assert.equal(campus.campusName,verified.campusName);
  assert.equal(campus.academic2026.officialComponentSourceRow,verified.officialSummaryReport);
  assert.equal(campus.academic2026.officialSTAARSourceRow,verified.officialSTAARReport);
  for(const [field,sourceValue] of Object.entries(verified.domainsScaledScores))assert.equal(scores[field],sourceValue);
  for(const [sourceField,ledgerField] of Object.entries({reading:'reading',math:'math',science:'science',socialStudies:'socialStudies'})){
    assert.equal(scores[ledgerField],verified.subjectsMeetsGradeLevel[sourceField].meetsPercentReported);
  }
  assert.equal(campus.academic2026.analysisGenerated,!!verified.newMetricAnalysis);
  if(verified.newMetricAnalysis)narratives++;
 }
 assert.equal(valid,6);assert.equal(missing,86);assert.equal(narratives,3);
});
test('official all-student subject counts and published percentages reconcile, no masking or PII inferred',()=>{
 const d=academic.campuses;
 const known={
  '057903122':{overall:91,domain:[93,92,85],reading:[195,150,77],math:[195,149,76],science:[58,27,47]},
  '061902118':{overall:79,domain:[82,73,73],reading:[356,230,65],math:[357,169,47],science:[121,49,40]},
  '061902140':{overall:76,domain:[73,78,72],reading:[221,125,57],math:[220,93,42],science:[85,26,31]},
  '061902142':{overall:74,domain:[76,70,70],reading:[394,221,56],math:[394,176,45],science:[137,47,34]},
  '061902134':{overall:89,domain:[92,86,83],reading:[266,220,83],math:[265,180,68],science:[94,48,51]},
  '061902047':{overall:91,domain:[91,85,91],reading:[900,675,75],math:[899,549,61],science:[276,179,65],socialStudies:[276,144,52]}
 };
 assert.deepEqual(Object.keys(d).sort(),Object.keys(known).sort());
 for(const [id,campus] of Object.entries(d)){
  const expected=known[id];
  assert.equal(campus.overallRatingScore,expected.overall);
  assert.deepEqual(Object.values(campus.domainsScaledScores),expected.domain);
  assert.equal(campus.accountabilityYear,2026);
  assert.equal(new URL(campus.officialSummaryReport).searchParams.get('ccyy'),'2026');
  for(const url of [campus.officialSummaryReport,campus.officialSTAARReport]){
   assert.ok(validTEA(url));
   assert.equal(new URL(url).searchParams.get('id'),id);
  }
  for(const [subject,datum] of Object.entries(campus.subjectsMeetsGradeLevel)){
   if(subject==='socialStudies'&&!expected.socialStudies){
    assert.equal(datum.status,'not-applicable');
    assert.equal(datum.meetsPercentReported,null);
    assert.equal(datum.totalTests,null);
    continue;
   }
   assert.equal(datum.status,'published');
   assert.deepEqual([datum.totalTests,datum.meetsTests,datum.meetsPercentReported],expected[subject]);
   assert.ok(datum.totalTests>0&&datum.meetsTests<=datum.totalTests);
   assert.ok(Math.abs(Math.round(100*datum.meetsTests/datum.totalTests)-datum.meetsPercentReported)<=1);
  }
 }
 const narratives=Object.entries(d).filter(([,v])=>v.newMetricAnalysis);
 assert.deepEqual(narratives.map(([id])=>id).sort(),['061902047','061902134','061902142']);
 for(const [id,v] of narratives){assert.equal(v.existingCuratedNarrative,false);assert.equal(v.newMetricAnalysis.causalExplanation,false);}
 assert.equal(/\\b(?:student_id|first_name|last_name|date_of_birth)\\b/i.test(JSON.stringify(academic)),false);
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
