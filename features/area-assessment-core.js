'use strict';
// Region-level facts only. Nothing in this module can certify a home's assigned school,
// an individual parcel's hazard exposure, or an address-level crime/safety score.
const AreaAssessmentCore=(()=>{
  function summarizeSchools(campuses,insideZip,getRating){
    if(!Array.isArray(campuses)||typeof insideZip!=='function'||typeof getRating!=='function')
      return {status:'unknown',message:'학교 위치·경계 확인 필요'};
    const located=campuses.filter(s=>Array.isArray(s.ll)&&s.ll.length===2&&s.ll.every(Number.isFinite)&&insideZip(s.ll));
    if(!located.length)return {status:'empty',count:0,rated:0,ab:0,message:'ZIP 내 위치 학교 0곳 · 배정 학교가 없다는 뜻은 아님'};
    let rated=0,ab=0;
    for(const s of located){
      const grade=getRating(s);
      if(['A','B','C','D','F'].includes(grade)){rated++;if(grade==='A'||grade==='B')ab++}
    }
    return {status:'available',count:located.length,rated,ab,
      message:'소재 학교 '+located.length+'곳 · TEA A/B '+ab+'곳 (등급 연결 '+rated+'곳)'};
  }
  function summarizeNoaa(rows,countyName){
    const name=String(countyName||'').replace(/ County$/i,'').toUpperCase();
    if(!name||!Array.isArray(rows))return {status:'unknown',message:'카운티 기상기록 확인 필요'};
    const matches=rows.filter(r=>r&&r.county===name&&[2024,2025].includes(r.year));
    if(!matches.length)return {status:'unknown',message:'해당 카운티 NOAA 기록 없음 · 저위험 의미 아님'};
    const sum=cat=>matches.filter(r=>r.category===cat).reduce((n,r)=>n+(Number.isFinite(r.count)&&r.count>=0?r.count:0),0);
    return {status:'available',county:name,hail:sum('hail'),flood:sum('flood'),
      message:name+' County · 2024–25 우박 '+sum('hail')+'건 / 홍수 '+sum('flood')+'건'};
  }
  function summarizeCrime(dataset,zip){
    const z=dataset?.zips?.[String(zip||'')],year=String(dataset?.metadata?.years?.at(-1)||'');
    if(!z||!Array.isArray(z.cities)||!z.cities.length)return {status:'unknown',message:'FBI 도시별 자료 연결 없음'};
    const major=z.cities.slice().sort((a,b)=>b.share-a.share)[0];
    if(!major||major.share<0.5||(Number(z.outsideCityShare)||0)>=0.5)
      return {status:'mixed',message:'ZIP에 여러 관할 구역 혼재 · 도시별 지도 확인'};
    const city=dataset.cities?.[major.ori],recent=city?.years?.[year];
    if(!city||!recent)return {status:'unknown',message:'주요 관할 도시의 보고 자료 없음'};
    const violent=recent.violentRate,property=recent.propertyRate;
    if(!Number.isFinite(violent)||!Number.isFinite(property))
      return {status:'unknown',message:'FBI '+year+' 신고 월수 불충분 · 비교 보류'};
    return {status:'available',city:city.city,year,share:major.share,violent,property,
      message:year+' '+city.city+' · 폭력 '+Math.round(violent)+' / 재산 '+Math.round(property)+' (10만 명당)'};
  }
  // Only display an explicitly calculated ZIP representative-point time.
  // Do not embed personal office locations or private cached commute datasets.
  function summarizeCommute(minutes,hasDestination){
    if(!hasDestination)return {status:'unknown',message:'목적지 선택 후 별도 계산'};
    if(!Number.isFinite(minutes)||minutes<0)return {status:'unknown',message:'선택 목적지 · 통근 패널에서 별도 계산'};
    return {status:'available',minutes:Math.round(minutes),
      message:'선택 목적지 · ZIP 대표점 약 '+Math.round(minutes)+'분 (교통량 미반영)'};
  }
  return {summarizeSchools,summarizeNoaa,summarizeCrime,summarizeCommute};
})();
if(typeof window!=='undefined')window.AreaAssessmentCore=AreaAssessmentCore;
if(typeof module!=='undefined'&&module.exports)module.exports=AreaAssessmentCore;
