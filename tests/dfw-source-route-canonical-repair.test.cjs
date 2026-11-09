'use strict';
// Canonical 2026 public district navigation URL repair. NOT student assignment QA.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official}=require('../trusted-link-policy.js');
const {checkOfficialUrl}=require('../scripts/audit-gis-upload-links.cjs');
const {buildFromRepo}=require('../scripts/build-dfw-school-coverage-matrix.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

const expected={
 '070908':'https://www.midlothianisd.org/enrollment/find-my-school',
 '057904':'https://www.chisd.net/services/lacy-enrollment-center/k-12-new-student-registration'
};
test('district pages are current approved exact-host HTTPS guidance, not false GIS',()=>{
 const source=read('data/dfw-neighbor-official-school-links-2026.json');
 const matrix=read('data/dfw-school-coverage-matrix-2026.json');
 for(const [code,url] of Object.entries(expected)){
  const d=DISTRICT_REGISTRY[code],e=source.districts.find(x=>x.code===code);
  const m=matrix.districts.find(x=>x.code===code);
  assert.ok(d&&e&&m,'district identity missing '+code);
  assert.equal(d.official,url);
  assert.equal(e.url,url);
  assert.equal(m.parentGuidance.officialUrl,url);
  assert.equal(m.parentGuidance.status,'registered-official-source');
  assert.equal(d.lookupKind,'finder-guidance');
  assert.equal(official(url),url);
  assert.ok(checkOfficialUrl(url));
  assert.equal(d.zoneKey,null);
  assert.equal(d.address,null);
  assert.equal(m.geometry.confirmedCurrentYear,false);
  assert.equal(m.geometry.referenceMatchedMinimum,null);
  assert.equal(m.geometry.matchedLoadedPercent,null);
 }
 assert.equal(official('https://www.chisd.net.evil.example/schoolfinder'),null);
 assert.equal(checkOfficialUrl('https://www.chisd.net.evil.example/schoolfinder'),false);
});
test('no stale error-prone official URL remains in registry or parent evidence',()=>{
 for(const p of ['district-registry.js','data/dfw-neighbor-official-school-links-2026.json',
  'data/dfw-school-coverage-matrix-2026.json']){
  const s=fs.readFileSync(p,'utf8');
  assert.ok(!s.includes('https://enroll.chisd.net/enrollment/'),p);
  assert.ok(!s.includes('https://www.midlothianisd.org/enrollment/school-boundaries'),p);
 }
});
test('107/108 public official parent sources preserved, Chico unverified and no assignment rate invented',()=>{
 const m=buildFromRepo();
 assert.deepEqual(read('data/dfw-school-coverage-matrix-2026.json'),m);
 assert.equal(m.summary.publicISDs,108);
 assert.equal(m.summary.publicISDsWithRegisteredParentRoute,107);
 assert.equal(m.summary.publicISDsMissingRegisteredParentRoute,1);
 assert.equal(m.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(m.summary.exactAddressAssignmentCoveragePercent,null);
 assert.equal(m.districts.find(d=>d.code==='249904').parentGuidance.status,'not-verified');
});
