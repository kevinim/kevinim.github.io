'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official}=require('../trusted-link-policy.js');
const evidence=JSON.parse(fs.readFileSync('data/dfw-noncfb-grade-year-source-evidence-2026.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('data/dfw-school-coverage-matrix-2026.json','utf8'));

test('10 distinct non-CFB real TEA districts have exact official HTTPS routes and visible age/grade caveats',()=>{
 assert.equal(evidence.schemaVersion,1);
 assert.equal(evidence.districts.length,10);
 assert.equal(new Set(evidence.districts.map(x=>x.code)).size,10);
 assert.ok(evidence.districts.every(x=>x.code!=='CFB'&&x.code!=='057903'));
 for(const e of evidence.districts){
  assert.match(e.code,/^\\d{6}$/);
  const d=DISTRICT_REGISTRY[e.code],row=matrix.districts.find(x=>x.code===e.code);
  assert.ok(d&&row,e.code);
  assert.equal(row.category,'public-isd');
  assert.equal(d.official,e.official);
  assert.equal(d.officialNote,e.sourceFootnote);
  assert.equal(row.parentGuidance.yearCaution,e.sourceFootnote);
  assert.equal(row.parentGuidance.officialUrl,e.official);
  assert.equal(row.parentGuidance.status,'registered-official-source');
  assert.equal(d.lookupKind,e.lookupKind);
  assert.equal(official(e.official),e.official);
  assert.ok(e.source.startsWith('https://')&&!/[\\s]/.test(e.source));
  assert.ok(e.sourceYear.length>25);
  assert.ok(e.gradeScope.length>25);
  assert.ok(e.sourceFootnote.length>85);
  assert.ok(e.exceptionIds.length>=1);
  assert.equal(d.zoneKey,null);
  assert.equal(d.currency,null);
  assert.equal(d.address,null);
  assert.equal(row.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(row.geometry.matchedLoadedPercent,null);
  assert.equal(row.geometry.confirmedCurrentYear,false);
  assert.equal(e.currentYearSchoolSpecificGeometryInDashboard,false);
  assert.equal(e.verifiedIndividualResidentialAssignment,false);
  assert.equal(e.sourceRedistributionRightsVerified,false);
 }
 assert.equal(evidence.verifiedCurrentYearCampusPolygons,0);
 assert.equal(evidence.verifiedRealResidentialAssignments,0);
 assert.equal(evidence.sourceRoutesRegisteredNew,0);
 assert.equal(matrix.summary.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(matrix.summary.exactAddressAssignmentCoveragePercent,null);
});
test('current-year and future-year data cannot be silently conflated',()=>{
 const by=Object.fromEntries(evidence.districts.map(x=>[x.code,x]));
 for(const c of ['220919','061911','043903','043911']){
  assert.match(by[c].sourceFootnote,/2027–28/);
  assert.match(by[c].sourceFootnote,/2026–27/);
 }
 assert.match(by['061901'].sourceFootnote,/2028–29/);
 assert.match(by['043908'].sourceFootnote,/2025–26/);
 assert.match(by['220907'].sourceFootnote,/2018–19/);
 assert.match(by['061911'].sourceFootnote,/Romer.*Barksdale/);
 assert.match(by['061911'].sourceFootnote,/5·7·8/);
 assert.match(by['220919'].sourceFootnote,/Durham/);
 assert.match(by['220906'].sourceFootnote,/Dove.*Bransford/);
 assert.match(by['061901'].sourceFootnote,/Paloma Creek/);
 assert.match(by['043902'].sourceFootnote,/Find an Apartment/);
 assert.match(by['061914'].sourceFootnote,/고등학교/);
});
test('old city GIS, printable maps and current official Finder are not equivalent to campus polygons',()=>{
 const by=Object.fromEntries(evidence.districts.map(x=>[x.code,x]));
 assert.equal(by['220907'].status,'historic-city-gis-finder-only');
 assert.equal(by['220906'].lookupKind,'official-map');
 assert.equal(by['061911'].status,'approved-current-official-finder-no-licensed-geojson');
 assert.equal(by['043911'].status,'two-school-years-separate-finders');
 for(const x of evidence.districts){
  assert.ok(!('polygon' in x));
  assert.ok(!('coordinates' in x));
  assert.ok(!('studentAddress' in x));
 }
});
test('district source quality update cannot alter district route totals or endorse missing boundary as 0%',()=>{
 const s=matrix.summary;
 assert.equal(s.publicISDs,108);
 assert.equal(s.publicISDsWithRegisteredParentRoute,65);
 assert.equal(s.publicISDsMissingRegisteredParentRoute,43);
 assert.equal(s.publicISDCampusRowsWithRegisteredParentRoute,1784);
 assert.equal(s.publicISDCampusRowsWithUnverifiedParentRoute,157);
 assert.equal(s.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(s.exactAddressAssignmentCoveragePercent,null);
});
