'use strict';
// Pure presentation policy for previously loaded, authoritative GIS candidates.
// Does NOT call a Finder, infer polygons, send a home address, or verify enrollment.
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.HomeAssignmentMap=api;
})(typeof window!=='undefined'?window:null,function(){
 const VISIBLE=new Set(['current','finder-current','boundary-review','finder-boundary-review']);
 const LEVELS=new Set(['elementary','middle','high','senior']);
 function featureIsZoned(f){
  return f?.type==='Feature'&&['Polygon','MultiPolygon'].includes(f.geometry?.type)&&
   Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length>0&&
   typeof f.properties?.school==='string'&&f.properties.school.trim().length>0&&
   LEVELS.has(f.properties?.gradeLevel);
 }
 function plan(assignment,displayMode){
  const status=assignment?.status||'unavailable';
  if(status==='unverified-year'&&assignment?.district==='AISD')
   return {kind:'table-only',features:[],markerCandidates:true,
    message:'Allen 공식 주소표에 나온 학교명 후보만 강조합니다. GIS는 2019/2023 과거 자료여서 현행 학교 경계를 자동 표시하지 않습니다.'};
  if(!VISIBLE.has(status))
   return {kind:'unverified',features:[],markerCandidates:false,
    message:status==='needs-address-verification'?'주소 위치가 불확실해 학교 및 경계를 자동 강조하지 않습니다.':
      '이 주소에 검증된 학교 경계를 자동으로 표시할 수 없습니다. 학군 공식 주소검색기에서 확인하세요.'};
  if(!['official','finder'].includes(displayMode))
   return {kind:'unverified',features:[],markerCandidates:false,
    message:'현행 배정 경계의 출처를 확인하지 못했습니다. 과거 학년도 도형을 현재 학교 배정으로 사용하지 않습니다.'};
  const features=Array.isArray(assignment.features)?assignment.features:[];
  if(!features.length||features.length>24||features.some(f=>!featureIsZoned(f)))
   return {kind:'unverified',features:[],markerCandidates:false,
    message:'학교 후보 도형이 없거나 구조가 불명확해 지도 자동표시를 중단했습니다.'};
  const near=status==='boundary-review'||status==='finder-boundary-review';
  const qualifier=near?'경계 근처 주소로, 반드시 별도 검증이 필요합니다. ':'';
  const source=displayMode==='official'
   ?'2026–27 공식 출처 GIS의 학교 후보 경계를 자동 표시했습니다. '
   :'공식 Finder 연결 GIS의 학교 후보 경계를 표시했습니다. 원본 학년도가 다를 수 있습니다. ';
  return {kind:displayMode==='official'?'current-gis':'finder-linked',
   features,markerCandidates:true,review:near,
   message:qualifier+source+'최종 배정은 학군 공식 Finder에서 주소·학년·호수 및 예외 사항을 확인하세요.'};
 }
 return Object.freeze({plan,featureIsZoned});
});
