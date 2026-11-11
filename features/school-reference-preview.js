'use strict';
// Explicit opt-in GIS reference preview. Never produces enrollment/assigned-school
// claims, map geometry, home highlights or changes ConditionalSchoolRelease.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)Object.defineProperty(root,'SchoolReferencePreview',{value:api,writable:false,configurable:false});
})(typeof window!=='undefined'?window:null,function(){
 const CURRENT=Object.freeze({
  FISD:{status:'current',currency:'always',year:'2026–27',source:'Frisco ISD 공식 학교별 경계'},
  PROSPER:{status:'current',currency:'always',year:'2026–27',source:'Prosper ISD 공식 학교별 경계'},
  '043907':{status:'finder-current',currency:'live',year:'2026–27',source:'McKinney ISD 공식 Finder 연결 경계'}
 });
 const LEVEL=Object.freeze({elementary:'초등',middle:'중등',high:'고등',senior:'Senior High'});
 const REASONS=Object.freeze({
  'needs-address-verification':'주소 위치 정밀도가 충분하지 않습니다.',
  'apartment-split-review':'아파트·건물별 배정 예외가 있어 참고 후보를 표시하지 않습니다.',
  'feeder-review':'학년별 진학 조합이 불확실하여 후보를 표시하지 않습니다.',
  'conflict':'여러 학군의 경계 자료가 충돌해 후보를 표시하지 않습니다.',
  'boundary-review':'경계에 가까워 참고 후보를 표시하지 않습니다.',
  'finder-boundary-review':'경계에 가까워 참고 후보를 표시하지 않습니다.',
  'loading':'학교 경계 자료를 불러오는 중입니다.',
  'error':'학교 경계 자료를 불러오지 못했습니다.',
  'reference':'과거·저장본 경계로는 현행 참고 후보를 표시하지 않습니다.',
  'unverified-year':'학교 배정 자료의 적용 학년도가 확인되지 않았습니다.',
  'unavailable':'연결된 현행 학교별 경계 후보가 없습니다.'
 });
 function blocked(reason){
  return Object.freeze({kind:'unavailable',reason:reason||'공식 Finder에서 학년도·주소·학년별로 확인하세요.',candidates:Object.freeze([])});
 }
 function plan(raw,registry,official){
  if(!raw||typeof raw!=='object')return blocked('학교 자료가 없습니다.');
  if(Object.hasOwn(REASONS,raw.status))return blocked(REASONS[raw.status]);
  const cfg=CURRENT[raw.district],entry=registry?.[raw.district];
  if(!cfg||!entry||raw.status!==cfg.status||entry.currency!==cfg.currency)
   return blocked('현행 학교별 GIS 출처를 독립 확인하지 못했습니다.');
  const safeUrl=typeof official==='function'?official(entry.official):null;
  if(!safeUrl||typeof safeUrl!=='string'||!safeUrl.startsWith('https://'))
   return blocked('검증된 교육청 공식 확인 링크가 없습니다.');
  const features=raw.features;
  if(!Array.isArray(features)||!features.length||features.length>16)
   return blocked('학교별 GIS 후보의 수나 구조가 불명확합니다.');
  const candidates=[],seen=new Set();
  for(const feature of features){
   const p=feature?.properties,g=feature?.geometry;
   if(feature?.type!=='Feature'||!['Polygon','MultiPolygon'].includes(g?.type)||
      !Array.isArray(g.coordinates)||!g.coordinates.length||
      typeof p?.school!=='string'||p.school.trim().length<2||p.school.length>120||
      !Object.hasOwn(LEVEL,p.gradeLevel))
    return blocked('학교별 도형 또는 학년 정보가 누락되어 참고 후보를 표시하지 않습니다.');
   // Even a source registered as current cannot promote a feature that
   // explicitly identifies itself as older, proposed or unverified.
   const vintage=String(p.schoolYear||p.sourceVintage||'').replace(/[–—]/g,'-').trim();
   if((vintage&&vintage!=='2026-27')||p.current===false||p.sourceYearConfirmed===false)
    return blocked('해당 학교 도형의 출처 학년도가 현행으로 검증되지 않았습니다.');
   const school=p.school.trim(),key=p.gradeLevel+'|'+school.toLocaleLowerCase('en-US');
   if(seen.has(key))return blocked('같은 학교·학년 후보가 중복되어 표시하지 않습니다.');
   seen.add(key);
   const grades=typeof p.grades==='string'&&p.grades.length<=40?p.grades.trim():'';
   candidates.push(Object.freeze({school,level:LEVEL[p.gradeLevel],grades}));
  }
  const covered=new Set(features.map(f=>f.properties.gradeLevel));
  const missing=['elementary','middle','high'].filter(level=>!covered.has(level)&&!(level==='high'&&covered.has('senior'))).map(l=>LEVEL[l]);
  const notices=[];
  // Frisco's own 2026–27 locator warns that *new* students inside Nelson's
  // attendance zone may be assigned to Wester because Nelson is at capacity.
  // Reference names must never conceal that enrollment-specific exception.
  if(raw.district==='FISD'&&candidates.some(c=>/\bnelson\b/i.test(c.school)))
   notices.push('Frisco ISD 2026–27 예외: Nelson 구역 신규 등록 학생은 Wester Middle School 배정 대상입니다. 기존 재학생·전입 조건은 교육청에 확인하세요.');
  // McKinney official transfer/grandfather decisions affect individual
  // placements even when 2026–27 zoned-campus geometry is current.
  if(raw.district==='043907')
   notices.push('McKinney ISD: 기존 학생의 전학·잔류(grandfathering) 승인에 따라 실제 등록 학교가 경계 후보와 달라질 수 있습니다.');
  return Object.freeze({
   kind:'reference-only',district:raw.district,source:cfg.source,year:cfg.year,
   officialUrl:safeUrl,
   candidates:Object.freeze(candidates),
   missing:Object.freeze(missing),
   notices:Object.freeze(notices),
   warning:'GIS 위치 참고 후보이며 실제 주소별 배정학교가 아닙니다. 배정·전학·학년·아파트 예외는 공식 Finder에서 확인하세요.'
  });
 }
 function render(target,model){
  if(!target||typeof target.replaceChildren!=='function')return false;
  const doc=target.ownerDocument;
  target.replaceChildren();
  function node(tag,cls,content){
   const el=doc.createElement(tag);
   if(cls)el.className=cls;
   if(content!=null)el.textContent=String(content);
   return el;
  }
  const wrap=node('section','school-reference-preview');
  wrap.setAttribute('role','region');
  wrap.setAttribute('aria-label','신뢰도 미인증 학교별 GIS 참고 후보');
  if(model?.kind!=='reference-only'){
   wrap.appendChild(node('p','school-reference-warning',model?.reason||'참고 자료가 없습니다. 공식 Finder에서 확인하세요.'));
   target.appendChild(wrap);return false;
  }
  wrap.appendChild(node('strong','school-reference-warning','참고 후보 · 실제 배정 미인증'));
  wrap.appendChild(node('p','school-reference-source',model.source+' · 자료 학년도 '+model.year+' · 주소 조회 미검증'));
  const list=node('ul','school-reference-list');
  for(const candidate of model.candidates){
   const item=node('li','',candidate.level+' · '+candidate.school+(candidate.grades?' ('+candidate.grades+')':''));
   list.appendChild(item);
  }
  wrap.appendChild(list);
  if(model.missing.length)wrap.appendChild(node('p','school-reference-warning','표시 불완전: '+model.missing.join('·')+' 자료 미확인'));
  for(const note of model.notices||[])wrap.appendChild(node('p','school-reference-warning',note));
  wrap.appendChild(node('p','school-reference-warning',model.warning));
  const link=node('a','cardlink','공식 학교배정 확인하기');
  link.setAttribute('href',model.officialUrl);
  link.setAttribute('target','_blank');
  link.setAttribute('rel','noopener noreferrer');
  wrap.appendChild(link);
  target.appendChild(wrap);return true;
 }
 return Object.freeze({plan,render});
});
