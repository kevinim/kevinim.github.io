'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {audit}=require('../scripts/audit-dfw-home-automation-readiness.cjs');
test('districtwide school auto-mapping coverage cannot be inferred from official URL registrations',()=>{
 const r=audit(),s=r.summary;
 assert.equal(s.publicISDs,108);
 assert.equal(s.configuredSchoolZoneSources,7);
 assert.equal(s.pointInPolygonCandidateDistricts,6);
 assert.equal(s.addressTableOnlyDistricts,1);
 assert.equal(s.noAutomaticSchoolZoneSourceDistricts,101);
 assert.equal(s.sourceYearConfirmedDistricts,2);
 assert.equal(s.publishedYearUnconfirmedDistricts,1);
 assert.equal(s.exactResidentialAssignmentSuccessRate,null);
 assert.equal(s.currentYearCampusPolygonCompletenessRate,null);
 assert.equal(new Set(r.districts.map(d=>d.teaCode)).size,108);
});
test('Garland choice and CFB resident finder cannot masquerade as zoned GIS',()=>{
 const r=audit();
 for(const code of ['057909','057903']){
  const d=r.districts.find(x=>x.teaCode===code);
  assert.ok(d);assert.equal(d.automationLevel,'official-link-or-no-source');
  assert.equal(d.zoneSourceKey,null);
 }
});
test('Allen street table is not equivalent to 2026-27 GIS and map layer alone is not a verified home assignment',()=>{
 const r=audit();
 const a=r.districts.find(x=>x.teaCode==='043901');
 const f=r.districts.find(x=>x.teaCode==='043905');
 assert.equal(a.automationLevel,'address-table-only');
 assert.equal(a.sourceYearStatus,'historical-or-unknown');
 assert.equal(f.automationLevel,'geometry-candidate');
 assert.equal(f.sourceYearStatus,'2026-27-source');
 for(const row of r.districts){
  assert.equal(row.exactAddressAssignmentValidated,false);
  assert.equal(row.verifiedPolygonForEveryCampus,false);
 }
});

test('Dallas published GIS source is a provisional candidate, not current-year assignment proof',()=>{
 const r=audit(),d=r.districts.find(x=>x.teaCode==='057905');
 assert.equal(d.automationLevel,'geometry-candidate');
 assert.equal(d.sourceYearStatus,'publisher-gis-2026-updated-not-year-confirmed');
 assert.equal(d.exactAddressAssignmentValidated,false);
});
