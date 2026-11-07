'use strict';
// Cross-check a live Plano GIS point's four campus levels against the district's
// separately published feeder-pattern table. This is a conflict guard, NOT proof
// that the 2025-26 GIS shapes represent a verified 2026-27 polygon vintage.
const PLANO_FEEDER_LEVELS=['elementary','middle','high','senior'];
function planoFeederKey(value){
 return String(value||'').toLowerCase()
  .replace(/\([^)]*\)/g,' ')
  .replace(/\b(?:senior\s+high|sr\.?\s+high|elementary|middle|high)\s*(?:school|campus)?\b/g,' ')
  .replace(/\b(?:school|campus)\b/g,' ')
  .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function validPlanoFeederReference(reference){
 return reference?.sourceType==='current district-published feeder descriptions'
  &&reference?.academicYearExplicit===null
  &&Array.isArray(reference.feeders)
  &&reference.feeders.length===11
  &&reference.feeders.every(r=>typeof r.seniorHigh==='string'
   &&Array.isArray(r.elementary)&&r.elementary.length
   &&typeof r.middle==='string'&&typeof r.high==='string');
}
function evaluatePlanoFeederAssignment(features,reference){
 if(!validPlanoFeederReference(reference))return {status:'source-unavailable',observed:{}};
 const observed={};
 for(const level of PLANO_FEEDER_LEVELS){
  const raw=(Array.isArray(features)?features:[])
   .filter(f=>f?.properties?.gradeLevel===level)
   .map(f=>String(f.properties.school||'').trim()).filter(Boolean);
  const keys=[...new Set(raw.map(planoFeederKey).filter(Boolean))];
  if(keys.length!==1)return {status:'ambiguous',level,counts:{...observed,[level]:keys.length},observed};
  observed[level]=raw[0];
 }
 const key=level=>planoFeederKey(observed[level]);
 const matches=reference.feeders.filter(row=>
  row.elementary.some(s=>planoFeederKey(s)===key('elementary'))
  &&planoFeederKey(row.middle)===key('middle')
  &&planoFeederKey(row.high)===key('high')
  &&planoFeederKey(row.seniorHigh)===key('senior'));
 return {status:matches.length===1?'consistent':'disagreement',observed,
  matchingFeederPaths:matches.length,schoolYearVerified:false};
}
if(typeof module!=='undefined')module.exports={
 PLANO_FEEDER_LEVELS,planoFeederKey,validPlanoFeederReference,evaluatePlanoFeederAssignment
};
