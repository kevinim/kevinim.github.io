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
 // Current district-operated Finders whose linked *geometry* is not proved
 // equivalent to 2026–27. Live references only, never a current-year grant.
 const FINDER_VINTAGE=Object.freeze({
  PISD:{status:'finder-current',currency:'finder',year:'GIS 원본 2025–26',
   source:'Plano ISD SchoolFinder 연결 원본(2025–26 레이어)'},
  LISD:{status:'finder-current',currency:'finder',year:'고등 2025–26 / 초·중 적용년도 미확인',
   source:'Lewisville ISD School Locator 연결 GIS'}
 });
 const SOURCE_EVIDENCE=Object.freeze({
  FISD:{kind:'교육청 직접 제공 공식 학교별 경계',year:'2026–27 적용 학년도 확인',yearBasis:'GIS 최초 게시·갱신일은 별도 미확인'},
  PROSPER:{kind:'교육청 공식 Infofinder 학교별 GIS',year:'2026–27 적용 학년도 확인',yearBasis:'구역 학년도 확인 · 실제 등록 자격은 별도'},
  PISD:{kind:'현재 교육청 SchoolFinder가 연결한 GIS',year:'GIS 레이어 표기 2025–26',yearBasis:'Finder 현재 운영과 2026–27 경계 독립 인증은 별개'},
  LISD:{kind:'현재 교육청 School Locator가 연결한 GIS',year:'고등 레이어 2025–26 · 초·중 미확인',yearBasis:'Finder 제목의 2026–27은 개별 GIS 연도 증명이 아님'},
  '043907':{kind:'현재 교육청 School Zone Finder 연결 GIS',year:'Finder 2026–27 · 개별 레이어 원본 연도 분리 확인',yearBasis:'초등 일부 2026–27 표기 · 중·고는 레이어별 원본 확인 필요'}
 });
 const LEVEL=Object.freeze({elementary:'초등',middle:'중등',high:'고등',senior:'Senior High'});
 // Prosper ISD 2026–27 new-enrollment restrictions, NOT changes to published GIS zones.
 // Exact campus IDs come from Prosper's official Infofinder i 31-campus dataset.
 const PROSPER_CLOSED=Object.freeze({
  '043912117':'Prosper ISD 2026–27 신규 등록: Christie Elementary 구역의 신규 학생은 유치원(K)을 제외하고 Thomson Elementary로 안내됩니다. K학년은 예외입니다.',
  '043912042':'Prosper ISD 2026–27 신규 등록: Reynolds Middle 구역의 신규 학생은 공사 기간 Rushing Middle로 안내됩니다.',
  '043912046':'Prosper ISD 2026–27 신규 등록: Moseley Middle 구역의 신규 학생은 Rushing Middle로 안내됩니다.'
 });
 const PROSPER_CLOSED_SOURCE='https://www.prosper-isd.net/page/closed-to-enrollment';
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
  const cfg=CURRENT[raw.district]||FINDER_VINTAGE[raw.district],entry=registry?.[raw.district];
  const vintageLimited=Object.prototype.hasOwnProperty.call(FINDER_VINTAGE,raw.district);
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
   if(vintageLimited){
    // The live Finder must yield precisely the expected publisher-mapped
    // older/uncertain source. A cached/future/altered schema fails closed.
    const accepted=raw.district==='PISD'
     ?p.sourceDistrict==='PISD'&&p.currentFinderSource===true&&
       p.yearVerified2627===false&&
       p.sourceVintage==='Current district Finder (source layer 2025–26)'
     :p.yearVerified2627===false&&p.verifiedYear==null&&
       p.sourceVintage===(p.gradeLevel==='high'
        ?'공식 검색기 연결 · 고등 레이어 2025–26 표기'
        :'공식 검색기 연결 · 학년도 미확인')&&
       (p.sourceYear==null||p.sourceYear==='2025-26');
    if(!accepted||p.current===true||p.sourceYearConfirmed===true||p.schoolYear)
     return blocked('공식 Finder 연결 GIS 원본의 학년도·출처가 변경되어 참고 표시를 중단했습니다.');
   }else if((vintage&&vintage!=='2026-27')||p.current===false||p.sourceYearConfirmed===false)
    return blocked('해당 학교 도형의 출처 학년도가 현행으로 검증되지 않았습니다.');
   const school=p.school.trim(),key=p.gradeLevel+'|'+school.toLocaleLowerCase('en-US');
   if(seen.has(key))return blocked('같은 학교·학년 후보가 중복되어 표시하지 않습니다.');
   seen.add(key);
   const grades=typeof p.grades==='string'&&p.grades.length<=40?p.grades.trim():'';
   // Preserve only source-audited 2026–27 Prosper campus identities.
   // School zone evidence remains distinct from residential enrollment.
   const officialProsper=raw.district==='PROSPER'&&
    p.sourceDistrict==='PROSPER'&&p.current===true&&
    p.sourceYearConfirmed===true&&p.sourceVintage==='2026–27'&&
    p.schoolYear==='2026–27'&&
    /^043912[0-9]{3}$/.test(String(p.campusId||''))&&
    /^[0-9]{3}$/.test(String(p.schoolCode||''))&&
    p.campusId==='043912'+p.schoolCode;
   if(raw.district==='PROSPER'&&p.campusId!=null&&!officialProsper)
    return blocked('Prosper 공식 GIS 캠퍼스 번호 또는 학교 코드가 일치하지 않습니다.');
   const yearNote=raw.district==='PISD'?'공식 SchoolFinder 연결 · 원본 GIS 레이어 2025–26':
    raw.district==='LISD'?(p.gradeLevel==='high'?'고등 GIS 2025–26 표기 · 주소 배정 미확인':
     '초·중 GIS 적용 학년도 미확인 · 주소 배정 미확인'):
    raw.district==='043907'?(p.gradeLevel==='elementary'&&p.yearVerified2627===true&&p.verifiedYear==='2026-27'
     ?'초등 GIS 원본 2026–27 확인 · 주소 배정 미인증':
     typeof p.sourceYear==='string'&&/^\\d{4}-\\d{2}$/.test(p.sourceYear)
      ?'GIS 레이어 학년도 '+p.sourceYear.replace('-','–')+' · 주소 배정 미인증'
      :'GIS 레이어 학년도 미확인 · Finder 운영 연도와 별개'):'';
   candidates.push(Object.freeze({school,level:LEVEL[p.gradeLevel],grades,
    ...(yearNote?{yearNote}:{}),
    ...(officialProsper?{campusId:String(p.campusId),schoolCode:String(p.schoolCode)}:{})}));
  }
  const covered=new Set(features.map(f=>f.properties.gradeLevel));
  // Plano High (grades 9–10) and Senior High (grades 11–12) are distinct.
  // A Senior-only polygon cannot silently satisfy missing High coverage.
  const missing=['elementary','middle','high'].filter(level=>!covered.has(level)&&
   !(level==='high'&&raw.district!=='PISD'&&covered.has('senior'))).map(l=>LEVEL[l]);
  if(raw.district==='PISD'&&!covered.has('senior'))missing.push('Senior High');
  const notices=[];
  if(raw.district==='PISD')
   notices.push('Plano: GIS 원본은 2025–26 명칭입니다. 9–10학년 High와 11–12학년 Senior High를 따로 확인하고 Jackson/Coit Rd 분리 진학을 공식 Finder에서 검증하세요.');
  if(raw.district==='LISD')
   notices.push('Lewisville: 고등 GIS 2025–26 표기, 초·중 적용 학년도 미확인. 9학년 및 아파트·호수는 별도의 공식 Find an Apartment에서 확인해야 합니다.');
  // Only source-audited ID-linked Prosper GIS candidate schools can trigger
  // published capacity/registration notices. A zone shape never automatically
  // changes into a school enrollment or a transfer-granted campus.
  let capacityNoticeUrl=null;
  if(raw.district==='PROSPER'){
   let hasCapacityNotice=false;
   for(const candidate of candidates){
    const notice=PROSPER_CLOSED[candidate.campusId];
    if(notice){
     notices.push(notice);
     hasCapacityNotice=true;
    }
   }
   if(hasCapacityNotice){
    notices.push('Prosper ISD: 퇴교 후 재등록하는 학생도 신규 등록으로 분류됩니다. 실제 학년·주소·기존 재학생 예외는 교육청 등록 담당자에게 확인하세요. GIS 경계상 후보학교는 변경하지 않습니다.');
    const verifiedUrl=typeof official==='function'?official(PROSPER_CLOSED_SOURCE):null;
    if(typeof verifiedUrl==='string'&&verifiedUrl===PROSPER_CLOSED_SOURCE)
     capacityNoticeUrl=verifiedUrl;
   }
  }
  // Frisco's own 2026–27 locator warns that *new* students inside Nelson's
  // attendance zone may be assigned to Wester because Nelson is at capacity.
  // Reference names must never conceal that enrollment-specific exception.
  if(raw.district==='FISD'&&candidates.some(c=>/\bnelson\b/i.test(c.school)))
   notices.push('Frisco ISD 2026–27 예외: Nelson 구역 신규 등록 학생은 Wester Middle School 배정 대상입니다. 기존 재학생·전입 조건은 교육청에 확인하세요.');
  // McKinney official transfer/grandfather decisions affect individual
  // placements even when 2026–27 zoned-campus geometry is current.
  if(raw.district==='043907')
   notices.push('McKinney ISD: 기존 학생의 전학·잔류(grandfathering) 승인에 따라 실제 등록 학교가 경계 후보와 달라질 수 있습니다.');
  const evidence=SOURCE_EVIDENCE[raw.district];
  // Source authority, geometry vintage and official residence assignment
  // are distinct claims. Neither a Finder link nor a polygon grants enrollment.
  const provenance=Object.freeze({
   source:cfg.source,geometryKind:evidence.kind,geometryYear:evidence.year,
   yearBasis:evidence.yearBasis,officialAddressAssignment:'미인증 · 공식 주소별 검색 결과를 수신하지 않음',
   originalPublicationDate:'확인되지 않음'
  });
  return Object.freeze({
   kind:'reference-only',district:raw.district,source:cfg.source,year:cfg.year,
   provenance,
   referenceOnlyFinderVintage:vintageLimited,
   officialUrl:safeUrl,
   candidates:Object.freeze(candidates),
   missing:Object.freeze(missing),
   notices:Object.freeze(notices),
   ...(capacityNoticeUrl?{capacityNoticeUrl}:{}),
   warning:vintageLimited
    ?'공식 검색기에 연결된 연도 불확실 GIS 참고 후보입니다. 2026–27 주소별 배정 인증이 아니며 아파트·학년·진학 예외는 공식 Finder에서 확인하세요.'
    :'GIS 위치 참고 후보이며 실제 주소별 배정학교가 아닙니다. 배정·전학·학년·아파트 예외는 공식 Finder에서 확인하세요.'
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
  wrap.appendChild(node('strong','school-reference-warning','GIS 경계 후보 · 주소 공식 배정 미인증'));
  const prov=model.provenance;
  const evidence=node('div','school-reference-provenance');
  evidence.setAttribute('aria-label','GIS 출처 및 학교 배정 검증 상태');
  for(const [label,value] of [
   ['GIS 출처',prov?.source||model.source],
   ['경계 유형',prov?.geometryKind||'자료 확인 필요'],
   ['GIS 기준 연도',prov?.geometryYear||'미확인'],
   ['연도 해석',prov?.yearBasis||'자료 확인 필요'],
   ['최초 게시일',prov?.originalPublicationDate||'확인되지 않음'],
   ['주소 공식 배정',prov?.officialAddressAssignment||'미인증']
  ])evidence.appendChild(node('p','school-reference-source',label+' · '+value));
  wrap.appendChild(evidence);
  const list=node('ul','school-reference-list');
  for(const candidate of model.candidates){
   const item=node('li','',candidate.level+' · '+candidate.school+(candidate.grades?' ('+candidate.grades+')':''));
   // Keep the campus-specific source-year warning visible beside each candidate.
   if(candidate.yearNote)item.appendChild(node('small','school-reference-vintage',' · '+candidate.yearNote));
   list.appendChild(item);
  }
  wrap.appendChild(list);
  if(model.missing.length)wrap.appendChild(node('p','school-reference-warning','표시 불완전: '+model.missing.join('·')+' 자료 미확인'));
  for(const note of model.notices||[])wrap.appendChild(node('p','school-reference-warning',note));
  wrap.appendChild(node('p','school-reference-warning',model.warning));
  if(model.capacityNoticeUrl==='https://www.prosper-isd.net/page/closed-to-enrollment'){
   const capacity=node('a','cardlink','Prosper ISD 2026–27 신규 등록 제한 공식 안내');
   capacity.setAttribute('href',model.capacityNoticeUrl);
   capacity.setAttribute('target','_blank');
   capacity.setAttribute('rel','noopener noreferrer');
   wrap.appendChild(capacity);
  }
  const link=node('a','cardlink','공식 학교배정 확인하기');
  link.setAttribute('href',model.officialUrl);
  link.setAttribute('target','_blank');
  link.setAttribute('rel','noopener noreferrer');
  wrap.appendChild(link);
  target.appendChild(wrap);return true;
 }
 return Object.freeze({plan,render});
});
