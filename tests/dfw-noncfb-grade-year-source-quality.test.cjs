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
  assert.match(e.code,/^\d{6}$/);
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
  assert.ok(e.source.startsWith('https://')&&!/\s/.test(e.source));
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
 assert.equal(s.publicISDsWithRegisteredParentRoute,73);
 assert.equal(s.publicISDsMissingRegisteredParentRoute,35);
 assert.equal(s.publicISDCampusRowsWithRegisteredParentRoute,1827);
 assert.equal(s.publicISDCampusRowsWithUnverifiedParentRoute,114);
 assert.equal(s.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(s.exactAddressAssignmentCoveragePercent,null);
});


test('seven sourced campus changes reconcile exactly to TEA identities without fabricating new-campus ratings',()=>{
 const tea=JSON.parse(fs.readFileSync('tea-ratings-2026.json','utf8'));
 const all=JSON.parse(fs.readFileSync('data/dfw-noncfb-campus-transition-evidence-2026.json','utf8'));
 assert.equal(all.schemaVersion,1);
 assert.equal(all.entries.length,7);
 assert.equal(all.counts.existingTEACampusRecordsWithChangedStatus,5);
 assert.equal(all.counts.newCampusesMissingTEARecords,2);
 const ids=new Set();
 let existing=0,unratedNew=0;
 for(const e of all.entries){
  assert.notEqual(e.districtCode,'057903');
  assert.notEqual(e.districtCode,'CFB');
  assert.ok(e.source.startsWith('https://'));
  assert.match(e.effectiveAcademicYear,/^20[0-9]{2}-[0-9]{2}$/);
  assert.ok(e.footnote.length>60);
  assert.ok(e.destinationNote.length>40);
  assert.ok(!('zoneGeometry' in e)&&!('polygon' in e)&&!('actualResidentialAddress' in e));
  if(e.presentInTea2026Snapshot){
   existing++;
   assert.ok(!ids.has(e.campusId),e.campusId);
   ids.add(e.campusId);
   const record=tea.data.find(x=>x.id===e.campusId);
   assert.ok(record,e.campusId);
   assert.equal(record.name,e.schoolNameFromTEA);
   assert.equal(record.id.slice(0,6),e.districtCode);
  }else{
   unratedNew++;
   assert.equal(e.campusId,null);
   assert.equal(e.schoolNameFromTEA,null);
   assert.equal(e.status,'new-campus-absent-from-snapshot');
   assert.ok(!tea.data.some(x=>x.id.startsWith(e.districtCode)&&new RegExp(e.schoolName.includes('Romer')?'ROMER':'BARKSDALE','i').test(x.name)));
  }
 }
 assert.equal(existing,5);
 assert.equal(unratedNew,2);
});
test('operating-year status is not contaminated by future school closure plans',()=>{
 const rows=JSON.parse(fs.readFileSync('data/dfw-noncfb-campus-transition-evidence-2026.json','utf8')).entries;
 const by=Object.fromEntries(rows.filter(x=>x.campusId).map(x=>[x.campusId,x]));
 for(const code of ['061901120','220906103','220906108']){
  assert.equal(by[code].effectiveAcademicYear,'2026-27');
  assert.equal(by[code].regularAssignmentCampus2026_27,false);
 }
 assert.equal(by['220919106'].status,'future-closure-only');
 assert.equal(by['220919106'].effectiveAcademicYear,'2027-28');
 assert.equal(by['220919106'].regularAssignmentCampus2026_27,true);
 assert.equal(by['220919102'].status,'current-year-feeder-change');
 assert.equal(by['220919102'].regularAssignmentCampus2026_27,true);
});
