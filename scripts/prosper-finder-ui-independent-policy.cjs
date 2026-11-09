'use strict';
// This independent browser observation never upgrades a district to Level 2 or
// Level 1 without separate 2026-27 reviewer-approved three-grade address proof.
const APPROVED_HOST='www.infofinderi.com';
function evaluate(input){
 const issues=[];
 const check=(ok,issue)=>{if(!ok)issues.push(issue)};
 check(input?.schemaVersion===1,'INVALID_BROWSER_SCHEMA');
 check(input?.source==='OFFICIAL_PROSPER_LINKED_INFOFINDER_BROWSER','UNVERIFIED_SOURCE');
 check(input?.officialUrl==='https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1','UNVERIFIED_OFFICIAL_LINK');
 check(input?.year==='2026-27','INVALID_SCHOOL_YEAR');
 check(input?.schoolAssignmentIndependentlyCertified===false,'FALSE_RESIDENCE_CERTIFICATION');
 check(input?.productionAuthorized===false,'FALSE_PRODUCTION_APPROVAL');
 const frames=Array.isArray(input?.frames)?input.frames:[];
 check(frames.some(f=>f.host===APPROVED_HOST),'OFFICIAL_FRAME_NOT_SEEN');
 for(const f of frames){
  check(!f.host||/^[a-z0-9.-]{3,120}$/i.test(f.host),'INVALID_HOST_ORIGIN');
  check(!JSON.stringify(f).match(/1441 Kirkwood|771 Salada|560 Corley|1524 Vermillion|2970 Sunfish/i),
   'PRIVATE_OR_PUBLIC_ADDRESS_IN_BROWSER_EVIDENCE');
 }
 const cases=Array.isArray(input?.cases)?input.cases:[];
 for(const c of cases){
  check(/^[a-z0-9_-]{5,50}$/i.test(c.sampleId||''),'INVALID_REDACTED_SAMPLE_ID');
  check(['UI_VISIBLE_SCHOOL_RESULT','FINDER_LOOKUP_INCONCLUSIVE','LOOKUP_NOT_ATTEMPTED'].includes(c.status),
   'INVALID_UI_OBSERVATION');
  check(c.independentReviewerApproved!==true,'NO_REVIEWER_APPROVAL_FROM_AUTOMATION');
  check(c.releaseApproved!==true,'NO_RELEASE_APPROVAL_FROM_AUTOMATION');
  check(!('address' in c)&&!('latitude' in c)&&!('longitude' in c),'NO_ADDRESS_IN_ARTIFACT');
 }
 return {status:issues.length?'INVALID_INDEPENDENT_BROWSER_EVIDENCE':
  input.status==='UI_OPENED_ADDRESS_LOOKUP_NOT_CERTIFIED'?'OFFICIAL_UI_REACHABLE_NOT_ASSIGNMENT_PROOF':
  input.status==='DISCOVERY_ONLY_NO_ADDRESS_SUBMISSION'?'UI_DISCOVERY_ONLY':
  'UI_INCONCLUSIVE_NO_INDEPENDENT_ASSIGNMENT',
  issues,independentlyVerifiedResidentialAssignments:0,
  level2PromotionAllowed:false,level1PromotionAllowed:false,
  productionAuthorized:false};
}
module.exports={evaluate};
