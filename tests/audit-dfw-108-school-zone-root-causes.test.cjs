'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {audit}=require('../scripts/audit-dfw-108-school-zone-root-causes.cjs');
const matrix=require('../data/dfw-school-coverage-matrix-2026.json');
const clone=x=>JSON.parse(JSON.stringify(x));
test('full 108 public ISD TEA denominator and 107 parent route entries on PR160',()=>{
 const v=audit(matrix);
 assert.deepEqual(v.errors,[]);
 assert.equal(v.totalPublicISDs,108);
 assert.equal(v.registeredOfficialParentRoutes,107);
 assert.equal(v.missingOfficialParentRoutes,1);
 assert.equal(v.totalTEASchoolRows,1941);
 assert.equal(v.verifiedCurrentYearResidentialAssignments,0);
});
test('all ISDs assigned a non-conflated connection-status reason',()=>{
 const v=audit(matrix),counts=v.categoryTotals;
 assert.equal(Object.values(counts).reduce((n,r)=>n+r.districts,0),108);
 assert.equal(counts['parent-route-present-campus-gis-not-onboarded'].districts,100);
 assert.equal(counts['parent-route-unverified'].districts,1);
 assert.equal(counts['historical-polygons-only'].districts,1);
 assert.equal(counts['source-current-recheck-pending'].districts,2);
 assert.equal(counts['live-finder-drift-uncertain'].districts,1);
 assert.equal(counts['finder-layer-vintage-unverified'].districts,2);
 assert.equal(counts['choice-based-assignment'].districts,1);
});
test('root causes preserve CFB, Dallas and Northwest parallel PRs and no rights claims',()=>{
 const v=audit(matrix);
 for(const [code,pr] of [['057903',154],['057905',164],['061911',167]]){
  const row=v.rows.find(x=>x.code===code);
  assert.equal(row.parallelWork.pr,pr);
  assert.equal(row.currentYearCampusGISIndependentlyCertified,false);
  assert.equal(row.addressToThreeGradeSchoolE2EIndependentlyCertified,false);
 }
});
test('never turn registered parent link into certified home school or per-campus polygon',()=>{
 const v=audit(matrix);
 assert.equal(v.claimOfAllSchoolGISCoverage,false);
 assert.equal(v.releaseApproved,false);
 assert.equal(v.verifiedCurrentYearResidentialAssignments,0);
});
test('unregistered Chico cannot masquerade as a parent route',()=>{
 const v=audit(matrix),chico=v.rows.find(x=>x.name==='CHICO ISD');
 assert.equal(chico.knownParentRouteStatus,'unverified');
 assert.equal(chico.rootCauseClass,'parent-route-unverified');
});
test('source drift: any unrecognized failure mode must block classification',()=>{
 const x=clone(matrix);x.districts.find(d=>d.code==='057903').missingReason='all-data-complete';
 assert.ok(audit(x).errors.some(s=>s.includes('unclassified_reason:057903')));
});
test('inconsistent source counts cannot pass reported official route coverage',()=>{
 const x=clone(matrix);x.summary.publicISDsWithRegisteredParentRoute=108;
 assert.ok(audit(x).errors.includes('parent_route_source_counter_mismatch'));
});
