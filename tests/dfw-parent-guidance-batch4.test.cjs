'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official,APPROVED_HOSTS}=require('../trusted-link-policy.js');
const ui=require('../school-zone-ui.js');
const matrix=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));
const source=JSON.parse(fs.readFileSync('data/dfw-parent-source-evidence-batch4-2026.json','utf8'));
test('8 TEA districts, exact official HTTPS, finder vs inquiry, no invented GIS or address assignment',()=>{
 assert.equal(source.evidence.length,8);
 assert.equal(new Set(source.evidence.map(e=>e.teaCode)).size,8);
 let count=0,finders=0,inquiries=0;
 for(const e of source.evidence){
  const entry=DISTRICT_REGISTRY[e.teaCode];
  const m=matrix.districts.find(d=>d.code===e.teaCode);
  assert.ok(entry&&m,e.teaCode);
  assert.equal(m.category,'public-isd');
  assert.equal(entry.official,e.officialLandingUrl);
  assert.equal(entry.lookupKind,e.routeKind);
  assert.equal(official(entry.official),entry.official);
  assert.ok(APPROVED_HOSTS.includes(e.host),e.host);
  assert.equal(entry.zoneKey,null);
  assert.equal(entry.currency,null);
  assert.equal(entry.address,null);
  assert.equal(entry.campusIdMatch,false);
  assert.equal(m.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(m.geometry.confirmedCurrentYear,false);
  assert.equal(m.geometry.matchedLoadedPercent,null);
  assert.equal(m.parentGuidance.officialUrl,entry.official);
  assert.equal(m.parentGuidance.lookupType,e.routeKind);
  assert.equal(m.parentGuidance.status,'registered-official-source');
  assert.equal(m.priority,'P1');
  assert.equal(e.verifiedCurrentYearAttendanceGIS,false);
  assert.equal(e.verifiedIndividualAddressAssignment,false);
  assert.equal(e.personalAddressSubmitted,false);
  assert.ok(e.limitations.length>50);
  assert.ok(e.sourceObservation.length>30);
  const expected=e.routeKind==='official-inquiry'?'inquiry-only':'finder-only';
  assert.equal(ui.classify({matchStatus:'no-district-polygon-source',sourceReady:true,
   schoolType:'elementary',officialKind:e.routeKind,officialUrl:e.officialLandingUrl,
   displayMode:'historical'}).kind,expected);
  if(e.routeKind==='finder-guidance')finders++;
  else if(e.routeKind==='official-inquiry')inquiries++;
  else assert.fail('Unrecognized source quality');
  count+=m.teaCampusRecords;
 }
 assert.equal(finders,5);
 assert.equal(inquiries,3);
 assert.equal(count,54);
 assert.equal(matrix.summary.publicISDsWithRegisteredParentRoute,85);
 assert.equal(matrix.summary.publicISDsMissingRegisteredParentRoute,23);
 assert.equal(matrix.summary.registeredParentRouteRatePublicISDPercent,78.7);
 assert.equal(matrix.summary.publicISDCampusRowsWithRegisteredParentRoute,1880);
 assert.equal(matrix.summary.publicISDCampusRowsWithUnverifiedParentRoute,61);
 assert.equal(matrix.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(matrix.summary.exactAddressAssignmentCoveragePercent,null);
});
test('partial-grade and specialty transfers remain prominent and malicious link hosts are rejected',()=>{
 for(const code of ['116901','249905'])assert.match(DISTRICT_REGISTRY[code].officialNote,/초등/);
 assert.match(DISTRICT_REGISTRY['184902'].officialNote,/2027–28/);
 assert.match(DISTRICT_REGISTRY['043919'].officialNote,/Scholars/);
 assert.match(DISTRICT_REGISTRY['070905'].officialNote,/검색기는 아닙니다/);
 assert.equal(official('https://www.wsisd.com.attacker.invalid/enrollment'),null);
 assert.equal(official('http://www.kaufmanisd.net/page/kisd-school-zone-finder/'),null);
 assert.equal(official('https://www.castleberryisd.net:443/enrollnow/enrollnow'),null);
});
