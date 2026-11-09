'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official,APPROVED_HOSTS}=require('../trusted-link-policy.js');
const ui=require('../school-zone-ui.js');
const m=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));
const evidence=JSON.parse(fs.readFileSync('data/dfw-parent-source-evidence-batch6-2026.json','utf8'));
test('twelve official parent routes cannot advertise an address Finder, GIS or exact placement',()=>{
 assert.equal(evidence.evidence.length,12);
 assert.equal(new Set(evidence.evidence.map(e=>e.teaCode)).size,12);
 let rows=0;
 for(const e of evidence.evidence){
  const r=DISTRICT_REGISTRY[e.teaCode],d=m.districts.find(x=>x.code===e.teaCode);
  assert.ok(r&&d,e.teaCode);
  assert.equal(d.category,'public-isd');
  assert.equal(r.official,e.officialLandingUrl);
  assert.equal(r.lookupKind,'official-inquiry');
  assert.equal(d.parentGuidance.lookupType,'official-inquiry');
  assert.equal(d.parentGuidance.officialUrl,e.officialLandingUrl);
  assert.equal(d.parentGuidance.status,'registered-official-source');
  assert.equal(official(e.officialLandingUrl),e.officialLandingUrl);
  assert.ok(APPROVED_HOSTS.includes(e.host),e.host);
  assert.equal(e.routeKind,'official-inquiry');
  assert.equal(r.zoneKey,null);assert.equal(r.currency,null);assert.equal(r.address,null);assert.equal(r.campusIdMatch,false);
  assert.equal(d.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(d.geometry.confirmedCurrentYear,false);
  assert.equal(d.geometry.matchedLoadedPercent,null);
  assert.equal(d.missingReason,'official-parent-route-linked-but-campus-gis-not-ingested');
  assert.equal(d.priority,'P1');
  assert.equal(e.verifiedCurrentYearAttendanceGIS,false);
  assert.equal(e.verifiedIndividualAddressAssignment,false);
  assert.equal(e.personalAddressSubmitted,false);
  assert.ok(e.limitations.length>=45&&e.sourceObservation.length>=30);
  assert.equal(ui.classify({matchStatus:'no-district-polygon-source',sourceReady:true,schoolType:'elementary',
   officialKind:e.routeKind,officialUrl:e.officialLandingUrl,displayMode:'historical'}).kind,'inquiry-only');
  rows+=d.teaCampusRecords;
 }
 assert.equal(rows,53);
 assert.equal(m.summary.publicISDsWithRegisteredParentRoute,85);
 assert.equal(m.summary.publicISDsMissingRegisteredParentRoute,23);
 assert.equal(m.summary.registeredParentRouteRatePublicISDPercent,78.7);
 assert.equal(m.summary.publicISDCampusRowsWithRegisteredParentRoute,1880);
 assert.equal(m.summary.publicISDCampusRowsWithUnverifiedParentRoute,61);
 assert.equal(m.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(m.summary.exactAddressAssignmentCoveragePercent,null);
});
test('school-grade and residency caveats and strict outbound link controls',()=>{
 assert.match(DISTRICT_REGISTRY['116903'].officialNote,/PK–2/);
 assert.match(DISTRICT_REGISTRY['057919'].officialNote,/학군 경계/);
 assert.match(DISTRICT_REGISTRY['184909'].officialNote,/TEA School District Locator/);
 assert.match(DISTRICT_REGISTRY['061903'].officialNote,/검색기는 확인되지/);
 assert.equal(official('https://www.boydisd.net.evil.invalid/enrollments'),null);
 assert.equal(official('http://www.peaster.net/parents-students'),null);
 assert.equal(official('https://www.keeneisd.org:443/student-central/enrollment-and-registration'),null);
});
