'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeProgress}=require('../scripts/build-tea-profile-progress.cjs');
const snapshot=require('../data/tea-profile-progress-2026.json');
const root=path.join(__dirname,'..');
test('canonical release progress snapshot is generated from exact official TEA source batches',()=>{
  const actual=makeProgress(snapshot.asOf);
  assert.deepEqual(actual,snapshot);
  assert.equal(fs.readFileSync(path.join(root,'data/tea-profile-progress-2026.json'),'utf8'),JSON.stringify(actual,null,2)+'\n');
  assert.equal(actual.totalCampuses,2282);
  assert.deepEqual(Object.fromEntries(['campuses','domainAnyReported','domainAllReported','staarAnyReported','staarAllFourReported','scoreBasedComparisonEligible','staarSourceAbsent','public2025_26CountCampuses','fullRaceShareCampuses'].map(k=>[k,actual.official2026[k]])),{campuses:2282,domainAnyReported:2101,domainAllReported:2063,staarAnyReported:2105,staarAllFourReported:814,scoreBasedComparisonEligible:2060,staarSourceAbsent:110,public2025_26CountCampuses:2282,fullRaceShareCampuses:6});
});
test('every exact district appears once and coverage totals reconcile without filling masked values',()=>{
  const x=snapshot.official2026,by=x.byDistrict;
  assert.equal(by.length,181);
  assert.equal(new Set(by.map(v=>v.districtId)).size,181);
  for(const field of ['campuses','domainAllReported','staarAnyReported','public2025_26CountCampuses','fullRaceShareCampuses'])
    assert.equal(by.reduce((n,d)=>n+d[field],0),x[field]);
  assert.deepEqual(by.find(v=>v.districtId==='057903')&&[by.find(v=>v.districtId==='057903').campuses,by.find(v=>v.districtId==='057903').domainAllReported],[35,32]);
  assert.equal(snapshot.public2025_26SuppressedCells,5141);
  assert.equal(snapshot.public2025_26UnlistedCells,2556);
  assert.equal(snapshot.public2025_26PublishedCells,8277);
  assert.equal(snapshot.official2026.schoolYear,'2025-26');
});
