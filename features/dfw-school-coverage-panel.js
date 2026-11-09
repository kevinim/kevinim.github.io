'use strict';
/* Lazy source-backed coverage view. No household address processing or external calls.
 * Never infer a campus attendance assignment or show baseline as 2026-27 GIS proof.
 */
(function(){
 const FILE='./data/dfw-school-coverage-matrix-2026.json';
 const priorityLabel={P0:'P0 · 공식 안내 조사',P1:'P1 · 원본/제도 점검',P2:'P2 · 보완'};
 const reasonLabels={
  'official-parent-lookup-not-yet-verified':'학군 공식 확인 경로 미등록',
  'official-parent-route-linked-but-campus-gis-not-ingested':'공식 안내 연결 · 학교별 GIS 미구성',
  'other-lea-admissions-model-needs-classification':'별도 운영기관 · 입학 방식 확인 필요',
  'choice-not-address-zoning':'학교 선택제 · 주소 자동 배정 아님',
  'historical-campus-polygons-not-current-assignment':'과거 경계 · 현행 여부 미검증',
  'finder-linked-polygons-year-not-confirmed':'Finder 관련 도형 연도 미확인',
  'live-finder-source-can-change-since-reference-run':'공식 Finder 실시간 재검증 필요',
  'current-year-source-reference-still-needs-live-recheck':'2026–27 원본 · 실시간 확인 필요',
  'campus-polygon-evidence-unreviewed':'학교별 GIS 검증 이력 미확인'
 };
 const el=(tag,cls,text)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(text!==undefined)x.textContent=String(text);
  return x;
 };
 function init(){
  const panel=document.getElementById('dfwSchoolCoveragePanel');
  const content=document.getElementById('dfwSchoolCoverageContent');
  if(!panel||!content)return;
  let started=false;
  panel.addEventListener('toggle',()=>{
   if(panel.open&&!started){started=true;load(content)}
  });
  if(panel.open){started=true;load(content)}
 }
 async function load(mount){
  mount.replaceChildren(el('p',null,'DFW 학군 연결 현황을 불러오는 중…'));
  try{
   const response=await fetch(FILE,{cache:'force-cache'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(data.schemaVersion!==1||!Array.isArray(data.districts)||
      data.districts.length!==data.summary?.teaDistrictCodes)throw Error('자료 버전 불일치');
   render(mount,data);
  }catch(error){
   mount.replaceChildren(el('p',null,'학군 연결 현황을 불러올 수 없습니다. 페이지 새로고침 후 다시 열어주세요. ('+error.message+')'));
  }
 }
 function render(mount,data){
  mount.replaceChildren();
  const s=data.summary;
  const stats=el('div','dfw-coverage-stats');
  for(const [value,label] of [
   [s.publicISDsWithRegisteredParentRoute+'/'+s.publicISDs,'공식 안내 등록 ISD (26년 자료)'],
   [s.registeredParentRouteRatePublicISDPercent+'%','공식 안내 등록률 · 배정선 완성률 아님'],
   [s.publicISDsMissingRegisteredParentRoute,'미등록 ISD · 확인 필요'],
   [s.teaDistrictCodes,'전체 TEA 운영 주체 (기타 '+s.otherLEAs+' 포함)']
  ]){
   const card=el('div','dfw-coverage-stat');
   card.append(el('strong',null,value),el('span',null,label));
   stats.appendChild(card);
  }
  mount.appendChild(stats);
  mount.appendChild(el('p','dfw-coverage-help',
   '기준: DFW 광역통계권 11개 카운티 · TEA 2026 예비 학교 기록. 행정상 소속 카운티 기준이므로 카운티 경계를 넘는 통학구역까지 완전 검증한 값은 아닙니다.'));
  mount.appendChild(el('p','dfw-coverage-help',
   'GIS 배정선 연결률과 실제 주소·학년별 배정 확인률은 아직 전체 학군 기준으로 산출할 수 없습니다. 미검증을 0%로 표시하지 않습니다.'));
  const controls=el('div','dfw-coverage-filter');
  const select=el('select');
  select.setAttribute('aria-label','학군 데이터 연결 우선순위');
  for(const [value,title] of [['P0','P0 · 공식 안내 미등록'],['P1','P1 · 자료 보강'],['P2','P2 · 후속'],['all','전체 152개 운영 주체']]){
   const option=el('option',null,title);option.value=value;select.appendChild(option);
  }
  const input=el('input');input.type='search';
  input.setAttribute('aria-label','학군명·카운티 검색');input.placeholder='학군명·카운티 검색';
  controls.append(select,input);mount.appendChild(controls);
  const label=el('p','dfw-coverage-help');
  label.setAttribute('role','status');label.setAttribute('aria-live','polite');
  mount.appendChild(label);
  const wrap=el('div','dfw-coverage-table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');
  wrap.setAttribute('aria-label','DFW 학군별 학교 배정 연결 현황');
  const table=el('table');
  const head=el('thead'),headRow=el('tr');
  for(const name of ['학군 / 카운티','TEA 학교 기록','공식 안내 / 미연결 사유','GIS 상태']){
   const th=el('th',null,name);th.scope='col';headRow.appendChild(th);
  }
  head.appendChild(headRow);table.appendChild(head);
  const body=el('tbody');table.appendChild(body);wrap.appendChild(table);mount.appendChild(wrap);
  const more=el('button','dfw-coverage-more','20개 더 보기');
  more.type='button';mount.appendChild(more);
  const foot=el('p','dfw-coverage-help',
   '기존 7개 학군의 GIS 숫자는 과거 브라우저 검증 최소치일 뿐, 학년도·주소별 배정 보증이 아닙니다. 다른 학군은 GIS 확인 전까지 수치를 표시하지 않습니다.');
  mount.appendChild(foot);
  const byCode=new Map(data.districts.map(d=>[d.code,d]));
  let shown=20;
  const safeLink=url=>{
   if(typeof url!=='string')return null;
   return window.TrustedLinkPolicy?.official?.(url)||null;
  };
  function display(){
   const term=input.value.trim().toLocaleLowerCase();
   const matching=data.priorityQueue.map(code=>byCode.get(code)).filter(Boolean).filter(d=>
    (select.value==='all'||d.priority===select.value)&&
    (!term||[d.name,d.countyOfRecord,d.code].some(v=>String(v).toLocaleLowerCase().includes(term))));
   const page=matching.slice(0,shown);
   body.replaceChildren();
   for(const d of page){
    const row=el('tr');
    const name=el('td');name.append(el('strong',null,d.name),el('div','dfw-coverage-help',d.countyOfRecord+' · '+d.code));
    const n=el('td',null,d.teaCampusRecords);n.style.textAlign='right';
    const route=el('td');
    route.append(el('div',null,reasonLabels[d.missingReason]||d.missingReason));
    const url=safeLink(d.parentGuidance.officialUrl);
    if(url){
     const a=el('a',null,'학군 공식 안내');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
     route.appendChild(a);
    }else route.append(el('div','dfw-coverage-help','링크 검증 필요'));
    const zone=d.geometry;
    let geometryText=zone.status==='reference-browser-minimum-only'?
     '참고 매칭 '+zone.referenceMatchedMinimum+'/'+zone.referenceLoadedMinimum:
     zone.status==='no-dashboard-school-polygons-configured'?'앱 지도 경계 미구성':'GIS 원본 검증 필요';
    if(zone.vintageMode==='historical-2019-2023-reference')geometryText+=' · 과거자료';
    else if(zone.vintageMode?.includes('not-confirmed')||zone.vintageMode?.includes('mixed-vintages'))geometryText+=' · 연도 미확정';
    const gis=el('td',null,geometryText);
    row.append(name,n,route,gis);body.appendChild(row);
   }
   more.hidden=page.length>=matching.length;
   label.textContent=(select.value==='all'?'전체':priorityLabel[select.value])+' · '+matching.length+'개 학군/운영 주체 중 '+page.length+'개 표시';
   if(matching.length===0) {
    const row=el('tr'),cell=el('td',null,'검색 조건에 맞는 학군이 없습니다.');
    cell.colSpan=4;row.appendChild(cell);body.appendChild(row);
   }
  }
  select.addEventListener('change',()=>{shown=20;display()});
  input.addEventListener('input',()=>{shown=20;display()});
  more.addEventListener('click',()=>{shown+=20;display()});
  display();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
