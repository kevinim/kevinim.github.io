'use strict';
// Redfin UAT bridge. Runs only with ?redfinUat=1. Never fetches or embeds Redfin.
(function(){
 if(!/\/redfin-uat\.html$/i.test(window.location.pathname))return;
 const core=window.RedfinUatCore;
 if(!core)return;
 let nextId=1,mode='area',listingLayer=null;
 const saved=[];
 const $=id=>document.getElementById(id);
 function status(message,error){
  const node=$('redfinUatStatus');
  if(node){node.textContent=message;node.dataset.error=String(!!error);}
 }
 function dashboardMap(){
  // Reuse the classic script's Leaflet instance without modifying core map state.
  try{return typeof map!=='undefined'&&map&&typeof map.hasLayer==='function'?map:null;}catch{return null;}
 }
 function layerForMap(){
  const m=dashboardMap();
  if(!m||!window.L)return null;
  if(!listingLayer)listingLayer=window.L.layerGroup();
  return listingLayer;
 }
 function setMode(value){
  mode=value==='listings'?'listings':'area';
  const m=dashboardMap(),group=layerForMap();
  if(m&&group){
   if(mode==='listings'&&!m.hasLayer(group))group.addTo(m);
   if(mode==='area'&&m.hasLayer(group))m.removeLayer(group);
  }
  for(const b of document.querySelectorAll('#redfinUatLayerToggle button[data-mode]'))
   b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  const note=$('redfinUatLayerHint');
  if(note)note.textContent=mode==='listings'
   ?'수동으로 추가한 매물 핀만 표시 · 학교와 ZIP 지도는 유지'
   :'기존 지역·학교 지도 · 매물 핀만 숨김';
 }
 function link(href,label){
  const a=document.createElement('a');a.href=href;a.textContent=label;
  a.target='_blank';a.rel='noopener noreferrer';return a;
 }
 function text(tag,value,klass){
  const e=document.createElement(tag);e.textContent=value;
  if(klass)e.className=klass;return e;
 }
 function button(label,action,id,klass){
  const b=document.createElement('button');
  b.type='button';b.textContent=label;b.dataset.action=action;b.dataset.id=String(id);
  if(klass)b.className=klass;
  return b;
 }
 function render(){
  const host=$('redfinUatCards');host.replaceChildren();
  $('redfinUatCount').textContent=saved.length+' / 3';
  if(!saved.length){host.append(text('p','링크를 붙여넣고 주소를 확인하면 매물 후보가 표시됩니다.','redfin-help'));return;}
  for(const item of saved){
   const card=document.createElement('article');card.className='redfin-card';
   card.append(text('b',item.address),
    text('small',item.rent===null?'월 렌트: 직접 입력하지 않음':'입력한 월 렌트: $'+item.rent.toLocaleString('en-US')),
    text('small',item.marker?'지도 핀: Esri 참고 좌표 · 배정 미검증':'지도 핀: 아직 추가하지 않음'),
    link(item.sourceUrl,'Redfin 원본에서 사진·가격 확인'));
   const row=document.createElement('div');row.className='redfin-actions';
   const pin=button(item.busy?'위치 확인 중…':item.marker?'핀 갱신':'지도에 핀 추가','pin',item.id,'secondary');
   pin.disabled=!!item.busy;
   row.append(pin,button('학교·통근 분석','analyze',item.id),button('삭제','remove',item.id,'secondary'));
   card.append(row);host.append(card);
  }
 }
 function add(){
  const parsed=core.parseRedfinUrl($('redfinUatUrl').value);
  if(!parsed.ok){status(parsed.error,true);return;}
  const address=core.validateAddress($('redfinUatAddress').value);
  if(!address){status('정확한 DFW 주소를 입력하세요. 예: 4652 Phillip Dr, Plano, TX 75024',true);$('redfinUatAddress').focus();return;}
  const rent=core.validateRent($('redfinUatRent').value);
  if(rent===false){status('월 렌트는 선택사항이며 입력 시 $100–$99,999 정수입니다.',true);return;}
  if(saved.some(s=>s.sourceUrl===parsed.sourceUrl)){status('이미 목록에 있는 매물입니다.',true);return;}
  if(saved.length>=3){status('최대 3개입니다. 기존 후보를 먼저 삭제하세요.',true);return;}
  saved.push({id:nextId++,sourceUrl:parsed.sourceUrl,address,rent,marker:null,busy:false});
  $('redfinUatUrl').value='';$('redfinUatAddress').value='';$('redfinUatRent').value='';
  status('후보를 추가했습니다. 매물 가격·사진·가능 여부는 Redfin 원문에서 확인하세요.',false);
  render();
 }
 function locateOnMap(item){
  const group=layerForMap();
  if(!group){status('지도 라이브러리가 준비되면 다시 시도하세요.',true);return;}
  if(item.busy)return;
  item.busy=true;render();
  const query=new URLSearchParams({
   SingleLine:item.address,sourceCountry:'USA',maxLocations:'3',outFields:'Addr_type',
   searchExtent:'-98.4,32.4,-96.0,33.7',f:'json'
  });
  fetch('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?'+query,
   {referrerPolicy:'no-referrer'})
   .then(r=>{if(!r.ok)throw Error('주소 서비스 HTTP '+r.status);return r.json();})
   .then(data=>{
    if(!saved.includes(item))return;
    const c=(data.candidates||[]).find(x=>Number.isFinite(x.score)&&x.score>=85&&
     Number.isFinite(x.location?.x)&&Number.isFinite(x.location?.y)&&
     x.location.x>=-98.4&&x.location.x<=-96.0&&x.location.y>=32.4&&x.location.y<=33.7);
    if(!c)throw Error('정확도를 충족하는 좌표를 찾지 못했습니다.');
    if(item.marker)group.removeLayer(item.marker);
    const dot=window.L.circleMarker([c.location.y,c.location.x],
     {radius:10,weight:2,color:'#fff',fillColor:'#b45309',fillOpacity:0.95});
    const popup=document.createElement('div');
    popup.append(text('strong',item.address),document.createElement('br'),
     text('span','Redfin 주소 확인 필요 · 학교 배정 아님'),document.createElement('br'),
     link(item.sourceUrl,'Redfin 원본 열기'));
    dot.bindPopup(popup);item.marker=dot;group.addLayer(dot);
    setMode('listings'); // does not call setView / flyTo / fitBounds
    status('참고용 매물 핀을 표시했습니다. 주소와 공식 배정은 따로 확인하세요.',false);
   })
   .catch(e=>{if(saved.includes(item))status('주소 좌표 확인 실패: '+String(e?.message||'조회 오류'),true);})
   .finally(()=>{item.busy=false;render();});
 }
 function analyze(item){
  const input=$('homeAddress'),form=$('homeForm');
  if(!input||!form){status('기존 집 주소 검색 패널을 찾을 수 없습니다.',true);return;}
  input.value=item.address;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  setMode('area');
  if(typeof form.requestSubmit==='function')form.requestSubmit();
  else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  status('기존 집 주소 검색에 전달했습니다. 학교 배정은 공식 학군 검색기로 확인하세요.',false);
  input.scrollIntoView({behavior:'smooth',block:'center'});
 }
 function init(){
  const before=document.querySelector('.controls-grid'),box=document.querySelector('.mapbox');
  if(!before||!box||!$('homeForm'))return;
  const panel=document.createElement('section');panel.className='redfin-uat';panel.id='redfinUatPanel';
  panel.setAttribute('aria-label','Redfin 매물 연결 UAT');
  // All HTML below is static. User input is rendered with DOM textContent only.
  panel.innerHTML=[
   '<div class="redfin-kicker">FAMILY UAT · REDFIN LINK BRIDGE</div>',
   '<h2>Redfin 매물 → TX 지역 분석</h2>',
   '<p class="redfin-help">Redfin을 이 화면에 삽입하지 않습니다. 원본 사이트에서 사진·가격을 보고 링크를 붙여넣으세요. URL에서 추출한 주소는 검증되지 않았습니다.</p>',
   '<form id="redfinUatForm" class="redfin-form" novalidate>',
   '<div><label for="redfinUatUrl">개별 Redfin 매물 HTTPS URL</label><input id="redfinUatUrl" type="url" maxlength="2048" autocomplete="off" required placeholder="https://www.redfin.com/TX/.../home/..."></div>',
   '<div><label for="redfinUatAddress">주소 확인·수정 (필수)</label><input id="redfinUatAddress" maxlength="200" autocomplete="off" required placeholder="번지 도로명, City, TX ZIP"></div>',
   '<div><label for="redfinUatRent">월 렌트 USD (선택)</label><input id="redfinUatRent" type="number" min="100" max="99999" step="1" placeholder="직접 입력"></div>',
   '<button type="submit">후보에 추가</button></form>',
   '<div id="redfinUatStatus" class="redfin-status" role="status" aria-live="polite">이 페이지에서만 보관 · 새로고침하면 삭제 · 서버 또는 Redfin에서 자동 수집하지 않음</div>',
   '<p class="redfin-help">비교 후보 <strong id="redfinUatCount">0 / 3</strong> · 지도 핀 추가를 누르면 Esri에 주소가 전송됩니다. 학교·통근 분석은 기존 집 주소 검색을 사용합니다.</p>',
   '<div id="redfinUatCards" class="redfin-cards" aria-live="polite"></div>',
   '<p class="redfin-help">출처: 사용자 링크 (<a href="https://www.redfin.com/rentals" target="_blank" rel="noopener noreferrer">Redfin Rentals</a>). 가격·사진·임대 가능 여부는 자동 확인하지 않으며 Redfin과 제휴하지 않았습니다.</p>'
  ].join('');
  before.parentNode.insertBefore(panel,before);
  const toggles=document.createElement('div');
  toggles.className='redfin-toggle';toggles.id='redfinUatLayerToggle';
  toggles.setAttribute('role','group');toggles.setAttribute('aria-label','지역 분석 및 매물 핀 레이어');
  toggles.innerHTML='<button type="button" data-mode="area" aria-pressed="true">Area Intelligence</button>'+
   '<button type="button" data-mode="listings" aria-pressed="false">Rental Listings</button>'+
   '<small id="redfinUatLayerHint">기존 지역·학교 지도 · 매물 핀만 숨김</small>';
  box.insertBefore(toggles,$('map'));
  $('redfinUatUrl').addEventListener('change',()=>{
   const p=core.parseRedfinUrl($('redfinUatUrl').value);
   if(p.ok&&p.suggestedAddress&&!$('redfinUatAddress').value.trim()){
    $('redfinUatAddress').value=p.suggestedAddress;
    status('URL 경로에서 주소를 제안했습니다. Redfin 원문과 대조한 뒤 추가하세요.',false);
   }else if(!p.ok&&$('redfinUatUrl').value.trim())status(p.error,true);
   else if(p.ok&&!p.suggestedAddress)status('주소를 자동 추출할 수 없습니다. 정확한 주소를 수동 입력하세요.',false);
  });
  $('redfinUatForm').addEventListener('submit',e=>{e.preventDefault();add();});
  toggles.addEventListener('click',e=>{const b=e.target.closest('button[data-mode]');if(b)setMode(b.dataset.mode);});
  $('redfinUatCards').addEventListener('click',e=>{
   const b=e.target.closest('button[data-action]');if(!b)return;
   const item=saved.find(x=>x.id===Number(b.dataset.id));if(!item)return;
   if(b.dataset.action==='pin')locateOnMap(item);
   else if(b.dataset.action==='analyze')analyze(item);
   else if(b.dataset.action==='remove'){
    if(item.marker&&listingLayer)listingLayer.removeLayer(item.marker);
    saved.splice(saved.indexOf(item),1);render();status('매물 후보를 삭제했습니다.',false);
   }
  });
  render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();