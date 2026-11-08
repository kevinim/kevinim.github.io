/* P41 healthcare access core: requires actual routed travel-time data; no guessed ETA.
 * Standalone CommonJS + classic browser script. No map integration or network calls.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HealthcareAccessCore=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function validFacility(row){
  return row&&typeof row==='object'&&/^[A-Z0-9]{6}$/.test(String(row.cmsFacilityId||''))&&
    typeof row.name==='string'&&typeof row.city==='string'&&
    [true,false,null].includes(row.emergencyServices);
 }
 function summarizeEmergencyAccess(facilities,travelMinutesByFacility,thresholds=[15,30]){
  if(!Array.isArray(facilities)||facilities.some(x=>!validFacility(x)))throw new TypeError('valid facilities required');
  if(!travelMinutesByFacility||typeof travelMinutesByFacility!=='object'||Array.isArray(travelMinutesByFacility))throw new TypeError('explicit route time map required');
  if(!Array.isArray(thresholds)||!thresholds.length||thresholds.some(t=>!Number.isFinite(t)||t<0||t>1440)||new Set(thresholds).size!==thresholds.length)throw new RangeError('invalid thresholds');
  const ed=facilities.filter(f=>f.emergencyServices===true);
  const seen=new Set(),candidates=[];let missing=0;
  for(const f of ed){
   if(seen.has(f.cmsFacilityId))throw new RangeError('duplicate CMS Facility ID');
   seen.add(f.cmsFacilityId);
   const v=travelMinutesByFacility[f.cmsFacilityId];
   if(v===null||v===undefined||v===''){missing++;continue}
   const n=Number(v);
   if(!Number.isFinite(n)||n<0||n>1440)throw new RangeError('invalid routed minutes for '+f.cmsFacilityId);
   candidates.push({cmsFacilityId:f.cmsFacilityId,name:f.name,city:f.city,driveMinutes:n});
  }
  candidates.sort((a,b)=>a.driveMinutes-b.driveMinutes||a.cmsFacilityId.localeCompare(b.cmsFacilityId));
  const counts=Object.fromEntries(thresholds.map(t=>[String(t),candidates.filter(f=>f.driveMinutes<=t).length]));
  return {nearestKnown:candidates[0]||null,accessCountsLowerBound:counts,
   totalCmsEmergencyFlagFacilities:ed.length,facilitiesWithKnownTravelTime:candidates.length,
   facilitiesMissingTravelTime:missing,completeTravelTimeCoverage:missing===0,
   limitation:'CMS ED flag does not verify 24/7 hours, trauma level, or all freestanding emergency centers. Counts are lower bounds until all EDs have verified route times.'};
 }
 return Object.freeze({validFacility,summarizeEmergencyAccess});
});