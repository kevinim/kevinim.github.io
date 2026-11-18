'use strict';
// Public Infofinder SearchAddress response evidence, NOT an enrollment grant.
// No storage/logging; this helper never fetches behind CORS restrictions.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)Object.defineProperty(root,'ProsperOfficialAddressResponse',{value:api,writable:false,configurable:false});
})(typeof window!=='undefined'?window:null,function(){
 const ENDPOINT='https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchAddress';
 const CID='PI5FFG7RYZ1';
 const LEVELS=Object.freeze(['elementary','middle','high']);
 const ALIASES={NORTH:'N',SOUTH:'S',EAST:'E',WEST:'W',STREET:'ST',AVENUE:'AVE',
  ROAD:'RD',DRIVE:'DR',LANE:'LN',BOULEVARD:'BLVD',PARKWAY:'PKWY',COURT:'CT',
  PLACE:'PL',CIRCLE:'CIR',TRAIL:'TRL',APARTMENT:'APT',SUITE:'STE'};
 function streetKey(value){
  if(typeof value!=='string')return '';
  return value.toUpperCase().replace(/#/g,' UNIT ').replace(/[^A-Z0-9]+/g,' ')
   .trim().split(/\s+/).map(x=>ALIASES[x]||x).join(' ');
 }
 function normalizeCode(value){
  const s=String(value??'');return /^\d{1,3}$/.test(s)?s.padStart(3,'0'):null;
 }
 const fail=reason=>Object.freeze({status:'not-verified',reason,enrollmentCertified:false,schools:Object.freeze([])});
 function safeInput(input){
  const street=String(input?.street||'').trim(),zip=String(input?.zip||'').trim();
  if(!/^\d{5}$/.test(zip)||!/^\d{1,7}\b/.test(street)||street.length>160||
   /[<>\r\n]/.test(street)||!streetKey(street))return null;
  return {street,zip};
 }
 function requestUrl(input){
  const q=safeInput(input);if(!q)throw Error('Invalid official address lookup input');
  const url=new URL(ENDPOINT);
  for(const [k,v] of Object.entries({clientId:CID,streetAddress:q.street,
   zipCode:q.zip,schoolId:'-1',gradeId:'-1'}))url.searchParams.set(k,v);
  return url.toString();
 }
 function verify(input,response,zoneData){
  const q=safeInput(input);if(!q)return fail('invalid-input');
  let data=response;
  try{if(typeof data==='string')data=JSON.parse(data)}
  catch{return fail('invalid-official-response-json')}
  if(!data||data.resultCode!==200)return fail('official-source-error');
  const meta=zoneData?.metadata,features=zoneData?.features;
  if(meta?.district!=='PROSPER'||meta.sourceYear!=='2026–27'||
   meta.currentYearConfirmed!==true||!Array.isArray(meta.sourceGroupNames)||
   meta.sourceGroupNames.length!==3||meta.sourceGroupNames.some(x=>
    !/^2026-2027 (ELEMENTARY|MIDDLE|HIGH) SCHOOL$/.test(x))||
   !Array.isArray(features)||features.length!==31)return fail('unverified-year-or-district-source');
  if(data.exactAddressMatch!==true||!Array.isArray(data.addresses))
   return fail('not-exact-address');
  const exact=data.addresses.filter(a=>a?.addressExact===true);
  if(exact.length!==1)return fail('ambiguous-or-missing-exact-address');
  if(streetKey(exact[0].addressStreet)!==streetKey(q.street)||
   String(exact[0].addressZip||'')!==q.zip)return fail('different-address');
  const zones=new Map(),sourceLevels=new Set();
  for(const f of features){
   const p=f?.properties,code=normalizeCode(p?.schoolCode);
   if(!p||!code||zones.has(code)||p.sourceDistrict!=='PROSPER'||p.current!==true||
    p.sourceYearConfirmed!==true||p.sourceVintage!=='2026–27'||
    p.schoolYear!=='2026–27'||!/^043912\d{3}$/.test(p.campusId||'')||
    !LEVELS.includes(p.gradeLevel))return fail('invalid-zone-campus');
   zones.set(code,p);sourceLevels.add(p.gradeLevel);
  }
  if(zones.size!==31||sourceLevels.size!==3)return fail('incomplete-zone-catalog');
  if(!Array.isArray(data.schools)||data.schools.length!==3)
   return fail('missing-or-extra-school');
  const usedCodes=new Set(),usedLevels=new Set(),matched=[];
  for(const s of data.schools){
   const code=normalizeCode(s?.schoolCode),p=zones.get(code);
   if(!p||usedCodes.has(code)||usedLevels.has(p.gradeLevel)||
    typeof s.schoolName!=='string'||!s.schoolName.trim()||
    s.schoolName.length>150||/[<>\r\n]/.test(s.schoolName))return fail('unmatched-or-duplicate-official-school');
   usedCodes.add(code);usedLevels.add(p.gradeLevel);
   matched.push(Object.freeze({level:p.gradeLevel,schoolCode:code,
    campusId:p.campusId,officialName:s.schoolName.trim(),zoneName:p.school}));
  }
  if(!LEVELS.every(x=>usedLevels.has(x)))return fail('incomplete-grade-coverage');
  matched.sort((a,b)=>LEVELS.indexOf(a.level)-LEVELS.indexOf(b.level));
  return Object.freeze({status:'official-address-source-match',
   source:'Prosper ISD Infofinder i/SearchAddress',schoolYear:'2026–27',
   addressExact:true,enrollmentCertified:false,schoolCount:matched.length,
   independentResidentialHoldoutsCertified:false,
   schools:Object.freeze(matched)});
 }
 return Object.freeze({requestUrl,verify,streetKey,normalizeCode});
});
