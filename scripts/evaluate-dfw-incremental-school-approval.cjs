#!/usr/bin/env node
'use strict';
// Incremental district capability review. This is NOT the mandatory production
// release gate: #148's seven-district full-polygon gate remains fail-closed.
const fs=require('node:fs');
const path=require('node:path');
const {official}=require('../trusted-link-policy.js');
const ROOT=path.resolve(__dirname,'..');
const POLICY_YEAR='2026-27';
const REQUIRED=Object.freeze([
 ['FISD','Frisco ISD'],['PISD','Plano ISD'],['AISD','Allen ISD'],
 ['LISD','Lewisville ISD'],['PROSPER','Prosper ISD'],['CFB','CFB ISD'],
 ['043907','McKinney ISD'],['057912','Irving ISD']
]);
const LEVELS=Object.freeze({
 FULL:'LEVEL_1_ASSIGNMENT_AND_CURRENT_BOUNDARY',
 ASSIGNMENT:'LEVEL_2_ASSIGNMENT_ONLY',
 FINDER:'LEVEL_3_VERIFIED_OFFICIAL_FINDER_ONLY',
 HOLD:'LEVEL_4_UNVERIFIED_HOLD'
});
const GRADE_KEYS=Object.freeze(['elementary','middle','high']);
function isDay(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));}
function freshDay(s,today,maxDays=90){
 if(!isDay(s)||!isDay(today))return false;
 const n=(Date.parse(today+'T00:00:00Z')-Date.parse(s+'T00:00:00Z'))/86400000;
 return n>=0&&n<=maxDays;
}
function safeUrl(value){
 if(typeof value!=='string'||official(value)!==value)return false;
 const u=new URL(value);
 // No search terms/private address fields, credentials or fragments in audit sources.
 return !u.search&&!u.hash&&!u.username&&!u.password;
}
function containsPrivateKeys(v){
 if(!v||typeof v!=='object')return false;
 if(Array.isArray(v))return v.some(containsPrivateKeys);
 return Object.keys(v).some(k=>/(^|_)(streetaddress|fulladdress|homeaddress|apartmentunit|unitnumber|latitude|longitude|coordinates|residentname|residentemail|geocode)(_|$)/i.test(k)||
  containsPrivateKeys(v[k]));
}
function countsForYear(c,academicYear){
 return c&&c.academicYear===academicYear &&
  c.publicResidentialSample===true&&c.hasFullAddressInEvidence!==true&&
  c.officialFinderResultCapturedIndependently===true&&
  c.dashboardAddressResolved===true&&c.gradeExceptionReviewed===true&&
  c.campusMarkersVisible===true&&
  /^\d{5}$/.test(String(c.zip||''))&&
  /^[a-z0-9][a-z0-9_-]{5,48}$/i.test(String(c.sampleId||''))&&
  /^[a-f0-9]{64}$/i.test(String(c.redactedEvidenceSha256||''))&&
  GRADE_KEYS.every(grade=>{
   const a=c.officialCampusIds?.[grade],b=c.dashboardCampusIds?.[grade];
   return typeof a==='string'&&/^\d{9}$/.test(a)&&a===b;
  });
}
function evaluateDistrict(code,d,{today,academicYear}){
 const blockers=[],result={code,name:REQUIRED.find(x=>x[0]===code)?.[1]||code};
 const finder=d?.finder||{},assignment=d?.assignment||{},boundary=d?.boundary||{};
 let tier=LEVELS.HOLD;
 const finderPass=safeUrl(finder.url)&&finder.operationalResultVerified===true&&
  finder.reviewedByDistrictSource===true&&finder.academicYear===academicYear&&
  freshDay(finder.observedOn,today);
 if(!finderPass)blockers.push('OFFICIAL_CURRENT_FINDER_OPERATION_NOT_VERIFIED');
 if(finderPass)tier=LEVELS.FINDER;
 const cases=Array.isArray(assignment.cases)?assignment.cases:[];
 const uniqueIds=new Set(cases.map(c=>c?.sampleId));
 const zips=new Set(cases.map(c=>String(c?.zip||'')));
 const hashes=new Set(cases.map(c=>c?.redactedEvidenceSha256));
 const reviewerPass=assignment.independentReviewerApproved===true&&
  typeof assignment.collectorId==='string'&&assignment.collectorId.length>=3&&
  typeof assignment.reviewerId==='string'&&assignment.reviewerId.length>=3&&
  assignment.collectorId!==assignment.reviewerId&&
  freshDay(assignment.reviewedOn,today);
 const samplePass=cases.length>=3&&uniqueIds.size===cases.length&&
  zips.size>=2&&hashes.size===cases.length&&
  cases.every(c=>countsForYear(c,academicYear)&&freshDay(c.reviewedOn,today));
 const assignmentPass=finderPass&&reviewerPass&&samplePass&&
  assignment.finderResultsIndependentOfDashboardGIS===true;
 if(!assignmentPass)blockers.push('INDEPENDENT_THREE_RESIDENCE_GRADE_ASSIGNMENTS_NOT_VERIFIED');
 if(assignmentPass)tier=LEVELS.ASSIGNMENT;
 const matched=Array.isArray(boundary.cases)?boundary.cases:[];
 const caseIds=new Set(cases.map(c=>c.sampleId));
 const boundaryCasePass=assignmentPass&&matched.length===cases.length&&
  new Set(matched.map(c=>c?.sampleId)).size===cases.length&&
  matched.every(c=>caseIds.has(c.sampleId)&&
   c.currentYearOfficialPolygon===true&&c.schoolClickAndVisiblePolygon===true&&
   c.officialCampusIdsExactlyMatch===true&&
   GRADE_KEYS.every(grade=>c.gradePolygons?.[grade]===true));
 const boundaryPass=boundaryCasePass&&
  safeUrl(boundary.officialPublisherUrl)&&
  boundary.academicYear===academicYear&&boundary.districtPublishedCurrentYear===true&&
  boundary.reuseRightsReviewed===true&&boundary.independentReviewerApproved===true&&
  typeof boundary.reviewerId==='string'&&boundary.reviewerId.length>=3&&
  boundary.reviewerId!==assignment.collectorId&&
  freshDay(boundary.reviewedOn,today);
 if(!boundaryPass)blockers.push('CURRENT_YEAR_OFFICIAL_POLYGON_AND_CLICK_NOT_VERIFIED');
 if(boundaryPass)tier=LEVELS.FULL;
 result.tier=tier;
 result.capabilities={
  officialFinderNavigation:finderPass,
  autoAssignedSchoolMarkers:assignmentPass,
  currentYearOfficialBoundaryOverlay:boundaryPass
 };
 result.blockers=blockers;
 result.reviewerAction=boundaryPass?'OWNER_RELEASE_REVIEW_REQUIRED':
  assignmentPass?'BOUNDARY_GIS_REMAINS_HOLD':
  finderPass?'OFFICIAL_NAVIGATION_ONLY':'DO_NOT_SHOW_UNVERIFIED_AUTO_ASSIGNMENT';
 result.productionAuthorized=false;
 return result;
}
function evaluate(evidence,{today='2026-11-09',productionCommit=null}={}){
 const errors=[];
 if(evidence?.schemaVersion!==2)errors.push('INVALID_POLICY_SCHEMA');
 if(evidence?.academicYear!==POLICY_YEAR)errors.push('NOT_2026_27_POLICY_EVIDENCE');
 if(!isDay(today))errors.push('INVALID_REVIEW_DATE');
 if(containsPrivateKeys(evidence))errors.push('PRIVATE_ADDRESS_OR_LOCATION_FIELD_FORBIDDEN');
 if(evidence?.datasetKind!=='REDACTED_REVIEW_ATTESTATIONS_ONLY')
  errors.push('UNTRUSTED_EVIDENCE_TYPE');
 if(productionCommit&&evidence?.productionCommit!==productionCommit)
  errors.push('PRODUCTION_COMMIT_NOT_PINNED');
 if(evidence?.explicitlyAuthorizesProduction===true)
  errors.push('EVIDENCE_CANNOT_AUTHORIZE_PRODUCTION');
 const districts={};
 for(const [code] of REQUIRED){
  districts[code]=evaluateDistrict(code,evidence?.districts?.[code],{today,academicYear:POLICY_YEAR});
 }
 const unknown=Object.keys(evidence?.districts||{}).filter(x=>!REQUIRED.some(d=>d[0]===x));
 if(unknown.length)errors.push('UNKNOWN_DISTRICT_EVIDENCE');
 if(errors.length){
  for(const d of Object.values(districts)){
   d.tier=LEVELS.HOLD;
   d.capabilities={officialFinderNavigation:false,autoAssignedSchoolMarkers:false,
    currentYearOfficialBoundaryOverlay:false};
   d.productionAuthorized=false;
   d.blockers=['INVALID_OR_UNTRUSTED_EVIDENCE',...d.blockers];
  }
 }
 const tally={};for(const level of Object.values(LEVELS))tally[level]=0;
 for(const d of Object.values(districts))tally[d.tier]++;
 const seven=REQUIRED.filter(x=>x[0]!=='057912').map(x=>districts[x[0]]);
 return {
  schemaVersion:2,policy:'DFW_PER_DISTRICT_CAPABILITY_EVIDENCE',asOf:today,
  academicYear:POLICY_YEAR,errors,districts,counts:tally,
  scope:{districtsEvaluated:REQUIRED.length,
   sevenDistrictFullGeometryReadyForOwnerReview:errors.length===0&&seven.every(d=>d.tier===LEVELS.FULL),
   irvingIsOptionalExpansion:true},
  production:{status:'NO_GO',ownerApprovalRequired:true,
   note:'Evidence tier readiness is not production authorization; mandatory #148 original full-release job and security integration remain in force.'}
 };
}
function runCli(){
 const input=process.argv.find(x=>x.startsWith('--evidence='))?.split('=').slice(1).join('=')||
  'data/dfw-incremental-school-approval-evidence-2026.json';
 const output=process.argv.find(x=>x.startsWith('--output='))?.split('=').slice(1).join('=')||
  'artifacts/dfw-per-district-capability-review.json';
 let source,report;
 try{
  source=JSON.parse(fs.readFileSync(path.resolve(ROOT,input),'utf8'));
  report=evaluate(source,{today:process.env.DFW_REVIEW_DATE||'2026-11-09',
   productionCommit:process.env.DFW_PRODUCTION_SHA||null});
 }catch(err){
  report={schemaVersion:2,errors:['EVIDENCE_FILE_MISSING_OR_INVALID'],
   production:{status:'NO_GO',ownerApprovalRequired:true}};
  process.exitCode=1;
 }
 fs.mkdirSync(path.dirname(path.resolve(ROOT,output)),{recursive:true});
 fs.writeFileSync(path.resolve(ROOT,output),JSON.stringify(report,null,2)+'\n');
 console.log('DFW_DISTRICT_CAPABILITY_REVIEW '+JSON.stringify({
  errors:report.errors,counts:report.counts,production:report.production,
  output
 }));
 if(report.errors?.length)process.exitCode=1;
}
if(require.main===module)runCli();
module.exports={REQUIRED,LEVELS,POLICY_YEAR,evaluate,evaluateDistrict,safeUrl,freshDay};
