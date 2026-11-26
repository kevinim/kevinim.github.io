'use strict';
// No state inferred from a ZIP or a statewide rectangle: the geocoder must explicitly confirm TX.
// Coordinates are used only to reject obviously misplaced geocoder responses.
function isTexasGeocode(c){
 const region=String(c?.attributes?.Region||'').trim().toUpperCase(),p=c?.location;
 return (region==='TX'||region==='TEXAS')
  &&Number.isFinite(p?.x)&&Number.isFinite(p?.y)
  &&p.x>=-106.7&&p.x<=-93.45&&p.y>=25.8&&p.y<=36.55;
}
// A unit-bearing request cannot be validated by a building-only PointAddress.
// Preserve the result only as a reference until Esri returns the same unit.
function residentialUnit(value){
 const m=/(?:\b(?:APT|APARTMENT|UNIT|SUITE|STE)\.?\s*|#\s*)([A-Z0-9]+(?:-[A-Z0-9]+)?)(?=\b|[,;]|$)/i.exec(String(value||''));
 return m?m[1].replace(/[^A-Z0-9]/gi,'').toUpperCase():null;
}
// Confidence score and ZIP cannot substitute for a matching civic house number.
function streetNumber(value){
 const m=/^\s*(\d{1,6}[A-Z]?)\b/i.exec(String(value||''));
 return m?m[1].toUpperCase():null;
}
function mentionsUnit(value){
 return /(?:\b(?:APT|APARTMENT|UNIT|SUITE|STE)\b|#\s*[A-Z0-9])/i.test(String(value||''));
}
// A high-score road interpolation is still not a building / apartment placement.
function assessResidentialGeocode(requestedAddress,c){
 const a=c?.attributes||{},type=String(a.Addr_type||''),score=c?.score;
 const requestedUnit=residentialUnit(requestedAddress);
 const requestedNumber=streetNumber(requestedAddress);
 const returnedNumbers=[c?.address,a.Match_addr].map(streetNumber).filter(Boolean);
 const returnedUnits=[c?.address,a.Match_addr].map(residentialUnit).filter(Boolean);
 const inputZip=String(requestedAddress||'').match(/\b\d{5}(?:-\d{4})?\b/g)?.at(-1)?.slice(0,5)||null;
 const candidateZip=String(a.Postal||'').match(/\b\d{5}\b/)?.[0]||String(c?.address||'').match(/\b\d{5}\b/)?.[0]||null;
 let reason=null;
 if(!c?.location||!Number.isFinite(c.location.x)||!Number.isFinite(c.location.y))reason='좌표를 확인하지 못했습니다.';
 else if(!isTexasGeocode(c))reason='텍사스 주와 좌표를 확인할 수 없습니다.';
 else if(!requestedNumber)reason='주거지 번지수를 확인할 수 없습니다.';
 else if(!returnedNumbers.length||returnedNumbers.some(n=>n!==requestedNumber))
  reason='입력한 주거지 번지수와 검색 결과가 일치하지 않습니다.';
 else if(inputZip&&(!candidateZip||inputZip!==candidateZip))reason='입력 ZIP과 검색 결과 ZIP이 일치하지 않습니다.';
 else if(!Number.isFinite(score)||score<95)reason='주소 일치도가 95점 미만입니다.';
 else if(!['PointAddress','Subaddress'].includes(type))reason='건물 또는 호수 단위 주소가 아닌 추정 위치입니다.';
 else if(mentionsUnit(requestedAddress)&&!requestedUnit)reason='아파트 호수 입력이 불완전합니다.';
 else if(requestedUnit&&type!=='Subaddress')reason='입력한 호수와 일치하는 세부 주소 좌표가 확인되지 않았습니다.';
 else if(requestedUnit&&!returnedUnits.includes(requestedUnit))reason='검색 결과에서 동일한 아파트 호수를 확인하지 못했습니다.';
 return {usableForSchoolCandidate:reason===null,reason,score:Number.isFinite(score)?score:null,matchType:type||null,matchedZip:candidateZip};
}
// Prefer precisely matched residences, keep distinct Texas results, and avoid picking one
// of two nearly tied houses automatically. Manual selection does NOT verify school enrollment.
function rankTexasHomeCandidates(requestedAddress,raw){
 const score=c=>Number.isFinite(c?.score)?c.score:-1;
 const quality=c=>assessResidentialGeocode(requestedAddress,c).usableForSchoolCandidate;
 const seen=new Set();
 const candidates=(Array.isArray(raw)?raw:[]).filter(isTexasGeocode).sort((a,b)=>
  Number(quality(b))-Number(quality(a))||score(b)-score(a)
 ).filter(c=>{
  const key=String(c.address||'').trim().toUpperCase().replace(/\s+/g,' ');
  if(!key||seen.has(key))return false;
  seen.add(key);return true;
 }).slice(0,5);
 const first=candidates[0],second=candidates[1];
 const requiresSelection=!!(first&&second&&(
  !quality(first)||(quality(second)&&score(second)>=score(first)-2)
 ));
 return {candidates,requiresSelection};
}
if(typeof module!=='undefined')module.exports={isTexasGeocode,residentialUnit,assessResidentialGeocode,rankTexasHomeCandidates};
