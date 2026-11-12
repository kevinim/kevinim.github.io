'use strict';
// City-level reported crime (FBI Crime Data Explorer, NIBRS) drawn on city
// limits. A city police department reports crimes inside its city limits, so
// the map colors cities — never ZIP codes, homes or schools.
const CRIME_DATA_URL='./data/dfw-crime-city-2023-2025.geojson';
const CRIME_CATEGORIES={
 violent:{label:'폭력 범죄',detail:'살인·강간·강도·가중폭행',breaks:[100,200,350,500]},
 property:{label:'재산 범죄',detail:'주거침입·절도·차량절도·방화',breaks:[800,1500,2500,3500]}
};
const CRIME_COLORS=['#f2f0f7','#cbc9e2','#9e9ac8','#756bb1','#54278f'];
const CRIME_SMALL_CITY=10000;

function crimeRateClass(rate,category){
 if(!Number.isFinite(rate))return -1;
 const b=CRIME_CATEGORIES[category]?.breaks;if(!b)return -1;
 let i=0;while(i<b.length&&rate>=b[i])i++;return i;
}
function crimeCityRate(feature,category,year){
 const y=feature?.properties?.years?.[year];
 const rate=y?.[category+'Rate'];
 return {rate:Number.isFinite(rate)?rate:null,count:y?.[category]??null,months:y?.[category+'Months']??0,population:y?.population??null};
}
// Trend from the first to the latest year, using rates per 100k so population
// growth does not read as more crime. Within +/-10% counts as flat.
function crimeTrend(years,category){
 const ks=Object.keys(years||{}).sort();
 const first=years?.[ks[0]]?.[category+'Rate'],last=years?.[ks.at(-1)]?.[category+'Rate'];
 if(!ks.length||!Number.isFinite(first)||!Number.isFinite(last))return {dir:'unknown',label:'추세 판단 불가',from:ks[0],to:ks.at(-1)};
 // Tiny counts (every year < 20 cases) swing wildly; 1 -> 7 cases is not a +600% trend.
 if(ks.every(k=>(Number(years[k]?.[category])||0)<20))return {dir:'small',label:'건수 적음 · 추세 판단 보류',from:ks[0],to:ks.at(-1)};
 const pct=first===0?(last===0?0:100):Math.round((last-first)/first*100);
 const dir=pct>=10?'up':pct<=-10?'down':'flat';
 return {dir,pct,from:ks[0],to:ks.at(-1),label:dir==='up'?'▲ 증가':dir==='down'?'▼ 감소':'― 비슷'};
}
function crimeYearsHtml(years,category,esc){
 const ks=Object.keys(years||{}).sort(),t=crimeTrend(years,category);
 const cells=ks.map(y=>{const v=years[y];return esc(y)+' '+(v?.[category+'Months']===12?Number(v[category]).toLocaleString('en-US')+'건':'보고 부족')}).join(' · ');
 const cls=t.dir==='up'?'crime-up':t.dir==='down'?'crime-down':'crime-flat';
 return cells+' <b class="'+cls+'">'+esc(t.label)+(Number.isFinite(t.pct)&&!['unknown','small'].includes(t.dir)?' '+(t.pct>0?'+':'')+t.pct+'%':'')+'</b>';
}
function validateCrimeGeojson(j){
 return j?.type==='FeatureCollection'&&Array.isArray(j.features)&&j.features.length>=100&&
  Array.isArray(j.metadata?.years)&&String(j.metadata?.source||'').includes('FBI Crime Data Explorer')&&
  j.features.every(f=>f.properties?.ori&&f.properties?.city&&f.properties?.years&&f.geometry);
}

function createCrimeCityMap(map,documentRef){
 const d=documentRef||document;
 const button=d.getElementById('crimeMapToggle'),legend=d.getElementById('crimeLegend');
 const status=d.getElementById('crimeStatus');
 const zipToggle=d.getElementById('zipOverlay');
 if(!map||!button||!legend||!status)return null;
 let data=null,layer=null,pending=null,restoreZip=null,on=false,category='violent',requestId=0;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString('en-US'):'—';
 const year=()=>String(data?.metadata?.years?.at(-1)||'');
 const setStatus=t=>{status.textContent=t};
 const style=f=>{
  const r=crimeCityRate(f,category,year()),cls=crimeRateClass(r.rate,category);
  const small=(r.population||0)<CRIME_SMALL_CITY;
  return cls<0?{color:'#8a94a6',weight:1,dashArray:'4 4',fillColor:'#e5e7eb',fillOpacity:.35}
   :{color:small?'#6b5fa5':'#4b3f8f',weight:small?1:1.4,dashArray:small?'3 3':null,fillColor:CRIME_COLORS[cls],fillOpacity:.72};
 };
 const popup=f=>{
  const p=f.properties,y=year(),ref=data?.metadata?.reference?.[y]||{};
  const row=cat=>{const r=crimeCityRate(f,cat,y),c=CRIME_CATEGORIES[cat],tx=ref[cat]?.texas;
   return '<div style="margin-top:5px">'+esc(c.label)+' '+esc(y)+': '+(r.rate===null?'<b>자료 부족</b> ('+r.months+'/12개월 보고)':'<b>'+fmt(r.rate)+'</b> / 10만 명'+(Number.isFinite(tx)?' <small>(텍사스 '+fmt(tx)+')</small>':''))+
    '<br><small>'+crimeYearsHtml(p.years,cat,esc)+'</small></div>'};
  const pop=f.properties.years?.[y]?.population;
  return '<div class="fema-popup"><strong>'+esc(p.city)+'</strong>'+row('violent')+row('property')+
   '<div>경찰 관할 인구(FBI): '+fmt(pop)+'</div>'+
   ((pop||0)<CRIME_SMALL_CITY?'<small>인구 1만 명 미만이라 건수가 적어 해마다 크게 변할 수 있습니다.</small><br>':'')+
   '<small>시 경계 안에서 '+esc(p.agency)+'에 신고된 범죄입니다. 동네·주소별 위험이 아닙니다.</small></div>';
 };
 function drawLegend(){
  legend.replaceChildren();
  if(!on){legend.hidden=true;return}
  legend.hidden=false;
  const c=CRIME_CATEGORIES[category],y=year(),tx=data?.metadata?.reference?.[y]?.[category]?.texas;
  const head=d.createElement('div');head.className='fema-legend-title';
  head.textContent=c.label+' · 인구 10만 명당 신고 건수 ('+y+'년, 도시별)';legend.appendChild(head);
  const seg=d.createElement('div');seg.className='crime-seg';seg.setAttribute('role','group');seg.setAttribute('aria-label','범죄 종류');
  for(const [k,v] of Object.entries(CRIME_CATEGORIES)){
   const b=d.createElement('button');b.type='button';b.dataset.cat=k;b.textContent=v.label;b.setAttribute('aria-pressed',String(k===category));
   b.addEventListener('click',()=>{category=k;recolor()});seg.appendChild(b);
  }
  legend.appendChild(seg);
  const sw=d.createElement('div');sw.className='fema-legend-swatches';
  const edges=[0,...c.breaks];
  edges.forEach((lo,i)=>{const s=d.createElement('span'),chip=d.createElement('i');chip.style.backgroundColor=CRIME_COLORS[i];chip.setAttribute('aria-hidden','true');
   s.appendChild(chip);s.appendChild(d.createTextNode(i<c.breaks.length?fmt(lo)+'–'+fmt(c.breaks[i]-1):fmt(lo)+'+'));sw.appendChild(s)});
  legend.appendChild(sw);
  const note=d.createElement('div');note.className='fema-legend-note';
  note.textContent=c.detail+(Number.isFinite(tx)?' · 텍사스 평균 '+fmt(tx):'')+' · 회색 점선: 보고 부족·자료 없음(0이 아님) · 색 없는 곳: 시 경계 밖(카운티 관할) · 도시를 누르면 상세';
  legend.appendChild(note);
 }
 function recolor(){if(layer){layer.setStyle(style);layer.eachLayer(l=>{if(l.getPopup())l.setPopupContent(popup(l.feature))})}drawLegend()}
 async function getData(){
  if(data)return data;
  pending=pending||fetch(CRIME_DATA_URL,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
   .then(j=>{if(!validateCrimeGeojson(j))throw Error('범죄 자료 형식 검증 실패');data=j;return j})
   .finally(()=>{pending=null});
  return pending;
 }
 function setZip(off){
  if(!zipToggle)return;
  if(off){if(restoreZip===null){restoreZip=zipToggle.checked;if(zipToggle.checked){zipToggle.checked=false;zipToggle.dispatchEvent(new Event('change'))}}}
  else if(restoreZip!==null){zipToggle.checked=restoreZip;zipToggle.dispatchEvent(new Event('change'));restoreZip=null}
 }
 async function setOn(next){
  const id=++requestId;on=next;button.setAttribute('aria-pressed',String(on));
  if(!on){if(layer&&map.hasLayer(layer))map.removeLayer(layer);setZip(false);setStatus('범죄율 지도 꺼짐 · 필요할 때만 자료를 불러옵니다.');drawLegend();return}
  // One area-coloring layer at a time: hazards off first (they restore ZIP), then ZIP off.
  for(const hid of ['femaHazardEnabled','nfhlEnabled','txwrapWHPEnabled']){const t=d.getElementById(hid);if(t?.checked){t.checked=false;t.dispatchEvent(new Event('change',{bubbles:true}))}}
  setZip(true);setStatus('도시별 범죄 자료를 불러오는 중…');
  try{
   const j=await getData();if(id!==requestId||!on)return;
   if(!map.getPane('crimePane')){map.createPane('crimePane');const p=map.getPane('crimePane');p.style.zIndex='385';p.style.pointerEvents='auto'}
   if(!layer)layer=L.geoJSON(j,{pane:'crimePane',style,onEachFeature:(f,l)=>l.on('click',()=>l.bindPopup(popup(f),{maxWidth:290}).openPopup())});
   if(!map.hasLayer(layer))layer.addTo(map);
   recolor();
   setStatus('FBI 범죄 통계 '+j.features.length+'개 도시 · '+j.metadata.years[0]+'–'+j.metadata.years.at(-1)+' · 시 경계 기준');
  }catch(err){
   console.error('Crime map unavailable:',err);if(id!==requestId)return;
   on=false;button.setAttribute('aria-pressed','false');setZip(false);
   setStatus('범죄 자료를 불러오지 못했습니다. 새로고침하거나 FBI Crime Data Explorer에서 확인하세요.');drawLegend();
  }
 }
 button.addEventListener('click',()=>setOn(!on));
 // Capture phase: switch crime off (restoring ZIP colors) BEFORE the hazard
 // module's own handler records the ZIP state it must restore later.
 d.addEventListener('change',e=>{
  if(on&&e.target?.checked&&['femaHazardEnabled','nfhlEnabled','txwrapWHPEnabled'].includes(e.target.id))setOn(false);
 },true);
 setStatus('범죄율 지도 꺼짐 · 필요할 때만 자료를 불러옵니다.');drawLegend();
 return {setOn,isOn:()=>on,getLoadedFeatureCount:()=>data?.features?.length||0,setCategory:c=>{if(CRIME_CATEGORIES[c]){category=c;recolor()}}};
}
// ZIP detail: the cities this ZIP lies in and their 3-year trends (city-level).
let crimeZipData=null;
function crimeZipHtml(zip,data=crimeZipData){
 if(!data)return '';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const z=data.zips?.[zip],latest=String(data.metadata?.years?.at(-1)||'');
 let html='<div id="crimeZipTrend" style="margin-top:18px;font-size:12px;font-weight:800">범죄 추세 (이 ZIP이 걸친 도시 기준)</div>';
 if(!z||!z.cities.length)return html+'<p class="source">이 ZIP은 시 경찰 자료가 있는 도시와 거의 겹치지 않습니다(카운티 관할 등). 범죄 건수를 표시하지 않습니다.</p>';
 for(const c of z.cities){
  const city=data.cities[c.ori];if(!city)continue;
  const rate=k=>city.years?.[latest]?.[k+'Rate'];
  html+='<div class="crime-zip-city"><div><b>'+esc(city.city)+'</b> <span class="source">ZIP 면적의 약 '+Math.round(c.share*100)+'%'+((city.years?.[latest]?.population||0)<10000?' · 인구 1만 미만, 변동 큼':'')+'</span></div>'+
   ['violent','property'].map(k=>'<div class="crime-zip-row"><span>'+esc(CRIME_CATEGORIES[k].label)+(Number.isFinite(rate(k))?' · '+esc(latest)+' 10만 명당 '+rate(k).toLocaleString('en-US'):'')+'</span><span>'+crimeYearsHtml(city.years,k,esc)+'</span></div>').join('')+'</div>';
 }
 if(z.outsideCityShare>=0.05)html+='<p class="source">ZIP 면적의 약 '+Math.round(z.outsideCityShare*100)+'%는 시 경찰 자료가 없는 지역(카운티 보안관 관할 등)입니다.</p>';
 return html+'<p class="source">시 경찰에 신고된 건수(FBI)입니다. 도시 전체 수치이며 이 ZIP 안의 건수가 아닙니다. 추세는 '+esc(data.metadata.years[0])+'→'+esc(latest)+' 인구 10만 명당 비율 변화(±10% 이내는 비슷)입니다.</p>';
}
if(typeof window!=='undefined'){
 // crimeZipHtml is already global (top-level function in a classic script).
 fetch('./data/dfw-crime-zip-cities-2023-2025.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
  .then(j=>{crimeZipData=j;if(typeof drawDetail==='function')drawDetail()}).catch(e=>console.error('ZIP 범죄 추세 자료 오류:',e));
}
if(typeof module!=='undefined')module.exports={CRIME_CATEGORIES,CRIME_COLORS,crimeRateClass,crimeCityRate,crimeTrend,crimeZipHtml,validateCrimeGeojson};
if(typeof window!=='undefined')window.createCrimeCityMap=createCrimeCityMap;
