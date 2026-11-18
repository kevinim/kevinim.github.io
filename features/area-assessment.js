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
    {id:'crime',title:'도시 범죄 신고율',target:'crime'},
    {id:'commute',title:'통근 기준시간',target:'commute'}
  ];
  const rows={};
  let countyIndex=null,noaaRows=null,loadError=false,paintScheduled=false;
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
      status==='empty'?'소재 0곳':status==='unknown'?'확인 필요':'확인 중';
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
    render();loadRegionSnapshot();
    window.setTimeout(schedule,12500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
