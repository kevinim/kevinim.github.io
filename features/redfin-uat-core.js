'use strict';
// Redfin UAT: user-pasted links only. No scraping, API calls, storage or Redfin iframe.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RedfinUatCore=api;
})(typeof window!=='undefined'?window:null,function(){
 const MAX_URL=2048;
 const DFW_ZIP=/^7[56]\d{3}$/;
 const STREET_SUFFIX=/\b(?:St|Street|Dr|Drive|Rd|Road|Ave|Avenue|Ln|Lane|Ct|Court|Trl|Trail|Way|Pl|Place|Pkwy|Parkway|Blvd|Boulevard|Cir|Circle|Ter|Terrace|Loop|Cv|Cove|Hwy|Highway|Pass|Park|Row|Run)\b/i;
 function invalid(error){return {ok:false,error,sourceUrl:null,suggestedAddress:null,needsConfirmation:true};}
 function parseRedfinUrl(input){
  if(typeof input!=='string')return invalid('Redfin 링크를 입력하세요.');
  const raw=input.trim();
  if(!raw||raw.length>MAX_URL||!/^https:\/\//i.test(raw)||/[\u0000-\u0020\u007f\\]/.test(raw))
   return invalid('HTTPS Redfin 매물 링크만 입력할 수 있습니다.');
  const authority=raw.slice(8).split(/[/?#]/)[0];
  if(authority.includes(':'))return invalid('URL에 사용자 정보나 포트를 입력하지 마세요.');
  let u;
  try{u=new URL(raw)}catch{return invalid('올바른 URL이 아닙니다.');}
  if(u.protocol!=='https:'||u.username||u.password||u.port||!['redfin.com','www.redfin.com'].includes(u.hostname.toLowerCase()))
   return invalid('redfin.com의 HTTPS 링크만 허용됩니다.');
  if(/%(?:2f|5c|00|0a|0d)/i.test(u.pathname))return invalid('인코딩된 경로 구분자가 포함된 링크는 사용할 수 없습니다.');
  let parts;
  try{parts=u.pathname.split('/').filter(Boolean).map(decodeURIComponent)}catch{return invalid('URL 경로를 읽을 수 없습니다.');}
  if(parts.length<4||parts[0].toUpperCase()!=='TX'||!parts[1]||!parts.slice(2).some(x=>/^(?:home|apartment|rental)$/i.test(x)))
   return invalid('Texas 주의 개별 Redfin 매물 링크를 입력하세요. 검색결과 URL은 지원하지 않습니다.');
  const city=parts[1].replace(/-/g,' ').trim();
  if(!/^[a-z][a-z .'-]{1,75}$/i.test(city))return invalid('매물 도시를 확인할 수 없습니다.');
  const slug=parts[2]||'';
  const m=slug.match(/^(\d{1,6}[A-Za-z]?)-(.+)-(7[56]\d{3})$/);
  let suggestedAddress=null,zip=null;
  if(m){
   const street=m[2].replace(/-/g,' ').trim();
   if(street.length<=95&&STREET_SUFFIX.test(street)&&DFW_ZIP.test(m[3])){
    zip=m[3];
    suggestedAddress=m[1]+' '+street+', '+city+', TX '+zip;
   }
  }
  return {ok:true,error:null,sourceUrl:u.origin+u.pathname,suggestedAddress,city,zip,
   needsConfirmation:true,source:'Redfin URL path only (unverified)'};
 }
 function validateAddress(input){
  if(typeof input!=='string')return null;
  const value=input.trim().replace(/\s+/g,' ');
  if(value.length<12||value.length>200||/[\u0000-\u001f\u007f<>]/.test(value))return null;
  // Require complete, human-confirmed DFW street, city, state and ZIP; do not infer from ZIP alone.
  const match=value.match(/^(\d{1,6}[A-Za-z]?\s+[^,]+),\s*([A-Za-z][A-Za-z .'-]+),\s*(?:TX|Texas)\s+(7[56]\d{3})(?:-\d{4})?$/i);
  if(!match||!STREET_SUFFIX.test(match[1])||!DFW_ZIP.test(match[3]))return null;
  return value;
 }
 function validateRent(value){
  const str=String(value??'').trim();
  if(!str)return null;
  if(!/^\d{1,6}$/.test(str))return false;
  const v=Number(str);
  return v>=100&&v<=99999?v:false;
 }
 return Object.freeze({parseRedfinUrl,validateAddress,validateRent});
});