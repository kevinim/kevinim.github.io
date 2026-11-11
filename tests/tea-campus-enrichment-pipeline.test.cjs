'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ratings=require('../tea-ratings-2026.json');
const api=require('../scripts/tea-campus-enrichment-pipeline.cjs');
const SOURCE='https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026';
const PEIMS='https://rptsvr1.tea.texas.gov/adhocrpt/adste.html';
const BASE={campuses:{},schemaVersion:1,accountabilityYear:2026};
const components='campus_id,student_achievement,school_progress,closing_gaps,reading_meets,math_meets\n057903122,91,89,85,71,65\n061902118,82,73,73,65,47\n';
const enrollment='campus_id,enrollment,black,hispanic,white,native,asian,pacific,multi\n057903122,100,15,20,25,0,30,0,10\n061902118,100,16,15,25,0,37,0,7\n';
test('normalizes TEA 2026 domain scores and PEIMS campus ethnicity by exact 9-digit IDs',()=>{
 const result=api.build({components:api.parseCsv(components),componentSource:SOURCE,
  enrollment:api.parseCsv(enrollment),ethnicitySource:PEIMS,previous:BASE});
 assert.equal(Object.keys(result.campuses).length,2);
 assert.deepEqual(result.campuses['057903122'].domains,{achievement:91,progress:89,gaps:85});
 assert.equal(result.campuses['057903122'].subjects.reading,71);
 assert.equal(result.campuses['057903122'].demographics.race.asian,30);
 assert.equal(result.campuses['061902118'].demographics.race.asian,37);
 assert.equal(result.campuses['061902118'].demographics.year,'2025–26');
 assert.equal(result.campuses['061902118'].domainsSource,SOURCE);
 assert.equal(result.campuses['061902118'].demographics.src,PEIMS);
 const progress=api.coverage(result).summary;
 assert.equal(progress.allSchools,2282);
 assert.equal(progress.with2026Rating,2144);
 assert.equal(progress.notRated,138);
 assert.equal(progress.withDomainComponents,2);
 assert.equal(progress.withSubjectMetrics,2);
 assert.equal(progress.withVerifiedEthnicity,2);
});
test('suppressed categories are unavailable, NOT invented as zero',()=>{
 const inCsv=enrollment.replace('057903122,100,15,20,25,0,30,0,10','057903122,100,-999,20,25,0,30,0,10');
 const result=api.build({enrollment:api.parseCsv(inCsv),ethnicitySource:PEIMS,previous:BASE});
 assert.equal(result.campuses['057903122'].demographicsStatus,'suppressed-or-unavailable');
 assert.equal(result.campuses['057903122'].demographics,undefined);
 assert.equal(result.campuses['061902118'].demographics.race.native,0);
});
test('rejects incorrect PEIMS denominators, unknown IDs, duplicate campuses and invalid scores',()=>{
 assert.throws(()=>api.build({enrollment:api.parseCsv(enrollment.replace('100,15,20','101,15,20')),ethnicitySource:PEIMS,previous:BASE}),/does not equal/);
 assert.throws(()=>api.build({components:api.parseCsv(components.replace('057903122','057903999')),componentSource:SOURCE,previous:BASE}),/not in current/);
 assert.throws(()=>api.build({components:api.parseCsv(components+components.split('\n')[1]+'\n'),componentSource:SOURCE,previous:BASE}),/Duplicate component/);
 assert.throws(()=>api.build({components:api.parseCsv(components.replace('91,89,85','101,89,85')),componentSource:SOURCE,previous:BASE}),/0 to 100/);
 assert.throws(()=>api.build({components:api.parseCsv(components.replace('057903122','57303122')),componentSource:SOURCE,previous:BASE}),/nine digits/);
});
test('only official TEA report URLs and aggregated rows are admitted',()=>{
 assert.throws(()=>api.requireOfficialSource('https://txschools.net/download'),/Only official/);
 assert.throws(()=>api.requireOfficialSource('https://tea.texas.gov.evil.test/'),/Only official/);
 assert.throws(()=>api.requireOfficialSource('http://rptsvr1.tea.texas.gov/'),/Only official/);
 assert.throws(()=>api.parseCsv('campus_id,student_id,black\n057903122,secret,3'),/Student-level/);
 assert.throws(()=>api.parseCsv('campus_id,last_name,black\n057903122,NAME,3'),/Student-level/);
 assert.deepEqual(api.parseCsv('campus_id,notes\n057903122,"quoted, ""note"""\n'),[{campus_id:'057903122',notes:'quoted, "note"'}]);
});
test('all current campus identities are unique, and initial progress is transparent',()=>{
 const ids=ratings.data.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(ids.length,2282);
 const d=new Set(ratings.data.map(x=>x.district));
 assert.equal(d.size,181);
 const baseline=require('../data/tea-profile-progress-2026.json');
 assert.equal(baseline.totalCampuses,ratings.data.length);
 assert.equal(baseline.distinctDistricts,d.size);
 assert.equal(baseline.accountabilityRatingPresent,ratings.data.filter(r=>['A','B','C','D','F'].includes(r.rating)).length);
 assert.equal(baseline.notRated,ratings.data.filter(r=>r.rating==='Not Rated').length);
 assert.ok(baseline.individualNarratives<=baseline.profilePanelsConnected);
 assert.ok(baseline.domainComponentsReviewed<=baseline.individualNarratives);
 assert.equal(baseline.imported2026Components,0,'never claim incoming official data before verified ingestion');
});
