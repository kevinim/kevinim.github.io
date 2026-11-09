'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluate}=require('../scripts/audit-p1-prosper-address-gis-evidence.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const codes=['101','041','006'];
function sample(){
 const ids=['synthetic-a','synthetic-b','synthetic-c','synthetic-d','synthetic-e'];
 const fixture={district:'PROSPER',cases:ids.map(id=>({id}))};
 const rows=ids.map((id,i)=>i<4?{
  id,status:'OFFICIAL_POINT_GIS_CORROBORATED',officialCodes:codes,
  GIS:{elementary:[{code:'101',year:'2026–27'}],middle:[{code:'041',year:'2026–27'}],
   high:[{code:'006',year:'2026–27'}]}
 }:{id,status:'INCONCLUSIVE',reason:'NO_EXACT_LIVE_POINT_ADDRESS'});
 const source={schemaVersion:1,district:'PROSPER',academicYear:'2026–27',
  status:'SOURCE_CORROBORATION_PASS_NOT_ENROLLMENT',geocodeUsedLive:true,
  districtPointResultsUsedLive:true,allSchoolsVerifiedByIndependentAuthority:false,
  householdEnrollmentVerified:false,productionReleaseApproved:false,
  results:rows,corroborated:4,disagreements:[]};
 const checks=ids.slice(0,4).flatMap(id=>[390,1366].map(viewport=>({
  id,viewport,status:'PUBLIC_HOUSE_BROWSER_OFFICIAL_GIS_CORROBORATED',
  district:'PROSPER',assignmentStatus:'current',geocodeUsable:true,
  homeMapVisible:'true',homePolygonCount:3,homeLayerGroups:1,
  renderedPolygonCount:1,listMatchedSchoolButtons:3,
  selectedSchool:'Synthetic test campus',clearHomeLeavesNoZone:true,issue:null
 })));
 const browser={schemaVersion:1,status:'PASS_BROWSER_MAP_ONLY',checks,passes:8,
  genuineEsriGeocoderNotReplayed:true,officialInfofinderPointSourceGenuine:true,
  independentDistrictFinderUiVerified:false,independentVendorSource:false,
  independentEnrollmentOrUnitEligibility:false,productionReleaseApproved:false};
 return {source,browser,fixture};
}
const check=(mutate,expected)=>{
 const d=sample();mutate(d);
 const r=evaluate(d.source,d.browser,d.fixture);
 assert.equal(r.technicalStatus,'NO_GO_TECHNICAL_QA');
 assert.equal(r.releaseGate.status,'NO_GO');
 assert.ok(r.issues.includes(expected),JSON.stringify(r.issues));
};
test('full synthetic Prosper technical agreement stays release NO-GO',()=>{
 const d=sample(),r=evaluate(d.source,d.browser,d.fixture);
 assert.equal(r.technicalStatus,'PASS_TECHNICAL_QA_ONLY',JSON.stringify(r.issues));
 assert.deepEqual(r.totals,{sampled:5,corroborated:4,quarantined:1,browserChecks:8,browserPassed:8});
 assert.equal(r.releaseGate.status,'NO_GO');
 assert.equal(r.releaseGate.reviewerApproved,false);
 assert.equal(r.releaseGate.independentOfficialFinderUiVerified,false);
 assert.equal(r.releaseGate.independentResidentialAssignmentVerified,false);
});
test('stale 2025 GIS metadata cannot pass',()=>check(d=>d.source.academicYear='2025–26',
 'OFFICIAL_GIS_SOURCE_REPORT_NOT_PASS'));
test('same source vendor cannot be relabeled independent',()=>check(d=>d.browser.independentVendorSource=true,
 'BROWSER_PROVENANCE_OR_RELEASE_FLAG_INVALID'));
test('source report cannot claim production approved',()=>check(d=>d.source.productionReleaseApproved=true,
 'SOURCE_PROVENANCE_OR_RELEASE_FLAG_INVALID'));
test('a missing exact address stays quarantined and is never counted as school confirmed',()=>check(d=>{
 d.source.results[4].status='OFFICIAL_POINT_GIS_CORROBORATED';d.source.corroborated=5;},
 'RESIDENTIAL_CROSSCHECK_COVERAGE_CHANGED'));
test('official three-grade school code drift blocks P1',()=>check(d=>{
 d.source.results[0].officialCodes[0]='999';},'SOURCE_CODE_OR_GRADE_YEAR_MISMATCH'));
test('grade-level school vintage drift blocks P1',()=>check(d=>{
 d.source.results[1].GIS.middle[0].year='2025–26';},'SOURCE_CODE_OR_GRADE_YEAR_MISMATCH'));
test('mobile or desktop home polygons not rendered blocks P1',()=>check(d=>{
 d.browser.checks[0].homePolygonCount=0;},'BROWSER_INTERACTIVE_MAP_OR_CLEAR_FAILED'));
test('school click failure or address clear failure blocks P1',()=>check(d=>{
 d.browser.checks[2].clearHomeLeavesNoZone=false;},'BROWSER_INTERACTIVE_MAP_OR_CLEAR_FAILED'));
test('no fake screenshots or duplicated viewport evidence',()=>check(d=>{
 d.browser.checks[0].viewport=1366;},'BROWSER_UNKNOWN_OR_DUPLICATE_CASE'));
test('one missing 390px viewport cannot pass P1',()=>check(d=>{
 d.browser.checks.pop();d.browser.passes=7;},'BROWSER_RUN_COUNT_CHANGED'));
test('missing report inputs must fail closed',()=>{
 const r=evaluate(null,null,null);
 assert.equal(r.technicalStatus,'NO_GO_TECHNICAL_QA');
 assert.equal(r.releaseGate.status,'NO_GO');
});
