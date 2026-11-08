/* 2025 FEMA NRI winter hazard layer. Scores are Census tract relative risk,
   NEVER utility reliability, a home-specific outage probability or current weather. */
(function(root){
'use strict';
const TYPES={cwav:{name:'한파',key:'coldWave'},istm:{name:'얼음폭풍',key:'iceStorm'},wntw:{name:'겨울철 기상',key:'winterWeather'}};
const COLORS={'Very Low':'#f7e8dc','Relatively Low':'#f4c6ad','Relatively Moderate':'#ef9a7e','Relatively High':'#db6154','Very High':'#a62d2e'};
const KOR={'Very Low':'매우 낮음','Relatively Low':'상대적으로 낮음','Relatively Moderate':'중간','Relatively High':'상대적으로 높음','Very High':'매우 높음','No Rating':'등급 없음','Insufficient Data':'자료 없음'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validScores(j){
 if(!j||j.metadata?.sourceVersion!=='December 2025'||j.metadata?.dataset!=='2025 NRI v1.20.0'||
 j.metadata.tractCount!==j.records?.length||j.records.length<1000)return false;
 const keys=new Set();
 for(const r of j.records){
  if(!/^48\d{9}$/.test(r.tract)||keys.has(r.tract))return false;keys.add(r.tract);
  for(const v of Object.values(TYPES)){
   const x=r[v.key];if(!x||x.score!==null&&(!Number.isFinite(x.score)||x.score<0||x.score>100)||
      ![...Object.keys(COLORS),'Insufficient Data','No Rating','Not Applicable'].includes(x.rating))return false;
  }
 }
 return true;
}
function initWinterHazardMap(map,d){
 d=d||document;
 const quick=d.getElementById('winterMapQuickToggle'),legend=d.getElementById('winterMapLegend'),status=d.getElementById('winterMapStatus');
 if(!map||!quick||!legend||!root.L)return null;
 const selected=()=>TYPES[d.getElementById('winterHazardType')?.value]?
 d.getElementById('winterHazardType').value:'cwav';
 const selectedRec=(r)=>r?.[TYPES[selected()].key]||null;
 const setStatus=x=>{if(status)status.textContent=x};
 const zip=d.getElementById('zipOverlay');
 let enabled=false,pending=null,tracts=null,geo=null,layer=null,restoreZip=null,request=0;
 function sync(){
  quick.setAttribute('aria-pressed',String(enabled));
  const check=d.getElementById('winterMapEnabled');if(check)check.checked=enabled;
 }
 function fillMetric(f){
  const x=selectedRec(tracts?.get(f.properties?.tract));
  return x&&Object.hasOwn(COLORS,x.rating)&&Number.isFinite(x.score)?x:null;
 }
 function style(f){
  const metric=fillMetric(f);
  return {pane:'femaWinterPane',color:metric?'#b04b43':'transparent',weight:metric?.rating==='Very High'?0.7:0.35,
   opacity:metric?.rating==='Very High'?0.7:0.3,fillColor:metric?COLORS[metric.rating]:'transparent',
   fillOpacity:metric?0.65:0,interactive:!!metric};
 }
 function popup(f){
  const r=tracts?.get(f.properties?.tract),m=selectedRec(r);
  const rating=m?.rating||'Insufficient Data';
  return '<div class="fema-popup"><strong>'+esc(f.properties?.county)+' County · Tract '+esc(f.properties?.tract)+'</strong>'+
   '<div>FEMA '+esc(TYPES[selected()].name)+' 상대 위험: <b>'+esc(KOR[rating]||rating)+'</b></div>'+
   '<div>위험 점수: '+(Number.isFinite(m?.score)?m.score.toFixed(1)+'/100':'자료 없음')+'</div>'+
   '<small>2025년 12월 NRI v1.20 · Census tract 평균. 전력회사 정전시간이나 특정 집의 정전 위험과 다릅니다.</small></div>';
 }
 function paintLegend(){
  legend.replaceChildren();legend.hidden=!enabled;if(!enabled)return;
  const title=d.createElement('div');title.className='fema-legend-title';title.textContent='FEMA '+TYPES[selected()].name+' · 지역별 상대 위험 (2025)';legend.appendChild(title);
  const swatches=d.createElement('div');swatches.className='fema-legend-swatches';
  for(const [key,color] of Object.entries(COLORS)){
   const el=d.createElement('span'),swatch=d.createElement('i');swatch.style.backgroundColor=color;
   el.appendChild(swatch);el.appendChild(d.createTextNode(KOR[key]));swatches.appendChild(el);
  }
  legend.appendChild(swatches);
  const note=d.createElement('div');note.className='fema-legend-note';
  note.textContent='등급 없음·자료 없음은 무색 · 2020 Census tract 기준. 전력망 또는 주소별 정전 예측치가 아닙니다.';
  legend.appendChild(note);
 }
 function recolor(){
  if(!layer)return;
  layer.eachLayer(l=>{l.setStyle(style(l.feature));if(l.getPopup())l.setPopupContent(popup(l.feature));});
  paintLegend();
 }
 async function load(){
  if(tracts&&geo)return;
  if(!pending)pending=Promise.all([
   fetch('./data/resilience/fema-nri-dfw-winter-2025.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('NRI 겨울 점수 HTTP '+r.status);return r.json()}),
   fetch('./data/phase2a-fema-nri-dfw-2025.geojson',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('NRI 구역 HTTP '+r.status);return r.json()})
  ]).then(([scores,shapes])=>{
    if(!validScores(scores)||shapes.type!=='FeatureCollection'||
      shapes.metadata?.sourceDataset!=='2025 NRI v1.20.0'||
      shapes.metadata?.snapshotSourceVersion!=='December 2025'||
      shapes.features?.length!==scores.records.length)throw Error('NRI 자료·기하 형상 버전 또는 범위 불일치');
    const index=new Map(scores.records.map(r=>[r.tract,r]));
    for(const feature of shapes.features)if(!index.has(feature.properties?.tract))throw Error('지역 매칭 누락 '+feature.properties?.tract);
    geo=shapes;tracts=index;
  }).finally(()=>{pending=null});
  return pending;
 }
 function restore(){
  if(restoreZip!==null&&zip){zip.checked=restoreZip;zip.dispatchEvent(new Event('change',{bubbles:true}));restoreZip=null;}
 }
 async function toggle(next){
  const id=++request;enabled=Boolean(next);sync();
  if(!enabled){
   if(layer&&map.hasLayer(layer))map.removeLayer(layer);
   restore();paintLegend();setStatus('겨울 위험 지도 꺼짐');return;
  }
  for(const name of ['femaHazardEnabled','nfhlEnabled','txwrapWHPEnabled']){
   const control=d.getElementById(name);
   if(control?.checked){control.checked=false;control.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  const crime=d.getElementById('crimeMapToggle');
  if(crime?.getAttribute('aria-pressed')==='true')crime.click();
  if(zip&&restoreZip===null){restoreZip=zip.checked;if(zip.checked){zip.checked=false;zip.dispatchEvent(new Event('change',{bubbles:true}));}}
  setStatus('2025 FEMA 겨울 위험과 Census tract 경계를 확인하는 중…');paintLegend();
  try{
   await load();if(id!==request||!enabled)return;
   if(!map.getPane('femaWinterPane')){
     map.createPane('femaWinterPane');
     map.getPane('femaWinterPane').style.zIndex='390';
     map.getPane('femaWinterPane').style.pointerEvents='auto';
   }
   if(!layer)layer=L.geoJSON(geo,{pane:'femaWinterPane',style,onEachFeature:(f,l)=>{l.on('click',()=>{if(fillMetric(f))l.bindPopup(popup(f),{maxWidth:300}).openPopup()})}});
   if(!map.hasLayer(layer))layer.addTo(map);
   recolor();setStatus('FEMA 2025 · '+geo.features.length+'개 Census tract · '+TYPES[selected()].name+' 상대 위험. 주소별 정전 위험 아님');
  }catch(e){
   if(id!==request)return;
   console.error('Winter NRI map unavailable:',e);enabled=false;sync();
   if(layer&&map.hasLayer(layer))map.removeLayer(layer);restore();paintLegend();
   setStatus('겨울 위험 자료를 검증하거나 불러오지 못했습니다. FEMA 공식 자료를 확인하세요.');
  }
 }
 quick.addEventListener('click',()=>toggle(!enabled));
 d.addEventListener('change',e=>{
  if(e.target?.id==='winterMapEnabled')toggle(e.target.checked);
  if(e.target?.id==='winterHazardType'&&enabled){recolor();setStatus('FEMA 2025 '+TYPES[selected()].name+' 상대 위험 지도');}
 },false);
 // Capture competing layers first so they see the ZIP toggle restored.
 d.addEventListener('change',e=>{
  if(enabled&&['femaHazardEnabled','nfhlEnabled','txwrapWHPEnabled','zipOverlay'].includes(e.target?.id)&&e.target.checked){toggle(false);}
 },true);
 d.addEventListener('click',e=>{if(enabled&&e.target?.closest?.('#crimeMapToggle'))toggle(false)},true);
 sync();paintLegend();setStatus('한파·얼음폭풍·겨울철 기상 중 선택해 지역별 상대 위험을 표시합니다.');
 return {toggle,validScores,getLoadedCount:()=>tracts?.size||0};
}
root.initWinterHazardMap=initWinterHazardMap;
if(typeof module!=='undefined')module.exports={initWinterHazardMap,validScores};
})(typeof window!=='undefined'?window:globalThis);
