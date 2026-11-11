
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
const OFFICIAL=Object.fromEntries(Object.entries(DISTRICT_REGISTRY).map(([k,v])=>[k,v.official]));
const schoolZoneCache=new WeakMap();
function schoolZoneInfo(s){
 const source=window.SchoolBoundaryMatch.boundarySchoolSource(s.district);
 const shapes=state.zoneData[source]||[],failed=!!state.zoneLoadErrors[source];
 const mode=districtZoneDisplay(s.district,state.liveFinder);
 const districtRecord=districtInfo(s.district),officialUrl=window.TrustedLinkPolicy?.official(OFFICIAL[s.district])||null;
 const officialKind=districtRecord?.lookupKind||'address-search',officialNote=districtRecord?.officialNote||null;
 const prev=schoolZoneCache.get(s);
 if(prev?.shapes===shapes&&prev.ready===state.zoneReady&&prev.failed===failed&&prev.mode===mode&&prev.officialUrl===officialUrl)return prev.value;
 const match=window.SchoolBoundaryMatch.findSchoolBoundary(s,shapes,(name,district)=>scoreRecord(name,district));
 const status=window.SchoolZoneUI.classify({matchStatus:match.status,sourceReady:state.zoneReady,sourceFailed:failed,displayMode:mode,officialUrl,officialKind,schoolType:s.type});
 const value={...status,officialUrl,officialKind,officialNote,match};
 schoolZoneCache.set(s,{shapes,ready:state.zoneReady,failed,mode,officialUrl,value});
 return value;
}
function schoolZoneLinkLabel(kind){
 return kind==='choice-process'?'학군 학교 선택·신청 안내':kind==='official-map'?'학군 공식 배정 지도':kind==='official-inquiry'?'학군 공식 배정 지도·문의':kind==='finder-guidance'?'학군 공식 배정 조회 안내':'학군 공식 주소 검색기';
}
function renderSchoolZoneMapHint(s,zone){
 const banner=el('schoolZoneMapHint');if(!banner)return;
 banner.replaceChildren();
 if(!s||!zone||['current','finder','historical'].includes(zone.kind)){banner.hidden=true;return;}
 banner.hidden=false;
 const title=document.createElement('strong');title.textContent=s.name+' — '+zone.label;banner.appendChild(title);
 const detail=document.createElement('p');detail.textContent=zone.explanation+' 학교 위치 마커는 배정 범위가 아닙니다.';banner.appendChild(detail);
 if(zone.officialUrl){
  const link=document.createElement('a');
  if(window.TrustedLinkPolicy.setOfficialAnchor(link,zone.officialUrl)){
   link.textContent=schoolZoneLinkLabel(zone.officialKind)+' 열기';banner.appendChild(link);
  }
 }
 if(zone.officialNote){const note=document.createElement('p');note.className='school-zone-note';note.textContent=zone.officialNote;banner.appendChild(note);}
}

const PROSPER_MAPS={elementary:'https://aptg.co/vgDpkm',middle:'https://aptg.co/ty_VGv',high:'https://aptg.co/hmz4Ps'};
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
let state={zoneData:{},zoneReady:false,zoneLoadErrors:{},showHistoric:true,showOldZones:false,liveFinder:{},ratings:[],ratingFilter:'all',zip:'75093',metric:'korean',level:'all',showZip:true,showSchools:true,allen:false,schools:[],selectedSchool:null,dest:null,times:{},schoolQuery:'',polys:{},uploaded:null,boundaries:[],initDone:false};
const el=id=>document.getElementById(id),fmt=v=>v==null?'미공개':Number(v).toLocaleString('en-US'),money=v=>v==null?'미공개':v===250001?'$250,000 이상':'$'+fmt(v),pct=v=>v==null?'미공개':v.toFixed(1)+'%',escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(s){let e=el('toast');e.textContent=s;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',4000)}
let outsideData=null,isochroneData=null,isochroneLayer=null,countyData=null;
state.heatScope='county';
let map=null,zipGroup,schoolGroup,schoolFocusGroup,zoneGroup,homeZoneGroup,routeGroup,targetMarker,zipMarkers,areaLabels,placeNames={},baseTiles=null,baseErrors=0,activeBase='osm',boundarySeq=0;const col={elementary:'#315bd3',middle:'#078b7d',high:'#c08038'};
function ratingKey(n){return n.toLowerCase().replace(/\b(school|h s|h s\.|h\.s\.|el|ms|high school|middle school|elementary school)\b/g,s=>s.includes('high')||s==='h s'||s==='h.s.'?'high':s==='ms'?'middle':s==='el'?'elementary':'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function canonical(n){return String(n||'').toLowerCase().replace(/\bh\.?\s*s\.?\b/g,'high').replace(/\bm\.?\s*s\.?\b/g,'middle').replace(/\bsr\.?\b/g,'senior').replace(/\b(?:elem|el)\b/g,'elementary').replace(/\bschool\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function scoreRecord(n,district=''){const key=district+'|'+canonical(n);const matches=state.ratingIndex?.get(key);return matches?.length===1?matches[0]:null}
function score(n,district=''){return scoreRecord(n,district)?.score??null}
function schoolPassesRatingFilter(s){
 const filter=state.ratingFilter;
 if(filter==='all')return true;
 const record=scoreRecord(s.name,s.district);
 if(filter==='rated')return record?.score!=null;
 if(filter==='unrated')return record?.rating==='Not Rated';
 if(filter==='unlinked')return !record;
 return ['A','B','C','D','F'].includes(filter)&&record?.rating===filter;
}
function clearSelectedSchoolIfFiltered(){
 if(!state.selectedSchool)return;
 if((state.level!=='all'&&state.selectedSchool.type!==state.level)
    ||!schoolPassesRatingFilter(state.selectedSchool)){
  state.selectedSchool=null;
  schoolFocusGroup?.clearLayers();
  drawDetail();drawBoundary();
 }
}
function ratingText(r){if(!r)return 'TEA 미연결';if(r.rating==='Not Rated'){const p=r.prior2025;return '2026 미평가'+(unratedExplanation(r)?' · '+unratedExplanation(r):'')+(p?` · 2025 ${p.rating} ${p.score}${p.paired?' (학군 연계)':''}`:'')}return (r.score===null?`${r.rating} · 점수 미공개`:`${r.rating} · ${r.score}`)+(r.paired2026?' (연계 평가)':'')}
function scoreSource(n,district=''){return scoreRecord(n,district)?.official||'https://txschools.gov/'}
function getZip(){return DATA.find(x=>x.z===state.zip)}
function niceMetric(v,k=state.metric){return k==='income'?money(v):pct(v)}
function metricLabel(k){return ({korean:'한국계',indian:'인도계',chinese:'중국계',vietnamese:'베트남계',white:'비히스패닉 백인',black:'비히스패닉 흑인',asian:'비히스패닉 아시아계',hispanic:'히스패닉',multiracial:'비히스패닉 복수 인종',kids:'18세 미만',childHH:'미성년자 동거 가구',income:'중위 가구 소득'})[k]}
function scopedZips(){
 if(state.heatScope==='all'||!countyData)return DATA;
 const primary=countyData.zipCounty[state.zip], info=countyData.counties[primary];
 if(!primary||!info)return [];
 const allowed=new Set([primary,...(state.heatScope==='adjacent'?info.neighbors:[])]);
 return DATA.filter(d=>allowed.has(countyData.zipCounty[d.z]));
}
const placeKorean={'Denison':'데니슨','Gunter':'건터','Sherman':'셔먼','Bailey':'베일리','Bells':'벨스','Bonham':'본햄','Howe':'하우','Tom Bean':'톰 빈','Trenton':'트렌턴','Collinsville':'콜린스빌','Southmayd':'사우스메이드','Ector':'엑터','Gainesville':'게인즈빌','Addison':'애디슨','Allen':'앨런','Alvarado':'앨버라도','Alvord':'앨버드','Anna':'애나','Argyle':'아가일','Arlington':'알링턴','Balch Springs':'발치 스프링스','Bardwell':'바드웰','Bedford':'베드퍼드','Blooming Grove':'블루밍 그로브','Blue Ridge':'블루 리지','Briar':'브라이어','Bridgeport':'브리지포트','Burleson':'벌리슨','Caddo Mills':'캐도 밀스','Campbell':'캠벨','Carrollton':'캐럴턴','Carter':'카터','Cedar Hill':'시더 힐','Celeste':'셀레스트','Celina':'셀라이나','Chico':'치코','Cleburne':'클리번','Colleyville':'콜리빌','Commerce':'커머스','Coppell':'코펠','Crandall':'크랜들','Cresson':'크레슨','Cross Roads':'크로스 로즈','Cumby':'컴비','Dallas':'댈러스','DeSoto':'드소토','Decatur':'디케이터','Dennis':'데니스','Denton':'덴턴','Duncanville':'던컨빌','Elmo':'엘모','Ennis':'에니스','Euless':'율리스','Farmers Branch':'파머스 브랜치','Farmersville':'파머스빌','Fate':'페이트','Ferris':'페리스','Flower Mound':'플라워 마운드','Forney':'포니','Fort Worth':'포트워스','Frisco':'프리스코','Frost':'프로스트','Garland':'갈랜드','Garner':'가너','Godley':'고들리','Grand Prairie':'그랜드 프레리','Grandview':'그랜드뷰','Grapevine':'그레이프바인','Greenville':'그린빌','Gun Barrel City':'건 배럴 시티','Haltom City':'할텀 시티','Hickory Creek':'히커리 크리크','Highland Park':'하이랜드 파크','Highland Village':'하이랜드 빌리지','Hurst':'허스트','Hutchins':'허친스','Irving':'어빙','Italy':'이탈리','Jacksboro':'잭스버로','Josephine':'조세핀','Joshua':'조슈아','Kaufman':'코프먼','Keene':'킨','Keller':'켈러','Kennedale':'케네데일','Krum':'크럼','Ladonia':'라도니아','Lancaster':'랭커스터','Lavon':'러본','Leonard':'레너드','Lewisville':'루이스빌','Little Elm':'리틀 엘름','Lone Oak':'론 오크','Lucas':'루커스','Mabank':'메이번크','Mansfield':'맨스필드','Maypearl':'메이펄','McKinney':'매키니','McLendon-Chisholm':'매클렌던 치좀','Melissa':'멜리사','Mesquite':'메스키트','Midlothian':'미들로디언','Milford':'밀퍼드','Millsap':'밀샙','Mineral Wells':'미네랄 웰스','Murphy':'머피','Myrtle Springs':'머틀 스프링스','Nevada':'너베이다','New Fairview':'뉴 페어뷰','North Richland Hills':'노스 리치랜드 힐스','Northlake':'노스레이크','Palmer':'파머','Paradise':'패러다이스','Pecan Acres':'피칸 에이커스','Pecan Gap':'피칸 갭','Pecan Plantation':'피칸 플랜테이션','Perrin':'페린','Pilot Point':'파일럿 포인트','Plano':'플레이노','Ponder':'폰더','Princeton':'프린스턴','Prosper':'프로스퍼','Red Oak':'레드 오크','Richardson':'리처드슨','Rio Vista':'리오 비스타','Rockwall':'록월','Rosser':'로서','Rowlett':'라울렛','Royse City':'로이스 시티','Sachse':'색시','Sanger':'생어','Scurry':'스커리','Seagoville':'시고빌','Southlake':'사우스레이크','Sunnyvale':'서니베일','Sunset':'선셋','Terrell':'테럴','The Colony':'더 콜로니','Tool':'툴','Valley View':'밸리 뷰','Van Alstyne':'밴 앨스타인','Venus':'비너스','Watauga':'와토가','Waxahachie':'왁사해치','Weatherford':'웨더퍼드','West Tawakoni':'웨스트 타와코니','Whitewright':'화이트라이트','Wilmer':'윌머','Wolfe City':'울프 시티','Wylie':'와일리'};
const countyKorean={'Dallas':'댈러스','Collin':'콜린','Denton':'덴턴','Grayson':'그레이슨','Rockwall':'록월','Tarrant':'태런트','Ellis':'엘리스','Kaufman':'코프먼','Hunt':'헌트','Van Zandt':'밴 잰트','Henderson':'헨더슨','Fannin':'패닌','Hopkins':'홉킨스','Delta':'델타','Parker':'파커','Johnson':'존슨','Wise':'와이즈','Hood':'후드','Palo Pinto':'팔로 핀토','Somervell':'서머벨','Cooke':'쿡','Montague':'몬태규','Jack':'잭','Navarro':'나바로'};
function countyName(name){if(el('countyLanguage').value==='en')return name;const key=name.replace(/ County$/,'');return countyKorean[key]?countyKorean[key]+' 카운티':name}
function displayPlace(name){
 if(el('countyLanguage').value==='en')return name;
 if(name.endsWith(' County'))return countyName(name);
 const direct=placeKorean[name];if(direct)return direct;
 const directions={'North':'북부','South':'남부','East':'동부','West':'서부','NW':'북서부','SW':'남서부','NE':'북동부','SE':'남동부'};
 const prefix=name.match(/^(North|South|East|West|NW|SW|NE|SE) (.+)$/);
 if(prefix&&placeKorean[prefix[2]])return placeKorean[prefix[2]]+' '+directions[prefix[1]];
 const suffix=name.match(/^(.+) (North|South|East|West)$/);
 if(suffix&&placeKorean[suffix[1]])return placeKorean[suffix[1]]+' '+directions[suffix[2]];
 return name;
}
function updatePlaceOptions(){for(const option of el('zipSelect').options){const d=DATA.find(x=>x.z===option.value);if(d)option.textContent=d.z+' · '+displayPlace(d.name)}}
function scopeDescription(){if(state.heatScope==='all')return '전체 지도 지역';if(!countyData)return '카운티 자료 로딩 중 · 전체 기준';const c=countyData.counties[countyData.zipCounty[state.zip]];if(!c)return '대표 카운티 미확인';return countyName(c.name)+(state.heatScope==='adjacent'?' 및 인접 카운티':'')}
function metricRange(){const a=scopedZips().map(d=>d[state.metric]).filter(Number.isFinite);return a.length?[Math.min(...a),Math.max(...a)]:[null,null]}
function shade(v){if(!Number.isFinite(v))return '#b8c2cc';const [mn,mx]=metricRange();if(mn===null)return '#b8c2cc';const t=mx===mn?.5:Math.max(0,Math.min(1,(v-mn)/(mx-mn)));const lo=[247,251,255],hi=[8,81,156];return '#'+lo.map((n,i)=>Math.round(n+(hi[i]-n)*t).toString(16).padStart(2,'0')).join('')}
function drawHeatLegend(){const [min,max]=metricRange(),box=el('heatLegend');if(!box)return;if(state.withinHour){box.innerHTML='<b>통근 지도 · 직접 경로 확인</b><div>빨간 점선: 60분 도달선 · Valhalla/OSM</div><div class="heat-values"><span>파란색: 60분 이내</span><span>흰색: 60분 초과</span><span>회색: 미확인</span></div><div>2026-11-04 도로망 기반 추정 · 교통량 미반영 · 파란 ZIP은 대표점 기준, ZIP 일부만 도달선에 포함될 수 있음</div>';return;}box.innerHTML='<b>'+escape(metricLabel(state.metric))+'</b> · ZIP별 비교 <span style="color:#667892">(회색: 자료 없음)</span><div class="heat-scale" aria-hidden="true"></div><div class="heat-values"><span>낮음 '+(min===null?'미공개':niceMetric(min))+'</span><span>높음 '+(max===null?'미공개':niceMetric(max))+'</span></div><div>2020–2024 ACS 추정치 · '+escape(scopeDescription())+' · '+scopedZips().filter(d=>Number.isFinite(d[state.metric])).length+'개 ZIP 기준 · 범위 밖은 옅은 회색</div>'}

function init(){DATA.forEach(d=>{let o=document.createElement('option');o.value=d.z;o.textContent=`${d.z} · ${d.name}`;el('zipSelect').appendChild(o)});el('zipSelect').value=state.zip;el('zipSelect').onchange=e=>selectZip(e.target.value);el('metric').onchange=e=>{state.metric=e.target.value;drawZip();drawDetail();drawTable()};el('heatScope').onchange=e=>{state.heatScope=e.target.value;drawZip()};el('schoolScope').onchange=()=>drawList();el('countyLanguage').onchange=()=>{updatePlaceOptions();renderData();drawZip();drawCommute();window.refreshCandidateComparisons?.()};el('compareTable').querySelector('thead').onclick=e=>{const b=e.target.closest('button[data-sort]');if(!b)return;const k=b.dataset.sort;tableSort.dir=tableSort.key===k?-tableSort.dir:1;tableSort.key=k;drawTable()};el('ratingFilter').onchange=e=>{state.ratingFilter=e.target.value;clearSelectedSchoolIfFiltered();drawSchools();drawList()};el('zipOverlay').onchange=e=>{state.showZip=e.target.checked;drawZip()};el('oneHourOverlay').onchange=e=>{state.withinHour=e.target.checked;drawZip();drawIsochrone();if(state.withinHour&&isochroneLayer)map.fitBounds(isochroneLayer.getBounds(),{padding:[20,20]})};el('schoolOverlay').onchange=e=>{state.showSchools=e.target.checked;drawSchools()};
// Map-level hazard chips: one tap shows that FEMA hazard; tapping the active
// chip turns it off. Detailed settings stay in the collapsed side panel.
const hazardChips=[...document.querySelectorAll('#hazardMapQuickToggle .hazard-chip')];
const updateHazardShortcut=()=>{
 const on=el('femaHazardEnabled').checked,type=el('femaHazardType').value;
 for(const b of hazardChips)b.setAttribute('aria-pressed',String(on&&b.dataset.hazard===type));
};
for(const b of hazardChips)b.onclick=()=>{
 const toggle=el('femaHazardEnabled'),type=el('femaHazardType');
 const turnOff=toggle.checked&&type.value===b.dataset.hazard;
 if(type.value!==b.dataset.hazard){type.value=b.dataset.hazard;type.dispatchEvent(new Event('change',{bubbles:true}))}
 if(toggle.checked===turnOff){toggle.checked=!turnOff;toggle.dispatchEvent(new Event('change',{bubbles:true}))}
 updateHazardShortcut();
};
for(const id of ['femaHazardEnabled','femaHazardType','nfhlEnabled','txwrapWHPEnabled']){
 el(id).addEventListener('change',()=>queueMicrotask(updateHazardShortcut));
}
updateHazardShortcut();el('historicOverlay').onchange=e=>{state.showHistoric=e.target.checked;drawBoundary();drawHomeAssignmentMap()};el('referenceBoundaryOverlay').onchange=e=>{state.showOldZones=e.target.checked;drawBoundary();drawHomeAssignmentMap()};el('levels').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.level=b.dataset.v;[...el('levels').children].forEach(x=>x.classList.toggle('active',x===b));clearSelectedSchoolIfFiltered();drawSchools();drawList()};el('schoolSearch').oninput=e=>{state.schoolQuery=e.target.value.toLowerCase();drawList()};el('schoolSearchClear').onclick=()=>{el('schoolSearch').value='';state.schoolQuery='';drawList()};el('calcCommute').onclick=calcCommute;el('destination').onkeydown=e=>{if(e.key==='Enter')calcCommute()};el('destination').oninput=()=>{el('officeSelect').value=Object.keys(OFFICES).find(k=>OFFICES[k].toLowerCase()===el('destination').value.trim().toLowerCase())||'custom';state.times={};state.dest=null;drawCommute();if(routeGroup)routeGroup.clearLayers();if(map&&targetMarker){map.removeLayer(targetMarker);targetMarker=null}showSavedCommute();drawTable();if(typeof refreshHomeOffice==='function')refreshHomeOffice()};el('officeSelect').onchange=e=>{el('destination').value=OFFICES[e.target.value]||'';el('destination').oninput();if(e.target.value==='custom')el('destination').focus()};el('baseMap').onchange=e=>setBaseMap(e.target.value);
loadSavedCommute();renderData();drawList();if(window.L){map=L.map('map',{zoomControl:true,preferCanvas:true,zoomAnimation:false}).setView([33.129,-96.785],11);setBaseMap('osm');zipGroup=L.featureGroup().addTo(map);schoolGroup=L.featureGroup().addTo(map);zoneGroup=L.featureGroup().addTo(map);homeZoneGroup=L.featureGroup().addTo(map);routeGroup=L.featureGroup().addTo(map);zipMarkers=L.featureGroup().addTo(map);areaLabels=L.layerGroup().addTo(map);schoolFocusGroup=L.featureGroup().addTo(map);window.createFemaHazardOverlay?.(map,document);window.healthcareOverlayController=window.initHealthcareMap?.(map,document);window.winterOverlayController=window.initWinterHazardMap?.(map,document);window.createNFHLFloodOverlay?.(map,document);window.createTxWrapWHPOverlay?.(map,document);window.createNoaaStormHistory?.(document);window.createCrimeCityMap?.(map,document);map.on('moveend',()=>{drawSchools();drawAreaLabels()});if(window.ResizeObserver)new ResizeObserver(()=>syncMapSize()).observe(map.getContainer());fetch('./county-scopes.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{countyData=data;drawZip();drawList()}).catch(e=>{console.error('카운티 비교자료 오류:',e);el('heatScope').value='all';state.heatScope='all';el('heatScope').disabled=true;el('heatScopeStatus').textContent='카운티 자료를 불러오지 못해 전체 범위로 비교합니다. 새로고침해 주세요.';drawZip()});fetch('./data/dfw-mena-ancestry-2024.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(obj=>{menaData=obj;drawDetail()}).catch(e=>console.error('중동·아랍계 조상 자료 오류:',e));fetch('./dfw-race-2024.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(obj=>{for(const d of DATA)Object.assign(d,obj.data[d.z]||{});drawZip();drawDetail();window.refreshCandidateComparisons?.()}).catch(e=>{console.error('인구 구성 자료 오류:',e);el('mapLoadStatus').textContent='인구 구성 자료를 불러오지 못했습니다. 새로고침해 주세요.'});fetch('./zcta-place-names.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{placeNames=data;for(const d of DATA)if(d.name.endsWith(' County')&&data[d.z])d.name=data[d.z];updatePlaceOptions();renderData();drawAreaLabels()}).catch(e=>console.error('지역명 자료를 불러오지 못했습니다:',e));loadZipShapes();Promise.all([loadBoundaryData(),loadSchools().then(loadRatings).then(loadExtra2026SchoolLocations)]).then(()=>{addFriscoBoundarySchools();addProsperCurrentSchools();window.schoolBoundaryAuditReady=true;renderSchoolBoundaryCoverageAudit()});setTimeout(()=>map.invalidateSize(),250)}else{el('map').innerHTML='<div style="padding:30px;color:#53647a">미리보기 또는 브라우저에서 지도 라이브러리 로딩에 실패했습니다. GitHub Pages 정식 주소를 이용하거나 브라우저 연결을 확인하세요. 아래 인구 비교표와 기본 학교 목록은 사용할 수 있습니다.</div>';el('mapLoadStatus').textContent='Leaflet 지도를 로드하지 못했습니다.';state.schools=FALLBACK_SCHOOLS.filter(s=>!isRetiredCampus(s));drawList();}}

function setBaseMap(choice, fallbackFrom=null){
 if(!map)return;
 const sources={
   osm:{name:'OpenStreetMap',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',opts:{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',maxZoom:19}},
   esri:{name:'Esri Streets',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',opts:{attribution:'Tiles &copy; Esri',maxZoom:18}}
 };
 choice=Object.hasOwn(sources,choice)?choice:'osm';
 const cfg=sources[choice],status=el('tileStatus');
 if(baseTiles)map.removeLayer(baseTiles);
 activeBase=choice;baseErrors=0;el('baseMap').value=choice;
 status.hidden=!fallbackFrom;
 status.textContent=fallbackFrom ? fallbackFrom+' 타일 오류로 '+cfg.name+' 배경을 사용합니다. 일부 지도가 보이지 않으면 지도 배경을 직접 변경하세요.' : '';
 const layer=L.tileLayer(cfg.url,{...cfg.opts,keepBuffer:2});
 baseTiles=layer;
 layer.on('tileerror',()=>{
   if(baseTiles!==layer)return;
   baseErrors++;
   status.hidden=false;
   status.textContent=cfg.name+' 지도 타일을 불러오지 못했습니다. 연결을 확인하거나 다른 지도 배경을 선택하세요.';
   if(baseErrors===3 && !fallbackFrom){
     setBaseMap(choice==='osm'?'esri':'osm',cfg.name);
   }
 });
 layer.addTo(map);
}
async function loadRatings(){
 try{
  const res=await fetch('./tea-ratings-2026.json',{cache:'no-store'});
  if(!res.ok)throw Error('2026 rating HTTP '+res.status);
  const j=await res.json();
  if(j.year!==2026||!Array.isArray(j.data))throw Error('rating schema');
  state.ratings=j.data.filter(r=>/^\d{9}$/.test(r.id)&&['A','B','C','D','F','Not Rated'].includes(r.rating));
  let locationById=new Map();try{const lr=await fetch('./nces-locations-2024.json',{cache:'no-store'});if(!lr.ok)throw Error('HTTP '+lr.status);const lj=await lr.json();if(!Array.isArray(lj.data))throw Error('location schema');locationById=new Map(lj.data.map(x=>[x.id,x]))}catch(e){console.error('NCES location data:',e);toast('학교 위치 자료 일부를 불러오지 못했습니다.')}
  state.ratingIndex=new Map();
  for(const r of state.ratings){for(const key of new Set([canonical(r.name),canonical(r.officialName)])){const k=r.district+'|'+key;const values=state.ratingIndex.get(k)||[];values.push(r);state.ratingIndex.set(k,values)}}
  addVerifiedAliases(state.ratingIndex,state.schools,state.ratings,(name,district)=>district+'|'+canonical(name));
  const existingById=new Map();for(const x of state.schools)if(x.id)existingById.set(x.id,existingById.has(x.id)?null:x);
  const existingByKey=new Map();for(const x of state.schools){const k=x.district+'|'+canonical(x.name);existingByKey.set(k,existingByKey.has(k)?null:x)}
  for(const r of state.ratings){
   if(isRetiredCampus(r))continue;
   const type=schoolType(r.name)||'other',location=locationById.get(r.id),key=r.district+'|'+canonical(r.name);
   const existing=(existingById.get(r.id)?.district===r.district?existingById.get(r.id):null)||(state.ratingIndex.get(key)?.length===1?existingByKey.get(key):null);
   if(existing){existing.address=existing.address||r.address||location?.address;existing.ll=existing.ll||location?.ll;existing.districtName=r.districtName}
   else state.schools.push({name:r.name,type,district:r.district,districtName:r.districtName,address:r.address||location?.address,ll:location?.ll,source:location?'NCES 2024–25 / TEA 2026 예비':'2026 TEA 예비 평가'});
  }
  state.schools.sort((a,b)=>a.name.localeCompare(b.name));
  drawSchools();drawList();
 }catch(e){console.error('2026 TEA rating data:',e);toast('학교 평가 데이터 로딩에 실패했습니다. 공식 TEA 링크를 사용하세요.')}
}

async function loadExtra2026SchoolLocations(){
 const paths=['./schools2026-1.json','./schools2026-2.json','./schools2026-3.json','./schools2026-4.json'];
 const resp=await Promise.allSettled(paths.map(async path=>{
  const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status+' '+path);
  const j=await r.json();if(!Array.isArray(j.data))throw Error('Invalid schools file '+path);
  return j.data;
 }));
 let inserted=0;
 for(const entry of resp){
  if(entry.status==='rejected'){console.warn('2026 school location batch unavailable:',entry.reason);continue}
  for(const s of entry.value){
   if(Array.isArray(s.ll)&&Number.isFinite(s.ll[0])&&Number.isFinite(s.ll[1])&&s.ll[0]>32.8&&s.ll[0]<33.7&&s.ll[1]>-97.4&&s.ll[1]<-96.35){addSchool(s);inserted++}
  }
 }
 state.schools.sort((a,b)=>a.name.localeCompare(b.name));
 if(typeof refreshHomeSchools==='function')refreshHomeSchools();drawSchools();drawList();
 console.info('Verified 2026 campus coordinates processed:',inserted);
}

async function geocodeSchool(s){
 if(!s.address)return false;
 try{
  const q=new URLSearchParams({SingleLine:s.address,sourceCountry:'USA',maxLocations:'1',outFields:'Addr_type',f:'json'});
  const res=await fetch('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?'+q);
  if(!res.ok)throw Error('HTTP '+res.status);
  const j=await res.json();const x=j.candidates?.[0];
  if(!x||x.score<85||!x.location)throw Error('정확한 주소 좌표를 확인하지 못함');
  const lat=x.location.y,lon=x.location.x;
  if(!(lat>32.8&&lat<33.7&&lon> -97.3&&lon< -96.35))throw Error('대상 지역 밖 좌표');
  s.ll=[lat,lon];drawSchools();drawList();return true;
 }catch(e){console.warn('School geocoding error:',s.name,e);return false}
}

function renderData(){showSavedCommute();const d=getZip();el('k-zip').textContent=d.z;el('k-area').textContent=displayPlace(d.name);el('k-korean').textContent=pct(d.korean);el('k-households').textContent=pct(d.childHH);el('k-income').textContent=money(d.income);drawDetail();drawTable()}
function selectZip(z,fly=true){state.zip=z;el('zipSelect').value=z;state.selectedSchool=null;schoolFocusGroup?.clearLayers();renderSchoolZoneMapHint(null,null);renderData();drawZip();drawList();drawCommute();if(map){syncMapSize();const p=state.polys[z];if(p){map.stop();map.fitBounds(p.getBounds(),{maxZoom:12,padding:[18,18],animate:false})}else{map.stop();map.setView(getZip().ll,12,{animate:false})}}drawSchools();if(state.dest)drawSelectedRoute()}
// Middle Eastern / Arab ancestry (ACS B04006). Federal race tables count these
// residents as White, so they are shown separately from the race breakdown.
// Self-reported ancestry allows two answers per person: rows are never summed.
let menaData=null;
const MENA_ROWS=[['아랍계','arab'],['이란계','iranian'],['터키계','turkish'],['이스라엘계','israeli'],['아르메니아계','armenian']];
const ARAB_ROWS=[['이집트','egyptian'],['레바논','lebanese'],['팔레스타인','palestinian'],['시리아','syrian'],['이라크','iraqi'],['요르단','jordanian'],['모로코','moroccan'],['기타 아랍계','otherArab'],['아랍계(국가 미기재)','arabOther']];
function menaShare(r,key){
 const total=r?.total?.[0],[est,moe]=r?.[key]||[];
 if(!(total>0)||est==null)return {text:'미공개',width:0};
 const share=est/total*100,noisy=est>0&&moe!=null&&moe/1.645/est>0.4;
 return {text:share.toFixed(1)+'%'+(noisy?' ※':''),width:Math.min(100,share/8*100),title:'추정 '+est.toLocaleString('en-US')+'명 ± '+(moe??'?')+' (90% 오차범위)'};
}
function menaHtml(z){
 const r=menaData?.data?.[z];
 if(!r)return menaData?'<p class="source">이 ZIP의 중동·아랍계 조상 자료가 없습니다.</p>':'';
 const bar=([label,key])=>{const s=menaShare(r,key);return `<div class="brow" title="${s.title||''}"><div class="btop"><span>${label}</span><span>${s.text}</span></div><div class="track"><div class="fill" style="width:${s.width}%"></div></div></div>`};
 const sub=ARAB_ROWS.map(([label,key])=>{const s=menaShare(r,key);return `<div class="race-row" title="${s.title||''}"><span>${label}</span><strong>${s.text}</strong></div>`}).join('');
 return '<div id="menaAncestry" style="margin-top:18px;font-size:12px;font-weight:800">중동·아랍계 (조상 응답)</div><div class="bars">'+MENA_ROWS.map(bar).join('')+'</div>'
  +'<details class="small-note" style="margin-top:8px"><summary>아랍계 세부 (국가별)</summary>'+sub+'</details>'
  +'<p class="source">미국 인구조사 인종 기준에서 중동·북아프리카계는 “백인”에 포함되어 위 인구 구성에 따로 나오지 않습니다. 이 항목은 ACS 2020–2024 B04006의 본인 응답 조상(ancestry) 기준이며, 한 사람이 두 개까지 답할 수 있어 항목끼리 더하지 않습니다. ※ 표시는 ZIP 단위 표본 오차가 큰 추정치입니다.</p>';
}
// Wide "선택 ZIP 상세" card under the map: subgroup breakdowns (and city crime
// trends when that module is loaded) side by side, so the right column stays
// about as tall as the map instead of becoming a long narrow scroll.
function drawZipInsights(d){
 const box=el('zipInsights');if(!box||!d)return;
 const arr=[['한국계',d.korean],['인도계',d.indian],['중국계',d.chinese],['베트남계',d.vietnamese],['필리핀계',d.filipino]];
 const asian='<div class="insight-title">아시아계 세부 구성</div><div class="bars">'+arr.map(([x,y])=>`<div class="brow"><div class="btop"><span>${x}</span><span>${pct(y)}</span></div><div class="track"><div class="fill" style="width:${Math.min(100,y/32*100)}%"></div></div></div>`).join('')+'</div><p class="source">민족 상세 데이터는 복수 선택 응답을 포함할 수 있어 합계가 전체 Asian 수치와 정확히 일치하지 않을 수 있습니다.</p>';
 const cards=[asian,menaHtml(d.z),window.crimeZipHtml?.(d.z)||''].filter(Boolean);
 box.innerHTML='<div class="insights-head"><h2>선택 ZIP 상세</h2><span class="pill">'+escape(d.z+' · '+displayPlace(d.name))+'</span></div><div class="insights-grid">'+cards.map(c=>'<div class="insight-card">'+c+'</div>').join('')+'</div>';
}
function drawDetail(){const d=getZip();drawZipInsights(d);if(state.selectedSchool){const s=state.selectedSchool;const sRating=scoreRecord(s.name,s.district);const sScore=sRating?.score??null;const zone=schoolZoneInfo(s),finder=zone.officialUrl;const lookup=finder?'<a class="cardlink" target="_blank" rel="noopener noreferrer" href="'+escape(finder)+'">'+escape(schoolZoneLinkLabel(zone.officialKind))+' ↗</a>'+(zone.officialNote?'<p class="school-zone-note">'+escape(zone.officialNote)+'</p>':''):'<div class="source">이 학교의 공식 주소별 학군 Finder 링크는 아직 검증되지 않았습니다. 소속 학군에 직접 확인하세요.</div>';el('detailContent').innerHTML=`<h3>${escape(s.name)}</h3><div class="school-zone-head"><span class="school-zone-label ${zone.kind}">${escape(zone.label)}</span></div><div class="muted">${({high:'고등학교',middle:'중학교',elementary:'초등학교'})[s.type]||'학교'} · ${escape(s.districtName||s.district||'학군 미확인')} · 2026 TEA 예비: <b>${escape(ratingText(sRating))}</b></div>${s.address?`<div style="margin-top:10px;font-size:12px">${escape(s.address)}</div>`:''}<div class="source">학교 위치 출처: ${escape(s.source||'좌표·연도 미검증')} · 지도 핀은 현재 배정을 보장하지 않습니다.</div><hr class="rule"><div class="eyebrow">학교 배정 안내</div><p class="muted" style="margin:9px 0">학교 위치나 오래된 경계만으로 현재 배정이 보장되지 않습니다. 학군별 공식 주소 검색·지도·학교 선택·문의 절차를 통해 확인하세요.</p><div class="notice" id="zoneNotice">${s.district==='AISD'?'Allen 공개 GIS 경계는 메타데이터가 과거 연도로 표시됩니다. <b>최신 배정 확인이 필요</b>합니다.':'최신 2026–27 학교별 배정구역은 공식 학군에서 주소로 확인해야 합니다. 과거 GIS 표시가 있더라도 현재 배정 근거로 사용할 수 없습니다.'}</div>${lookup}<details><summary>학교 출처와 지도 보기</summary><a class="cardlink" target="_blank" rel="noopener" href="${escape(window.TrustedLinkPolicy?.withFallback(scoreSource(s.name,s.district),'https://txschools.gov/')||'https://txschools.gov/')}">${sScore===null?'TEA 성적 확인':'2026 점수 출처'} ↗</a>${(s.district==='FISD'||s.district==='PROSPER')?`<a class="cardlink" target="_blank" rel="noopener" href="${escape(window.TrustedLinkPolicy?.withFallback(s.district==='FISD'?FISD_MAPS[s.type]:PROSPER_MAPS[s.type],OFFICIAL[s.district])||'https://txschools.gov/')}">공식 배정구역 안내 ${({elementary:'초등',middle:'중등',high:'고등'})[s.type]} 배정구역 확인 ↗</a>`:''}<a class="cardlink" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address||s.name+', Texas')}">학교 위치 확인 ↗</a></details><div style="margin-top:18px"><button class="btn secondary" data-clear-school>ZIP 통계로 돌아가기</button></div>`;drawBoundary();return}
let html=`<h3>${escape(displayPlace(d.name))} <span style="font-size:12px;color:#7a8b9c;font-weight:500">${d.z}</span></h3><div class="muted">인구조사 우편번호 통계구역 · 표본 추정치</div><div class="stat-list">`;
const stats=[['전체 인구',fmt(d.pop)+'명'],['중위 연령',d.age==null?'미공개':d.age+'세'],['18세 미만 인구',pct(d.kids)],['미성년자 동거 가구',pct(d.childHH)],['중위 가구 소득',money(d.income)]];html+=stats.map(([x,y])=>`<div class="statrow"><span>${x}</span><strong>${y}</strong></div>`).join('')+'</div>';const race=[['백인 (비히스패닉)',d.white],['흑인 (비히스패닉)',d.black],['아시아계 (비히스패닉)',d.asian],['히스패닉 (모든 인종)',d.hispanic],['복수 인종 (비히스패닉)',d.multiracial],['미 원주민 (비히스패닉)',d.native],['태평양 제도계 (비히스패닉)',d.pacific],['기타 인종 (비히스패닉)',d.other]];html+='<div style="font-size:12px;font-weight:800;margin:14px 0 6px">전체 인구 구성</div>'+race.map(([name,value])=>'<div class="race-row"><span>'+escape(name)+'</span><strong>'+pct(value)+'</strong></div>').join('')+'<div class="source">ACS 2020–2024 B03002; 반올림으로 합계가 100%와 다를 수 있습니다. 지도 아래 “선택 ZIP 상세”의 아시아계·중동계 세부 항목은 복수 응답을 포함하므로 위 구성과 직접 합산하지 않습니다.</div>';el('detailContent').innerHTML=html;if(map)zoneGroup?.clearLayers()}
window.clearSchool=()=>{state.selectedSchool=null;schoolFocusGroup?.clearLayers();updateSelectedSchoolList();drawDetail();drawBoundary();drawSchools()};
let tableSort={key:null,dir:1};
function drawTable(){const table=el('compareTable'),tbody=table.querySelector('tbody');let rows=DATA.slice();if(tableSort.key){const k=tableSort.key,dir=tableSort.dir;rows.sort((a,b)=>{const x=a[k],y=b[k];if(x==null||y==null)return x==null?(y==null?0:1):-1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y)))*dir})}table.querySelectorAll('th').forEach(th=>{th.removeAttribute('aria-sort');if(th.dataset.sort===tableSort.key)th.setAttribute('aria-sort',tableSort.dir===1?'ascending':'descending')});tbody.innerHTML=rows.map(d=>`<tr data-z="${d.z}" class="${d.z===state.zip?'sel':''}"><td><b>${d.z}</b><br><span style="color:#718095">${escape(displayPlace(d.name))}</span></td><td>${pct(d.korean)}</td><td>${pct(d.indian)}</td><td>${pct(d.chinese)}</td><td>${pct(d.kids)}</td><td>${pct(d.childHH)}</td><td>${money(d.income)}</td></tr>`).join('');tbody.querySelectorAll('tr').forEach(tr=>tr.onclick=()=>selectZip(tr.dataset.z))}
async function loadZipShapes(){
  try{
    const res=await fetch('./dfw-zcta-boundaries.geojson',{cache:'no-store'});
    if(!res.ok)throw new Error('ZIP 데이터 HTTP '+res.status);
    const obj=await res.json();
    if(outsideData?.shapes?.features)obj.features.push(...outsideData.shapes.features);
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
    drawZip();drawList();
    if(state.polys[state.zip])map.fitBounds(state.polys[state.zip].getBounds(),{padding:[25,25],maxZoom:12});
    el('mapLoadStatus').innerHTML='<b>'+found.size+'개 ZIP 통계 경계 표시</b><br>DFW 11개 카운티와 주변 후보 ZIP. ZIP과 학교 배정구역은 다릅니다.';
  }catch(e){
    console.error('ZIP boundary loading failed:',e);
    drawZip();
    el('mapLoadStatus').textContent='ZIP 경계를 불러오지 못했습니다. 구역명 마커를 대신 표시합니다: '+e.message;
  }
}
function drawZip(){if(!map)return;zipGroup.clearLayers();zipMarkers.clearLayers();DATA.forEach(d=>{const p=state.polys[d.z];if(p&&state.showZip){p.setStyle({color:d.z===state.zip?'#1e4298':'#99a8ba',weight:d.z===state.zip?2.8:1.1,opacity:.9,fillColor:state.withinHour?'#aab5c0':(scopedZips().includes(d)?shade(d[state.metric]):'#d1d5db'),fillOpacity:(state.withinHour||scopedZips().includes(d))?.72:.3});p.off('click').on('click',()=>selectZip(d.z,false));p.bindTooltip(`<b>${d.z}</b> ${escape(displayPlace(d.name))}<br>${metricLabel(state.metric)}: ${niceMetric(d[state.metric])}<br>통근 시간: 목적지 검색 후 확인`,{sticky:true});zipGroup.addLayer(p)}else if(!p){const icon=L.divIcon({className:'',html:`<div class="mapmark zip" style="width:41px;border-radius:10px">${d.z}</div>`,iconSize:[41,27],iconAnchor:[20,14]});L.marker(d.ll,{icon}).addTo(zipMarkers).on('click',()=>selectZip(d.z))}});drawAreaLabels();drawHeatLegend()}
function drawIsochrone(){
  if(!map)return;
  if(isochroneLayer){map.removeLayer(isochroneLayer);isochroneLayer=null}
  if(state.withinHour&&isochroneData)isochroneLayer=L.geoJSON(isochroneData,{interactive:false,style:{color:'#c53030',weight:3,opacity:1,fill:false,dashArray:'7 5'}}).addTo(map);
}
function drawAreaLabels(){
  if(!map||!areaLabels)return;
  areaLabels.clearLayers();
  if(!state.showZip)return;
  const bounds=map.getBounds(),size=map.getSize(),occupied=[];
  const candidates=DATA.filter(d=>state.polys[d.z]&&bounds.contains(d.ll)).sort((a,b)=>(b.z===state.zip)-(a.z===state.zip));
  for(const d of candidates){
    const name=placeNames[d.z]||(!d.name.endsWith(' County')?d.name:'');
    const label=name?displayPlace(name):'';if(!label)continue;
    const width=Math.min(190,Math.max(70,label.length*7+16)),height=23,p=map.latLngToContainerPoint(d.ll);
    const rect={left:p.x-width/2-4,right:p.x+width/2+4,top:p.y-height/2-4,bottom:p.y+height/2+4};
    if(rect.left<0||rect.right>size.x||rect.top<0||rect.bottom>size.y)continue;
    if(occupied.some(r=>rect.left<r.right&&rect.right>r.left&&rect.top<r.bottom&&rect.bottom>r.top))continue;
    occupied.push(rect);
    const icon=L.divIcon({className:'area-label'+(d.z===state.zip?' selected':''),html:'<span>'+escape(label)+'</span>',iconSize:[width,height],iconAnchor:[width/2,height/2]});
    L.marker(d.ll,{icon,interactive:false,keyboard:false,zIndexOffset:d.z===state.zip?3000:2000}).addTo(areaLabels);
  }
}
function schoolType(s){const a=(s||'').toLowerCase().replace(/\bh\s+s\b/g,'high').replace(/\bm\s+s\b/g,'middle');if(/elementary|\bel\b|primary|kindergarten|\bk-5\b|\bk-6\b/.test(a))return'elementary';if(/middle|intermediate|junior high|\bms\b/.test(a))return'middle';if(/high|senior|freshman|\bhs\b/.test(a))return'high';return null}
function normalizeSchool(raw){if(!raw.name)return null;let type=raw.type||schoolType(raw.name+' '+(raw.grades||'')+' '+(raw.stype||''));if(type===null)type=schoolType(raw.stype);if(!type)return null;let district=raw.district||'';if(!district){const a=(raw.addr||'').toLowerCase();district=a.includes('allen')?'AISD':a.includes('frisco')?'FISD':a.includes('plano')?'PISD':a.includes('prosper')?'PROSPER':''}return {...raw,type,district}}
async function loadSchools(){
  state.schools=FALLBACK_SCHOOLS.filter(s=>!isRetiredCampus(s)).map(s=>({...s,source:'검증 필요한 초기 학교 목록'}));
  drawList();
  let loaded=0;
  try{
    const res=await fetch('./schools.json',{cache:'no-store'});
    if(!res.ok)throw new Error('학교 데이터 HTTP '+res.status);
    const obj=await res.json();
    if(!Array.isArray(obj.schools))throw new Error('학교 데이터 형식 오류');
    for(const raw of obj.schools){
      const s=normalizeSchool(raw);
      if(!s||isRetiredCampus(s)||!Array.isArray(s.ll)||!Number.isFinite(s.ll[0])||!Number.isFinite(s.ll[1]))continue;
      addSchool(s);
      loaded++;
    }
    if(!loaded)throw new Error('학교 좌표 0개');
  }catch(e){console.error('School location dataset:',e);toast('학교 지도 위치 데이터를 읽지 못했습니다. 기본 목록은 유지됩니다.')}
  state.schools.sort((a,b)=>a.name.localeCompare(b.name));
  drawSchools();
  drawList();
  el('schoolCount').textContent=state.schools.length+'개 학교 · 위치 '+state.schools.filter(s=>s.ll).length+'개 · 2026 점수 '+state.schools.filter(s=>score(s.name,s.district)!==null).length+'개';
}
function addSchool(s){if(isRetiredCampus(s))return;const key=canonical(s.name);if(!key)return;const ex=state.schools.find(a=>canonical(a.name)===key&&(!a.district||!s.district||a.district===s.district));if(ex){ex.ll=s.ll||ex.ll;ex.address=s.address||ex.address;ex.district=s.district||ex.district;ex.source=s.source;return}state.schools.push(s)}
function gradeTag(s){return s.type==='high'?'고등':s.type==='middle'?'중등':s.type==='elementary'?'초등':'기타'}
// A school-site location is a distinct item from any enrollment boundary.
// Use a dedicated overlay so viewport marker redraws and grade/rating filters
// cannot make an explicitly selected campus disappear.
function updateSelectedSchoolList(){
 const panel=el('schoolList');
 if(!panel)return;
 for(const button of panel.querySelectorAll('button.school[data-sid]')){
  const school=state.schools[Number(button.dataset.sid)];
  const selected=!!school&&school===state.selectedSchool;
  button.classList.toggle('school-map-selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 }
}
function focusSelectedSchoolCampus(s,fromList=false){
 if(!map||!schoolFocusGroup)return false;
 schoolFocusGroup.clearLayers();
 const ll=s?.ll;
 const valid=Array.isArray(ll)&&ll.length===2&&ll.every(Number.isFinite)
  &&ll[0]>25&&ll[0]<37&&ll[1]>-107&&ll[1]<-93;
 if(valid){
  const ring=L.circleMarker(ll,{radius:23,color:'#facc15',weight:5,
   fillColor:'#facc15',fillOpacity:.12,interactive:false}).addTo(schoolFocusGroup);
  const icon=L.divIcon({className:'',html:'<span class="selected-school-campus-pin" aria-hidden="true">학교</span>',
   iconSize:[36,36],iconAnchor:[18,18]});
  const marker=L.marker(ll,{icon,title:s.name,keyboard:true,zIndexOffset:5000}).addTo(schoolFocusGroup);
  // Leaflet string tooltips are HTML. Use a Text node to prevent school-name injection.
  const caption=document.createElement('span');
  caption.textContent=s.name;
  marker.bindTooltip(caption,{permanent:true,direction:'top',offset:[0,-20],
   className:'selected-school-campus-tooltip',opacity:1}).openTooltip();
  ring.bringToFront();
  syncMapSize();
  map.stop();
  map.setView(ll,Math.max(map.getZoom(),14),{animate:false});
 }
 if(fromList){
  const mapPanel=map.getContainer().closest('.mapbox')||map.getContainer();
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  mapPanel.scrollIntoView?.({behavior:reduced?'auto':'smooth',block:'start'});
 }
 const notice=el('schoolMapStatus');
 if(notice)notice.textContent=valid
  ?'선택한 학교 위치: '+s.name+' · 노란색 원·학교명으로 강조했습니다. 학교 위치는 참고용이며 주소별 배정 경계가 아닙니다.'
  :'선택한 학교 '+(s?.name||'')+'의 건물 좌표가 확인되지 않았습니다. 경계가 있더라도 학교 위치를 뜻하지 않습니다.';
 return valid;
}
async function schoolClicked(s,fromList=false){
 if(!s)return;
 state.selectedSchool=s;
 updateSelectedSchoolList();
 // Preserve existing source/year warnings and user-selected boundary overlay.
 state.showOldZones=true;state.showHistoric=true;
 el('referenceBoundaryOverlay').checked=true;
 el('historicOverlay').checked=true;
 drawDetail();
 if(map){
  drawBoundary();
  // A boundary may be geographically far larger than the campus point.
  // Always prioritize the actual campus location for the list's "where is it?" action.
  const focused=focusSelectedSchoolCampus(s,fromList);
  if(!focused&&!s.address)toast('학교 건물 위치 좌표 미확인. 배정 경계는 학교 건물 위치가 아닙니다.');
 }else toast('지도 로딩 실패. 학군 공식 Finder에서 주소를 확인하세요.');
 if(!s.ll&&s.address){
  toast('학교 건물 좌표를 확인하는 중입니다.');
  await geocodeSchool(s);
  if(state.selectedSchool!==s)return; // Late request cannot move newly selected campus.
  if(!focusSelectedSchoolCampus(s,false))
   toast('학교 건물 위치 좌표를 확인하지 못했습니다. 상세정보와 공식 사이트를 참고하세요.');
 }
}
// Leaflet caches the container size and only re-reads it on window resize or
// invalidateSize(). A container that was hidden/0×0 at init, or resized by
// layout without a window resize, leaves getBounds() describing the wrong area.
function syncMapSize(){
 const c=map.getContainer(),s=map.getSize();
 if(s.x!==c.clientWidth||s.y!==c.clientHeight)map.invalidateSize({debounceMoveend:true});
 return map.getSize();
}
function drawSchools(){
 if(!map)return;
 const homeActive=typeof home!=='undefined'&&!!home&&window.ConditionalSchoolRelease?.decide?.(home.assignment)?.allowed===true;
 const legend=el('schoolLegend');
 if(legend){
  legend.classList.toggle('matching',homeActive);
  legend.innerHTML=homeActive?'<span>집 주소 배정 후보</span><span>그 외 학교 · 배정 미확인</span>':'<span>초등</span><span>중등</span><span>고등</span>';
 }
 schoolGroup.clearLayers();
 const notice=el('schoolMapStatus'),zoom=map.getZoom();
 if(!state.showSchools){
  if(notice)notice.textContent='학교 마커 표시가 꺼져 있습니다. 목록에서 선택한 학교는 노란색 위치 강조로 표시합니다.';
  return;
 }
 // getBounds() is derived from Leaflet's cached size; refresh it first so the
 // bounds always describe the area actually on screen (root cause of the
 // Allen 75013 / Plano 75093 "화면 내 0개" P0).
 const size=syncMapSize();
 const bounds=map.getBounds();
 // Render every eligible school in the current viewport, irrespective of ISD
 // or zoom. Filtering is explicit; never silently discard campuses by rank.
 const eligible=state.schools.filter(s=>s.ll&&s.type!=='other'&&
  (state.level==='all'||s.type===state.level)&&
  schoolPassesRatingFilter(s));
 const visible=eligible.filter(s=>bounds.contains(s.ll));
 const homeCandidates=homeActive?state.schools.filter(s=>s.ll&&s.type!=='other'&&
  (state.level==='all'||s.type===state.level)&&homeSchoolMatches(s)):[];
 const displayed=[...new Set([...visible,...homeCandidates])];
 if(!size.x||!size.y){
  // The map container is not laid out (hidden/collapsed). The ResizeObserver
  // redraws once it gets a size; say so instead of showing a false zero.
  if(notice)notice.textContent='지도가 아직 화면에 배치되지 않아 학교 마커를 계산하지 않았습니다. 지도가 보이면 자동으로 다시 표시합니다.';
  return;
 }
 for(const s of displayed){
  const cls=homeActive?(homeSchoolMatches(s)?'home-match':'nearby'):s.type;
  const rating=scoreRecord(s.name,s.district)?.rating;
  const letter=['A','B','C','D','F'].includes(rating)?rating:'';
  const badge=letter?'<small class="school-map-grade-badge grade-'+letter.toLowerCase()+'">'+letter+'</small>':'';
  const icon=L.divIcon({className:'',html:`<div class="mapmark ${cls}">${s.type==='elementary'?'초':s.type==='middle'?'중':'고'}${badge}</div>`,iconSize:[27,27],iconAnchor:[13,13]});
  L.marker(s.ll,{icon,title:s.name}).addTo(schoolGroup).on('click',()=>schoolClicked(s));
 }
 if(notice){
  notice.textContent='학교 마커 '+displayed.length+'개 표시 · 등록 '+state.schools.length+'개 · 필터 적합 '+eligible.length+'개 · 화면 내 '+visible.length+'개 · ZIP '+state.zip+' · Zoom '+zoom+' · 지도 '+size.x+'×'+size.y+' · 학교 위치는 배정 확정 정보가 아닙니다.'+(state.selectedSchool?' · 선택: '+state.selectedSchool.name+(Array.isArray(state.selectedSchool.ll)?' (노란색 학교 위치 마커)':' (학교 좌표 미확인)'):'');
 }
}
function drawHomeAssignmentMap(){
 if(!map||!homeZoneGroup)return;
 homeZoneGroup.clearLayers();
 const selected=typeof home!=='undefined'&&home?home:null;
 const status=el('homeMapAssignmentStatus');
 if(!selected){if(status)status.textContent='';return;}
 const assignment=selected.assignment;
 // Do not promote source-backed reference GIS into residential enrollment.
 if(window.ConditionalSchoolRelease?.decide?.(assignment)?.allowed!==true){
  if(status){
   status.textContent='주소별 자동 배정은 아직 인증되지 않았습니다. 학군 공식 Finder를 이용하세요. 지도 참조 경계는 학교 배정 확정이 아닙니다.';
   status.dataset.evidence='conditional-hold';
   status.dataset.visible='false';
  }
  return;
 }
 const mode=assignment?.district?districtZoneDisplay(assignment.district,state.liveFinder):'historical';
 const plan=window.HomeAssignmentMap?.plan(assignment,mode);
 if(!plan){if(status)status.textContent='지도 학교 후보 표시 기능을 불러오지 못했습니다.';return;}
 const visible=plan.features.length>0&&state.showHistoric;
 if(visible){
  const current=plan.kind==='current-gis';
  L.geoJSON({type:'FeatureCollection',features:plan.features},{
   interactive:false,
   style:{color:current?'#087f69':'#285ac0',weight:4,
    dashArray:plan.review?'5 5':current?null:'9 5',
    fillColor:current?'#70cbb4':'#8db6f8',fillOpacity:.20}
  }).addTo(homeZoneGroup);
 }
 if(status){
  status.textContent=plan.message+(plan.features.length&&!state.showHistoric?' 배정 경계 표시 토글이 꺼져 있습니다.':'');
  status.dataset.evidence=plan.kind;
  status.dataset.visible=String(visible);
 }
}
// Run only upon an explicit address selection, never on a map move/async reload.
function focusHomeAssignedSchools(){
 if(!map||typeof home==='undefined'||!home||!state.showSchools||
    !home.geocodeQuality?.usableForSchoolCandidate||
    window.ConditionalSchoolRelease?.decide?.(home.assignment)?.allowed!==true)return;
 const points=state.schools.filter(s=>s.ll&&homeSchoolMatches(s)).map(s=>s.ll);
 if(!points.length||points.length>12)return;
 const all=[home.ll,...points];
 if(all.some(ll=>!Array.isArray(ll)||ll.length!==2||!ll.every(Number.isFinite)))return;
 const bounds=L.latLngBounds(all);
 // A stale/outlier campus must never zoom across Texas.
 if(bounds.getNorthEast().distanceTo(bounds.getSouthWest())>70000)return;
 map.fitBounds(bounds,{maxZoom:12,padding:[45,45],animate:false});
}
function schoolWithinScope(s){const scope=el('schoolScope').value;if(scope==='all')return true;if(!s.ll)return false;const county=countyData?.zipCounty[state.zip];if(scope==='county'&&!county)return false;const candidates=scope==='zip'?[getZip()]:DATA.filter(d=>countyData.zipCounty[d.z]===county);return candidates.some(d=>{const layer=state.polys[d.z];if(!layer||!layer.getBounds().contains(s.ll))return false;const geo=layer.toGeoJSON();return (geo.features||[geo]).some(f=>geometryContains([s.ll[1],s.ll[0]],f.geometry))})}
function drawList(){let items=state.schools.filter(s=>schoolWithinScope(s)&&(state.level==='all'||s.type===state.level)&&schoolPassesRatingFilter(s)&&(!state.schoolQuery||s.name.toLowerCase().includes(state.schoolQuery)));const box=el('schoolList');box.classList.toggle('broad',el('schoolScope').value!=='zip');const groups=[['elementary','초등학교'],['middle','중학교'],['high','고등학교'],['other','기타 학교']];box.innerHTML=items.length?'<div class="school-groups">'+groups.map(([type,label])=>{const group=items.filter(s=>(['elementary','middle','high'].includes(s.type)?s.type:'other')===type).sort((a,b)=>{const ar=scoreRecord(a.name,a.district),br=scoreRecord(b.name,b.district),order={'A':0,'B':1,'C':2,'D':3,'F':4};return (order[ar?.rating]??5)-(order[br?.rating]??5)||((br?.score??-1)-(ar?.score??-1))||a.name.localeCompare(b.name)});if(!group.length)return '';return `<section class="school-group"><h3>${label} · ${group.length}</h3>${group.map(s=>{const r=scoreRecord(s.name,s.district),grade=r&&['A','B','C','D','F'].includes(r.rating)?'grade-'+r.rating.toLowerCase():'nr',zone=schoolZoneInfo(s);return `<button class="school ${state.selectedSchool===s?'school-map-selected':''} ${typeof home!=='undefined'&&home&&homeSchoolMatches(s)?'home-match':''}" aria-pressed="${state.selectedSchool===s}" data-sid="${state.schools.indexOf(s)}"><span><b>${escape(s.name)}${typeof home!=='undefined'&&home?(homeSchoolMatches(s)?'<span class="match-label">집 주소 배정 후보</span>':'<span class="other-label">배정 미확인</span>'):''}</b><small>${gradeTag(s)} · ${escape(s.districtName||s.district||'배정 학군 확인 필요')}${s.ll?' · 클릭하면 학교 위치 강조':' · 위치 미확인 · 클릭 시 주소 좌표 확인'}</small><small class="school-zone-label ${zone.kind}">${escape(zone.label)}</small></span><span class="score ${grade}">${escape(ratingText(r))}</span></button>`}).join('')}</section>`}).join('')+'</div>':'<div class="muted" style="padding:14px">검색 결과 없음</div>';el('schoolCount').textContent=items.length+'개 학교';box.querySelectorAll('button.school[data-sid]').forEach(b=>b.onclick=()=>schoolClicked(state.schools[+b.dataset.sid],true))}


function zoneNameKey(name){
 return String(name||'').toLowerCase().replace(/\b(dr|doctor|elementary|middle|senior|sr|high|school|campus)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function convertFriscoZones(data){
 const types={'Elementary':'elementary','Middle School':'middle','High School':'high'};
 if(!Array.isArray(data)||!data.length)throw Error('Frisco 경계 데이터 형식 오류');
 return data.map((z,i)=>{
  if(!z.name||!z.grades||!types[z.type]||!Array.isArray(z.border)||!z.border.length)throw Error('Frisco 경계 항목 오류 '+i);
  const coordinates=z.border.map(poly=>poly.map(ring=>{
   if(!Array.isArray(ring)||ring.length<3)throw Error('Frisco 경계 좌표 오류 '+i);
   const points=ring.map(([lng,lat])=>{
    if(!Number.isFinite(lng)||lng>=-96||lng<=-98||!Number.isFinite(lat)||lat<=32||lat>=34)throw Error('Frisco 경계 좌표 범위 오류 '+i);
    return [lng,lat];
   });
   const a=points[0],b=points[points.length-1];
   if(a[0]!==b[0]||a[1]!==b[1])points.push(a);
   return points;
  }));
  return {type:'Feature',properties:{school:z.name,gradeLevel:types[z.type],grades:z.grades,sourceVintage:'2026–27',address:z.address,location:z.location},geometry:{type:'MultiPolygon',coordinates}};
 });
}
// Official Lewisville locator embeds Web Mercator rings; preserve islands and holes.
// Same MetroStudy finder format serves Lewisville and McKinney ISD; cfg holds
// the district-specific layer titles, elementary field, TEA prefix and vintage.
const LEWISVILLE_FINDER={label:'루이스빌',prefix:'061902',layers:[['Elementary_Boundaries','ELEM_PLAN1','elementary'],['Middle_Boundaries','MID_NAME','middle'],['High_Boundaries','HIGH_NAME','high']],vintage:level=>level==='high'?'공식 검색기 연결 · 고등 레이어 2025–26 표기':'공식 검색기 연결 · 학년도 미확인'};
const MCKINNEY_FINDER={label:'매키니',prefix:'043907',layers:[['Elementary Boundaries','ELEM_NAME','elementary'],['Middle Boundaries','MID_NAME','middle'],['High Boundaries','HIGH_NAME','high']],vintage:()=>'2026–27 공식 School Zone Finder'};
function convertMetrostudyZones(webmap,cfg=LEWISVILLE_FINDER){
 const specs=cfg.layers;
 // The locator's Schools layer uses the three-digit TEA campus suffix. Only use
 // a campus identity when its locator name and school level are unambiguous.
 const campusIndex=new Map(),classes={ELEM:'elementary',MID:'middle',HIGH:'high'};
 const campuses=webmap.operationalLayers?.find(l=>l.title==='Schools')?.featureCollection?.layers?.[0]?.featureSet?.features||[];
 for(const f of campuses){const a=f.attributes||{},level=classes[a.CLASS],n=String(a.NAME||'').trim().toUpperCase(),id=Number(a.CAMPUS_ID);if(!level||!n||!Number.isInteger(id)||id<1||id>999)continue;const k=level+'|'+n,items=campusIndex.get(k)||[];items.push(cfg.prefix+String(id).padStart(3,'0'));campusIndex.set(k,items)}
 const out=[];for(const [title,field,level] of specs){const layer=webmap.operationalLayers?.find(l=>l.title===title)?.featureCollection?.layers?.[0];if(!layer?.featureSet?.features)throw Error(cfg.label+' 경계 레이어 없음: '+title);
 for(const f of layer.featureSet.features){const name=f.attributes?.[field];if(!name||!f.geometry?.rings?.length)continue;
 const rings=f.geometry.rings.filter(r=>r.length>=4).map(r=>r.map(([x,y])=>{const ll=L.CRS.EPSG3857.unproject(L.point(x,y));return [ll.lng,ll.lat]}));
 const area=r=>Math.abs(r.reduce((v,p,i)=>{const q=r[(i+1)%r.length];return v+p[0]*q[1]-q[0]*p[1]},0));
 const ordered=rings.map(r=>({r,area:area(r),parent:null,depth:0})).sort((a,b)=>b.area-a.area);
 for(let i=0;i<ordered.length;i++){const child=ordered[i];const parents=ordered.slice(0,i).filter(p=>ringContains(child.r[0],p.r));if(parents.length){child.parent=parents.reduce((a,b)=>a.area<b.area?a:b);child.depth=child.parent.depth+1}}
 const polys=ordered.filter(r=>r.depth%2===0).map(r=>[r.r,...ordered.filter(h=>h.parent===r&&h.depth%2===1).map(h=>h.r)]);if(!polys.length)continue;
 const ids=campusIndex.get(level+'|'+String(name).trim().toUpperCase())||[];
 out.push({type:'Feature',properties:{school:name,gradeLevel:level,campusId:ids.length===1?ids[0]:null,sourceVintage:cfg.vintage(level)},geometry:{type:'MultiPolygon',coordinates:polys}});
 }}return out;
}
// External finders (Frisco, MetroStudy for Lewisville/McKinney, Plano ArcGIS)
// are read live. Without a limit, one hung server keeps Promise.all pending
// and every district shows "loading" forever. Timeout -> error message +
// official finder link (Plano falls back to its stored copy).
const ZONE_FETCH_TIMEOUT_MS=window.__zoneFetchTimeoutMs||20000;
const zoneFetch=(url,opt={})=>fetch(url,{...opt,signal:window.AbortSignal?.timeout?AbortSignal.timeout(ZONE_FETCH_TIMEOUT_MS):undefined});
async function loadBoundaryData(){
 // Keep the separately published official feeder chains independent of live GIS.
 // Missing/invalid reference never silently validates an address assignment.
 state.planoFeederReference=null;
 const feederPromise=fetch('./plano-official-feeder-reference-2026.json',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
  .then(j=>{if(!validPlanoFeederReference(j))throw Error('unexpected feeder source');state.planoFeederReference=j})
  .catch(err=>{state.planoFeederReference=null;console.warn('Plano feeder source unavailable',err)});
 const sources=[
  {district:'FISD',url:'https://static.friscoisd.org/js/json/school.borders.2627.json',label:'프리스코 2026–27 (공식 검색기)'},
  {district:'LISD',url:'https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/03c099e24d304c4fa0f4ce8a76c10062/data?f=json',label:'루이스빌 현재 공식 Finder 지도 (고등학교 2025–26 표기)'},
  {district:'PISD_LOOKUP',url:'./plano-locator-reference.geojson',label:'플레이노 현재 공식 Finder GIS (원본 2025–26)'},
  {district:'043907',url:'https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/23b28d101ba947498650f6c7b9ef251b/data?f=json',label:'매키니 2026–27 공식 School Zone Finder'},
  {district:'PROSPER',url:'./prosper-attendance-2026.geojson',label:'프로스퍼 2026–27 (공식 검색기 · 31개 학교 배정구역)'},

  {district:'AISD',url:'./allen-attendance-historical.geojson',label:'Allen 2019·2023'}
 ];
 const results=await Promise.all(sources.map(async x=>{
  try{
   if(x.district==='PISD_LOOKUP'){
     try{
      const zones=await loadPlanoLiveFinder(zoneFetch);
      state.zoneData.PISD_LOOKUP=zones;state.liveFinder.PISD_LOOKUP=true;
      return x.label+': '+zones.length+'개 · 공식 서비스 실시간 확인';
     }catch(err){console.warn('Plano official Finder live read failed; cached reference only',err)}
    }
    const r=await zoneFetch(x.url,{cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const j=await r.json();
   if(x.district==='FISD')state.zoneData.FISD=convertFriscoZones(j);
   else if(x.district==='LISD'){state.zoneData.LISD=convertMetrostudyZones(j,LEWISVILLE_FINDER);if(state.zoneData.LISD.length<19)throw Error('Incomplete Lewisville Finder map');state.liveFinder.LISD=true;}
   else if(x.district==='043907'){
    // Every elementary piece must carry the finder's 2026-27 school year.
    const elem=j.operationalLayers?.find(l=>l.title==='Elementary Boundaries')?.featureCollection?.layers?.[0]?.featureSet?.features||[];
    if(!elem.length||elem.some(f=>f.attributes?.SCHL_YEAR!=='2026-27'))throw Error('매키니 2026–27 학년도 검증 실패');
    const zones=convertMetrostudyZones(j,MCKINNEY_FINDER);
    const count=lv=>new Set(zones.filter(f=>f.properties.gradeLevel===lv).map(f=>f.properties.school)).size;
    if(count('elementary')<15||count('middle')!==5||count('high')!==3)throw Error('매키니 Finder 학교 수 불일치');
    state.zoneData['043907']=zones;state.liveFinder['043907']=true;
   }
   else if(x.district==='PROSPER'){
    if(j.type!=='FeatureCollection'||j.metadata?.sourceYear!=='2026–27'||j.metadata?.currentYearConfirmed!==true||j.features?.length!==31||new Set(j.features.map(f=>f.properties?.campusId)).size!==31||j.features.some(f=>f.properties?.current!==true||f.properties?.sourceDistrict!=='PROSPER'||f.properties?.sourceVintage!=='2026–27'||f.geometry?.type!=='MultiPolygon'))throw Error('프로스퍼 최신 학년도/학교별 경계 검증 실패');
    state.zoneData.PROSPER=j.features;
   }
   else{
    if(j.type!=='FeatureCollection'||!Array.isArray(j.features))throw Error('GeoJSON 형식 오류');
    state.zoneData[x.district]=j.features.filter(f=>f.geometry&&f.properties?.school);
   }
   return x.label+': '+state.zoneData[x.district].length+'개'+(x.district==='PISD_LOOKUP'?' · 저장된 과거 참고본 (현재 공식 조회 실패)':'');
  }catch(e){console.error('Zone data '+x.label,e);state.zoneData[x.district]=[];state.zoneLoadErrors[x.district]=e.message;return x.label+': 오류 ('+e.message+')'}
 }));
 await feederPromise;
 state.assignmentLoadFailed=results.some(x=>x.includes(': 오류 ('));state.zoneReady=true;window.refreshCandidateComparisons?.();
 el('zoneDatasetStatus').innerHTML=results.map(escape).join('<br>')+
  '<br>Plano 공식 진학표 점검: '+(state.planoFeederReference?'11개 경로 로딩 완료 · 집주소별 초·중·고·Senior High 자동 대조':'검증 자료 로딩 실패 · Plano 집주소 자동 학교 강조 중단')+
  '<br><b>2026–27 GIS 독립 검증: Frisco·Prosper 2곳 · 공식 Finder 연결 GIS: Plano·Lewisville 2곳(연도 불일치 가능) · Allen 주소표 공식 조회 검증 · CFB GuideK12 공식 주소 Finder는 주소 후보 선택 후 초·중·고 결과 2건 검증. 개별 호수와 상충하는 진학표는 학군 담당자 확인이 필요합니다.</b>';
 if(state.selectedSchool)drawBoundary();
 if(typeof refreshHomeSchools==='function')refreshHomeSchools();drawSchools();drawList();
}
function addFriscoBoundarySchools(){
 for(const f of state.zoneData.FISD||[]){
  if(isRetiredCampus({district:'FISD',name:f.properties?.school}))continue;
  const p=f.properties, key=zoneNameKey(p.school).replace(/\bk\s*4\b/g,'').trim();
  const ll=p.location&&Number.isFinite(p.location.lat)&&Number.isFinite(p.location.lng)?[p.location.lat,p.location.lng]:null;
  const existing=state.schools.find(s=>s.district==='FISD'&&s.type===p.gradeLevel&&zoneNameKey(s.name).replace(/\bk\s*4\b/g,'').trim()===key);
  if(existing){if(!existing.ll&&ll)existing.ll=ll;if(!existing.address&&p.address)existing.address=p.address;continue}
  addSchool({name:p.school,type:p.gradeLevel,district:'FISD',address:p.address,ll,source:'Frisco ISD 2026–27'});
 }
 state.schools.sort((a,b)=>a.name.localeCompare(b.name));
 if(typeof refreshHomeSchools==='function')refreshHomeSchools();drawSchools();drawList();
}
function addProsperCurrentSchools(){
 addSchool({name:'Jim Bridges Middle School',type:'middle',district:'PROSPER',address:'3225 East Frontier Parkway, Prosper, TX 75078',source:'Prosper ISD 2026–27 new campus; TEA rating not established'});
 state.schools.sort((a,b)=>a.name.localeCompare(b.name));drawSchools();drawList();
}
function renderSchoolBoundaryCoverageAudit(){
 if(!state.zoneReady)return null;
 const schools=state.schools.filter(s=>['elementary','middle','high'].includes(s.type));
 const summary={total:schools.length,matched:0,missing:0,
  byDistrict:{},byReason:{},missingSchools:[],
  note:'Counts are for the live loaded campus directory and currently loaded polygon sources; they are not claims about which schools a resident can enroll in.'};
 for(const school of schools){
  const source=window.SchoolBoundaryMatch.boundarySchoolSource(school.district);
  const polygons=state.zoneData[source]||[];
  const match=window.SchoolBoundaryMatch.findSchoolBoundary(school,polygons,(name,district)=>scoreRecord(name,district));
  const reason=state.zoneLoadErrors[source]?'source-fetch-failed':match.status;
  const district=summary.byDistrict[school.district]||(summary.byDistrict[school.district]={total:0,matched:0,missing:0,reasons:{}});
  district.total++;
  if(reason==='matched'){summary.matched++;district.matched++}
  else{
   summary.missing++;district.missing++;
   summary.byReason[reason]=(summary.byReason[reason]||0)+1;
   district.reasons[reason]=(district.reasons[reason]||0)+1;
   summary.missingSchools.push({school:school.name,district:school.district,
    type:school.type,reason,availablePolygons:polygons.length});
  }
 }
 const coreCodes=['FISD','PISD','AISD','LISD','PROSPER','CFB'];
 const coreDistricts=coreCodes.map(x=>summary.byDistrict[x]||{total:0,matched:0,missing:0});
 summary.targetSix={
  districts:coreCodes,
  total:coreDistricts.reduce((n,v)=>n+v.total,0),
  matched:coreDistricts.reduce((n,v)=>n+v.matched,0),
  missing:coreDistricts.reduce((n,v)=>n+v.missing,0),
  missingSchools:summary.missingSchools.filter(x=>coreCodes.includes(x.district))
 };
 summary.otherDistricts={total:summary.total-summary.targetSix.total,
  missing:summary.missing-summary.targetSix.missing};
 window.schoolBoundaryCoverage=summary;
 const target=el('schoolBoundaryCoverageAudit');
 if(target){
  const reasonLabels={'no-district-polygon-source':'학교별 경계 GIS 미연결',
   'no-grade-polygon-source':'해당 학교급 경계 없음',
   'school-not-in-polygon-source':'학교명·도형 원본 불일치 또는 미수록',
   'special-campus-no-standard-zone':'선발·학년전용·전환 학교',
   'source-fetch-failed':'이번 세션 지도 원본 로딩 실패',
   'not-a-zoned-campus':'일반 배정학교 이외 유형'};
  target.replaceChildren();
  const title=document.createElement('strong');
  title.textContent='주요 6개 학군 '+summary.targetSix.total+'개 중 지도 경계 표시 '+summary.targetSix.matched+
   '개 · 미표시 '+summary.targetSix.missing+'개';
  target.appendChild(title);
  const reasons=document.createElement('div');reasons.className='source';
  const coreReasons={};
  for(const item of summary.targetSix.missingSchools)coreReasons[item.reason]=(coreReasons[item.reason]||0)+1;
  reasons.textContent=Object.entries(coreReasons)
   .map(([reason,count])=>(reasonLabels[reason]||reason)+' '+count+'개').join(' · ')||'미표시 사유 없음';
  target.appendChild(reasons);
  const note=document.createElement('small');note.className='source';
  note.textContent='현재 로드된 학교·경계 원본 기준. 6개 학군 외 학교 '+summary.otherDistricts.total+'개는 별도 범위로 집계(현재 배정 GIS 미지원 '+summary.otherDistricts.missing+'개). 개별 학교 선택 시 사유 각주를 표시하며, 배정선을 추측해 만들지 않습니다.';
  target.appendChild(note);
 }
 return summary;
}
window.getSchoolBoundaryCoverage=()=>window.schoolBoundaryCoverage||renderSchoolBoundaryCoverageAudit();
function drawBoundary(){
 if(!map)return;
 ++boundarySeq;zoneGroup.clearLayers();
 const s=state.selectedSchool;
 if(!s){renderSchoolZoneMapHint(null,null);return;}
 const note=el('zoneNotice');
 const zoneDisplay=districtZoneDisplay(s.district,state.liveFinder);
 const officialYear=zoneDisplay==='official',finderLinked=zoneDisplay==='finder';
 const historical=!officialYear&&!finderLinked;
 if((historical&&!state.showOldZones)||(!historical&&!state.showHistoric)){
   if(note)note.textContent='배정 경계선 표시를 직접 끈 상태입니다. 학교를 다시 선택하면 해당 경계선을 자동으로 표시합니다.';
   return;
 }
 const geo=state.zoneData[districtZoneKey(s.district)]||[];
 const match=window.SchoolBoundaryMatch.findSchoolBoundary(s,geo,(name,district)=>scoreRecord(name,district));
 renderSchoolZoneMapHint(s,schoolZoneInfo(s));
 const found=match.features;
 if(found.length){
  const current=officialYear;
  const layer=L.geoJSON({type:'FeatureCollection',features:found},{style:{color:current?'#087f69':finderLinked?'#285ac0':'#d37125',weight:3,dashArray:current||finderLinked?null:'7 5',fillColor:current?'#70cbb4':finderLinked?'#8db6f8':'#ffc078',fillOpacity:.25}}).addTo(zoneGroup);
  if(layer.getBounds().isValid())map.fitBounds(layer.getBounds(),{padding:[28,28],maxZoom:13});
  const yrs=[...new Set(found.map(f=>f.properties?.sourceVintage).filter(Boolean))].join(', ');
  const grades=[...new Set(found.map(f=>f.properties?.grades).filter(Boolean))].join(', ');
  if(note)note.innerHTML=s.district==='043907'?'<b>McKinney ISD 2026–27 공식 School Zone Finder 배정구역</b> · 2025년 12월 교육위원회 승인 지도 기준입니다. 5·8·12학년 기존 학교 유지(grandfather) 등 예외가 있으니 실제 주소는 학군 Finder로 확인하세요.':s.district==='PISD'&&finderLinked?'<b>Plano 현행 공식 Finder가 사용하는 배정선</b> · 원본 레이어는 2025–26 명칭입니다. 실제 주소·학년·호수는 Finder로 확인하세요.':s.district==='LISD'&&finderLinked?'<b>Lewisville 현행 공식 Finder가 사용하는 배정선</b> · 고등 레이어의 내부 연도는 2025–26. 실제 주소·아파트 호수는 Finder로 확인하세요.':s.district==='PROSPER'?'<b>Prosper 공식 검색기 배정구역 2026–27 · '+escape(yrs)+'</b> · 초등 20개, 중등 7개, 고등 4개 전체 구역 원본을 학군 검색기 좌표와 교차 검증했습니다. 녹색 도형은 배정구역 참고이며 실제 집 주소·학년·특수 프로그램/예외·등록 자격은 공식 Prosper ISD 검색기로 확인하세요.':current?'<b>Frisco 공식 검색기 경계 '+escape(yrs)+'</b> · 녹색 도형, 학년 '+escape(grades)+(grades.includes(',')?' (여러 학년의 구역을 함께 표시)':'')+'. 배정 예외와 정원 제한이 있을 수 있으므로 학군에 최종 확인하세요.':'<b style="color:#ab531b">과거 GIS 경계 '+escape(yrs)+' (현재 배정 보장 X)</b> · 주황색 점선 '+found.length+'개 도형 표시. 실제 2026–27 배정은 해당 주소로 공식 학군 검색에서 확인하세요.';
  if(note&&s.district==='FISD'&&window.SchoolBoundaryMatch.boundarySchoolKey(s.name)==='isbell'){
   const gradeLabels=[...new Set(found.map(f=>f.properties?.grades).filter(Boolean))];
   const explain=document.createElement('small');explain.className='source boundary-footnote';
   explain.textContent='Isbell 세부 학년 주의: 현재 연결된 공식 도형 '+found.length+'개는 '+(gradeLabels.join(', ')||'학년 미표기')+' 구역입니다. 전체 K–5 구역을 나타낸다는 뜻이 아니며, 2026–27 공식 주소 검색에서 정확한 학년별 배정을 확인하세요.';
   note.appendChild(explain);
  }
  if(note&&s.district==='PISD'&&/\bJackson\b/i.test(s.name))note.innerHTML+='<br><b>Jackson Elementary 진학 경로 예외:</b> Coit Rd 동쪽은 Wilson Middle → Vines High → Plano Senior, 서쪽은 Frankford Middle → Shepton High → Plano West Senior입니다. 정확한 주소로 학군 공식 SchoolFinder를 확인하세요.';
 }else if(!state.zoneReady&&districtInfo(s.district)?.zoneKey){
  if(note)note.textContent='배정구역 데이터를 불러오는 중입니다…';
 }else if(note){
  const source=window.SchoolBoundaryMatch.boundarySchoolSource(s.district);
  const loadError=state.zoneLoadErrors[source]||null;
  const sourceVintage=[...new Set(geo.map(f=>f.properties?.sourceVintage).filter(Boolean))].join(', ');
  const failure=window.SchoolBoundaryMatch.boundaryMissingExplanation(s,match,sourceVintage,loadError);
  note.replaceChildren();
  const heading=document.createElement('strong');heading.textContent=failure.reason;note.appendChild(heading);
  const footnote=document.createElement('small');footnote.className='source boundary-footnote';
  footnote.textContent='경계 미표시 각주 · '+failure.footnote;note.appendChild(footnote);
  if(failure.sourceUrl&&window.TrustedLinkPolicy?.official(failure.sourceUrl)){
   const sourceLink=document.createElement('a');sourceLink.href=window.TrustedLinkPolicy.official(failure.sourceUrl);
   sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.className='cardlink';
   sourceLink.textContent=failure.sourceLinkLabel||'미표시 원인 공식 근거 확인';note.appendChild(sourceLink);
  }
 }
}

const OFFICES={capitalone:'7933 Preston Road, Plano, TX 75024',usaa:'7300 Parkwood Blvd, Plano, TX 75024',schwab:'3000 Schwab Way, Westlake, TX 76262',fidelity:'1 Destiny Way, Westlake, TX 76262'};
function savedCommuteFor(zip){return null}
function averageMinutes(values){return Array.isArray(values)&&values.length===2&&values.every(Number.isFinite)?Math.round((values[0]+values[1])/120):null}
function commuteTableText(zip){const r=savedCommuteFor(zip);if(r){const am=averageMinutes(r.outbound),pm=averageMinutes(r.return);return am===null||pm===null?'미확인':`${am}분 · ${pm}분`}return state.times[zip]===undefined?'—':`도로망 ${Math.round(state.times[zip])}분`}
function showSavedCommute(){const box=el('commuteCache');if(!box)return;box.textContent='목적지 검색 시 입력한 목적지 주소가 OpenStreetMap Nominatim에, ZIP 대표점과 목적지 좌표가 OSRM 경로 서버에 전송됩니다. 집 주소나 개인정보는 목적지 칸에 입력하지 마세요. 직접 계산은 교통량을 반영하지 않습니다. Google Maps에서 출발 요일과 시간을 선택해 확인할 수 있습니다. ';if(el('destination').value.trim()){for(const [label,reverse] of [['출근 경로 ↗',false],['퇴근 경로 ↗',true]]){const a=document.createElement('a');a.href=gmaps(getZip(),reverse);a.target='_blank';a.rel='noopener';a.textContent=label;a.style.marginRight='12px';box.appendChild(a)}}}
async function loadSavedCommute(){showSavedCommute()}
async function calcCommute(){if(typeof home!=='undefined'&&home&&homeZipMatches(home.ll).some(d=>d.z===state.zip)){await calculateHomeCommute();el('routeStatus').textContent=state.zip+' · '+(el('homeRouteStatus')?.textContent||'집 주소 경로를 확인하지 못했습니다.');return}if(typeof homeRouteLayer!=='undefined'&&homeRouteLayer)homeRouteLayer.clearLayers();let addr=el('destination').value.trim();if(!addr){toast('회사 주소 또는 목적지를 먼저 입력해주세요.');return}el('routeStatus').textContent='목적지 위치 확인 중…';try{const q=new URLSearchParams({q:/\b(TX|Texas)\b/i.test(addr)?addr:addr+', Texas',format:'jsonv2',limit:'1',countrycodes:'us'});let r=await fetch('https://nominatim.openstreetmap.org/search?'+q,{headers:{'Accept':'application/json'}});if(!r.ok)throw Error('주소검색 응답 오류');let j=await r.json();if(!j.length)throw Error('주소를 찾을 수 없습니다. 더 구체적인 주소를 입력하세요');let p=[+j[0].lat,+j[0].lon];state.dest={ll:p,address:j[0].display_name};routeGroup.clearLayers();if(targetMarker)map.removeLayer(targetMarker);targetMarker=L.marker(p,{icon:window.workDestinationIcon(L)}).addTo(map).bindPopup('통근 목적지: '+escape(addr));el('routeStatus').textContent='도로망 기반 ZIP별 시간을 계산 중…';const commuteData=[getZip()];const coords=commuteData.map(d=>d.ll).concat([p]).map(ll=>ll[1].toFixed(6)+','+ll[0].toFixed(6)).join(';');let base='https://router.project-osrm.org/table/v1/driving/'+coords;let qs=new URLSearchParams({sources:commuteData.map((_,i)=>i).join(';'),destinations:String(commuteData.length),annotations:'duration'});let rr=await fetch(base+'?'+qs);if(!rr.ok)throw Error('경로 계산 API 응답 오류');const result=await rr.json();if(result.code!=='Ok')throw Error('도로 경로를 찾지 못했습니다');state.times={};commuteData.forEach((d,i)=>{const sec=result.durations?.[i]?.[0];if(Number.isFinite(sec))state.times[d.z]=sec/60});drawTable();drawCommute();drawSelectedRoute();}catch(e){el('routeStatus').textContent='예상 시간 계산 실패: '+e.message+' (Google Maps 링크로 직접 확인 가능)'}}
function gmaps(d,reverse=false){const dest=el('destination').value.trim()||state.dest?.address||'',zipPoint=d.ll[0]+','+d.ll[1];return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(reverse?dest:zipPoint)+'&destination='+encodeURIComponent(reverse?zipPoint:dest)+'&travelmode=driving'}
function drawCommute(){const d=getZip(),v=state.times[d.z];el('routeStatus').innerHTML=Number.isFinite(v)?'<b>선택 ZIP 대표점 · 교통량 미반영</b><div class="commuteline"><span>'+escape(d.z+' · '+displayPlace(d.name))+'</span><b>'+Math.round(v)+'분</b><a href="'+escape(gmaps(d))+'" target="_blank" rel="noopener">Google ↗</a></div>':''}

let routeRequestSeq=0;
async function drawSelectedRoute(){if(!map||!state.dest)return;const seq=++routeRequestSeq;routeGroup.clearLayers();const d=getZip(),p=state.dest.ll;try{const uri='https://router.project-osrm.org/route/v1/driving/'+d.ll[1]+','+d.ll[0]+';'+p[1]+','+p[0]+'?overview=full&geometries=geojson';const r=await fetch(uri);if(!r.ok)throw Error('route HTTP '+r.status);const j=await r.json();if(seq!==routeRequestSeq||d.z!==state.zip)return;const line=j.routes?.[0]?.geometry;if(line){window.noteCommuteRouteDistance?.(j.routes?.[0]?.distance,'zip');L.geoJSON(line,{style:{color:'#1d57d4',weight:4,opacity:.8}}).addTo(routeGroup);const mid=line.coordinates[Math.floor(line.coordinates.length/2)],minutes=j.routes?.[0]?.duration;if(mid&&Number.isFinite(minutes))L.marker([mid[1],mid[0]],{interactive:false,icon:L.divIcon({className:'',html:'<span class="route-label">ZIP 대표점 '+Math.round(minutes/60)+'분</span>',iconSize:[120,30]})}).addTo(routeGroup)}}catch(e){if(seq===routeRequestSeq)console.warn('route overlay',e)}}
document.addEventListener('DOMContentLoaded',async()=>{try{const r=await fetch('./dfw-demographics.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(j.year!==2024||!Array.isArray(j.data)||j.data.length!==292)throw Error('DFW 데이터 형식 오류');const existing=new Map(DATA.map(d=>[d.z,d]));for(const row of j.data){const prior=existing.get(row.z);if(prior){const name=prior.name;Object.assign(prior,row,{name})}else DATA.push(row)}}catch(e){console.error('DFW demographics:',e);toast('DFW 통계 데이터를 불러오지 못해 기존 11개 지역만 표시합니다.')}try{const r=await fetch('./dfw-outside-public.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);outsideData=await r.json();if(!Array.isArray(outsideData.data)||!Array.isArray(outsideData.shapes?.features))throw Error('주변 ZIP 데이터 형식 오류');for(const d of outsideData.data){Object.assign(d,outsideData.race[d.z]||{});DATA.push(d)}}catch(e){console.error('주변 ZIP 자료 오류:',e);toast('DFW 바깥 일부 ZIP을 불러오지 못했습니다.')}init()});

document.addEventListener('click',event=>{const button=event.target?.closest?.('button[data-clear-school]');if(button){event.preventDefault();clearSchool()}});
