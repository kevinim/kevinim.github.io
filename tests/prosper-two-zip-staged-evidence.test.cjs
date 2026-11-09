'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assess,campusRow}=require('../scripts/audit-prosper-two-zip-staged-evidence.cjs');
const mk=(s,g)=>({status:'OFFICIAL_POINT_GIS_CORROBORATED',id:s,sampleId:s,
 officialCodes:['101','041','001'],
 GIS:Object.fromEntries(['elementary','middle','high'].map((grade,i)=>[grade,[{
  campusId:'043912'+['101','041','001'][i],code:['101','041','001'][i]
 }]])),
 GISSchoolCodesByGrade:Object.fromEntries(['elementary','middle','high'].map((grade,i)=>[grade,[{
  campusId:'043912'+['101','041','001'][i],code:['101','041','001'][i]
 }]]))});
const fixture=()=>({
 a:{district:'PROSPER',academicYear:'2026–27',productionReleaseApproved:false,
    results:[mk('public_a'),mk('public_b'),mk('public_c'),{id:'bad_address',status:'INCONCLUSIVE',officialCodes:[]}]},
 b:{district:'PROSPER',academicYear:'2026-27',release:'NO_GO',schoolEnrollmentCertified:false,
    cases:[mk('public_other_zip')]},
 ui:{schemaVersion:1,officialUrl:'https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1',
     schoolAssignmentIndependentlyCertified:false,productionAuthorized:false,cases:[]}
});
test('crosswalk requires exact 9-digit Prosper TEA campus ID and 3-digit official code',()=>{
 const r=mk('public_a');assert.equal(campusRow(r),true);
 r.GIS.middle[0].campusId='043912999';assert.equal(campusRow(r),false);
});
test('two ZIP source correlation is a candidate only and never an automatic Level2 GO',()=>{
 const {a,b,ui}=fixture();const r=assess(a,b,ui);
 assert.equal(r.technicalStatus,'TWO_ZIP_CORRELATED_CAMPUS_SOURCE_READY_FOR_REVIEW');
 assert.deepEqual(r.summary.zipCodes,['75035','75078']);
 assert.equal(r.summary.technicalTotal,4);
 assert.equal(r.candidacy.schoolAssignmentLevel2Approved,false);
 assert.equal(r.production.status,'NO_GO');
 assert.equal(r.summary.independentHumanReviewedSamples,0);
});
test('a browser status without human evidence does not certify enrollment',()=>{
 const {a,b,ui}=fixture();
 ui.cases=[{status:'UI_VISIBLE_SCHOOL_RESULT',hasVisibleGradeResult:true}];
 const r=assess(a,b,ui);
 assert.equal(r.summary.currentlyRedactedIndependentUiGradeResultCandidates,1);
 assert.equal(r.candidacy.schoolAssignmentLevel2Approved,false);
 assert.equal(r.production.status,'NO_GO');
});
test('single ZIP, wrong campus ID, changed school year or source false claim remain blocked',()=>{
 for(const change of [
  x=>{x.b.cases=[];},
  x=>{x.b.cases[0].GIS.middle[0].campusId='043912999';},
  x=>{x.a.academicYear='2025–26';},
  x=>{x.ui.schoolAssignmentIndependentlyCertified=true;}
 ]){
  const f=fixture();change(f);
  assert.equal(assess(f.a,f.b,f.ui).technicalStatus,'INCOMPLETE_OR_INVALID_SOURCE');
 }
});

test('new 75035 probe officialSchoolCodes field is accepted only with matching 9-digit campus IDs',()=>{
 const x=mk('public_other_zip');
 x.officialSchoolCodes=x.officialCodes;
 delete x.officialCodes;
 assert.equal(campusRow(x),true);
 x.officialSchoolCodes=['101','041','999'];
 assert.equal(campusRow(x),false);
});
