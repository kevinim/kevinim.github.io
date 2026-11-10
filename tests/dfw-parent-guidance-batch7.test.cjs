'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official,APPROVED_HOSTS}=require('../trusted-link-policy.js');
const ui=require('../school-zone-ui.js');
const m=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));
const source=JSON.parse(fs.readFileSync('data/dfw-parent-source-evidence-batch7-2026.json','utf8'));
test('22 additional official ISD parent routes have no fabricated assignment or polygons',()=>{
 assert.equal(source.evidence.length,22);
 assert.equal(new Set(source.evidence.map(e=>e.teaCode)).size,22);
 let rows=0;
 for(const e of source.evidence){
  const r=DISTRICT_REGISTRY[e.teaCode],d=m.districts.find(x=>x.code===e.teaCode);
  assert.ok(r&&d,e.teaCode);
  assert.equal(d.category,'public-isd');
  assert.equal(r.official,e.officialLandingUrl);
  assert.equal(r.lookupKind,'official-inquiry');
  assert.equal(d.parentGuidance.status,'registered-official-source');
  assert.equal(d.parentGuidance.lookupType,'official-inquiry');
  assert.equal(d.parentGuidance.officialUrl,e.officialLandingUrl);
  assert.equal(d.parentGuidance.yearCaution,e.limitations);
  assert.equal(official(e.officialLandingUrl),e.officialLandingUrl);
  assert.ok(APPROVED_HOSTS.includes(e.host));
  assert.equal(r.zoneKey,null);assert.equal(r.address,null);
  assert.equal(r.currency,null);assert.equal(r.campusIdMatch,false);
  assert.equal(d.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(d.geometry.confirmedCurrentYear,false);
  assert.equal(d.geometry.matchedLoadedPercent,null);
  assert.equal(d.missingReason,'official-parent-route-linked-but-campus-gis-not-ingested');
  assert.equal(d.priority,'P1');
  assert.equal(e.routeKind,'official-inquiry');
  assert.equal(e.verifiedCurrentYearAttendanceGIS,false);
  assert.equal(e.verifiedIndividualAddressAssignment,false);
  assert.equal(e.personalAddressSubmitted,false);
  assert.ok(e.limitations.length>=45&&e.sourceObservation.length>=30);
  assert.equal(ui.classify({matchStatus:'no-district-polygon-source',sourceReady:true,
   schoolType:'elementary',officialKind:e.routeKind,officialUrl:e.officialLandingUrl,displayMode:'historical'}).kind,'inquiry-only');
  rows+=d.teaCampusRecords;
 }
 assert.equal(rows,58);
 assert.equal(m.summary.publicISDsWithRegisteredParentRoute,107);
 assert.equal(m.summary.publicISDsMissingRegisteredParentRoute,1);
 assert.equal(m.summary.registeredParentRouteRatePublicISDPercent,99.1);
 assert.equal(m.summary.publicISDCampusRowsWithRegisteredParentRoute,1938);
 assert.equal(m.summary.publicISDCampusRowsWithUnverifiedParentRoute,3);
 assert.equal(m.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(m.summary.exactAddressAssignmentCoveragePercent,null);
});
test('Chico remains unverified and misleading years are explicitly flagged',()=>{
 const chico=m.districts.find(d=>d.code==='249904');
 assert.equal(chico.teaCampusRecords,3);
 assert.equal(chico.parentGuidance.status,'not-verified');
 assert.equal(DISTRICT_REGISTRY['249904'],undefined);
 assert.deepEqual(source.unverifiedDistricts.map(x=>x.teaCode),['249904']);
 assert.match(DISTRICT_REGISTRY['184901'].officialNote,/2025–26/);
 assert.match(DISTRICT_REGISTRY['249901'].officialNote,/2027–28/);
 assert.match(DISTRICT_REGISTRY['116909'].officialNote,/서버 오류/);
 assert.equal(official('https://www.venusisd.net.evil.example/enroll'),null);
 assert.equal(official('http://www.millsapisd.net/parents-students/registration'),null);
 assert.equal(official('https://www.garnerisd.net:443/registration'),null);
});
test('Pilot Point parallel source improvement preserved exactly',()=>{
 const e=DISTRICT_REGISTRY['061903'],d=m.districts.find(x=>x.code==='061903');
 assert.equal(e.official,'https://www.pilotpointisd.com/265282_3');
 assert.equal(d.parentGuidance.officialUrl,e.official);
 assert.equal(d.parentGuidance.yearCaution,e.officialNote);
});
