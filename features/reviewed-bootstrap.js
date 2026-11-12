
'use strict';
const DATA=[
{z:'75093',name:'West Plano',pop:47954,korean:1.1,indian:8.3,chinese:5.7,vietnamese:.7,filipino:1.6,kids:19.4,childHH:28.3,income:124563,age:43.3,ll:[33.019,-96.815]},
{z:'75024',name:'NW Plano',pop:45652,korean:1.9,indian:27.8,chinese:5.6,vietnamese:1.5,filipino:.9,kids:21,childHH:32.7,income:117088,age:38.2,ll:[33.078,-96.825]},
{z:'75025',name:'North Plano',pop:53202,korean:1.4,indian:22.3,chinese:7.8,vietnamese:2.3,filipino:1.1,kids:23.9,childHH:42.1,income:143260,age:41.1,ll:[33.095,-96.745]},
{z:'75035',name:'East Frisco',pop:89682,korean:1.9,indian:27.7,chinese:3.5,vietnamese:1.4,filipino:1.4,kids:29.5,childHH:56.3,income:166590,age:38.7,ll:[33.155,-96.752]},
{z:'75034',name:'West Frisco',pop:53818,korean:2.3,indian:12.2,chinese:2.2,vietnamese:.8,filipino:1.2,kids:20.3,childHH:30.1,income:111122,age:35.9,ll:[33.113,-96.86]},
{z:'75036',name:'SW Frisco',pop:33496,korean:2.0,indian:21.5,chinese:2.7,vietnamese:1.2,filipino:.9,kids:25.7,childHH:43.5,income:151645,age:41.9,ll:[33.103,-96.912]},
{z:'75033',name:'North Frisco',pop:52795,korean:1.3,indian:10.2,chinese:1.9,vietnamese:1.1,filipino:1.1,kids:31.8,childHH:58.2,income:174762,age:36.5,ll:[33.185,-96.834]},
{z:'75013',name:'West Allen',pop:49796,korean:4.6,indian:12.1,chinese:7.1,vietnamese:2.9,filipino:.5,kids:24.9,childHH:41.5,income:146891,age:38.9,ll:[33.108,-96.689]},
{z:'75078',name:'Prosper',pop:53011,korean:1.0,indian:11.2,chinese:3.1,vietnamese:.7,filipino:1.0,kids:33.1,childHH:62.0,income:196564,age:36.6,ll:[33.237,-96.789]},
{z:'75056',name:'The Colony',pop:69628,korean:3.8,indian:7.4,chinese:1.8,vietnamese:2.5,filipino:1.0,kids:20.4,childHH:30.7,income:119682,age:37.4,ll:[33.089,-96.887]},
{z:'75010',name:'Carrollton North',pop:33326,korean:7.5,indian:7.7,chinese:2.6,vietnamese:3.1,filipino:1.7,kids:20.5,childHH:31.6,income:107317,age:38.4,ll:[33.045,-96.918]}
];
const OFFICIAL={PISD:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/attendance-boundary-descriptions',FISD:'https://www.friscoisd.org/page/2026-2027-zones/',AISD:'https://www.allenisd.org/page/findaschool',PROSPER:'https://www.prosper-isd.net/page/attendance-boundaries/',LISD:'https://www.lisd.net/resources/families/school-locator',CFB:'https://www.cfbisd.edu/students/school-maps-locator-system'};
const FISD_MAPS={elementary:'https://www.friscoisd.org/docs/default-source/attendance-zones/2026-27/2026-27-elementary-school.pdf?sfvrsn=692050e1_3',middle:'https://sf1.friscoisd.org/docs/default-source/attendance-zones/2026-27/2026-27-middle-school.pdf?sfvrsn=4e66667_3',high:'https://www.friscoisd.org/docs/default-source/attendance-zones/2026-27/2026-27-high-school.pdf?sfvrsn=1bf3f52f_3'};
const RATINGS={}; // School-level numeric ratings are not yet verified against TEA.
const FALLBACK_SCHOOLS=[
{name:'Wakeland High School',type:'high',district:'FISD',address:'10700 Legacy Dr, Frisco TX 75034'},
{name:'Reedy High School',type:'high',district:'FISD',address:'3003 Stonebrook Pkwy, Frisco TX 75034'},
{name:'Centennial High School',type:'high',district:'FISD',address:'6901 Coit Rd, Frisco TX 75035'},
{name:'Independence High School',type:'high',district:'FISD',address:'10555 Independence Pkwy, Frisco TX 75035'},
{name:'Liberty High School',type:'high',district:'FISD',address:'15250 Rolater Rd, Frisco TX 75035'},
{name:'Lebanon Trail High School',type:'high',district:'FISD',address:'5151 Ohio Dr, Frisco TX 75035'},
{name:'Lawler Middle School',type:'middle',district:'FISD'},
{name:'Nelson Middle School',type:'middle',district:'FISD'},
{name:'Talley Elementary School',type:'elementary',district:'FISD'},
{name:'McSpedden Elementary School',type:'elementary',district:'FISD'},
{name:'Plano West Senior High School',type:'high',district:'PISD'},
{name:'Plano Senior High School',type:'high',district:'PISD'},
{name:'Plano East Senior High School',type:'high',district:'PISD'},
{name:'Rice Middle School',type:'middle',district:'PISD'},
{name:'Robinson Middle School',type:'middle',district:'PISD'},
{name:'Jasper High School',type:'high',district:'PISD'},
{name:'Curtis Middle School',type:'middle',district:'AISD'},
{name:'Ereckson Middle School',type:'middle',district:'AISD'},
{name:'Allen High School',type:'high',district:'AISD'}
];
let state={zip:'75093',metric:'korean',level:'all',showZip:true,showSchools:true,allen:false,schools:[],selectedSchool:null,dest:null,times:{},schoolQuery:'',polys:{},uploaded:null,boundaries:[],initDone:false};
const el=id=>document.getElementById(id),fmt=v=>Number(v).toLocaleString('en-US'),money=v=>'$'+fmt(v),pct=v=>v.toFixed(1)+'%',escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(s){let e=el('toast');e.textContent=s;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',4000)}
let map=null,zipGroup,schoolGroup,zoneGroup,routeGroup,targetMarker,zipMarkers;const col={elementary:'#315bd3',middle:'#078b7d',high:'#c08038'};
function ratingKey(n){return n.toLowerCase().replace(/\b(school|h s|h s\.|h\.s\.|el|ms|high school|middle school|elementary school)\b/g,s=>s.includes('high')||s==='h s'||s==='h.s.'?'high':s==='ms'?'middle':s==='el'?'elementary':'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function canonical(n){return String(n||'').toLowerCase().replace(/h\.?\s?s\.?\b/g,'high').replace(/m\.?\s?s\.?\b/g,'middle').replace(/elem\b|el\b/g,'elementary').replace(/school\b/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function score(n){const k=canonical(n);for(let [x,s] of Object.entries(RATINGS)){if(canonical(x)===k)return s;}return null}
function scoreSource(n){return 'https://txschools.gov/'}
function getZip(){return DATA.find(x=>x.z===state.zip)}
function niceMetric(v,k=state.metric){return k==='income'?money(v):pct(v)}
function metricLabel(k){return ({korean:'한국계',indian:'인도계',chinese:'중국계',vietnamese:'베트남계',kids:'18세 미만',childHH:'미성년자 동거 가구',income:'중위 가구 소득'})[k]}
function shade(v){const a=DATA.map(d=>d[state.metric]);const mn=Math.min(...a),mx=Math.max(...a);const t=mx===mn?.5:(v-mn)/(mx-mn);return `hsl(${213-24*t} 65% ${88-46*t}%)`}
function init(){DATA.forEach(d=>{let o=document.createElement('option');o.value=d.z;o.textContent=`${d.z} · ${d.name}`;el('zipSelect').appendChild(o)});el('zipSelect').value=state.zip;el('zipSelect').onchange=e=>selectZip(e.target.value);el('metric').onchange=e=>{state.metric=e.target.value;drawZip();drawDetail();drawTable()};el('zipOverlay').onchange=e=>{state.showZip=e.target.checked;drawZip()};el('schoolOverlay').onchange=e=>{state.showSchools=e.target.checked;drawSchools()};el('allenOverlay').onchange=e=>{state.allen=e.target.checked;drawBoundary()};el('levels').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.level=b.dataset.v;[...el('levels').children].forEach(x=>x.classList.toggle('active',x===b));drawSchools();drawList()};el('schoolSearch').oninput=e=>{state.schoolQuery=e.target.value.toLowerCase();drawList()};el('schoolSearchClear').onclick=()=>{el('schoolSearch').value='';state.schoolQuery='';drawList()};el('calcCommute').onclick=calcCommute;el('destination').onkeydown=e=>{if(e.key==='Enter')calcCommute()};el('boundaryFile').onchange=loadBoundaryFile;
renderData();drawList();if(window.L){map=L.map('map',{zoomControl:true,preferCanvas:true}).setView([33.129,-96.785],11);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);zipGroup=L.featureGroup().addTo(map);schoolGroup=L.featureGroup().addTo(map);zoneGroup=L.featureGroup().addTo(map);routeGroup=L.featureGroup().addTo(map);zipMarkers=L.featureGroup().addTo(map);loadZipShapes();loadSchools();setTimeout(()=>map.invalidateSize(),250)}else{el('map').innerHTML='<div style="padding:30px;color:#53647a">미리보기 또는 브라우저에서 지도 라이브러리 로딩에 실패했습니다. GitHub Pages 정식 주소를 이용하거나 브라우저 연결을 확인하세요. 아래 인구 비교표와 기본 학교 목록은 사용할 수 있습니다.</div>';el('mapLoadStatus').textContent='Leaflet 지도를 로드하지 못했습니다.';state.schools=FALLBACK_SCHOOLS;drawList();}}
function renderData(){const d=getZip();el('k-zip').textContent=d.z;el('k-area').textContent=d.name;el('k-korean').textContent=pct(d.korean);el('k-households').textContent=pct(d.childHH);el('k-income').textContent=money(d.income);drawDetail();drawTable()}
function selectZip(z,fly=true){state.zip=z;el('zipSelect').value=z;state.selectedSchool=null;renderData();drawZip();if(map&&fly){const p=state.polys[z];p?map.fitBounds(p.getBounds(),{maxZoom:12,padding:[18,18]}):map.flyTo(getZip().ll,12)}drawSchools();if(state.dest)drawSelectedRoute()}
function drawDetail(){const d=getZip();if(state.selectedSchool){const s=state.selectedSchool;const sScore=score(s.name);el('detailContent').innerHTML=`<h3>${escape(s.name)}</h3><div class="muted">${({high:'고등학교',middle:'중학교',elementary:'초등학교'})[s.type]||'학교'} · ${escape(s.district||'학군 미확인')} · ${sScore===null?'TEA 점수 미확인':`TEA (추가 검증 필요): <b>${sScore}/100 · ${sScore>=90?'A':sScore>=80?'B':sScore>=70?'C':'D/F'}</b>`}</div>${s.address?`<div style="margin-top:10px;font-size:12px">${escape(s.address)}</div>`:''}<hr class="rule"><div class="eyebrow">SCHOOL ASSIGNMENT</div><p class="muted" style="margin:9px 0">학교 가까이 사는 것만으로 배정이 보장되지 않습니다. 해당 주소를 공식 학군 검색기에 입력해 검증하세요.</p><div class="notice" id="zoneNotice">${s.district==='AISD'?'Allen 공개 GIS 경계는 메타데이터가 과거 연도로 표시됩니다. <b>최신 배정 확인이 필요</b>합니다.':'2026–27 학교별 디지털 경계 폴리곤은 아직 검증되지 않았습니다. 공식 학교별 배정 확인 사이트를 열 수 있습니다.'}</div><a class="cardlink" target="_blank" rel="noopener" href="${OFFICIAL[s.district]||'https://txschools.gov/'}">학군 공식 배정 확인 ↗</a><a class="cardlink" target="_blank" rel="noopener" href="${scoreSource(s.name)}">${sScore===null?'TEA 성적 확인':'2026 점수 출처'} ↗</a>${s.district==='FISD'?`<a class="cardlink" target="_blank" rel="noopener" href="${FISD_MAPS[s.type]}">2026–27 공식 ${({elementary:'초등',middle:'중등',high:'고등'})[s.type]} 배정구역 지도 PDF ↗</a>`:''}<a class="cardlink" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address||s.name+', Texas')}">학교 위치 확인 ↗</a><div style="margin-top:18px"><button class="btn secondary" data-clear-school>ZIP 통계로 돌아가기</button></div>`;drawBoundary();return}
let html=`<h3>${escape(d.name)} <span style="font-size:12px;color:#7a8b9c;font-weight:500">${d.z}</span></h3><div class="muted">Census ZIP Tabulation Area · 표본 추정치</div><div class="stat-list">`;
const stats=[['전체 인구',fmt(d.pop)+'명'],['중위 연령',d.age+'세'],['18세 미만 인구',pct(d.kids)],['미성년자 동거 가구',pct(d.childHH)],['중위 가구 소득',money(d.income)]];html+=stats.map(([x,y])=>`<div class="statrow"><span>${x}</span><strong>${y}</strong></div>`).join('')+'</div><div style="margin-top:18px;font-size:12px;font-weight:800">아시아계 세부 구성</div><div class="bars">';const arr=[['한국계',d.korean],['인도계',d.indian],['중국계',d.chinese],['베트남계',d.vietnamese],['필리핀계',d.filipino]];html+=arr.map(([x,y])=>`<div class="brow"><div class="btop"><span>${x}</span><span>${pct(y)}</span></div><div class="track"><div class="fill" style="width:${Math.min(100,y/32*100)}%"></div></div></div>`).join('');html+='</div><p class="source">민족 상세 데이터는 복수 선택 응답을 포함할 수 있어 합계가 전체 Asian 수치와 정확히 일치하지 않을 수 있습니다.</p>';el('detailContent').innerHTML=html;if(map)zoneGroup?.clearLayers()}
window.clearSchool=()=>{state.selectedSchool=null;drawDetail();drawBoundary()};
function drawTable(){const tbody=el('compareTable').querySelector('tbody');tbody.innerHTML=DATA.map(d=>`<tr data-z="${d.z}" class="${d.z===state.zip?'sel':''}"><td><b>${d.z}</b><br><span style="color:#718095">${escape(d.name)}</span></td><td>${pct(d.korean)}</td><td>${pct(d.indian)}</td><td>${pct(d.chinese)}</td><td>${pct(d.kids)}</td><td>${pct(d.childHH)}</td><td>${money(d.income)}</td><td>${state.times[d.z]===undefined?'—':Math.round(state.times[d.z])+'분'}</td></tr>`).join('');tbody.querySelectorAll('tr').forEach(tr=>tr.onclick=()=>selectZip(tr.dataset.z))}
async function loadZipShapes(){
  try{
    const res=await fetch('./zips.geojson',{cache:'no-store'});
    if(!res.ok)throw new Error('ZIP 데이터 HTTP '+res.status);
    const obj=await res.json();
    if(obj.type!=='FeatureCollection'||!Array.isArray(obj.features))throw new Error('GeoJSON 형식 오류');
    const expected=new Set(DATA.map(d=>d.z));
    const found=new Set();
    for(const f of obj.features){
      const z=String(f.properties?.ZCTA5CE20||'');
      if(!expected.has(z)||!f.geometry)continue;
      const shape=L.geoJSON(f);
      if(!shape.getBounds().isValid())continue;
      state.polys[z]=shape;
      found.add(z);
      const centroid=shape.getBounds().getCenter();
      DATA.find(x=>x.z===z).ll=[centroid.lat,centroid.lng];
    }
    if(found.size!==DATA.length)throw new Error('ZIP 경계 '+found.size+'/'+DATA.length+'개');
    drawZip();
    map.fitBounds(zipGroup.getBounds(),{padding:[20,20],maxZoom:11});
    el('mapLoadStatus').innerHTML='<b>11개 ZIP 경계 표시 완료</b><br>NCTCOG / Census 2020 ZCTA (2021 발행). 학교 배정구역이 아닙니다.';
  }catch(e){
    console.error('ZIP boundary loading failed:',e);
    drawZip();
    el('mapLoadStatus').textContent='ZIP 경계를 불러오지 못했습니다. 구역명 마커를 대신 표시합니다: '+e.message;
  }
}
function drawZip(){if(!map)return;zipGroup.clearLayers();zipMarkers.clearLayers();DATA.forEach(d=>{const p=state.polys[d.z];if(p&&state.showZip){p.setStyle({color:d.z===state.zip?'#1e4298':'#99a8ba',weight:d.z===state.zip?2.8:1.1,opacity:.9,fillColor:shade(d[state.metric]),fillOpacity:.42});p.on('click',()=>selectZip(d.z,false));p.bindTooltip(`<b>${d.z}</b> ${escape(d.name)}<br>${metricLabel(state.metric)}: ${niceMetric(d[state.metric])}`,{sticky:true});zipGroup.addLayer(p)}else if(!p){const icon=L.divIcon({className:'',html:`<div class="mapmark zip" style="width:41px;border-radius:10px">${d.z}</div>`,iconSize:[41,27],iconAnchor:[20,14]});L.marker(d.ll,{icon}).addTo(zipMarkers).on('click',()=>selectZip(d.z))}})}
function schoolType(s){const a=(s||'').toLowerCase();if(/elementary|\bel\b|primary|kindergarten|\bk-5\b|\bk-6\b/.test(a))return'elementary';if(/middle|intermediate|junior high|\bms\b/.test(a))return'middle';if(/high|senior|freshman|\bhs\b/.test(a))return'high';return null}
function normalizeSchool(raw){if(!raw.name)return null;let type=raw.type||schoolType(raw.name+' '+(raw.grades||'')+' '+(raw.stype||''));if(type===null)type=schoolType(raw.stype);if(!type)return null;let district=raw.district||'';if(!district){const a=(raw.addr||'').toLowerCase();district=a.includes('allen')?'AISD':a.includes('frisco')?'FISD':a.includes('plano')?'PISD':a.includes('prosper')?'PROSPER':''}return {...raw,type,district}}
async function loadSchools(){
  state.schools=FALLBACK_SCHOOLS.map(s=>({...s,source:'검증 필요한 초기 학교 목록'}));
  drawList();
  let loaded=0;
  try{
    const res=await fetch('./schools.json',{cache:'no-store'});
    if(!res.ok)throw new Error('학교 데이터 HTTP '+res.status);
    const obj=await res.json();
    if(!Array.isArray(obj.schools))throw new Error('학교 데이터 형식 오류');
    for(const raw of obj.schools){
      const s=normalizeSchool(raw);
      if(!s||!Array.isArray(s.ll)||!Number.isFinite(s.ll[0])||!Number.isFinite(s.ll[1]))continue;
      addSchool(s);
      loaded++;
    }
    if(!loaded)throw new Error('학교 좌표 0개');
  }catch(e){console.error('School location dataset:',e);toast('학교 지도 위치 데이터를 읽지 못했습니다. 기본 목록은 유지됩니다.')}
  state.schools.sort((a,b)=>a.name.localeCompare(b.name));
  drawSchools();
  drawList();
  el('schoolCount').textContent=state.schools.length+'개 학교';
}
function addSchool(s){const key=canonical(s.name);if(!key)return;const ex=state.schools.find(a=>canonical(a.name)===key&&(!a.district||!s.district||a.district===s.district));if(ex){ex.ll=s.ll||ex.ll;ex.address=s.address||ex.address;ex.district=s.district||ex.district;ex.source=s.source;return}state.schools.push(s)}
function gradeTag(s){return s.type==='high'?'고등':s.type==='middle'?'중등':'초등'}
function schoolClicked(s){state.selectedSchool=s;drawDetail();if(map&&s.ll){map.flyTo(s.ll,13);drawBoundary()}else if(s.address){toast('이 학교 위치는 아직 지오코딩되지 않았습니다. 학교 정보의 Google 지도 링크로 확인하세요.')};if(window.innerWidth<721)el('detailContent').scrollIntoView({behavior:'smooth',block:'nearest'})}
function drawSchools(){if(!map)return;schoolGroup.clearLayers();if(!state.showSchools)return;const items=state.schools.filter(s=>s.ll&&(state.level==='all'||s.type===state.level));items.slice(0,260).forEach(s=>{const icon=L.divIcon({className:'',html:`<div class="mapmark ${s.type}">${s.type==='elementary'?'E':s.type==='middle'?'M':'H'}</div>`,iconSize:[27,27],iconAnchor:[13,13]});L.marker(s.ll,{icon,title:s.name}).addTo(schoolGroup).on('click',()=>schoolClicked(s))})}
function drawList(){let items=state.schools.filter(s=>(state.level==='all'||s.type===state.level)&&(!state.schoolQuery||s.name.toLowerCase().includes(state.schoolQuery)));el('schoolList').innerHTML=items.slice(0,135).map((s,i)=>{const r=score(s.name);return `<button class="school" data-sid="${state.schools.indexOf(s)}"><span><b>${escape(s.name)}</b><small>${gradeTag(s)} · ${escape(s.district||'배정 학군 확인 필요')} ${s.ll?'· 지도 위치 있음':''}</small></span><span class="score ${r===null?'nr':''}">${r===null?'TEA ↗':`A · ${r}`}</span></button>`}).join('')||'<div class="muted" style="padding:14px">검색 결과 없음</div>';el('schoolCount').textContent=state.schools.length+'개 학교';el('schoolList').querySelectorAll('button').forEach(b=>b.onclick=()=>schoolClicked(state.schools[+b.dataset.sid]))}
async function drawBoundary(){if(!map)return;zoneGroup.clearLayers();if(state.selectedSchool){const s=state.selectedSchool;let matched=0;if(state.uploaded){for(const f of state.uploaded.features||[]){const p=f.properties||{};const n=p.school||p.SchoolName||p.school_name||p.NAME||'';if(canonical(n)===canonical(s.name)){const l=L.geoJSON(f,{style:{color:'#e28820',weight:3,fillColor:'#ffca77',fillOpacity:.28}}).addTo(zoneGroup);matched++;map.fitBounds(l.getBounds(),{maxZoom:13})}}}
if(state.allen&&s.district==='AISD'){const t=s.type==='elementary'?'Elementary':s.type==='middle'?'Middle':'High_School';try{const url=`https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_${t}/MapServer/0/query`;const q=new URLSearchParams({where:`SchoolName='${s.name.replaceAll("'","''")}'`,outFields:'SchoolName,YearUpdated',outSR:'4326',returnGeometry:'true',f:'geojson'});const j=await (await fetch(url+'?'+q)).json();if(j.features?.length){const layer=L.geoJSON(j,{style:{color:'#db9b46',weight:3,fillColor:'#f8c06e',fillOpacity:.3}}).addTo(zoneGroup);map.fitBounds(layer.getBounds(),{maxZoom:13});matched+=j.features.length;let z=el('zoneNotice');if(z)z.innerHTML='<b>Allen historical GIS overlay:</b> '+j.features.map(f=>escape(f.properties.YearUpdated||'year unverified')).join(', ')+'년 표기 데이터. 반드시 Allen ISD에서 2026–27 구역을 다시 확인하세요.'}}catch(e){console.warn('Allen zone error',e)}}if(matched){let x=el('zoneNotice');if(x&&!state.allen)x.innerHTML=`업로드한 GeoJSON에서 ${matched}개 경계가 표시되었습니다. 공식 배정은 학군에서 검증해야 합니다.`}}
else if(state.allen){const url='https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_Elementary/MapServer/0/query';try{const q=new URLSearchParams({where:'1=1',outFields:'SchoolName,YearUpdated',outSR:'4326',f:'geojson'});const j=await (await fetch(url+'?'+q)).json();if(j.features?.length)L.geoJSON(j,{style:{color:'#cf9140',weight:1.5,fillOpacity:.08}}).addTo(zoneGroup)}catch(e){console.warn(e)}}}
async function loadBoundaryFile(event){
 const file=event?.target?.files?.[0];if(!file)return;
 try{
  if(!window.SchoolGeoJSONGuard)throw Error('파일 검증 모듈을 불러오지 못했습니다.');
  window.SchoolGeoJSONGuard.assertFileSize(file.size);
  const raw=await file.text();
  const verified=window.SchoolGeoJSONGuard.validate(JSON.parse(raw));
  state.uploaded=verified.geojson;
  toast(verified.stats.features+'개 학교 경계를 확인했습니다. 공식 배정은 학군에서 별도로 확인하세요.');
  drawBoundary();
 }catch(error){
  state.uploaded=null;
  if(zoneGroup)zoneGroup.clearLayers();
  toast('GeoJSON 파일 오류: '+error.message);
 }finally{if(event?.target)event.target.value=''}
}
async function calcCommute(){let addr=el('destination').value.trim();if(!addr){toast('회사 주소 또는 목적지를 먼저 입력해주세요.');return}el('routeStatus').textContent='목적지 위치 확인 중…';try{const q=new URLSearchParams({q:/\b(TX|Texas)\b/i.test(addr)?addr:addr+', Texas',format:'jsonv2',limit:'1',countrycodes:'us'});let r=await fetch('https://nominatim.openstreetmap.org/search?'+q,{headers:{'Accept':'application/json'}});if(!r.ok)throw Error('주소검색 응답 오류');let j=await r.json();if(!j.length)throw Error('주소를 찾을 수 없습니다. 더 구체적인 주소를 입력하세요');let p=[+j[0].lat,+j[0].lon];state.dest={ll:p,address:j[0].display_name};routeGroup.clearLayers();if(targetMarker)map.removeLayer(targetMarker);targetMarker=L.marker(p).addTo(map).bindPopup('통근 목적지: '+escape(addr));el('routeStatus').textContent='도로망 기반 ZIP별 시간을 계산 중…';const coords=DATA.map(d=>d.ll).concat([p]).map(ll=>ll[1].toFixed(6)+','+ll[0].toFixed(6)).join(';');let base='https://router.project-osrm.org/table/v1/driving/'+coords;let qs=new URLSearchParams({sources:DATA.map((_,i)=>i).join(';'),destinations:String(DATA.length),annotations:'duration'});let rr=await fetch(base+'?'+qs);if(!rr.ok)throw Error('경로 계산 API 응답 오류');const result=await rr.json();if(result.code!=='Ok')throw Error('도로 경로를 찾지 못했습니다');state.times={};DATA.forEach((d,i)=>{const sec=result.durations?.[i]?.[0];if(Number.isFinite(sec))state.times[d.z]=sec/60});drawTable();drawCommute();drawSelectedRoute();}catch(e){el('routeStatus').textContent='예상 시간 계산 실패: '+e.message+' (Google Maps 링크로 직접 확인 가능)';drawCommute()}}
function gmaps(d){const dest=el('destination').value.trim()||state.dest?.address||'';return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(d.ll[0]+','+d.ll[1])+'&destination='+encodeURIComponent(dest)+'&travelmode=driving'}
function drawCommute(){const vals=Object.values(state.times);if(!vals.length){el('routeStatus').innerHTML='자동 거리 계산이 되지 않았습니다. 아래 구역별 Google Maps 링크를 사용하세요.<div style="margin-top:8px">'+DATA.map(d=>`<a class="cardlink" target="_blank" rel="noopener" href="${gmaps(d)}">${d.z} ↗</a>`).join('')+'</div>';return}const xs=DATA.slice().sort((a,b)=>(state.times[a.z]??999)-(state.times[b.z]??999)).map(d=>`<div class="commuteline"><span>${d.z} · ${escape(d.name)}</span><b>${state.times[d.z]?Math.round(state.times[d.z])+'분':'—'}</b><a href="${gmaps(d)}" target="_blank" rel="noopener">Google ↗</a></div>`).join('');el('routeStatus').innerHTML='<b>통근 예상시간 (교통량 미반영)</b>'+xs+'<div class="source">공개 OSRM 도로망 분석값입니다. 러시아워 정체, 통행료, 학교 통학 시간 등 미반영. Google Maps에서 출발시간 설정을 활용하세요.</div>'}
async function drawSelectedRoute(){if(!map||!state.dest)return;routeGroup.clearLayers();const d=getZip(),p=state.dest.ll;try{const uri='https://router.project-osrm.org/route/v1/driving/'+d.ll[1]+','+d.ll[0]+';'+p[1]+','+p[0]+'?overview=full&geometries=geojson';const r=await fetch(uri),j=await r.json();const line=j.routes?.[0]?.geometry;if(line){L.geoJSON(line,{style:{color:'#1d57d4',weight:4,opacity:.8}}).addTo(routeGroup);map.fitBounds(routeGroup.getBounds(),{padding:[45,45],maxZoom:12})}}catch(e){console.warn('route overlay',e)}}
document.addEventListener('DOMContentLoaded',init);

document.addEventListener('click',event=>{const button=event.target?.closest?.('button[data-clear-school]');if(button){event.preventDefault();clearSchool()}});
