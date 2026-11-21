'use strict';
/* P1: Read-only ZIP evidence. City/county observations are not ZIP or parcel risks.
 * Use existing in-app controls; never change school marker, boundary, or geocoder state. */
(function(){
  const core=window.AreaAssessmentCore;
  if(!core)return;
  const $=id=>document.getElementById(id);
  const items=[
    {id:'schools',title:'학교 현황',target:'schools'},
    {id:'hazards',title:'자연재해 기록',target:'hazards'},
    {id:'healthcare',title:'응급 의료 접근성',target:'healthcare'},
    {id:'winter',title:'겨울 기상·전력',target:'winter'},
    {id:'crime',title:'도시 범죄 신고율',target:'crime'},
    {id:'commute',title:'통근 기준시간',target:'commute'}
  ];
  const rows={};
  let countyIndex=null,noaaRows=null,loadError=false,paintScheduled=false;
  let healthcareData=null,healthcareError=false,healthcareStarted=false;
  let dataDeadline=0,lastZip='',countyObserver=null;
  function el(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function selectedZip(){
    return String($('zipSelect')?.value||$('k-zip')?.textContent||'').trim();
  }
  function setFact(id,fact,unavailable){
    const row=rows[id];if(!row)return;
    const status=fact?.status||'loading';
    const display=status==='available'?'자료 확인':status==='mixed'?'관할 혼재':
      status==='empty'?'소재 0곳':status==='reference'?'지도 참고':status==='unknown'?'확인 필요':'확인 중';
    row.status.textContent=display;
    row.status.dataset.state=status;
    row.summary.textContent=fact?.message||unavailable||'자료 불러오는 중…';
    row.button.dataset.state=status;
  }
  function showAction(message){
    const note=$('areaQaActionStatus');
    if(note)note.textContent=message;
  }
  function scrollTo(node){
    node?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showNoaaCounty(zip){
    const select=$('noaaStormCounty');
    const code=countyIndex?.zipCounty?.[zip];
    const name=countyIndex?.counties?.[code]?.name?.replace(/ County$/i,'').toUpperCase();
    if(!select||!name)return;
    const selectCounty=()=>{
      if(!Array.from(select.options).some(o=>o.value===name))return false;
      select.value=name;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    };
    if(countyObserver){countyObserver.disconnect();countyObserver=null}
    if(selectCounty())return;
    countyObserver=new MutationObserver(()=>{
      if(selectCounty()){countyObserver.disconnect();countyObserver=null}
    });
    countyObserver.observe(select,{childList:true});
    window.setTimeout(()=>{countyObserver?.disconnect();countyObserver=null},12000);
  }
  function selectNearbyHospital(){
    const select=$('hospitalCity');if(!select)return;
    const choose=()=>{
      if(!Array.from(select.options).some(o=>o.value==='__nearby__'))return false;
      select.value='__nearby__';
      select.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    };
    if(choose())return;
    const observer=new MutationObserver(()=>{if(choose())observer.disconnect()});
    observer.observe(select,{childList:true});
    window.setTimeout(()=>observer.disconnect(),12000);
  }
  function onSummaryClick(target){
    const map=document.querySelector('.mapbox');
    if(target==='schools'){
      const toggle=$('schoolOverlay');
      if(toggle&&!toggle.checked){toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}))}
      showAction('학교 위치 마커를 표시했습니다. TEA 등급과 위치는 해당 주소의 배정 학교를 확정하지 않습니다.');
      scrollTo(map);
    }else if(target==='hazards'){
      const panel=$('noaaStormHistoryPanel');
      if(panel)panel.open=true;
      showNoaaCounty(selectedZip());
      const button=document.querySelector('#hazardMapQuickToggle button[data-hazard="ifld"]');
      if(button&&button.getAttribute('aria-pressed')!=='true')button.click();
      showAction('NOAA는 2024–25 카운티 과거 기록이며, 켜진 지도는 별개인 FEMA 2025 홍수 상대 위험도입니다. NOAA 상세 패널을 열었습니다.');
      scrollTo(map||panel);
    }else if(target==='healthcare'){
      void loadHealthcareSnapshot();
      const panel=$('healthcarePanel');if(panel)panel.open=true;
      selectNearbyHospital();
      const button=$('healthcareMapQuickToggle');
      if(button&&button.getAttribute('aria-pressed')!=='true')button.click();
      showAction('CMS 2026 병원과 Census 추정 좌표의 ZIP 대표점 직선거리 참고입니다. 실제 운영 중인 최단거리 응급실이나 운전시간은 검증되지 않았습니다.');
      scrollTo(panel||map);
    }else if(target==='winter'){
      const panel=$('gridResiliencePanel');if(panel)panel.open=true;
      const button=$('winterMapQuickToggle');
      if(button&&button.getAttribute('aria-pressed')!=='true')button.click();
      showAction('FEMA 2025 Census tract 겨울 기상 상대위험을 표시합니다. EIA 텍사스 전체 정전 통계와 별개이며, 집주소별 정전 가능성은 알 수 없습니다.');
      scrollTo(map||panel);
    }else if(target==='crime'){
      const panel=$('crimePanel');if(panel)panel.open=true;
      const button=$('crimeMapToggle');
      if(button&&button.getAttribute('aria-pressed')!=='true')button.click();
      showAction('FBI는 도시 전체의 신고율이며 특정 ZIP·주택의 안전 평가가 아닙니다. 도시별 범죄 지도를 켰습니다.');
      scrollTo(map||panel);
    }else if(target==='commute'){
      showAction('통근 상세에서 목적지를 선택하고 직접 계산하십시오. 교통량을 반영하지 않는 ZIP 대표점 기준입니다.');
      const button=$('calcCommute');
      scrollTo(button?.closest('.panel')||button);
      button?.focus({preventScroll:true});
    }
  }
  function mount(){
    const main=document.querySelector('.main');
    if(!main||$('areaQuickAssessment'))return;
    const section=el('section','area-qa');
    section.id='areaQuickAssessment';
    section.setAttribute('aria-labelledby','areaQaTitle');
    const top=el('div','area-qa-top');
    const heading=el('h3','','지역 빠른 점검');heading.id='areaQaTitle';
    top.append(heading,el('span','area-qa-zip','지역 확인 중'));
    section.append(top);
    section.append(el('p','area-qa-intro',
      '기존 자료에서 확인되는 항목만 표시합니다. 행을 누르면 지도와 공식 출처 안내를 볼 수 있습니다.'));
    const list=el('div','area-qa-list');
    for(const item of items){
      const button=el('button','area-qa-row');
      button.type='button';button.dataset.target=item.target;
      button.setAttribute('aria-label',item.title+' 상세 지도 및 출처 확인');
      const body=el('span','area-qa-body');
      const topLine=el('span','area-qa-row-head');
      const label=el('span','area-qa-label',item.title);
      const status=el('span','area-qa-state','확인 중');
      const summary=el('span','area-qa-value','자료 불러오는 중…');
      const meta=el('span','area-qa-note',core.regionEvidenceMeta(item.id));
      topLine.append(label,status);body.append(topLine,summary,meta);
      const arrow=el('span','area-qa-mark','›');arrow.setAttribute('aria-hidden','true');
      button.append(body,arrow);list.append(button);
      rows[item.id]={button,status,summary,meta};
    }
    section.append(list);
    const foot=el('p','area-qa-foot',
      '자료 없음은 위험이 낮다는 의미가 아닙니다. 학교 위치·시/카운티 통계와 개별 주택주소 판정은 다릅니다.');
    section.append(foot);
    const notice=el('p','area-qa-action-status','');
    notice.id='areaQaActionStatus';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    section.append(notice);
    main.before(section);
    section.addEventListener('click',event=>{
      const button=event.target.closest('button[data-target]');
      if(button&&section.contains(button))onSummaryClick(button.dataset.target);
    });
  }
  function schoolFact(zip){
    try{
      if(typeof state==='undefined'||!state.ratingIndex||!Array.isArray(state.schools))
        return null;
      const shape=state.polys?.[zip];
      if(!shape||typeof shape.toGeoJSON!=='function')
        return {status:'unknown',message:'선택 ZIP 경계 데이터가 없어 학교 소재 수 미산정'};
      if(typeof geometryContains!=='function'||typeof scoreRecord!=='function')
        return {status:'unknown',message:'학교 위치·평가 데이터 연결 확인 필요'};
      const geo=shape.toGeoJSON();
      const features=geo?.features||(geo?[geo]:[]);
      if(!features.length)return {status:'unknown',message:'ZIP 경계 도형이 없어 학교 수 미산정'};
      return core.summarizeSchools(state.schools,ll=>
        features.some(f=>f?.geometry&&geometryContains([ll[1],ll[0]],f.geometry)),
        s=>scoreRecord(s.name,s.district)?.rating);
    }catch(e){
      console.warn('Regional school assessment unavailable:',e);
      return {status:'unknown',message:'학교 데이터 검증 실패 · 학교 지도에서 직접 확인'};
    }
  }
  function hazardFact(zip){
    if(!countyIndex||!noaaRows){
      if(loadError)return {status:'unknown',message:'NOAA·카운티 연결 자료 로드 실패'};
      return null;
    }
    const code=countyIndex.zipCounty?.[zip],name=countyIndex.counties?.[code]?.name;
    if(!name)return {status:'unknown',message:'해당 ZIP의 대표 카운티 자료 없음'};
    return core.summarizeNoaa(noaaRows,name);
  }
  function healthcareFact(zip){
    if(healthcareError)return {status:'unknown',message:'CMS 병원 위치 참고자료를 확인하지 못했습니다'};
    if(!healthcareData)return null;
    try{
      const z=typeof getZip==='function'?getZip():null;
      if(z?.z!==zip||!Array.isArray(z.ll)||z.ll.length!==2)
        return {status:'unknown',message:'선택 ZIP의 대표 좌표 미확인 · 병원 상세에서 도시별 목록 확인'};
      const ranker=window.HospitalNearbyReference?.rankNearbyCMS;
      if(typeof ranker!=='function')throw Error('CMS ranker missing');
      return core.summarizeHealthcareReference(ranker(healthcareData,z.ll,{edOnly:true,limit:1}));
    }catch(e){
      console.warn('Regional hospital reference unavailable:',e);
      return {status:'unknown',message:'CMS 병원 근접도 검증 실패 · 상세 목록 확인'};
    }
  }
  function crimeFact(zip){
    try{
      const data=typeof crimeZipData!=='undefined'?crimeZipData:null;
      if(data)return core.summarizeCrime(data,zip);
      if(dataDeadline&&Date.now()>dataDeadline)
        return {status:'unknown',message:'FBI 도시별 자료를 확인하지 못했습니다'};
      return null;
    }catch(e){
      return {status:'unknown',message:'FBI 도시별 자료를 검증할 수 없습니다'};
    }
  }
  function render(){
    paintScheduled=false;
    if(!$('areaQuickAssessment'))return;
    const zip=selectedZip();
    if(lastZip!==zip){
      lastZip=zip;
      showAction('');
    }
    const option=$('zipSelect')?.selectedOptions?.[0];
    const title=option?.value===zip?String(option.textContent).trim():zip;
    $('areaQuickAssessment').querySelector('.area-qa-zip').textContent=
      zip?(title||zip)+' · ZIP 기준':'지역 미선택';
    setFact('schools',schoolFact(zip),'학교 위치·평가 자료 확인 중');
    setFact('hazards',hazardFact(zip),'카운티 NOAA 자료 확인 중');
    setFact('healthcare',healthcareFact(zip),'CMS 위치자료는 이 섹션이 보이면 확인합니다');
    setFact('winter',core.summarizeWinterReference());
    setFact('crime',crimeFact(zip),'FBI 도시 자료 확인 중');
    const minutes=typeof state!=='undefined'?state.times?.[zip]:null;
    setFact('commute',core.summarizeCommute(minutes,Boolean($('destination')?.value?.trim())));
  }
  function schedule(){
    if(paintScheduled)return;
    paintScheduled=true;window.setTimeout(render,60);
  }
  async function loadRegionSnapshot(){
    try{
      const [countyResponse,noaaResponse]=await Promise.all([
        fetch('./county-scopes.json',{cache:'force-cache'}),
        fetch('./data/area-noaa-counts-2024-2025.json',{cache:'force-cache'})
      ]);
      if(!countyResponse.ok||!noaaResponse.ok)throw Error('HTTP');
      const [counties,events]=await Promise.all([countyResponse.json(),noaaResponse.json()]);
      if(!counties?.zipCounty||!counties?.counties||
         !Array.isArray(events?.summary)||events?.years?.join(',')!=='2024,2025'||
         events.summary.some(x=>![2024,2025].includes(x.year)||!Number.isInteger(x.count)||x.count<0))
        throw Error('unverified snapshot');
      countyIndex=counties;noaaRows=events.summary;
    }catch(e){
      loadError=true;console.warn('Regional NOAA source unavailable:',e);
    }
    schedule();
  }
  async function loadHealthcareSnapshot(){
    if(healthcareStarted)return;
    healthcareStarted=true;
    try{
      const res=await fetch('./data/healthcare/cms-dfw-census-points-2026.json',{cache:'force-cache'});
      if(!res.ok)throw Error('CMS snapshot HTTP '+res.status);
      const data=await res.json();
      const ranker=window.HospitalNearbyReference?.rankNearbyCMS;
      if(typeof ranker!=='function'||!data?.metadata?.snapshotDate)
        throw Error('CMS reference module or provenance missing');
      // Validates the exact point dataset before it enters the overview UI.
      ranker(data,[33.014302,-96.791507],{edOnly:true,limit:1});
      healthcareData=data;
    }catch(e){
      healthcareError=true;console.warn('Regional hospital snapshot unavailable:',e);
    }
    schedule();
  }
  function initHealthcareLazy(){
    const section=$('areaQuickAssessment');if(!section)return;
    if(typeof IntersectionObserver!=='function'){void loadHealthcareSnapshot();return}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){
        observer.disconnect();void loadHealthcareSnapshot();
      }
    },{rootMargin:'700px'});
    observer.observe(section);
  }
  function init(){
    mount();if(!$('areaQuickAssessment'))return;
    dataDeadline=Date.now()+12000;
    for(const id of ['k-zip','schoolList','zipInsights','routeStatus','mapLoadStatus','crimeStatus']){
      const n=$(id);
      if(n)new MutationObserver(schedule).observe(n,{childList:true,characterData:true,subtree:true});
    }
    for(const id of ['officeSelect','destination','zipSelect'])
      $(id)?.addEventListener('change',schedule);
    $('destination')?.addEventListener('input',schedule);
    render();loadRegionSnapshot();initHealthcareLazy();
    window.setTimeout(schedule,12500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
