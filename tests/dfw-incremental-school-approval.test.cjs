'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {evaluate,LEVELS,REQUIRED}=require('../scripts/evaluate-dfw-incremental-school-approval.cjs');
const dataFile=path.join(__dirname,'../data/dfw-incremental-school-approval-evidence-2026.json');
const baseline=()=>JSON.parse(fs.readFileSync(dataFile,'utf8'));
const grades={elementary:'043901101',middle:'043901041',high:'043901001'};
const sample=(i)=>({
 sampleId:'public_case_0'+i,zip:i===2?'75002':'75001',
 publicResidentialSample:true,hasFullAddressInEvidence:false,
 officialFinderResultCapturedIndependently:true,dashboardAddressResolved:true,
 campusMarkersVisible:true,gradeExceptionReviewed:true,
 academicYear:'2026-27',reviewedOn:'2026-11-09',
 redactedEvidenceSha256:String(i).repeat(64),
 officialCampusIds:{...grades},dashboardCampusIds:{...grades}
});
function finderOnly(){
 const e=baseline();
 e.districts.AISD.finder={
  url:'https://www.allenisd.org/page/findaschool',
  operationalResultVerified:true,reviewedByDistrictSource:true,
  academicYear:'2026-27',observedOn:'2026-11-09'
 };
 return e;
}
function assignmentReady(){
 const e=finderOnly();
 e.districts.AISD.assignment={
  independentReviewerApproved:true,collectorId:'independent_collector',
  reviewerId:'independent_reviewer',reviewedOn:'2026-11-09',
  finderResultsIndependentOfDashboardGIS:true,
  cases:[sample(1),sample(2),sample(3)]
 };
 return e;
}
function boundaryReady(){
 const e=assignmentReady();
 e.districts.AISD.boundary={
  officialPublisherUrl:'https://www.allenisd.org/page/findaschool',
  academicYear:'2026-27',districtPublishedCurrentYear:true,
  reuseRightsReviewed:true,independentReviewerApproved:true,
  reviewerId:'geometry_reviewer',reviewedOn:'2026-11-09',
  cases:e.districts.AISD.assignment.cases.map(c=>({
   sampleId:c.sampleId,currentYearOfficialPolygon:true,
   schoolClickAndVisiblePolygon:true,officialCampusIdsExactlyMatch:true,
   gradePolygons:{elementary:true,middle:true,high:true}
  }))
 };
 return e;
}
const status=e=>evaluate(e,{today:'2026-11-09'});
test('eight focus district evidence records are enumerated; all unverified by default',()=>{
 const r=status(baseline());
 assert.deepEqual(r.errors,[]);
 assert.equal(REQUIRED.length,8);
 assert.equal(Object.keys(r.districts).length,8);
 assert.equal(r.counts[LEVELS.HOLD],8);
 assert.equal(r.scope.sevenDistrictFullGeometryReadyForOwnerReview,false);
 assert.equal(r.production.status,'NO_GO');
 assert.ok(Object.values(r.districts).every(x=>x.productionAuthorized===false));
});
test('a real official Finder navigation can be separately reported without school auto-assignment',()=>{
 const r=status(finderOnly());
 assert.equal(r.districts.AISD.tier,LEVELS.FINDER);
 assert.equal(r.districts.AISD.capabilities.officialFinderNavigation,true);
 assert.equal(r.districts.AISD.capabilities.autoAssignedSchoolMarkers,false);
 assert.equal(r.districts.AISD.capabilities.currentYearOfficialBoundaryOverlay,false);
 assert.equal(r.production.status,'NO_GO');
});
test('synthetic independently reviewed 3 public residences can make ONLY assignment tier ready',()=>{
 const r=status(assignmentReady());
 assert.equal(r.districts.AISD.tier,LEVELS.ASSIGNMENT);
 assert.equal(r.districts.AISD.capabilities.autoAssignedSchoolMarkers,true);
 assert.equal(r.districts.AISD.capabilities.currentYearOfficialBoundaryOverlay,false);
 assert.equal(r.production.status,'NO_GO');
 assert.equal(r.scope.sevenDistrictFullGeometryReadyForOwnerReview,false);
});
test('even a synthetic full polygon grade/click fixture never auto-authorizes production',()=>{
 const r=status(boundaryReady());
 assert.equal(r.districts.AISD.tier,LEVELS.FULL);
 assert.equal(r.districts.AISD.capabilities.currentYearOfficialBoundaryOverlay,true);
 assert.equal(r.districts.AISD.productionAuthorized,false);
 assert.equal(r.production.status,'NO_GO');
});
test('a URL that merely returns HTTP 200 or a stale link is not an operational Finder',()=>{
 const e=finderOnly();e.districts.AISD.finder.operationalResultVerified=false;
 assert.equal(status(e).districts.AISD.tier,LEVELS.HOLD);
 const e2=finderOnly();e2.districts.AISD.finder.observedOn='2025-11-01';
 assert.equal(status(e2).districts.AISD.tier,LEVELS.HOLD);
});
test('an injected address search URL or untrusted host never becomes approved Finder',()=>{
 const e=finderOnly();e.districts.AISD.finder.url='https://www.allenisd.org/page/findaschool?address=123+Main';
 assert.equal(status(e).districts.AISD.tier,LEVELS.HOLD);
 const f=finderOnly();f.districts.AISD.finder.url='https://www.allenisd.org.evil.test';
 assert.equal(status(f).districts.AISD.tier,LEVELS.HOLD);
});
test('a residential street address, exact coordinates or private keys in artifacts invalidates the entire review',()=>{
 for(const field of ['fullAddress','streetAddress','homeAddress','latitude','coordinates','residentEmail']){
  const e=assignmentReady();e.districts.AISD.assignment.cases[0][field]='sensitive';
  const r=status(e);
  assert.ok(r.errors.includes('PRIVATE_ADDRESS_OR_LOCATION_FIELD_FORBIDDEN'),field);
  assert.equal(r.districts.AISD.tier,LEVELS.HOLD,field);
 }
});
test('unreviewed, correlated, or self-approved Finder outcomes cannot unlock assignment',()=>{
 const tests=[
  e=>{e.districts.AISD.assignment.independentReviewerApproved=false;},
  e=>{e.districts.AISD.assignment.reviewerId=e.districts.AISD.assignment.collectorId;},
  e=>{e.districts.AISD.assignment.finderResultsIndependentOfDashboardGIS=false;},
  e=>{e.districts.AISD.assignment.reviewedOn='2024-01-01';}
 ];
 for(const mutate of tests){
  const e=assignmentReady();mutate(e);
  assert.equal(status(e).districts.AISD.tier,LEVELS.FINDER);
 }
});
test('one ZIP, two cases, duplicate cases, and fabricated old academic year fail assignment gate',()=>{
 const mods=[
  e=>{e.districts.AISD.assignment.cases[1].zip='75001';},
  e=>{e.districts.AISD.assignment.cases.pop();},
  e=>{e.districts.AISD.assignment.cases[1].sampleId='public_case_01';},
  e=>{e.districts.AISD.assignment.cases[2].academicYear='2025-26';}
 ];
 for(const mutate of mods){
  const e=assignmentReady();mutate(e);
  assert.equal(status(e).districts.AISD.tier,LEVELS.FINDER);
 }
});
test('school ID mismatch, special-program exception and absent marker fail assignment gate',()=>{
 for(const mutate of [
  c=>{c.dashboardCampusIds.elementary='043901999';},
  c=>{c.gradeExceptionReviewed=false;},
  c=>{c.campusMarkersVisible=false;},
  c=>{c.officialFinderResultCapturedIndependently=false;}
 ]){
  const e=assignmentReady();mutate(e.districts.AISD.assignment.cases[1]);
  assert.equal(status(e).districts.AISD.tier,LEVELS.FINDER);
 }
});
test('a historical 2025-26 polygon may not upgrade certified school-only tier',()=>{
 const e=boundaryReady();e.districts.AISD.boundary.academicYear='2025-26';
 assert.equal(status(e).districts.AISD.tier,LEVELS.ASSIGNMENT);
 const f=boundaryReady();f.districts.AISD.boundary.districtPublishedCurrentYear=false;
 assert.equal(status(f).districts.AISD.tier,LEVELS.ASSIGNMENT);
});
test('no visible school click, no reuse review or non-matching grade polygons cannot upgrade to full',()=>{
 for(const mutate of [
  e=>{e.districts.AISD.boundary.cases[0].schoolClickAndVisiblePolygon=false;},
  e=>{e.districts.AISD.boundary.cases[1].gradePolygons.high=false;},
  e=>{e.districts.AISD.boundary.reuseRightsReviewed=false;},
  e=>{e.districts.AISD.boundary.independentReviewerApproved=false;}
 ]){
  const e=boundaryReady();mutate(e);
  assert.equal(status(e).districts.AISD.tier,LEVELS.ASSIGNMENT);
 }
});
test('wrong academic year, unpinned production commit or fake deployment permission fail closed',()=>{
 for(const mutate of [
  e=>{e.academicYear='2025-26';},
  e=>{e.explicitlyAuthorizesProduction=true;}
 ]){
  const e=boundaryReady();mutate(e);
  const r=status(e);assert.ok(r.errors.length);
  assert.equal(r.districts.AISD.tier,LEVELS.HOLD);
 }
 const e=boundaryReady();const r=evaluate(e,{today:'2026-11-09',productionCommit:'my-commit'});
 assert.ok(r.errors.includes('PRODUCTION_COMMIT_NOT_PINNED'));
 assert.equal(r.districts.AISD.tier,LEVELS.HOLD);
});
test('unknown district evidence fails closed instead of silently creating an approved ISD',()=>{
 const e=assignmentReady();e.districts.FAKE=e.districts.AISD;
 const r=status(e);assert.ok(r.errors.includes('UNKNOWN_DISTRICT_EVIDENCE'));
 assert.equal(r.counts[LEVELS.HOLD],8);
});

test('a field named address, unit or raw geolocation is rejected even without address prefix',()=>{
 for(const key of ['address','unit','lat','lng','geoPoint']){
  const e=assignmentReady();e.districts.AISD.assignment.cases[0][key]='sensitive';
  const r=status(e);assert.ok(r.errors.includes('PRIVATE_ADDRESS_OR_LOCATION_FIELD_FORBIDDEN'),key);
  assert.equal(r.districts.AISD.tier,LEVELS.HOLD,key);
 }
});
test('impossible dates do not pass the 90-day freshness requirement',()=>{
 const e=finderOnly();e.districts.AISD.finder.observedOn='2026-02-30';
 assert.equal(status(e).districts.AISD.tier,LEVELS.HOLD);
});
