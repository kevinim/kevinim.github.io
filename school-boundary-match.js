'use strict';
const Districts=typeof module!=='undefined'&&typeof window==='undefined'?require('./district-registry.js'):window;
// School marker -> published attendance polygon matching. This is *display*
// matching, not a property-specific student enrollment determination.
function boundarySchoolKey(value){
 return String(value||'').toLowerCase()
  .replace(/\bh\.?\s*s\.?\b/g,'high').replace(/\bm\.?\s*s\.?\b/g,'middle')
  .replace(/\bsr\.?\b/g,'senior').replace(/\b(?:elem|el)\b/g,'elementary')
  .replace(/\bk\s*[-–]?\s*[0-9]\b/g,'')
  .replace(/\b(dr|doctor|elementary|middle|senior|sr|high|school|campus)\b/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function boundaryGradeLevels(type){
 return type==='high'?['high','senior']:type==='middle'?['middle']:type==='elementary'?['elementary']:[];
}
function boundarySchoolSource(district){
 return Districts.districtZoneKey(district);
}
function knownBoundaryException(s){
 const district=s?.district,key=boundarySchoolKey(s?.name);
 if(district==='PISD'&&key==='academy')return {
  reason:'Academy High School은 일반 주소별 진학구역이 아닌 지원·선발형 학교입니다.',
  footnote:'Plano ISD Academy Programs는 별도 지원 절차로 입학합니다. 일반 High School 출석구역 도형을 Academy에 대응시키면 잘못된 배정 안내가 되므로 표시하지 않습니다.',
  sourceUrl:'https://www.pisd.edu/students-families-a6/academy-programs'};
 if(district==='AISD'&&key==='lowery freshman center')return {
  reason:'Lowery Freshman Center는 Allen ISD의 9학년 전용 캠퍼스입니다.',
  footnote:'현재 보유한 Allen 2019·2023 학교별 배정 지도에는 Lowery 전용 도형이 없습니다. Allen High(10–12학년)의 과거 도형을 임의로 Lowery 9학년 경계로 복제하지 않습니다. 주소별 9학년 배정은 공식 Find-A-School에서 확인하세요.',
  sourceUrl:'https://www.allenisd.org/page/ahs-lowery-profile'};
 if(district==='LISD'&&key==='mill street')return {
  reason:'Mill Street Elementary는 2026–27학년도부터 일반 초등학교가 아닌 유아교육 시설로 전환됩니다.',
  footnote:'Lewisville ISD 공식 Turnaround Plan에 따라 기존 학생은 다른 초등학교로 재배정됐습니다. 과거 Mill Street의 통학구역을 현재 초등 배정도로 표시하지 않습니다.',
  sourceUrl:'https://www.lisd.net/resources/families/school-improvement/2025-2026-plans/mill-street'};
 // McKinney ISD closed and repurposed three elementary campuses for 2026-27
 // (board vote November 2025); the 2026-27 finder has no zones for them.
 if(district==='043907'&&/\b(mcneil|eddins|wolford)\b/.test(key))return {
  reason:'이 학교는 2026–27학년도부터 일반 초등학교로 운영되지 않습니다.',
  footnote:'McKinney ISD 교육위원회는 2025년 11월 Eddins·McNeil·Wolford 초등학교를 폐교 후 다른 용도로 전환하기로 의결했습니다. 학생들은 2025년 12월 승인된 2026–27 배정 지도에 따라 다른 초등학교로 재배정됐습니다. 과거 통학구역을 현재 배정으로 표시하지 않습니다.',
  sourceUrl:'https://www.mckinneyisd.net/page/efac',sourceLinkLabel:'McKinney ISD 시설 조정(EFAC) 공식 페이지'};
 if(district==='043907'&&key==='serenity')return {
  reason:'Serenity High는 2026–27 McKinney ISD 공식 School Zone Finder의 일반 고등학교 통학구역(Boyd·McKinney·North)에 포함되지 않는 캠퍼스입니다.',
  footnote:'주소별 일반 배정 대상이 아니므로 다른 고등학교의 구역을 대신 표시하지 않습니다. 입학 방식은 학군에 확인하세요.',
  sourceUrl:'https://www.mckinneyisd.net/page/efac',sourceLinkLabel:'McKinney ISD 공식 페이지'};
 if(district==='043907'&&key==='caldwell')return {
  reason:'Caldwell은 2026–27 McKinney ISD 공식 School Zone Finder에 일반 통학구역이 없는 캠퍼스입니다.',
  footnote:'공식 Finder의 학교 레이어에는 Caldwell Dual Language Academy로 표시됩니다. 입학 방식은 학군에 확인하세요. 인근 초등학교 구역을 대신 표시하지 않습니다.',
  sourceUrl:'https://www.mckinneyisd.net/page/efac',sourceLinkLabel:'McKinney ISD 공식 페이지'};
 if(district==='CFB'&&key==='early college')return {
  reason:'CFB Early College High School은 일반 주소별 고등학교 배정 대신 별도 지원·추첨 절차로 입학합니다.',
  footnote:'CFB 공식 Early College High School 입학 정책은 지원서와 weighted lottery를 명시합니다. 인근 일반 고등학교의 통학구역을 이 캠퍼스에 복제하면 잘못된 배정 정보가 되므로 표시하지 않습니다.',
  sourceUrl:'https://earlycollege.cfbisd.edu/campus-information/echs-designation/benchmark-1',
  sourceLinkLabel:'CFB Early College 공식 입학 절차'
 };
 return null;
}
function findSchoolBoundary(s,geo,ratings){
 const feats=Array.isArray(geo)?geo:[];
 const levels=boundaryGradeLevels(s?.type);
 if(!s||!levels.length)return {status:'not-a-zoned-campus',features:[],eligible:0,sourceFeatures:feats.length};
 if(!feats.length)return {status:knownBoundaryException(s)?'special-campus-no-standard-zone':'no-district-polygon-source',features:[],eligible:0,sourceFeatures:0};
 const eligible=feats.filter(f=>levels.includes(f?.properties?.gradeLevel));
 if(!eligible.length)return {status:knownBoundaryException(s)?'special-campus-no-standard-zone':'no-grade-polygon-source',features:[],eligible:0,sourceFeatures:feats.length};
 const key=boundarySchoolKey(s.name);
 const selected=typeof ratings==='function'?ratings(s.name,s.district):null;
 let hits=eligible.filter(f=>{
  const p=f?.properties||{};
  if(boundarySchoolKey(p.school)===key)return true;
  if(!selected?.id||typeof ratings!=='function')return false;
  const rated=ratings(p.school,s.district);
  return rated?.id===selected.id||(Districts.districtUsesCampusId(s.district)&&p.campusId===selected.id);
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
 return {status:hits.length?'matched':knownBoundaryException(s)?'special-campus-no-standard-zone':'school-not-in-polygon-source',features:hits,
  eligible:eligible.length,sourceFeatures:feats.length};
}
function boundaryMissingExplanation(s, result, sourceVintage, sourceLoadError){
 const district=s?.district||'';
 const finder=Districts.districtName(district)||district||'해당 학군';
 const special=knownBoundaryException(s);
 if(special&&result?.status!=='matched')return special;
 if(sourceLoadError)return {reason:finder+' 학군 배정구역 데이터가 이번 접속에서 로딩되지 않았습니다.',
  footnote:'이 세션의 원본 요청에 오류가 있어 학교별 경계 수록 여부를 판단할 수 없습니다. 인터넷/교육청 서비스 상태를 확인한 뒤 다시 시도하세요. 과거 도형을 임의로 대신 표시하지 않습니다.'};
 switch(result?.status){
 case 'not-a-zoned-campus':
  return {reason:'해당 학교는 지도에서 초·중·고 일반 배정구역을 표시하는 유형으로 분류되지 않았습니다.',
   footnote:'학교 선택제·특수 프로그램·기타 교육시설은 일반 통학구역 다각형이 없을 수 있습니다. 학군 공식 조회에서 주소와 학년을 확인하세요.'};
 case 'no-district-polygon-source':
  return {reason:finder+' 학군의 학교별 경계 다각형이 현재 지도에 연결되지 않았습니다.',
   footnote:district==='CFB'?'CFB 공식 GuideK12 조회기는 2025-03-06 승인된 학교 배정 변경을 반영합니다. 다만 이 대시보드가 독립적으로 그릴 수 있는 학교별 GIS 경계 원본은 확보되지 않았습니다. 지도의 학교 위치점이나 2015–16 NCES 구역을 현재 배정 경계로 대체하지 않습니다. 공식 조회기에 거주 주소를 입력해 확인하세요.':
    '공식 주소별 Finder와 지도용 GIS 다각형은 별개의 자료입니다. 이 화면에는 해당 학군 도형이 없어 경계를 추정하지 않습니다.',
   ...(district==='CFB'?{sourceUrl:'https://www.cfbisd.edu/students/school-maps-locator-system',sourceLinkLabel:'CFB 공식 주소별 배정 조회기'}:{})};
 case 'no-grade-polygon-source':
  return {reason:'현재 지도 원본에 이 학교 단계('+String(s.type||'미분류')+')의 배정구역이 없습니다.',
   footnote:'지도 자료의 학년 단계 또는 공개 범위가 제한됐습니다. 학교 위치만으로 배정 경계를 만들어 표시하지 않습니다.'};
 default:
  return {reason:'지도용 배정구역 원본에 '+String(s?.name||'이 학교')+'와 일치하는 학교별 경계를 확인하지 못했습니다.',
   footnote:'현재 도형 원본 '+(sourceVintage||'학년도 미확인')+'의 학교명·수록 범위와 학교 목록이 다를 수 있습니다(신설·개명·선택학교 등). 실제 원인은 공식 학군 자료 추가 확인이 필요하며, 임의로 이웃 학교 경계를 대신 표시하지 않습니다.'};
 }
}
if(typeof module!=='undefined')module.exports={boundarySchoolKey,boundaryGradeLevels,boundarySchoolSource,findSchoolBoundary,boundaryMissingExplanation,knownBoundaryException};
if(typeof window!=='undefined')window.SchoolBoundaryMatch={boundarySchoolKey,boundaryGradeLevels,boundarySchoolSource,findSchoolBoundary,boundaryMissingExplanation};
