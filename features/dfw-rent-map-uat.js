'use strict';
/* Separate, opt-in rent-map exploration UAT. Does not call rental APIs. */
(function () {
  const preview=/\/rent-map-uat\.html$/i.test(location.pathname);
  if(!preview&&!/(?:\/|\/index\.html)$/i.test(location.pathname))return;
  const core=window.DfwRentMapUatCore;
  if (!core) return;
  const $=id=>document.getElementById(id);
  const state={referenceLayer:null,referenceVisible:false,ready:false};
  function getMap() {
    try { return typeof map !== 'undefined' && map && typeof map.setView==='function' ? map : null; }
    catch (_) { return null; }
  }
  function el(tag,klass,contents) {
    const node=document.createElement(tag);
    if (klass) node.className=klass;
    if (contents!==undefined) node.textContent=contents;
    return node;
  }
  function selectedZip() {
    return core.safeZip($('zipSelect')?.value||$('k-zip')?.textContent);
  }
  function selectedRentalFilters() {
    return {
      minPrice:$('rentMapMinPrice')?.value||'',
      maxPrice:$('rentMapMaxPrice')?.value||'',
      minBeds:$('rentMapMinBeds')?.value||'',
      maxBeds:$('rentMapMaxBeds')?.value||'',
      minBaths:$('rentMapMinBaths')?.value||'',
      dogs:!!$('rentMapDogs')?.checked,
      cats:!!$('rentMapCats')?.checked,
      parking:!!$('rentMapParking')?.checked,
      laundry:!!$('rentMapLaundry')?.checked,
      furnished:!!$('rentMapFurnished')?.checked,
      pool:!!$('rentMapPool')?.checked,
      ac:!!$('rentMapAC')?.checked,
      dishwasher:!!$('rentMapDishwasher')?.checked
    };
  }
  function updateSearchLinks() {
    const zip=selectedZip(),place=$('k-area')?.textContent?.trim()||'지역';
    const display=$('rentMapSelectedZip'),house=$('rentMapHouses'),apts=$('rentMapApartments');
    if(!display||!house||!apts)return;
    display.textContent=zip?zip+' · '+place:'ZIP 선택 필요';
    let error='',filters=null;
    try{filters=core.normalizeRentalFilters(selectedRentalFilters());}
    catch(e){error=e?.message||'가격 및 침실 조건을 확인하세요.';}
    for(const [anchor,kind] of [[house,'houses'],[apts,'apartments']]){
      const url=error?'':core.redfinUrl(zip,kind,filters);
      if(url){anchor.href=url;anchor.removeAttribute('aria-disabled');anchor.tabIndex=0;}
      else{anchor.removeAttribute('href');anchor.setAttribute('aria-disabled','true');anchor.tabIndex=-1;}
    }
    const note=$('rentMapFilterStatus');
    if(note){
      note.dataset.invalid=String(!!error);
      const fmt=n=>n===null?'제한 없음':'$'+n.toLocaleString('en-US');
      note.textContent=error||('월 렌트 '+fmt(filters.minPrice)+' ~ '+fmt(filters.maxPrice)+
        ' · 침실 '+(filters.minBeds===null?'제한 없음':filters.minBeds+'개 이상')+
        (filters.maxBeds===null?'':', '+filters.maxBeds+'개 이하')+
        ' · 추가 조건 '+(Object.entries(filters).filter(([key,val])=>
          !['minPrice','maxPrice','minBeds','maxBeds'].includes(key)&&
          val!==null&&val!==false).length)+'개'+
        ' · Redfin에서 실제 검색 조건을 확인하세요.');
    }
    $('rentMapNoListings').textContent='가격은 월 렌트 기준입니다. 결과와 필터 적용 여부는 Redfin에서 확인하세요. 이 지도에는 실시간 매물 핀이 없습니다.';
  }
  function setScopeNote(m) {
    $('rentMapMapScale').textContent=core.mapScaleLabel(m.getZoom());
  }
  function focusCity(m,key) {
    const city=core.cityByKey(key);
    if(!city) return;
    m.stop();
    m.setView([city.lat,city.lng],city.zoom,{animate:false});
    for(const btn of document.querySelectorAll('#rentMapFocus button[data-focus]')){
      btn.setAttribute('aria-pressed',String(btn.dataset.focus===key));
    }
    $('rentMapStatus').textContent=city.label+' 주변을 표시합니다. 지도 중심 변경은 선택 ZIP이나 학교 배정 결과를 변경하지 않습니다.';
  }
  function ensureReferenceLayer(m) {
    if (state.referenceLayer||!window.L) return state.referenceLayer;
    const group=L.layerGroup();
    for(const ref of core.referencePlaces){
      // Use separate vector markers to avoid touching any school or GIS layer.
      const dot=L.circleMarker([ref.lat,ref.lng],{
        radius:8,color:'#fff',weight:2,fillColor:ref.color,fillOpacity:1
      });
      dot.bindPopup(ref.label+'<div>'+ref.detail+'</div><small>지역 참고 기준점 · 정확한 시설 위치 아님</small>');
      dot.bindTooltip(ref.label,{direction:'top'});
      group.addLayer(dot);
    }
    state.referenceLayer=group;
    return group;
  }
  function setReferencePlaces(m,visible) {
    const group=ensureReferenceLayer(m);
    if(!group) return;
    state.referenceVisible=!!visible;
    if(visible&&!m.hasLayer(group))group.addTo(m);
    if(!visible&&m.hasLayer(group))m.removeLayer(group);
    const button=$('rentMapRefs');
    button.setAttribute('aria-pressed',String(!!visible));
    button.textContent=visible?'생활 기준점 숨기기':'생활 기준점 표시';
    $('rentMapStatus').textContent=visible
      ?'Plano 업무지구, Irving Las Colinas, Dallas Mockingbird 주변을 별도 참고 마커로 표시했습니다. 위치는 대략적입니다.'
      :'생활 기준점 마커를 숨겼습니다. 학교·ZIP 지도 레이어는 그대로 유지됩니다.';
  }
  function addUI(m) {
    if($('rentMapUatPanel')) return;
    const host=document.querySelector('.mapcol'),mapBox=host?.querySelector('.mapbox');
    if(!host||!mapBox)return;
    const panel=el('section','rent-map-uat');
    panel.id='rentMapUatPanel';
    panel.setAttribute('aria-label',preview?'DFW 지도 방향 및 렌트 검색 UAT':'DFW 지도 방향 및 렌트 검색');
    panel.innerHTML=
      '<div class="rent-map-heading"><div><span class="rent-map-eyebrow">'+(preview?'MAP & RENTALS · UAT':'MAP & RENTALS')+'</span><h2>내가 보는 동네, 렌트 매물 연결</h2></div><span class="rent-map-chip">무료 · 원본 연결</span></div>'+
      '<p class="rent-map-desc">동네 위치를 먼저 확인하고, 선택한 ZIP의 실제 렌트 매물을 Redfin에서 바로 엽니다. 링크·주소를 복사할 필요가 없습니다.</p>'+
      '<div class="rent-map-layout"><div class="rent-map-discovery"><div class="rent-map-small-heading">지도에서 지역 찾기</div>'+
      '<div id="rentMapFocus" class="rent-map-focus" role="group" aria-label="지도 중심 이동"></div>'+
      '<div class="rent-map-map-tools"><button type="button" id="rentMapRefs" aria-pressed="false">생활 기준점 표시</button><span id="rentMapMapScale" aria-live="polite">지도 준비 중</span></div></div>'+
      '<div class="rent-map-listings"><div class="rent-map-small-heading rent-map-brandline"><img class="rent-map-redfin-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADyElEQVR4AexWT2gUVxj/vjdJ7aFIK/TShsbdZFtLZeNMpSAl2dkeSqEF26bSlh6qYhAPXj2oePGq4klERRRBRPyLB0/BWdaoCMnECDFhs7tBxUsUBZXE7M77/J6yk53ZefsnKl4c3jfvfb/f9+c3b2ZnR8B7Pj4IaHkHCEBMJe2Veavvz4KVGlCWN3v7Faa4Vu9o0wIKPb0/FK300eL36RnRjrcRjbOA4pAyFG1nFDbNXMG0j+XM1JpmhTQUMJ3si+Ut+xIYxg1C2MCFl7FFDt6BZSDwf0PgUMGyL09ZdndkYBVYV0DeTPfLdmMUEX8DPlXlNVgicvwvAtAtmvY/9YKFjpyy+jZzmdPML2Vb3ED4hBBOFszUVl2BSAHFVem1AowDgBDJQysHIu+G2F9YlVoXlVbTIJe0O0jQsbfSvNIR+UIMcaRg/tQJoaNGgNGGewHx01BcwCWgMhBkeD6oDIActlIgqNZZiujtC8MBAbme9Hcc8BebdqCUJ5eUIBYfuWJ3DTtblMWHnfS8LC0HSceBiHTJBPhHwepNVvMBAcKgAUDeLog+pJS7Ym7mv44x5344YoU79CDuOutBwrYw5/uICNS2yfd5ERCAgL8zFj0kXex2M7ujyQU0PursQaJTC0hwRQhrqxFfwF3zxy/46jurSX/N2+qBt933GyzKOL8TiPciIo734KvJnjVfVihfgEftX1fA8IyI4wk3Ox7GdX5i+FoekcZ0vMAliQrnC0BBn1XA8MwbMBHGGvkEkNPFtFf18gWQFFKXwPgcW0sDCQ1dQnUvX4AH5Ye6hMXghLBSl4fgzVQ4X8DHcx9N1PsNVxKamfOmvZrjop8pvp+zc3OTzL8avoCOicFHBHjnFfoGJwIQiLBHV4K4x7cTNx9VeF+AAvjJPafmxRr/dRpFK30QEFO6GvyOCPQICCAoHQagki65Hp4ze1OrLTsLCAO6OOLa9EL1WIgICOgaHrrLzwGLWAhoZsXNPzfQOA+IdT/F+OoPd41zj6qiAQEKf1bydvIu3FPrZo1fUjMe0a/89numy+Grv48Sd4T5GgHJ21cfe5L+ZhGz4eB6fsLNXDcI1H9JxDuDZgXButio8wRCR40AxatiQlJ/qyI63SuD0qN/CaCs6rw2bs61YiPOjdd+8BwpQIUsdzOXS2XP5mdiWvnNWveoc4G/GTby7ZAqV9VQtXT5WgEq4Ztb2Zvzz0tJr1z7JaN4ncXdzAmi8s8qV9XQxSm8rgAVsGJy6GliLDui1q1Yl5sdVLmNchoKaFTgTfl3LqCRwJcAAAD//5qref8AAAAGSURBVAMAwnVaUBMjA3IAAAAASUVORK5CYII=" alt="" aria-hidden="true" width="22" height="22" referrerpolicy="no-referrer" loading="lazy"><span>Redfin 렌트 매물 검색</span></div>'+
      '<strong id="rentMapSelectedZip" class="rent-map-current">ZIP 확인 중</strong>'+
      '<div id="rentMapFilters" class="rent-map-filters" role="group" aria-label="Redfin 렌트 가격과 침실 필터">'+
      '<label>월 렌트 최소 ($)<input id="rentMapMinPrice" type="number" min="0" max="50000" step="50" inputmode="numeric" placeholder="제한 없음"></label>'+
      '<label>월 렌트 최대 ($)<input id="rentMapMaxPrice" type="number" min="0" max="50000" step="50" inputmode="numeric" placeholder="제한 없음"></label>'+
      '<label>최소 침실 수<select id="rentMapMinBeds"><option value="">제한 없음</option><option value="0">Studio 이상</option><option value="1">1개 이상</option><option value="2">2개 이상</option><option value="3">3개 이상</option><option value="4">4개 이상</option><option value="5">5개 이상</option></select></label>'+
      '<label>최대 침실 수<select id="rentMapMaxBeds"><option value="">제한 없음</option><option value="0">Studio만</option><option value="1">1개 이하</option><option value="2">2개 이하</option><option value="3">3개 이하</option><option value="4">4개 이하</option><option value="5">5개 이하</option></select></label>'+
      '<details class="rent-map-more"><summary>추가 조건 · 욕실, 반려동물, 편의시설</summary>'+
      '<div class="rent-map-more-body"><label class="rent-map-bath-label">최소 욕실 수<select id="rentMapMinBaths"><option value="">제한 없음</option><option value="1">1개 이상</option><option value="1.5">1.5개 이상</option><option value="2">2개 이상</option><option value="2.5">2.5개 이상</option><option value="3">3개 이상</option><option value="4">4개 이상</option></select></label>'+
      '<div class="rent-map-checks">'+
      '<label><input id="rentMapDogs" type="checkbox">반려견 허용</label>'+
      '<label><input id="rentMapCats" type="checkbox">반려묘 허용</label>'+
      '<label><input id="rentMapParking" type="checkbox">주차 가능</label>'+
      '<label><input id="rentMapLaundry" type="checkbox">실내 세탁기</label>'+
      '<label><input id="rentMapFurnished" type="checkbox">가구 포함</label>'+
      '<label><input id="rentMapPool" type="checkbox">수영장</label>'+
      '<label><input id="rentMapAC" type="checkbox">에어컨</label>'+
      '<label><input id="rentMapDishwasher" type="checkbox">식기세척기</label>'+
      '</div></div></details>'+
      '<button id="rentMapResetFilters" class="rent-map-reset" type="button">필터 초기화</button></div>'+
      '<p id="rentMapFilterStatus" class="rent-map-filter-status" role="status" aria-live="polite"></p>'+
      '<div class="rent-map-search-actions"><a id="rentMapHouses" target="_blank" rel="noopener noreferrer" href="https://www.redfin.com/rentals">단독주택 렌트</a>'+
      '<a id="rentMapApartments" target="_blank" rel="noopener noreferrer" href="https://www.redfin.com/rentals">아파트 렌트</a></div>'+
      '<small id="rentMapNoListings">실제 매물은 원본에서 확인합니다.</small></div></div>'+
      '<p id="rentMapStatus" class="rent-map-status" role="status" aria-live="polite">도시를 누르면 지도 중심이 이동합니다. ZIP 선택은 지도나 지역 선택 메뉴에서 변경하세요.</p>'+
      '<p class="rent-map-source">참고 기준점은 개인 주소나 시설의 정확한 지점이 아닌 주변 지역 표시입니다. Redfin 매물은 별도 사이트에서 제공하며 자동 수집·삽입·동기화하지 않습니다.</p>';
    const nav=panel.querySelector('#rentMapFocus');
    for(const city of core.cities){
      const b=el('button','',city.label);
      b.type='button';b.dataset.focus=city.key;b.setAttribute('aria-pressed','false');
      b.addEventListener('click',()=>focusCity(m,city.key));
      nav.appendChild(b);
    }
    panel.querySelector('#rentMapRefs').addEventListener('click',()=>setReferencePlaces(m,!state.referenceVisible));
    panel.querySelector('#rentMapFilters').addEventListener('input',updateSearchLinks);
    panel.querySelector('#rentMapFilters').addEventListener('change',updateSearchLinks);
    panel.querySelector('#rentMapResetFilters').addEventListener('click',()=>{
      for(const id of ['rentMapMinPrice','rentMapMaxPrice','rentMapMinBeds','rentMapMaxBeds','rentMapMinBaths'])$(id).value='';
      for(const id of ['rentMapDogs','rentMapCats','rentMapParking','rentMapLaundry','rentMapFurnished','rentMapPool','rentMapAC','rentMapDishwasher'])$(id).checked=false;
      updateSearchLinks();
    });
    mapBox.before(panel);
    $('zipSelect')?.addEventListener('change',updateSearchLinks);
    const zipLabel=$('k-zip'),areaLabel=$('k-area');
    if(window.MutationObserver&&zipLabel) {
      const observer=new MutationObserver(updateSearchLinks);
      observer.observe(zipLabel,{childList:true,subtree:true,characterData:true});
      if(areaLabel)observer.observe(areaLabel,{childList:true,subtree:true,characterData:true});
    }
    m.on('zoomend',()=>setScopeNote(m));
    setScopeNote(m);
    updateSearchLinks();
    state.ready=true;
    window.__rentMapUatReady=true;
  }
  let attempts=0;
  function boot() {
    if(state.ready)return;
    const m=getMap();
    if(m&&$('zipSelect')?.options.length&&m.getContainer?.()&&window.L){
      addUI(m);return;
    }
    if(++attempts<100)setTimeout(boot,250);
    else console.warn('Rent map UAT: dashboard map did not initialize');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
