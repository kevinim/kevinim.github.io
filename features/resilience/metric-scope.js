/* P42: source-scope guard. State reliability context is NOT neighborhood risk. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ResilienceScope=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function validateStateSnapshot(d){
  return d&&d.metadata?.geography==='TX_STATE_ONLY'&&d.metadata?.uiIntegration===false&&
    Array.isArray(d.records)&&d.records.length===2&&d.records.every(r=>
      r.state==='TX'&&[2024,2025].includes(r.year)&&
      [r.allEvents?.saidi,r.allEvents?.saifi,r.allEvents?.caidi,
       r.excludingMajorEvents?.saidi,r.excludingMajorEvents?.saifi,
       r.excludingMajorEvents?.caidi].every(n=>Number.isFinite(n)&&n>=0));
 }
 function reliabilityContext(data,scope){
  if(!validateStateSnapshot(data))throw new TypeError('invalid EIA state context');
  if(!scope||typeof scope!=='object')throw new TypeError('explicit geographical scope required');
  if(scope.kind==='STATE'&&scope.id==='TX'){
    return {status:'STATEWIDE_CONTEXT_ONLY',scope:{kind:'STATE',id:'TX'},
      observations:data.records.map(r=>({year:r.year,coveragePercent:r.coveragePercent,
        withMajorEvents:r.allEvents,withoutMajorEvents:r.excludingMajorEvents})),
      neighborhoodRiskScore:null,localOutageDurationMinutes:null,
      warning:'Texas statewide reliability is not an estimate for a city, ZIP, utility, feeder, or address.'};
  }
  return {status:'LOCAL_EVIDENCE_NOT_AVAILABLE',scope,observations:[],
    neighborhoodRiskScore:null,localOutageDurationMinutes:null,
    warning:'No verified local electric-service territory or outage duration. Do not extrapolate state figures.'};
 }
 return Object.freeze({validateStateSnapshot,reliabilityContext});
});
