'use strict';
// Phase 2A FEMA 2025 NRI tract-only relative risk; never parcel/ZIP zoning.
// Data is fetched lazily, only after the user enables a hazard overlay.
const FEMA_HAZARD_TYPES={
 ifld:{label:'내륙 홍수 위험',meaning:'FEMA Inland Flooding 상대 위험도 · 개별 필지 침수 예상이나 FEMA NFHL 홍수보험지도와 다름'},
 wfir:{label:'산불 위험',meaning:'FEMA Wildfire 상대 위험도 · 실제 건물별 화재 위험이나 TxWRAP 등급이 아님'},
 hrcn:{label:'허리케인 영향 위험',meaning:'FEMA Hurricane 상대 위험도 · DFW에서는 해안 폭풍해일이 아닌 내륙 영향 참고용'}
};
// One visual dimension only: near-white -> progressively deeper red.
// Both absence types are unpainted; distinct text explanations appear BELOW the scale.
const FEMA_RISK_COLORS={
 'Very Low':'#fff1f1','Relatively Low':'#ffd1d1','Relatively Moderate':'#ff9e9e',
 'Relatively High':'#ef5858','Very High':'#b91c1c',
 'No Rating':null,'Insufficient Data':null
};
const FEMA_PAINTED_RATINGS=['Very Low','Relatively Low','Relatively Moderate','Relatively High','Very High'];
const FEMA_HAZARD_SOURCE='https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf';
function femaHazardMetric(feature,type){
 if(!Object.hasOwn(FEMA_HAZARD_TYPES,type))return {score:null,rating:'Insufficient Data',eal:null};
 const data=feature?.properties?.[type];
 if(!data||!Number.isFinite(data.score)||data.score<0||data.score>100)return {score:null,rating:'Insufficient Data',eal:null};
 // Do not turn a null or unrecognized official rating into "Low".
 const rating=Object.hasOwn(FEMA_RISK_COLORS,String(data.rating||''))?String(data.rating):'Insufficient Data';
 if(rating==='Insufficient Data')return {score:null,rating,eal:null};
 return {score:data.score,rating,eal:Number.isFinite(data.eal)&&data.eal>=0?data.eal:null};
}
function femaHazardStyle(feature,type,opacity=.62){
 const m=femaHazardMetric(feature,type);
 const painted=FEMA_PAINTED_RATINGS.includes(m.rating);
 return {pane:'femaHazardPane',color:painted?'#ac4c4c':'transparent',
  weight:painted?.35:0,opacity:painted?.5:0,
  fillColor:painted?FEMA_RISK_COLORS[m.rating]:'transparent',
  fillOpacity:painted?Math.max(.15,Math.min(.85,Number(opacity)||.62)):0,
  interactive:painted};
}
function validateFemaHazardGeojson(data){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))return false;
 const m=data.metadata;
 if(m?.sourceDataset!=='2025 NRI v1.20.0'||m?.snapshotSourceVersion!=='December 2025'||m?.scale!=='census-tract'||
  m?.notParcelFloodplain!==true||Object.keys(m?.coverageCounties||{}).length!==12)return false;
 if(data.features.length<1000||data.features.length>8000)return false;
 const seen=new Set(),countySet=new Set();
 for(const f of data.features){
  const p=f?.properties,tract=String(p?.tract||'');
  if(!/^48\d{9}$/.test(tract)||seen.has(tract)||!m.coverageCounties[p?.countyFips]||
   !f.geometry||!['Polygon','MultiPolygon'].includes(f.geometry.type))return false;
  seen.add(tract);countySet.add(p.countyFips);
  for(const hazard of Object.keys(FEMA_HAZARD_TYPES)){
   if(!p[hazard]||typeof p[hazard]!=='object')return false;
   const v=p[hazard].score;
   if(v!==null&&(!Number.isFinite(v)||v<0||v>100))return false;
  }
 }
 return countySet.size===12;
}
function createFemaHazardOverlay(map,documentRef){
 const d=documentRef||document;
 const toggle=d.getElementById('femaHazardEnabled');
 const typeSelect=d.getElementById('femaHazardType');
 const opacityControl=d.getElementById('femaHazardOpacity');
 const status=d.getElementById('femaHazardStatus');
 const legend=d.getElementById('femaHazardLegend');
 const zipToggle=d.getElementById('zipOverlay');
 if(!map||!toggle||!typeSelect||!opacityControl||!status||!legend)return null;
 let data=null,layer=null,pending=null,restoreZip=null,requestId=0;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const riskKor={'Very Low':'매우 낮음','Relatively Low':'상대적으로 낮음','Relatively Moderate':'중간','Relatively High':'상대적으로 높음','Very High':'매우 높음','No Rating':'공식 등급 없음','Insufficient Data':'자료 없음'};
 const setStatus=(value,warning=false)=>{status.textContent=value;status.dataset.state=warning?'warning':'ready'};
 const selected=()=>Object.hasOwn(FEMA_HAZARD_TYPES,typeSelect.value)?typeSelect.value:'ifld';
 const opacity=()=>Number(opacityControl.value)/100;
 const currency=v=>Number.isFinite(v)?'$'+Math.round(v).toLocaleString('en-US'):'자료 없음';
 const popup=f=>{
  const h=selected(),m=femaHazardMetric(f,h),p=f.properties;
  return '<div class="fema-popup"><strong>'+escape(p.county)+' County · Tract '+escape(p.tract)+'</strong>'+
   '<div>'+escape(FEMA_HAZARD_TYPES[h].label)+': <b>'+escape(riskKor[m.rating])+'</b></div>'+
   '<div>FEMA 상대 위험 점수: <b>'+(m.score===null?'미공개':m.score.toFixed(1)+'/100')+'</b></div>'+
   '<div>추정 연간 기대 손실(구역 전체): '+currency(m.eal)+'</div>'+
   '<small>2025년 12월 · 인구조사구역 평균 위험. 개별 주택 침수·피해 예측이나 보험 판정이 아닙니다.</small>'+
   '</div>';
 };
 function drawLegend(){
  const h=selected();
  legend.replaceChildren();
  if(!toggle.checked){legend.hidden=true;return}
  legend.hidden=false;
  const head=d.createElement('div');head.textContent=FEMA_HAZARD_TYPES[h].label+' · 동네별 상대 비교 (FEMA 2025)';head.className='fema-legend-title';legend.appendChild(head);
  const scale=d.createElement('div');scale.className='fema-legend-swatches';
  scale.setAttribute('aria-label','위험 등급: 매우 낮음부터 매우 높음까지 연한 빨강에서 진한 빨강');
  for(const k of FEMA_PAINTED_RATINGS){
   const entry=d.createElement('span'),chip=d.createElement('i');chip.style.backgroundColor=FEMA_RISK_COLORS[k];chip.setAttribute('aria-hidden','true');
   entry.appendChild(chip);entry.appendChild(d.createTextNode(riskKor[k]));scale.appendChild(entry);
  }
  legend.appendChild(scale);
  const absent=d.createElement('div');absent.className='fema-legend-absent';
  const unrated=d.createElement('div');unrated.textContent='등급 없음: FEMA가 위험 등급을 부여하지 않은 구역 · 색칠하지 않음';
  const missing=d.createElement('div');missing.textContent='자료 없음: 위험 수치가 없거나 해석 불가한 구역 · 색칠하지 않음';
  absent.appendChild(unrated);absent.appendChild(missing);legend.appendChild(absent);
  const caveat=d.createElement('div');caveat.className='fema-legend-note';
  caveat.textContent=FEMA_HAZARD_TYPES[h].meaning+' · 2020 Census tract 단위 · 주소·필지별 위험 평가 불가';
  legend.appendChild(caveat);
 }
 async function getData(){
  if(data)return data;
  if(!pending)pending=fetch('./data/phase2a-fema-nri-dfw-2025.geojson',{cache:'force-cache'})
   .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
   .then(j=>{if(!validateFemaHazardGeojson(j))throw Error('FEMA 출처, 연도, 구역 범위 또는 수치 검증 실패');data=j;return data})
   .finally(()=>{pending=null});
  return pending;
 }
 function recolor(){if(!layer)return;layer.eachLayer(l=>{l.setStyle(femaHazardStyle(l.feature,selected(),opacity()));if(l.getPopup())l.setPopupContent(popup(l.feature))});drawLegend()}
 async function setEnabled(){
  const id=++requestId;
  if(!toggle.checked){
   if(layer&&map.hasLayer(layer))map.removeLayer(layer);
   if(restoreZip!==null&&zipToggle){zipToggle.checked=restoreZip;zipToggle.dispatchEvent(new Event('change'));restoreZip=null}
   setStatus('재해 레이어 꺼짐 · 필요할 때만 지도 데이터를 불러옵니다.');
   drawLegend();return;
  }
  const nfhl=d.getElementById('nfhlEnabled');
  if(nfhl?.checked){nfhl.checked=false;nfhl.dispatchEvent(new Event('change'))}
  const txwrap=d.getElementById('txwrapWHPEnabled');
  if(txwrap?.checked){txwrap.checked=false;txwrap.dispatchEvent(new Event('change'))}
  if(zipToggle&&restoreZip===null){
   restoreZip=zipToggle.checked;
   if(zipToggle.checked){zipToggle.checked=false;zipToggle.dispatchEvent(new Event('change'))}
  }
  drawLegend();setStatus('FEMA 2025 구역별 상대 위험 데이터를 불러오는 중…');
  try{
   const j=await getData();
   if(id!==requestId||!toggle.checked)return;
   if(!map.getPane('femaHazardPane')){
    map.createPane('femaHazardPane');
    const pane=map.getPane('femaHazardPane');pane.style.zIndex='390';pane.style.pointerEvents='auto';
   }
   if(!layer)layer=L.geoJSON(j,{pane:'femaHazardPane',style:f=>femaHazardStyle(f,selected(),opacity()),
    onEachFeature:(f,l)=>{l.on('click',()=>l.bindPopup(popup(f),{maxWidth:295}).openPopup())}});
   if(!map.hasLayer(layer))layer.addTo(map);
   recolor();
   setStatus('FEMA 2025 v1.20 · '+j.features.length.toLocaleString('en-US')+'개 Census tract · '+Object.keys(j.metadata.coverageCounties).length+'개 카운티 · 별도 주택 위험도 아님');
  }catch(err){
   console.error('FEMA hazard overlay unavailable:',err);
   if(id!==requestId)return;
   toggle.checked=false;
   if(restoreZip!==null&&zipToggle){zipToggle.checked=restoreZip;zipToggle.dispatchEvent(new Event('change'));restoreZip=null}
   setStatus('재해 데이터를 검증하거나 불러오지 못했습니다. FEMA 공식 지도에서 확인하세요.',true);
   drawLegend();
  }
 }
 toggle.addEventListener('change',setEnabled);
 typeSelect.addEventListener('change',()=>{recolor();if(toggle.checked)setStatus('FEMA '+FEMA_HAZARD_TYPES[selected()].label+' · 2025 v1.20 Census tract 상대 위험 표시')});
 opacityControl.addEventListener('input',recolor);
 setStatus('재해 레이어 꺼짐 · 필요할 때만 지도 데이터를 불러옵니다.');drawLegend();
 return {setEnabled,reset:()=>{toggle.checked=false;return setEnabled()},getLoadedFeatureCount:()=>data?.features?.length||0};
}
if(typeof module!=='undefined')module.exports={FEMA_HAZARD_TYPES,FEMA_RISK_COLORS,femaHazardMetric,femaHazardStyle,validateFemaHazardGeojson};
if(typeof window!=='undefined')window.createFemaHazardOverlay=createFemaHazardOverlay;
