'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official,APPROVED_HOSTS}=require('../trusted-link-policy.js');
const ui=require('../school-zone-ui.js');
const matrix=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('data/dfw-parent-source-evidence-batch5-2026.json','utf8'));
test('eight new official routes have provenance, safe links and no invented assignments',()=>{
 assert.equal(manifest.evidence.length,8);
 assert.equal(new Set(manifest.evidence.map(e=>e.teaCode)).size,8);
 let campusRows=0,maps=0,inquiries=0;
 for(const e of manifest.evidence){
  const r=DISTRICT_REGISTRY[e.teaCode],d=matrix.districts.find(x=>x.code===e.teaCode);
  assert.ok(r&&d,e.teaCode);
  assert.equal(d.parentGuidance.status,'registered-official-source');
  assert.equal(d.parentGuidance.officialUrl,e.officialLandingUrl);
  assert.equal(r.official,e.officialLandingUrl);
  assert.equal(r.lookupKind,e.routeKind);
  assert.equal(official(r.official),r.official);
  assert.ok(APPROVED_HOSTS.includes(e.host),e.host);
  assert.equal(r.zoneKey,null);assert.equal(r.address,null);
  assert.equal(r.currency,null);assert.equal(r.campusIdMatch,false);
  assert.equal(d.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(d.geometry.confirmedCurrentYear,false);
  assert.equal(d.geometry.matchedLoadedPercent,null);
  assert.equal(d.missingReason,'official-parent-route-linked-but-campus-gis-not-ingested');
  assert.equal(d.priority,'P1');
  assert.equal(e.verifiedCurrentYearAttendanceGIS,false);
  assert.equal(e.verifiedIndividualAddressAssignment,false);
  assert.equal(e.personalAddressSubmitted,false);
  assert.ok(e.limitations.length>=45&&e.sourceObservation.length>=30);
  const expected=e.routeKind==='official-map'?'map-only':'inquiry-only';
  assert.equal(ui.classify({matchStatus:'no-district-polygon-source',sourceReady:true,
   schoolType:'elementary',officialKind:e.routeKind,officialUrl:e.officialLandingUrl,displayMode:'historical'}).kind,expected);
  e.routeKind==='official-map'?maps++:e.routeKind==='official-inquiry'?inquiries++:assert.fail('unverified finder claim');
  campusRows+=d.teaCampusRecords;
 }
 assert.equal(maps,2);assert.equal(inquiries,6);assert.equal(campusRows,43);
 assert.equal(matrix.summary.publicISDsWithRegisteredParentRoute,107);
 assert.equal(matrix.summary.publicISDsMissingRegisteredParentRoute,1);
 assert.equal(matrix.summary.registeredParentRouteRatePublicISDPercent,99.1);
 assert.equal(matrix.summary.publicISDCampusRowsWithRegisteredParentRoute,1938);
 assert.equal(matrix.summary.publicISDCampusRowsWithUnverifiedParentRoute,3);
 assert.equal(matrix.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(matrix.summary.exactAddressAssignmentCoveragePercent,null);
});
test('old map vintage and registration-only caveats survive; URL trust is fail-closed',()=>{
 assert.match(DISTRICT_REGISTRY['126911'].officialNote,/2022–23/);
 assert.match(DISTRICT_REGISTRY['061912'].officialNote,/세 곳/);
 assert.match(DISTRICT_REGISTRY['220914'].officialNote,/검색기가 아닙니다/);
 assert.equal(official('https://www.sangerisd.net.evil.example/enroll'),null);
 assert.equal(official('http://www.ldisd.net/about-us/about-the-district/attendance-zones'),null);
 assert.equal(official('https://www.godleyisd.net:443/resources/attendance-zones'),null);
});
