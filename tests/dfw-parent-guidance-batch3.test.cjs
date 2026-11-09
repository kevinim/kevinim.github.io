'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official,APPROVED_HOSTS}=require('../trusted-link-policy.js');
const matrix=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));
const evidence=JSON.parse(fs.readFileSync('data/dfw-parent-source-evidence-batch3-2026.json','utf8'));
test('exact official URLs for eight newly discovered parent entry points, no invented GIS',()=>{
 const list=evidence.evidence;
 assert.equal(list.length,8);
 assert.equal(new Set(list.map(x=>x.teaCode)).size,8);
 let campuses=0,finders=0,inquiries=0;
 for(const e of list){
  const d=DISTRICT_REGISTRY[e.teaCode],m=matrix.districts.find(x=>x.code===e.teaCode);
  assert.ok(d&&m,e.teaCode);
  assert.equal(d.zoneKey,null);
  assert.equal(d.currency,null);
  assert.equal(d.address,null);
  assert.equal(d.campusIdMatch,false);
  assert.equal(d.official,e.officialLandingUrl);
  assert.equal(official(d.official),d.official);
  assert.ok(APPROVED_HOSTS.includes(e.host));
  assert.equal(d.lookupKind,e.routeKind);
  assert.ok(['official-inquiry','finder-guidance'].includes(e.routeKind));
  if(e.routeKind==='finder-guidance')finders++;else inquiries++;
  assert.equal(e.verifiedCurrentYearAttendanceGIS,false);
  assert.equal(e.verifiedIndividualAddressAssignment,false);
  assert.ok(e.limitations.length>45);
  assert.equal(m.parentGuidance.officialUrl,d.official);
  assert.equal(m.parentGuidance.status,'registered-official-source');
  assert.equal(m.parentGuidance.lookupType,e.routeKind);
  assert.equal(m.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(m.geometry.matchedLoadedPercent,null);
  assert.equal(m.priority,'P1');
  campuses+=m.teaCampusRecords;
 }
 assert.equal(finders,2);
 assert.equal(inquiries,6);
 assert.equal(campuses,81);
 assert.equal(matrix.summary.publicISDsWithRegisteredParentRoute,65);
 assert.equal(matrix.summary.publicISDsMissingRegisteredParentRoute,43);
 assert.equal(matrix.summary.registeredParentRouteRatePublicISDPercent,60.2);
 assert.equal(matrix.summary.publicISDCampusRowsWithRegisteredParentRoute,1784);
 assert.equal(matrix.summary.publicISDCampusRowsWithUnverifiedParentRoute,157);
 assert.equal(matrix.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(matrix.summary.exactAddressAssignmentCoveragePercent,null);
});
test('outdated boundaries, similarly named ISDs and inquiry-only links retain warnings',()=>{
 const lookup=code=>DISTRICT_REGISTRY[code];
 assert.match(lookup('199902').officialNote,/2025–26/);
 assert.match(lookup('061907').officialNote,/2025–26/);
 assert.match(lookup('057911').officialNote,/Amarillo/);
 assert.match(lookup('126905').officialNote,/Interactive School Zone Finder/);
 for(const code of ['199902','070903','220904','116905','129906','061907']){
  assert.equal(lookup(code).lookupKind,'official-inquiry');
  assert.match(lookup(code).officialNote,/확인|미확인|검증|문의/);
 }
 assert.equal(official('https://www.hpisd.org.evil.invalid/'),null);
 assert.equal(official('http://www.joshuaisd.org/our-district/attendance-zones'),null);
});
