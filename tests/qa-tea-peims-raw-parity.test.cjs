'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {parseCsv,sourceCheck,verifyCohort}=require('../qa/tea-peims-raw-parity.cjs');
const manifest=require('../qa/evidence/tea-peims-raw-parity-20261111.json');
const cohort=manifest.cohorts[0];
const sample={schoolYear:'2025-26',sources:{CFB:cohort.sourceUrl},campuses:{'057903101':{district:'CFB',counts:{native:{status:'suppressed',publishedMask:'<10'},asian:{status:'published',count:12},black:{status:'not-listed'},hispanic:{status:'published',count:20},pacific:{status:'not-listed'},multi:{status:'not-listed'},white:{status:'published',count:40}}}}};
const csv='T E X A S E D U C A T I O N A G E N C Y\n"YEAR","REGION","COUNTY NAME","DISTRICT","DISTRICT NAME","CAMPUS","CAMPUS NAME","GRADE GROUP NAME","ETHNICITY","ENROLLMENT"\r\n"2025-2026",10,"DALLAS COUNTY",057903,"CFB ISD",057903101,"TEST, EL","ELEMENTARY","American Indian or Alaska Nat","<10"\r\n"2025-2026",10,"DALLAS COUNTY",057903,"CFB ISD",057903101,"TEST, EL","ELEMENTARY","Asian",12\r\n"2025-2026",10,"DALLAS COUNTY",057903,"CFB ISD",057903101,"TEST, EL","ELEMENTARY","Hispanic/Latino",20\r\n"2025-2026",10,"DALLAS COUNTY",057903,"CFB ISD",057903101,"TEST, EL","ELEMENTARY","White",40\r\n';
const small={...cohort,campuses:1,sourceRows:4};
test('published evidence sums and versions match eight independently audited districts',()=>{
  assert.equal(manifest.schemaVersion,1);assert.equal(manifest.schoolYear,'2025-26');
  assert.match(manifest.auditedHeadSha,/^[0-9a-f]{40}$/);
  assert.equal(new Set(manifest.cohorts.map(x=>x.districtId)).size,8);
  assert.equal(manifest.cohorts.reduce((n,x)=>n+x.campuses,0),371);
  assert.equal(manifest.cohorts.reduce((n,x)=>n+x.sourceRows,0),2290);
  for(const x of manifest.cohorts){sourceCheck(x.sourceUrl,x.districtId);assert.equal(x.csvFilename.includes('..'),false)}
});
test('realistic TEA CSV quoting and source suppression match 7-category staging exactly',()=>{
  assert.equal(parseCsv(csv)[2][6],'TEST, EL');
  assert.deepEqual(verifyCohort(sample,small,csv),{cohort:'CFB',campuses:1,rows:4,published:3,suppressed:1,notListed:3,exactMatch:true});
});
test('wrong year, spoofed TEA domain, forged campus, duplicate, guessed suppression fail closed',()=>{
  assert.throws(()=>verifyCohort(sample,small,csv.replace('"2025-2026"','"2024-2025"')),/school year/);
  assert.throws(()=>sourceCheck(cohort.sourceUrl.replace('rptsvr1.tea.texas.gov','rptsvr1.tea.texas.gov.evil.example'),'057903'),/not exact TEA/);
  assert.throws(()=>verifyCohort(sample,small,csv.replaceAll('057903101','999999999')),/mismatch/);
  assert.throws(()=>verifyCohort(sample,small,csv+csv.split('\r\n')[2]+'\n'),/Duplicate/);
  const bad=structuredClone(sample);bad.campuses['057903101'].counts.native.count=5;
  assert.throws(()=>verifyCohort(bad,small,csv),/suppression mismatch/);
  const missing=structuredClone(sample);missing.campuses['057903101'].counts.black={status:'published',count:0};
  assert.throws(()=>verifyCohort(missing,small,csv),/not-listed, not zero/);
});
test('manifest contains no student-level identifiers and no claimed complete distribution coverage',()=>{
  const text=fs.readFileSync(require.resolve('../qa/evidence/tea-peims-raw-parity-20261111.json'),'utf8');
  for(const forbidden of [/"student_id"\s*:/i,/"date_of_birth"\s*:/i,/"ssn"\s*:/i,/"home_address"\s*:/i])assert.equal(forbidden.test(text),false);
  assert.equal(manifest.discrepancies,0);assert.ok(manifest.limitations.some(x=>/denominators/.test(x)));
});
