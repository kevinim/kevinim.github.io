'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const matrix=require('../data/dfw-school-coverage-matrix-2026.json');
const {audit}=require('../scripts/audit-dfw-school-qa-readiness.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
test('full DFW denominator is 108 ISDs and not only 6 or 7 focus districts',()=>{
 const v=audit(matrix);
 assert.equal(v.status,'NO_GO_FULL_DFW_CERTIFICATION');
 assert.equal(v.summary.publicISDs,108);
 assert.equal(v.summary.teaDistrictCodes,152);
 assert.equal(v.summary.independentlyResidentialE2EVerifiedDistricts,0);
 assert.ok(v.summary.missingOfficialParentRoutes>0);
});
test('school source current year does not prove address-to-school path',()=>{
 const v=audit(matrix);
 assert.ok(v.summary.registryCurrentYearGeometrySourceCount>0);
 assert.equal(v.summary.independentlyResidentialE2EVerifiedDistricts,0);
 assert.equal(v.summary.verifiedFullDFWCoverage,false);
});
test('misleading 100% DFW claimed residence assignment is rejected without evidence',()=>{
 const d=copy(matrix);
 d.summary.exactAddressAssignmentCoveragePercent=100;
 assert.ok(audit(d).blockers.includes('unsupported_full_coverage_claim'));
});
test('inconsistent per-district source coverage summaries are rejected',()=>{
 const d=copy(matrix);
 d.summary.publicISDsWithRegisteredParentRoute+=1;
 assert.ok(audit(d).blockers.includes('summary_count_mismatch:publicISDsWithRegisteredParentRoute'));
});
test('8 more official links would not be equated with 8 new current school polygons',()=>{
 const d=copy(matrix);let added=0;
 for(const district of d.districts){
  if(added===8)break;
  if(district.category==='public-isd'&&district.parentGuidance.status==='not-verified'){
   district.parentGuidance={status:'registered-official-source',lookupType:'finder-guidance',
    officialUrl:'https://example.org/official-finder',registryKey:district.code};
   district.missingReason='official-parent-route-linked-but-campus-gis-not-ingested';
   added++;
  }
 }
 d.summary.publicISDsWithRegisteredParentRoute+=added;
 d.summary.publicISDsMissingRegisteredParentRoute-=added;
 const before=audit(matrix),after=audit(d);
 assert.equal(added,8);
 assert.equal(after.summary.registeredOfficialParentRoutes,before.summary.registeredOfficialParentRoutes+8);
 assert.equal(after.summary.registryCurrentYearGeometrySourceCount,before.summary.registryCurrentYearGeometrySourceCount);
 assert.equal(after.summary.independentlyResidentialE2EVerifiedDistricts,0);
 assert.equal(after.status,'NO_GO_FULL_DFW_CERTIFICATION');
});
