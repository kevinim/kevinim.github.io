'use strict';
/**
 * Independent QA decision helper, not dashboard runtime integration.
 * TEA district county is administrative metadata, not evidence that a school
 * campus is physically located in that county or assigns any home address.
 */
const exceptions = require('./evidence/tea-dfw-locality-exceptions-20261111.json');
function assessedLocality(record, evidence=exceptions) {
  if(!record || !/^\d{9}$/.test(record.id||'')) return {status:'unknown',locationDisplayEligible:false,homeAssignmentVerified:false,reason:'invalid-campus-id'};
  const row=evidence.campuses?.[record.id];
  if(!row) return {status:'not-assessed',locationDisplayEligible:false,homeAssignmentVerified:false,reason:'outside-evidence-sample'};
  if(record.id.slice(0,6)!==evidence.administrativeDistrictId ||
      record.districtCounty!==row.inventoryAdministrativeCounty ||
      String(record.officialName||record.name).toUpperCase()!==row.officialName) {
    return {status:'unknown',locationDisplayEligible:false,homeAssignmentVerified:false,reason:'campus-identity-provenance-mismatch'};
  }
  if(!['out-of-dfw','verified-dfw-location'].includes(row.campusLocality) ||
      row.sourceStatus!=='verified-operator-location-and-TEA-id' ||
      row.notEvidenceOfAssignedSchool!==true ||
      !Array.isArray(row.sourceURLs)||row.sourceURLs.length<2) {
    return {status:'unknown',locationDisplayEligible:false,homeAssignmentVerified:false,reason:'incomplete-external-locality-evidence'};
  }
  for(const source of row.sourceURLs){
    let u;try{u=new URL(source)}catch{return {status:'unknown',locationDisplayEligible:false,homeAssignmentVerified:false,reason:'invalid-source-url'}}
    if(u.protocol!=='https:'||!['tea.texas.gov','texasworks.com'].includes(u.hostname))return {status:'unknown',locationDisplayEligible:false,homeAssignmentVerified:false,reason:'untrusted-source-host'};
  }
  return {
    status:row.campusLocality,
    locationDisplayEligible:row.campusLocality==='verified-dfw-location',
    homeAssignmentVerified:false,
    reason:row.campusLocality==='out-of-dfw'?'operator-confirms-campus-outside-dfw':'operator-confirms-campus-within-dfw-not-residence-assignment',
    sourceURLs:row.sourceURLs
  };
}
module.exports={assessedLocality};
