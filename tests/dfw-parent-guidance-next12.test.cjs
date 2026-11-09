'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official,APPROVED_HOSTS}=require('../trusted-link-policy.js');
const matrix=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));
const codes=["070912","057907","070908","126903","184907","184903","220915","057904","057906","057913","070911","129901"];
test('next twelve official parent sources never fabricate GIS or enrollment',()=>{
 let campusRecords=0;
 assert.equal(new Set(codes).size,12);
 for(const code of codes){
  const row=matrix.districts.find(d=>d.code===code),entry=DISTRICT_REGISTRY[code];
  assert.ok(row&&entry,code);
  assert.equal(entry.zoneKey,null,code);
  assert.equal(entry.currency,null,code);
  assert.equal(entry.address,null,code);
  assert.equal(entry.campusIdMatch,false,code);
  assert.ok(['official-map','finder-guidance'].includes(entry.lookupKind),code);
  assert.equal(official(entry.official),entry.official,code);
  const host=entry.official.match(/^https:\/\/([^/]+)/)?.[1];
  assert.ok(APPROVED_HOSTS.includes(host),code);
  assert.equal(row.parentGuidance.registryKey,code);
  assert.equal(row.parentGuidance.officialUrl,entry.official);
  assert.equal(row.parentGuidance.yearCaution,entry.officialNote);
  assert.equal(row.parentGuidance.status,'registered-official-source');
  assert.equal(row.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(row.geometry.confirmedCurrentYear,false);
  assert.equal(row.priority,'P1');
  assert.equal(row.missingReason,'official-parent-route-linked-but-campus-gis-not-ingested');
  campusRecords+=row.teaCampusRecords;
 }
 assert.equal(campusRecords,143);
 assert.equal(matrix.summary.publicISDsWithRegisteredParentRoute,57);
 assert.equal(matrix.summary.publicISDsMissingRegisteredParentRoute,51);
 assert.equal(matrix.summary.publicISDCampusRowsWithRegisteredParentRoute,1730);
 assert.equal(matrix.summary.publicISDCampusRowsWithUnverifiedParentRoute,211);
 assert.equal(matrix.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(matrix.summary.exactAddressAssignmentCoveragePercent,null);
});
test('map vintage, rezoning and partial grade coverage warnings are preserved',()=>{
 assert.match(DISTRICT_REGISTRY['184907'].officialNote,/2024/);
 assert.match(DISTRICT_REGISTRY['057907'].officialNote,/2026–27/);
 for(const code of ['057913','070911'])assert.match(DISTRICT_REGISTRY[code].officialNote,/초등/);
 assert.equal(official('https://www.azleisd.net.evil.example/'),null);
 assert.equal(official('http://www.midlothianisd.org/enrollment/school-boundaries'),null);
});
