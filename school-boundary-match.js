'use strict';
// School marker -> published attendance polygon matching. This is *display*
// matching, not a property-specific student enrollment determination.
function boundarySchoolKey(value){
 return String(value||'').toLowerCase()
  .replace(/\bh\.?\s*s\.?\b/g,'high').replace(/\bm\.?\s*s\.?\b/g,'middle')
  .replace(/\bsr\.?\b/g,'senior').replace(/\b(?:elem|el)\b/g,'elementary')
  .replace(/\b(dr|doctor|elementary|middle|senior|sr|high|school|campus)\b/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function boundaryGradeLevels(type){
 return type==='high'?['high','senior']:type==='middle'?['middle']:type==='elementary'?['elementary']:[];
}
function boundarySchoolSource(district){
 return district==='PISD'?'PISD_LOOKUP':district;
}
function findSchoolBoundary(s,geo,ratings){
 const feats=Array.isArray(geo)?geo:[];
 const levels=boundaryGradeLevels(s?.type);
 if(!s||!levels.length)return {status:'not-a-zoned-campus',features:[],eligible:0,sourceFeatures:feats.length};
 if(!feats.length)return {status:'no-district-polygon-source',features:[],eligible:0,sourceFeatures:0};
 const eligible=feats.filter(f=>levels.includes(f?.properties?.gradeLevel));
 if(!eligible.length)return {status:'no-grade-polygon-source',features:[],eligible:0,sourceFeatures:feats.length};
 const key=boundarySchoolKey(s.name);
 const selected=typeof ratings==='function'?ratings(s.name,s.district):null;
 let hits=eligible.filter(f=>{
  const p=f?.properties||{};
  if(boundarySchoolKey(p.school)===key)return true;
  if(!selected?.id||typeof ratings!=='function')return false;
  const rated=ratings(p.school,s.district);
  return rated?.id===selected.id||(['LISD','PROSPER'].includes(s.district)&&p.campusId===selected.id);
 });
 // Allen's historical polygons sometimes use only the surname, while
 // the school directory includes a honoree's complete name. Unique only.
 if(!hits.length&&s.district==='AISD'){
  const last=key.split(' ').at(-1);
  if(last&&last.length>=4){
   const candidates=eligible.filter(f=>boundarySchoolKey(f.properties?.school)===last);
   if(new Set(candidates.map(f=>boundarySchoolKey(f.properties.school))).size===1)hits=candidates;
  }
 }
 return {status:hits.length?'matched':'school-not-in-polygon-source',features:hits,
  eligible:eligible.length,sourceFeatures:feats.length};
}
function boundaryMissingExplanation(s, result, sourceVintage, sourceLoadError){
 const district=s?.district||'';
 const finder=({FISD:'Frisco',PISD:'Plano',AISD:'Allen',LISD:'Lewisville',PROSPER:'Prosper',CFB:'CFB'})[district]||district||'해당 학군';
 if(sourceLoadError)return {reason:finder+' 학군 배정구역 데이터가 이번 접속에서 로딩되지 않았습니다.',
  footnote:'이 세션의 원본 요청에 오류가 있어 학교별 경계 수록 여부를 판단할 수 없습니다. 인터넷/교육청 서비스 상태를 확인한 뒤 다시 시도하세요. 과거 도형을 임의로 대신 표시하지 않습니다.'};
 switch(result?.status){
 case 'not-a-zoned-campus':
  return {reason:'해당 학교는 지도에서 초·중·고 일반 배정구역을 표시하는 유형으로 분류되지 않았습니다.',
   footnote:'학교 선택제·특수 프로그램·기타 교육시설은 일반 통학구역 다각형이 없을 수 있습니다. 학군 공식 조회에서 주소와 학년을 확인하세요.'};
 case 'no-district-polygon-source':
  return {reason:finder+' 학군의 학교별 경계 다각형이 현재 지도에 연결되지 않았습니다.',
   footnote:district==='CFB'?'CFB는 공식 GuideK12 주소 검색은 작동하지만 학교별 GIS 경계 원본을 대시보드에 확보하지 못했습니다. 주소를 입력하고 자동완성 후보를 선택해 배정을 확인하세요.':
    '공식 주소별 Finder와 지도용 GIS 다각형은 별개의 자료입니다. 이 화면에는 해당 학군 도형이 없어 경계를 추정하지 않습니다.'};
 case 'no-grade-polygon-source':
  return {reason:'현재 지도 원본에 이 학교 단계('+String(s.type||'미분류')+')의 배정구역이 없습니다.',
   footnote:'지도 자료의 학년 단계 또는 공개 범위가 제한됐습니다. 학교 위치만으로 배정 경계를 만들어 표시하지 않습니다.'};
 default:
  return {reason:'지도용 배정구역 원본에 '+String(s?.name||'이 학교')+'와 일치하는 학교별 경계를 확인하지 못했습니다.',
   footnote:'현재 도형 원본 '+(sourceVintage||'학년도 미확인')+'의 학교명·수록 범위와 학교 목록이 다를 수 있습니다(신설·개명·선택학교 등). 실제 원인은 공식 학군 자료 추가 확인이 필요하며, 임의로 이웃 학교 경계를 대신 표시하지 않습니다.'};
 }
}
if(typeof module!=='undefined')module.exports={boundarySchoolKey,boundaryGradeLevels,boundarySchoolSource,findSchoolBoundary,boundaryMissingExplanation};
if(typeof window!=='undefined')window.SchoolBoundaryMatch={boundarySchoolKey,boundaryGradeLevels,boundarySchoolSource,findSchoolBoundary,boundaryMissingExplanation};
