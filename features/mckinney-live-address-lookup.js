'use strict';
// Public publisher GIS re-query, NOT the official Finder's address-result API.
// The fixed source URL receives no user's address or coordinates.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)Object.defineProperty(root,'McKinneyLiveAddressLookup',{value:api,writable:false,configurable:false});
})(typeof window!=='undefined'?window:null,function(){
 const URL='https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/23b28d101ba947498650f6c7b9ef251b/data?f=json';
 const LEVELS=['elementary','middle','high'];
 const FIELDS=[['Elementary Boundaries','ELEM_NAME','elementary'],['Middle Boundaries','MID_NAME','middle'],['High Boundaries','HIGH_NAME','high']];
 const normal=s=>String(s||'').toLowerCase().replace(/\b(?:dr|doctor|elementary|elem|el|middle|mid|high|school|campus|hs|ms)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const year=s=>typeof s==='string'&&/^\d{4}[-–]\d{2}$/.test(s)?s.replace('–','-'):null;
 const fail=(kind,code,reason)=>Object.freeze({kind,code,reason,independentOfficialAddressVerified:false});
 function compare({map,point,localCandidate,convert,contains}={}){
  if(!Array.isArray(point)||point.length!==2||!Number.isFinite(point[0])||!Number.isFinite(point[1])||
     point[0]<=-98||point[0]>=-95||point[1]<=32||point[1]>=34)
   return fail('unavailable','imprecise-address','주소 좌표의 정밀도가 부족합니다.');
  if(localCandidate?.district!=='043907'||localCandidate?.status!=='finder-current'||
     !Array.isArray(localCandidate.features)||!localCandidate.features.length)
   return fail('unavailable','not-mckinney-zone','McKinney 현행 학군 Finder가 확인되지 않았습니다.');
  if(!Array.isArray(map?.operationalLayers)||typeof convert!=='function'||typeof contains!=='function')
   return fail('unavailable','invalid-source','공개 GIS 원본을 읽을 수 없습니다.');
  for(const [title,field,level] of FIELDS){
   const layers=map.operationalLayers.filter(l=>l?.title===title);
   const records=layers[0]?.featureCollection?.layers?.[0]?.featureSet?.features;
   if(layers.length!==1||!Array.isArray(records)||!records.length||records.length>300||
      records.some(f=>typeof f?.attributes?.[field]!=='string'||!f.attributes[field].trim()||
       !Array.isArray(f?.geometry?.rings)||!f.geometry.rings.length))
    return fail('source-conflict','invalid-layer','공식 '+level+' GIS 원본 구조가 변경됐습니다.');
   if(level==='elementary'&&records.some(f=>f.attributes.SCHL_YEAR!=='2026-27'))
    return fail('source-conflict','stale-elementary','초등 GIS 경계 학년도 불일치');
  }
  let zones;
  try{zones=convert(map)}catch{return fail('source-conflict','conversion-failed','공식 GIS 변환 실패')}
  if(!Array.isArray(zones)||zones.length<23||zones.length>300)
   return fail('source-conflict','invalid-conversion','공식 GIS 학교 구역 수 이상');
  for(const [level,min] of [['elementary',15],['middle',5],['high',3]]){
   const n=new Set(zones.filter(f=>f?.properties?.gradeLevel===level).map(f=>normal(f.properties.school))).size;
   if(level==='elementary'?n<min:n!==min)
    return fail('source-conflict','changed-school-count','학교 수가 검증된 공식 원본과 불일치');
  }
  const schools=[],warnings=[];
  for(const level of LEVELS){
   const hit=list=>{
    const selected=new Map();
    for(const f of list){
     if(f?.properties?.gradeLevel!==level||!['Polygon','MultiPolygon'].includes(f?.geometry?.type)||
        !contains(point,f.geometry))continue;
     const key=normal(f.properties.school);
     if(!key)return null;
     if(selected.has(key)&&selected.get(key).properties.campusId&&f.properties.campusId&&
        selected.get(key).properties.campusId!==f.properties.campusId)return null;
     selected.set(key,f);
    }
    return selected.size===1?[...selected.values()][0]:null;
   };
   const before=hit(localCandidate.features),after=hit(zones);
   if(!before||!after)
    return fail('source-conflict','zone-coverage-changed','기존 '+level+' 학교와 새로운 GIS 위치가 일치하지 않습니다.');
   if(normal(before.properties.school)!==normal(after.properties.school)||
      (before.properties.campusId&&after.properties.campusId&&before.properties.campusId!==after.properties.campusId))
    return fail('source-conflict','different-school',level+' 학교명 또는 Campus ID 불일치');
   const raw=after.properties.sourceYearRaw,sourceYear=year(raw)||year(after.properties.sourceYear);
   if((raw!=null&&!year(raw))||(sourceYear&&sourceYear!=='2026-27'))
    return fail('source-conflict','stale-school-year',level+' GIS 원본 학년도 불일치');
   if(!sourceYear)warnings.push(level+' GIS 학년도 미표기');
   schools.push(Object.freeze({level,school:after.properties.school,
     campusId:after.properties.campusId||null,sourceYear:sourceYear||null}));
  }
  return Object.freeze({kind:'source-matched',code:'live-gis-requery-matched',
   schools:Object.freeze(schools),warnings:Object.freeze(warnings),
   independentOfficialAddressVerified:false,
   notice:'2026–27 공개 공식 GIS를 다시 읽어 기존 학교 경계와 자동 대조했습니다. 공식 Finder의 주소별 결과는 별도로 확인해야 합니다.'});
 }
 async function lookup({point,localCandidate,requestJson,convert,contains,signal}={}){
  if(typeof requestJson!=='function')return fail('unavailable','missing-request','공식 GIS 조회 기능 없음');
  const map=await requestJson(URL,{cache:'no-store',timeoutMs:20000,signal});
  if(signal?.aborted){const e=new Error('Cancelled');e.name='AbortError';throw e}
  return compare({map,point,localCandidate,convert,contains});
 }
 return Object.freeze({URL,compare,lookup});
});
