'use strict';
// A high-score road interpolation is still not a building / apartment placement.
function assessResidentialGeocode(requestedAddress,c){
 const a=c?.attributes||{},type=String(a.Addr_type||''),score=c?.score,region=String(a.Region||'').trim().toUpperCase();
 const inputZip=String(requestedAddress||'').match(/\b\d{5}(?:-\d{4})?\b/g)?.at(-1)?.slice(0,5)||null;
 const candidateZip=String(a.Postal||'').match(/\b\d{5}\b/)?.[0]||String(c?.address||'').match(/\b\d{5}\b/)?.[0]||null;
 let reason=null;
 if(!c?.location||!Number.isFinite(c.location.x)||!Number.isFinite(c.location.y))reason='좌표를 확인하지 못했습니다.';
 else if(region&&region!=='TX'&&region!=='TEXAS')reason='텍사스 내 주소가 아닙니다.';
 else if(inputZip&&(!candidateZip||inputZip!==candidateZip))reason='입력 ZIP과 검색 결과 ZIP이 일치하지 않습니다.';
 else if(!Number.isFinite(score)||score<95)reason='주소 일치도가 95점 미만입니다.';
 else if(!['PointAddress','Subaddress'].includes(type))reason='건물 또는 호수 단위 주소가 아닌 추정 위치입니다.';
 return {usableForSchoolCandidate:reason===null,reason,score:Number.isFinite(score)?score:null,matchType:type||null,matchedZip:candidateZip};
}
if(typeof module!=='undefined')module.exports={assessResidentialGeocode};
