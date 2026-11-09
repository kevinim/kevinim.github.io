'use strict';
// Independent evidence rules for public-home / apartment-complex address QA.
// A unit number is NOT a default prerequisite; only official documented splits
// can require a building/unit lookup. This module never invents school results.
const LEVELS=['elementary','middle','high'];
function normalize(s){return String(s||'').normalize('NFKD').toLowerCase()
 .replace(/\b(school|elementary|middle|high|senior|sr|campus|academy)\b/g,'')
 .replace(/[^a-z0-9]/g,'');}
function standardYear(value){return String(value||'').replace(/[–—]/g,'-').trim();}
function resolveApartmentPolicy(sample,officialException){
 const isApartment=sample?.propertyType==='apartment-complex';
 if(!isApartment)return {lookup:'STREET_ADDRESS',unitRequired:false,exception:false};
 // Only district-published, precisely matching exception evidence permits
 // escalating to a building/unit lookup (not generic speculation).
 const valid=officialException?.verified===true
  &&officialException?.district===sample.districtHint
  &&officialException?.complexId===sample.id
  &&/^https:\/\//.test(officialException?.officialUrl||'')
  &&['BUILDING','UNIT'].includes(officialException?.scope);
 if(valid)return {lookup:officialException.scope==='UNIT'?'UNIT_EXCEPTION':'BUILDING_EXCEPTION',
  unitRequired:officialException.scope==='UNIT',exception:true,
  officialUrl:officialException.officialUrl};
 if(sample?.districtHint==='LISD')
  return {lookup:'DISTRICT_APARTMENT_COMPLEX_PICKER',unitRequired:false,exception:false};
 return {lookup:'STREET_ADDRESS_OR_COMPLEX',unitRequired:false,exception:false};
}
function compareFinderToDashboard({sample,official,display}){
 const apt=resolveApartmentPolicy(sample,official?.documentedComplexException);
 if(!official||official.verified!==true||official.method!=='OFFICIAL_FINDER_UI'
    ||official.district!==sample?.districtHint
    ||standardYear(official.schoolYear)!=='2026-27'
    ||!/^https:\/\//.test(official.sourceUrl||''))
  return {status:'UNVERIFIED_OFFICIAL_FINDER',unitRequired:apt.unitRequired,
    reason:'independent current-year district Finder result absent'};
 if(apt.unitRequired&&!official.exceptionScopeResolved)
  return {status:'NEEDS_OFFICIAL_BUILDING_UNIT_EXCEPTION',
    unitRequired:true,reason:'district-published complex split'};
 if(!display||display.district!==sample.districtHint)
  return {status:'DISTRICT_MISMATCH',unitRequired:apt.unitRequired};
 const out={};
 for(const level of LEVELS){
  const expected=official.schools?.[level],got=display.grades?.[level];
  if(typeof expected!=='string'||!expected.trim()||
     !Array.isArray(got)||got.length!==1||!got[0]?.school)
   return {status:'UNVERIFIED_GRADE_RESULT',level,unitRequired:apt.unitRequired};
  out[level]={official:expected,display:got[0].school,
    matches:normalize(expected)===normalize(got[0].school)};
 }
 if(sample.districtHint==='PISD'){
  const expected=official.schools?.senior,got=display.grades?.senior;
  if(typeof expected!=='string'||!expected.trim()||!Array.isArray(got)
     ||got.length!==1||!got[0]?.school)
   return {status:'UNVERIFIED_GRADE_RESULT',level:'senior',unitRequired:apt.unitRequired};
  out.senior={official:expected,display:got[0].school,
    matches:normalize(expected)===normalize(got[0].school)};
 }
 if(Object.values(out).some(x=>!x.matches))
  return {status:'OFFICIAL_FINDER_MISMATCH',levels:out,unitRequired:apt.unitRequired};
 const vintages=Object.values(display.grades||{}).flat().map(x=>standardYear(x.year));
 if(vintages.some(v=>/2025-26|2024-25|2019|2023/.test(v)))
  return {status:'FINDER_MATCH_BUT_GIS_YEAR_UNVERIFIED',
    levels:out,unitRequired:apt.unitRequired};
 if(display.renderedPolygonFeatures<(sample.districtHint==='PISD'?4:3)
    ||display.matchedMarkers<(sample.districtHint==='PISD'?4:3))
  return {status:'FINDER_MATCH_BUT_MAP_LINKAGE_INCOMPLETE',
    levels:out,unitRequired:apt.unitRequired};
 return {status:'CURRENT_FINDER_AND_MAP_CORROBORATED',
  levels:out,unitRequired:apt.unitRequired};
}
module.exports={LEVELS,normalize,standardYear,resolveApartmentPolicy,compareFinderToDashboard};
