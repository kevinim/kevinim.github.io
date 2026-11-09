'use strict';
// Scoped release authorization for the *address-derived* school assignment UI.
// NO district is currently approved for residential auto-assignment. A map
// polygon, campus point, school name, ZIP or Finder URL is NOT approval.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)Object.defineProperty(root,'ConditionalSchoolRelease',{
  value:api,writable:false,configurable:false
 });
})(typeof window!=='undefined'?window:null,function(){
 const CURRENT_YEAR='2026-27';
 const APPROVED_AUTO_DISTRICTS=Object.freeze({}); // Deliberately empty: no real residential E2E certification.
 const AUTOCANDIDATES=new Set(['current','finder-current','boundary-review','finder-boundary-review','unverified-year']);
 const SAFE_STATES=new Set(['needs-address-verification','apartment-split-review','feeder-review',
  'conflict','loading','error','unavailable']);
 function certified(district,grant){
  if(!district||!grant||grant.district!==district||
     grant.verdict!=='PASS'||grant.schoolYear!==CURRENT_YEAR||
     grant.independentReview!==true||grant.sourceRightsApproved!==true||
     !/^[a-f0-9]{64}$/.test(String(grant.evidenceSha256||'')))return false;
  const checks=grant.checks;
  if(!checks||['residentialHoldouts','officialFinder','campusIdentity',
   'currentYearPolygon','chromiumSchoolClick','gradeCoverage'].some(key=>checks[key]!==true))return false;
  if(!Array.isArray(grant.gradeLevels)||!['elementary','middle','high'].every(
   level=>grant.gradeLevels.includes(level)))return false;
  return true;
 }
 function decide(candidate,grants=APPROVED_AUTO_DISTRICTS){
  const district=typeof candidate?.district==='string'?candidate.district:'';
  const status=typeof candidate?.status==='string'?candidate.status:'unavailable';
  if(SAFE_STATES.has(status))return {allowed:false,kind:'preserve-warning',status,district};
  if(!AUTOCANDIDATES.has(status))return {allowed:false,kind:'finder-only',status:'conditional-finder-only',district};
  // A correctly formatted grant is never enough on its own. Grant records may
  // enter the immutable production list only after a separate reviewed PR and CI.
  if(!Object.prototype.hasOwnProperty.call(grants,district)||
     !certified(district,grants[district]))
   return {allowed:false,kind:'finder-only',status:'conditional-finder-only',district};
  if(status!=='current'&&status!=='finder-current')
   return {allowed:false,kind:'preserve-warning',status,district};
  return {allowed:true,kind:'certified-residential',status,district};
 }
 function apply(candidate){
  const decision=decide(candidate);
  if(decision.allowed)return candidate;
  // Preserve existing hard-error and split-address warnings, never show school
  // names from unreviewed GIS as an address assignment.
  if(decision.kind==='preserve-warning')return candidate;
  return {status:'conditional-finder-only',district:decision.district,
   releaseScope:'informational-only'};
 }
 function releaseSummary(){
  return Object.freeze({scope:'INFORMATIONAL_ONLY',automaticSchoolAssignment:'NO_GO',
   currentYearResidentialDistrictApprovals:Object.keys(APPROVED_AUTO_DISTRICTS).length,
   officialFinderLinks:'AVAILABLE_WHERE_SOURCE_REGISTERED',
   mapCampusMarkers:'INFORMATION_ONLY',
   externalPublicDeployment:'NOT_AUTHORIZED'});
 }
 return Object.freeze({decide,apply,certified,releaseSummary});
});
