'use strict';
/* Separate Map-First ZIP discovery UAT: existing dashboard remains source of truth. */
(function(){
  if(!/(?:\/|\/index\.html|\/rent-map-uat\.html)$/i.test(location.pathname))return;
  const core=window.DfwAreaExplorerCore;
  if(!core)return;
  const $=id=>document.getElementById(id);
  const ui={ready:false,query:'',timer:0};
  function getMap(){
    try{return typeof map!=='undefined'&&map&&typeof map.on==='function'?map:null;}
    catch(_){return null;}
  }
  function rows(){
    try{return typeof DATA!=='undefined'&&Array.isArray(DATA)?DATA:[];}
    catch(_){return [];}
  }
  function places(){
    try{return typeof placeNames!=='undefined'?placeNames:{};}
    catch(_){return {};}
  }
  function zipShapes(){
    try{return typeof state!=='undefined'&&state.polys?state.polys:{};}
    catch(_){return {};}
  }
  function boundsObject(m){
    const b=m.getBounds();return {south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()};
  }
  function node(tag,className,txt){
    const x=document.createElement(tag);
    if(className)x.className=className;
    if(txt!==undefined)x.textContent=txt;
    return x;
  }
  function selectedZip(){
    return String($('zipSelect')?.value||$('k-zip')?.textContent||'');
  }
  function focusZip(zip){
    const select=$('zipSelect');
    if(!/^\d{5}$/.test(zip)||!select||![...select.options].some(opt=>opt.value===zip))return;
    select.value=zip;
    // The dashboard's pre-existing change handler is the only ZIP selection gate:
    // redraw ZIP, school list, assigned-zone UI, KPls and move the map together.
    select.dispatchEvent(new Event('change',{bubbles:true}));
    $('areaExploreSearch').value='';
    ui.query='';
    $('areaExploreNote').textContent='선택한 지역이 기존 ZIP 필터와 동기화되었습니다. 지도와 학교 정보도 기존 방식으로 갱신됩니다.';
    refresh();
  }
  function focusCity(m,item){
    if(!item||!Array.isArray(item.ll))return;
    m.stop();
    m.setView(item.ll,11,{animate:false});
    $('areaExploreNote').textContent=item.city+' 주변으로 이동했습니다. 아래에서 세부 지역을 선택하세요.';
    refresh();
  }
  function selectedFacts(){
    const zip=selectedZip();
    const info=rows().find(row=>row.z===zip);
    $('areaExploreSelectedName').textContent=$('k-area')?.textContent||info?.name||'지역 선택';
    $('areaExploreSelectedZip').textContent=zip?zip+' · ZIP 통계 구역':'선택 없음';
    $('areaExploreKorean').textContent=$('k-korean')?.textContent||'확인 필요';
    $('areaExploreFamilies').textContent=$('k-households')?.textContent||'확인 필요';
    $('areaExploreIncome').textContent=$('k-income')?.textContent||'확인 필요';
  }
  function refresh(){
    if(!ui.ready)return;
    const m=getMap();if(!m)return;
    const search=$('areaExploreSearch');
    const query=search?.value||'';
    const list=$('areaExploreList');
    const opt={
      query,zoom:m.getZoom(),bounds:boundsObject(m),
      center:[m.getCenter().lat,m.getCenter().lng],
      selectedZip:selectedZip(),limit:16
    };
    const visible=core.candidates(rows(),places(),opt);
    list.replaceChildren();
    const heading=$('areaExploreListTitle');
    heading.textContent=query?'검색 결과':m.getZoom()<=10?'현재 지도에 보이는 도시':'현재 지도에 보이는 동네';
    const count=$('areaExploreCount');
    count.textContent=visible.length+'개'+(query?' 검색 결과':' 표시');
    if(!visible.length){
      const empty=node('p','area-explore-empty',query?'일치하는 지역이 없습니다. 영어 지명이나 5자리 ZIP도 검색할 수 있습니다.':'현재 화면에 연결된 ZIP 중심점이 없습니다. 지도를 이동하거나 확대해 보세요.');
      list.append(empty);
    }
    for(const result of visible){
      const button=node('button','area-explore-option');
      button.type='button';
      button.dataset.kind=result.kind;
      if(result.zip)button.dataset.zip=result.zip;
      if(result.selected)button.classList.add('selected');
      const label=result.kind==='city'?result.city:result.place;
      const name=node('span','area-explore-option-name',label);
      const hint=node('span','area-explore-option-sub',
        result.kind==='city'?result.count+'개 ZIP 지역 · 눌러서 세부 지역 보기':
        result.zip+(result.place===result.city?' · 지역 선택':' · '+result.city));
      const arrow=node('span','area-explore-option-arrow','›');
      arrow.setAttribute('aria-hidden','true');
      button.append(name,hint,arrow);
      button.setAttribute('aria-label',result.kind==='city'
        ?result.city+' 세부 지역 보기':result.place+' ZIP '+result.zip+' 선택');
      button.addEventListener('click',()=>result.kind==='city'?focusCity(m,result):focusZip(result.zip));
      list.append(button);
    }
    selectedFacts();
  }
  function mapClick(m,event){
    const target=event?.originalEvent?.target;
    if(target?.closest?.('.leaflet-marker-icon,.leaflet-popup,.leaflet-tooltip,.leaflet-control,.leaflet-interactive'))return;
    const point=event?.latlng;
    if(!point)return;
    const shapes=zipShapes();
    // Check actual ZCTA polygons, not nearest marker: never imply an assigned school.
    const candidate=rows().find(row=>{
      const p=shapes[row.z];
      if(!p||!p.getBounds?.().contains(point))return false;
      return core.containsGeoJSON(p.toGeoJSON(),point.lat,point.lng);
    });
    if(candidate)focusZip(candidate.z);
    else $('areaExploreNote').textContent='이 지점에는 연결된 ZIP 통계구역이 없습니다. 다른 지역을 누르거나 이름으로 검색하세요.';
  }
  function mount(){
    if(ui.ready)return;
    const m=getMap();
    const panel=$('rentMapUatPanel'),nav=$('rentMapFocus');
    if(!m||!panel||!nav||!$('zipSelect')?.options.length)return;
    const home=nav.closest('.rent-map-discovery');
    if(!home)return;
    const heading=home.querySelector('.rent-map-small-heading');
    if(heading)heading.textContent='ZIP을 몰라도 지도에서 동네 찾기';
    const wrapper=node('div','area-explorer');
    wrapper.id='areaExplorerUat';
    wrapper.setAttribute('aria-label','현재 지도 기반 지역 탐색기');
    wrapper.innerHTML=
      '<div class="area-explore-search"><span aria-hidden="true">⌕</span>'+
      '<input type="search" id="areaExploreSearch" aria-label="동네 이름이나 ZIP 검색" placeholder="동네·도시·ZIP 검색 (예: West Plano)" autocomplete="off">'+
      '<button type="button" id="areaExploreClear" aria-label="검색어 지우기">×</button></div>'+
      '<div class="area-explore-results-heading"><strong id="areaExploreListTitle">지도의 동네</strong>'+
      '<span id="areaExploreCount"></span></div>'+
      '<div class="area-explore-list" id="areaExploreList" aria-label="지역 탐색 결과"></div>'+
      '<p class="area-explore-hint" id="areaExploreNote" role="status" aria-live="polite">'+
      '지도를 이동·확대하면 현재 보이는 동네가 바뀝니다. 지도에서 ZIP 경계를 눌러도 선택됩니다.</p>'+
      '<section class="area-explore-selected" aria-label="선택한 지역 요약">'+
      '<div class="area-explore-selected-top"><div><span class="area-explore-kicker">선택한 지역</span>'+
      '<h3 id="areaExploreSelectedName">지역 확인 중</h3></div>'+
      '<span class="area-explore-zip" id="areaExploreSelectedZip">ZIP 확인 중</span></div>'+
      '<div class="area-explore-facts">'+
      '<div><small>한국계 비율</small><strong id="areaExploreKorean">—</strong></div>'+
      '<div><small>자녀 가구 비율</small><strong id="areaExploreFamilies">—</strong></div>'+
      '<div><small>가구 중위소득</small><strong id="areaExploreIncome">—</strong></div></div>'+
      '<div class="area-explore-actions">'+
      '<button type="button" id="areaExploreSchoolBtn">학교 정보 보기</button>'+
      '<button type="button" id="areaExploreCommuteBtn">통근 계산</button>'+
      '<button type="button" id="areaExploreRentBtn">렌트 검색 설정</button></div>'+
      '<p class="area-explore-factnote">2020–24 ACS ZIP 통계 · 학교 위치는 배정학교가 아닙니다. 통근 시간은 목적지를 지정해 별도로 계산합니다.</p>'+
      '</section>';
    home.insertBefore(wrapper,nav);
    const legacy=node('details','area-explore-city-shortcuts');
    const summary=node('summary','','기존 도시 바로가기');
    legacy.append(summary,nav);
    home.insertBefore(legacy,home.querySelector('.rent-map-map-tools'));
    $('areaExploreSearch').addEventListener('input',refresh);
    $('areaExploreClear').addEventListener('click',()=>{
      $('areaExploreSearch').value='';
      $('areaExploreSearch').focus();
      refresh();
    });
    const go=(selector)=>{
      const target=document.querySelector(selector);
      if(!target)return;
      target.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      if(target.matches('button,input,select,a'))target.focus({preventScroll:true});
    };
    $('areaExploreSchoolBtn').addEventListener('click',()=>go('#schoolSettings'));
    $('areaExploreCommuteBtn').addEventListener('click',()=>go('#calcCommute'));
    $('areaExploreRentBtn').addEventListener('click',()=>go('#rentMapMinPrice'));
    const zipEl=$('k-zip'),nameEl=$('k-area');
    if(window.MutationObserver&&zipEl){
      const observer=new MutationObserver(()=>{selectedFacts();refresh()});
      observer.observe(zipEl,{childList:true,characterData:true,subtree:true});
      if(nameEl)observer.observe(nameEl,{childList:true,characterData:true,subtree:true});
    }
    $('zipSelect').addEventListener('change',()=>{selectedFacts();refresh()});
    m.on('moveend',refresh);
    m.on('click',event=>mapClick(m,event));
    ui.ready=true;
    window.__areaExplorerUatReady=true;
    refresh();
  }
  let retries=0;
  function boot(){
    if(ui.ready)return;
    if(window.__rentMapUatReady&&getMap()&&$('rentMapFocus')){mount();return;}
    if(++retries<160)setTimeout(boot,150);
    else console.warn('Area Explorer UAT: map component not available');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
