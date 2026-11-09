'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluate}=require('../scripts/prosper-finder-ui-independent-policy.cjs');
function sample(){
 return {schemaVersion:1,source:'OFFICIAL_PROSPER_LINKED_INFOFINDER_BROWSER',
  officialUrl:'https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1',year:'2026-27',
  mode:'no-address-discovery',status:'UI_OPENED_ADDRESS_LOOKUP_NOT_CERTIFIED',
  schoolAssignmentIndependentlyCertified:false,signedReviewerCount:0,productionAuthorized:false,
  frames:[{host:'www.infofinderi.com',pathname:'/ifi/',controls:[{type:'text',placeholder:'Address'}],buttons:[]}],
  cases:[]};
}
test('even a successful official browser launch is not school assignment certification',()=>{
 const r=evaluate(sample());
 assert.equal(r.status,'OFFICIAL_UI_REACHABLE_NOT_ASSIGNMENT_PROOF');
 assert.equal(r.level2PromotionAllowed,false);
 assert.equal(r.level1PromotionAllowed,false);
 assert.equal(r.productionAuthorized,false);
 assert.equal(r.independentlyVerifiedResidentialAssignments,0);
});
test('spoofed official host and wrong school-year link cannot establish an approved source',()=>{
 for(const mutation of [
  x=>{x.officialUrl='https://www.infofinderi.com.evil.example/ifi/?cid=PI5FFG7RYZ1';},
  x=>{x.frames=[{host:'www.infofinderi.com.evil.example',pathname:'/ifi/',controls:[],buttons:[]}];},
  x=>{x.year='2025-26';}
 ]){
  const x=sample();mutation(x);assert.equal(evaluate(x).status,'INVALID_INDEPENDENT_BROWSER_EVIDENCE');
 }
});
test('false review or automatic Production approval fails closed',()=>{
 for(const key of ['schoolAssignmentIndependentlyCertified','productionAuthorized']){
  const x=sample();x[key]=true;
  assert.equal(evaluate(x).status,'INVALID_INDEPENDENT_BROWSER_EVIDENCE');
 }
});
test('a redacted UI entry cannot itself promote a district',()=>{
 const x=sample();x.cases=[{sampleId:'prosper-kirkwood',status:'UI_VISIBLE_SCHOOL_RESULT',
  independentReviewerApproved:false,releaseApproved:false}];
 const r=evaluate(x);
 assert.equal(r.status,'OFFICIAL_UI_REACHABLE_NOT_ASSIGNMENT_PROOF');
 assert.equal(r.independentlyVerifiedResidentialAssignments,0);
 assert.equal(r.level2PromotionAllowed,false);
});
test('live full addresses must not be emitted in any browser artifact',()=>{
 const x=sample();x.frames[0].buttons.push({text:'1441 Kirkwood Ln, Prosper TX 75078'});
 const r=evaluate(x);assert.ok(r.issues.includes('PRIVATE_OR_PUBLIC_ADDRESS_IN_BROWSER_EVIDENCE'));
});
