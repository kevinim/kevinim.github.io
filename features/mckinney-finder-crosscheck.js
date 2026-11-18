'use strict';
// McKinney 2026–27 public School Zone Finder GIS crosscheck, INFORMATIONAL ONLY.
// Never interprets ZIP or a campus marker as enrollment eligibility.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)Object.defineProperty(root,'McKinneyFinderCrosscheck',{value:api,writable:false,configurable:false});
})(typeof window!=='undefined'?window:null,function(){
 const DISTRICT='043907', YEAR='2026-27';
 const LEVELS=Object.freeze(['elementary','middle','high']);
 const LABELS=Object.freeze({elementary:'초등',middle:'중등',high:'고등'});
 const SOURCE='McKinney ISD 2026–27 School Zone Finder 공개 GIS';
 const normalize=value=>String(value||'').toLowerCase()
  .replace(/\b(?:dr|doctor|elementary|elem|el|middle|mid|high|school|campus|hs|ms)\b/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const cleanYear=value=>typeof value==='string'&&/^\d{4}[-–]\d{2}$/.test(value)
  ?value.replace('–','-'):null;
 const unavailable=(reason,code)=>Object.freeze({kind:'unavailable',district:DISTRICT,
  code:code||'source-unavailable',reason:String(reason||'공식 검색기로 다시 확인하세요.'),
  candidates:Object.freeze([])});
 function crosscheck({raw,geocodePrecise=false,sourceLive=false,registry=null,official=null,schools=[],ratings=[]}={}){
  if(!geocodePrecise)return unavailable('정확한 집주소의 지오코딩이 확인되지 않았습니다. 공식 Finder에서 주소를 다시 선택하세요.','imprecise-address');
  if(raw?.status==='apartment-split-review'||raw?.status==='needs-address-verification')
   return unavailable('집·호수 단위 위치가 검증되지 않았습니다. 공식 Finder에서 세부 주소를 확인하세요.','address-exception');
  if(raw?.status==='conflict'||raw?.status==='finder-boundary-review'||raw?.status==='boundary-review')
   return unavailable('학군 또는 학교 경계에 걸쳐 자동 교차검증을 중단했습니다.','ambiguous-boundary');
  if(raw?.district!==DISTRICT)return unavailable(
   raw?.district?'선택한 주소는 McKinney ISD로 확인되지 않았습니다. 주소의 실제 소속 학군 검색기를 사용하세요.':'McKinney ISD 소속을 확인하지 못했습니다.','other-district');
  if(raw.status!=='finder-current'||sourceLive!==true)
   return unavailable('McKinney 공식 Finder의 현재 경계 데이터를 불러오지 못했습니다.','live-source-unavailable');
  const rawUrl=registry?.[DISTRICT]?.official;
  const safeUrl=typeof official==='function'?official(rawUrl):null;
  if(typeof safeUrl!=='string'||!safeUrl.startsWith('https://www.mckinneyisd.net/'))
   return unavailable('교육청 공식 주소 검색 링크를 안전하게 검증하지 못했습니다.','official-link-failed');
  if(!Array.isArray(raw.features)||raw.features.length===0||raw.features.length>12)
   return unavailable('공식 GIS의 학교 경계 정보가 누락되었거나 비정상적입니다.','invalid-features');
  const byLevel=new Map(),excludedYears=new Map();
  for(const feature of raw.features){
   const p=feature?.properties,geom=feature?.geometry;
   const level=p?.gradeLevel,school=String(p?.school||'').trim();
   if(feature?.type!=='Feature'||!['Polygon','MultiPolygon'].includes(geom?.type)||
      !Array.isArray(geom.coordinates)||!geom.coordinates.length||
      !LEVELS.includes(level)||school.length<2||school.length>120)
    return unavailable('공식 GIS 응답에 잘못된 학교·학교급·도형이 있습니다.','malformed-feature');
   // SCHL_YEAR is provider metadata. Only elementary has an independent
   // feature-year verification gate in the current application.
   const year=cleanYear(p.sourceYearRaw)||cleanYear(p.sourceYear);
   if((p.sourceYearRaw!=null&&!year)||(year&&year!==YEAR)){
    // Fail closed per school level rather than removing independently valid
    // elementary/middle/high evidence from the entire result.
    excludedYears.set(level,String(p.sourceYearRaw||p.sourceYear||'미표기'));
    byLevel.delete(level);
    continue;
   }
   if(excludedYears.has(level))continue;
   if(byLevel.has(level)){
    const prior=byLevel.get(level);
    if(normalize(prior.school)!==normalize(school)||prior.year!==year)
     return unavailable('한 주소에 같은 학교급의 서로 다른 학교 경계가 중복됩니다.','multiple-schools-one-level');
    continue;
   }
   byLevel.set(level,{school,level,year,properties:p});
  }
  const sourceNames=new Set();
  const result=[];
  for(const level of LEVELS){
   const item=byLevel.get(level);
   if(!item)continue;
   const p=item.properties;
   const key=normalize(item.school);
   const campusId=typeof p.campusId==='string'&&/^043907\d{3}$/.test(p.campusId)?p.campusId:null;
   const byName=schools.filter(s=>s?.district===DISTRICT&&s.type===level&&normalize(s.name)===key);
   const byId=campusId?schools.filter(s=>s?.district===DISTRICT&&s.type===level&&s.id===campusId):[];
   const teaById=campusId?ratings.filter(x=>x?.district===DISTRICT&&x.id===campusId):[];
   const teaByName=ratings.filter(x=>x?.district===DISTRICT&&
    (normalize(x.name)===key||normalize(x.officialName)===key));
   if(byId.length>1||byName.length>1||teaById.length>1||teaByName.length>1||
      (byId.length===1&&byName.length===1&&byId[0]!==byName[0])||
      (teaById.length===1&&teaByName.length===1&&teaById[0]!==teaByName[0]))
    return unavailable('McKinney GIS 학교 ID와 TEA 학교명이 서로 다른 기록을 가리키거나 중복되었습니다.','identity-conflict');
   const matched=byId.length===1?byId[0]:byName.length===1?byName[0]:null;
   const ratingById=teaById.length===1?teaById[0]:null;
   const ratingByName=teaByName.length===1?teaByName[0]:null;
   const identityKind=ratingById?'TEA-campus-id':
    ratingByName?'TEA-name-only':matched?'directory-name-only':'unlinked';
   const verifiedRating=ratingById&&/^[A-F]$|^Not Rated$/.test(ratingById.rating)?
    ratingById.rating:null;
   // Do not expose raw ArcGIS attributes, coordinates or any address in UI.
   const linked=!!matched;
   const yearStatus=item.year===YEAR?
     (p.verifiedYear===YEAR&&level==='elementary'?'elementary-current-checked':'finder-year-labelled'):
      'year-not-on-feature';
   const itemKey=level+'|'+key;
   if(sourceNames.has(itemKey))return unavailable('공식 GIS 학교명이 중복되었습니다.','duplicated-school');
   sourceNames.add(itemKey);
   result.push(Object.freeze({school:item.school,level,levelText:LABELS[level],
    campusId:campusId||null,matchedSchool:matched||null,linked,
    identityKind,verifiedRating,teaCampusId:ratingById?.id||null,
    yearStatus,sourceYear:item.year||null,
    yearNote:yearStatus==='elementary-current-checked'?'2026–27 초등 GIS 학년도 확인':
     yearStatus==='finder-year-labelled'?'2026–27 Finder 원문 표기 · 독립 대조 전':
      '학교급 GIS 자체 학년도 미표기 · 별도 확인 필요'}));
  }
  if(!result.length)return unavailable(
   excludedYears.size?'초·중·고 GIS 원본 학년도 불일치로 확인 가능한 학교가 없습니다.':
   '초·중·고 경계에서 확인 가능한 학교가 없습니다.',
   excludedYears.size?'stale-source-year':'no-campus-match');
  const missing=LEVELS.filter(level=>!byLevel.has(level)).map(level=>LABELS[level]);
  return Object.freeze({kind:'reference-only',district:DISTRICT,
   source:SOURCE,sourceYear:'2026–27 Finder / 학교급별 표시 별도',officialUrl:safeUrl,
   candidates:Object.freeze(result),missing:Object.freeze(missing),
   sourceWarnings:Object.freeze([...excludedYears].map(([level,year])=>
    LABELS[level]+' GIS 원본 '+year+' : 2026–27로 인증되지 않아 제외')),
   identityMatched:result.filter(x=>x.identityKind==='TEA-campus-id').length,
   directoryMatched:result.filter(x=>x.linked).length,
   complete:result.length===3,independentOfficialAddressVerified:false,
   notice:'공식 Finder의 공개 GIS 경계와 주소 위치를 대조한 참고 후보이며, 공식 주소 검색 결과를 별도로 독립 확인한 배정학교는 아닙니다. 2026–27 전학·잔류·예외 등록은 교육청에 확인하세요.'});
 }
 return Object.freeze({crosscheck});
});
