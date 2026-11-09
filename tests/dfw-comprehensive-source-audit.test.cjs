'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load,audit}=require('../scripts/audit-dfw-comprehensive.cjs');
const fresh=()=>load();
test('2026 preliminary TEA 11-county school-by-school census and 85 source routes',()=>{
 const r=audit(fresh());
 assert.equal(r.status,'PASS',r.errors.join('\n'));
 assert.equal(r.summary.dfwRows,2182);
 assert.equal(r.summary.registeredParentRoutes,85);
 assert.equal(r.summary.unregisteredPublicISDs,23);
 assert.equal(r.summary.currentYearDashboardPolygonReferenceDistricts,2);
 assert.equal(r.summary.addressAssignmentCoveragePercent,null);
});
test('independent source census refuses a fictitious official parent URL',()=>{
 const d=fresh(),r=d.matrix.districts.find(x=>x.code==='061903');
 r.parentGuidance.officialUrl='https://evil.invalid/fake';
 assert.equal(audit(d).status,'FAIL');
 assert.match(audit(d).errors.join('|'),/provenance_url_mismatch|registry_url_crosswalk/);
});
test('one missing or duplicate TEA campus is an error',()=>{
 const d=fresh();d.tea.data.push({...d.tea.data.find(x=>x.districtCounty==='DALLAS')});
 const r=audit(d);
 assert.equal(r.status,'FAIL');
 assert.match(r.errors.join('|'),/duplicate_tea_campus/);
});
test('unreviewed GIS and address coverage cannot become numeric 0 or 100',()=>{
 const d=fresh();d.matrix.summary.exactAddressAssignmentCoveragePercent=0;
 assert.match(audit(d).errors.join('|'),/invented_dfw_gis_or_address_coverage/);
});
test('10 district year and rezoning disclaimers cannot drift from public UI',()=>{
 const d=fresh(),r=d.matrix.districts.find(x=>x.code==='061911');
 r.parentGuidance.yearCaution='no future year warning';
 assert.match(audit(d).errors.join('|'),/grade_year_caveat_mismatch_061911/);
});
test('unregistered school districts cannot masquerade as checked',()=>{
 const d=fresh(),r=d.matrix.districts.find(x=>x.code==='126908');
 r.parentGuidance.officialUrl='https://example.com/';
 assert.match(audit(d).errors.join('|'),/missing_route_claimed_verified_126908/);
});
test('supplemental source cannot retroactively claim certified GIS/address',()=>{
 const d=fresh();d.batches[3].evidence[0].verifiedCurrentYearAttendanceGIS=true;
 assert.match(audit(d).errors.join('|'),/supplemental_false_certification/);
});

test('legacy batch 3 missing explicit address metadata is warning, never address proof',()=>{
 const d=fresh();const r=audit(d);
 assert.equal(r.status,'PASS',r.errors.join('|'));
 assert.ok(r.warnings.some(x=>x.includes('Batch 3')));
});
test('any legacy evidence declaring personal address submission cannot pass',()=>{
 const d=fresh();d.batches[0].evidence[0].personalAddressSubmitted=true;
 assert.match(audit(d).errors.join('|'),/supplemental_false_certification/);
});
