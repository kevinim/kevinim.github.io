'use strict';
// School-marker / campus assignment polygon status for UI use only.
// Never infer an enrollment zone from a campus point or a nearby polygon.
(function(root){
 function classify({matchStatus,sourceReady,sourceFailed,displayMode,officialUrl,officialKind,schoolType}={}){
  if(!['elementary','middle','high'].includes(schoolType))
   return {kind:'nonstandard',label:'일반 배정 대상 확인',explanation:'일반 초·중·고 통학구역 대상 여부를 별도로 확인해야 합니다.'};
  if(!sourceReady)
   return {kind:'loading',label:'경계 확인 중',explanation:'학교별 지도 경계 데이터를 확인하고 있습니다.'};
  if(sourceFailed)
   return {kind:'error',label:'원본 연결 실패',explanation:'이번 접속에서 학군 경계 데이터를 불러오지 못했습니다. 없는 경계로 확정하지 않습니다.'};
  if(matchStatus==='matched'){
   if(displayMode==='official')
    return {kind:'current',label:'공식 배정선 표시',explanation:'학교별 도형이 표시됩니다. 주소·학년·예외는 공식 학군에서 최종 확인하세요.'};
   if(displayMode==='published')
    return {kind:'provisional',label:'공식 GIS · 학년도 검증 중',explanation:'교육청 공개 GIS는 2026년 7월 갱신되었으나 2026–27 실제 주소별 배정 검증은 미완료입니다. 공식 SchoolSite Locator에서 확인하세요.'};
   if(displayMode==='finder')
    return {kind:'finder',label:'공식 Finder 연동선',explanation:'현행 공식 Finder가 사용하는 도형입니다. 내부 자료 연도가 다를 수 있습니다.'};
   return {kind:'historical',label:'과거 참고 경계',explanation:'과거 지도를 참고용으로 표시하며 현재 배정을 보장하지 않습니다.'};
  }
  if(matchStatus==='special-campus-no-standard-zone')
   return {kind:'special',label:'일반 배정선 없음',explanation:'학년 전용·선택형·전환 학교 등으로 일반 주소별 배정선이 없을 수 있습니다.'};
  if(officialUrl){
   if(officialKind==='choice-process')
    return {kind:'choice-only',label:'학교 선택제 · 신청 확인',explanation:'이 학군은 주소로 일반 배정학교 하나가 자동 확정되는 방식이 아닙니다. 공식 학교 선택·신청 절차와 최종 배정 통지를 확인하세요.'};
   if(officialKind==='official-map')
    return {kind:'map-only',label:'지도 경계 없음 · 공식 지도',explanation:'학군 공식 구역 지도가 있지만 이 대시보드에는 승인된 학교별 GIS 도형이 없습니다. 정확한 주소·학년은 교육청에 확인하세요.'};
   if(officialKind==='official-inquiry')
    return {kind:'inquiry-only',label:'지도 경계 없음 · 교육청 문의',explanation:'학군 공식 구역 지도와 배정 문의 절차를 확인하세요. 경계 근처 주소는 교육청의 공식 답변을 받아야 합니다.'};
   return {kind:'finder-only',label:'지도 경계 없음 · 공식 조회',explanation:'이 학교에 연결할 검증된 지도 도형은 없습니다. 학군 공식 주소 조회 도구 또는 조회 안내 페이지에서 거주지와 학년별 배정을 확인하세요.'};
  }
  return {kind:'unverified',label:'배정선·Finder 미연결',explanation:'이 학교의 지도 경계와 공식 주소별 검색기 연결이 아직 확보되지 않았습니다. 학교 소속 학군에 직접 확인하세요.'};
 }
 const api=Object.freeze({classify});
 if(root)root.SchoolZoneUI=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
