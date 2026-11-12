/* Hospital points: official CMS identities + Census address-range geocoding.
   Layer independent of schools, school boundaries and FEMA polygons. */
(function(root){
'use strict';
const DATA_URL='./data/healthcare/cms-dfw-census-points-2026.json';
const TRAUMA_URL='./data/healthcare/dshs-cms-exact-matches-2026.json';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validPoint(p){return p&&/^[A-Z0-9]{6}$/.test(String(p.cmsFacilityId||''))&&
 typeof p.name==='string'&&p.geocodeStatus==='CENSUS_ADDRESS_RANGE_MATCH'&&
 Number.isFinite(p.lat)&&Number.isFinite(p.long)&&
 p.lat>31.6&&p.lat<34.6&&p.long>-98.8&&p.long<-95.2;}
function validDataset(x){
 return x&&x.metadata?.matchedCount>0&&x.metadata?.recordCount===104&&
 x.metadata.matchedCount+x.metadata.unmatchedCount===104&&
 Array.isArray(x.records)&&x.records.length===104&&
 x.records.filter(validPoint).length===x.metadata.matchedCount;
}
/* Informational-only radius ranking: interpolated Census addresses and ZIP
   reference points are not ED entrances, driving routes, or complete coverage. */
function rankNearbyCMS(dataset,center,{edOnly=true,limit=8}={}){
 if(!validDataset(dataset))throw new TypeError('validated CMS location dataset required');
 if(!Array.isArray(center)||center.length!==2||!center.every(Number.isFinite)||
    center[0]<24||center[0]>38||center[1]<-108||center[1]>-92)
  throw new RangeError('valid Texas [latitude,longitude] reference required');
 if(typeof edOnly!=='boolean'||!Number.isInteger(limit)||limit<1||limit>20)
  throw new RangeError('invalid informational ranking options');
 const rad=n=>n*Math.PI/180,fromLat=rad(center[0]),fromLng=rad(center[1]);
 const matches=dataset.records.filter(p=>validPoint(p)&&(!edOnly||p.emergencyServices===true));
 const ordered=matches.map(p=>{
  const dlat=rad(p.lat)-fromLat,dlng=rad(p.long)-fromLng;
  const a=Math.sin(dlat/2)**2+Math.cos(fromLat)*Math.cos(rad(p.lat))*Math.sin(dlng/2)**2;
  const distanceMiles=3958.7613*2*Math.asin(Math.min(1,Math.sqrt(a)));
  return {...p,distanceMiles};
 }).sort((a,b)=>a.distanceMiles-b.distanceMiles||a.cmsFacilityId.localeCompare(b.cmsFacilityId));
 return {records:ordered.slice(0,limit),rankedCount:ordered.length,
  approximateLocationsCount:dataset.metadata.matchedCount,
  missingLocationsCount:dataset.metadata.unmatchedCount,
  totalFacilitiesCount:dataset.metadata.recordCount,
  metric:'straight-line-miles-only; not drive time or ED-entrance location'};
}
function initHealthcareMap(map,d){
 d=d||document;
 const trigger=d.getElementById('healthcareMapQuickToggle');
 if(!map||!trigger||!root.L)return null;
 const group=L.layerGroup(),visibleStatus=d.getElementById('healthcareMapStatus');
 let records=null,matches={},promise=null,enabled=false,version=0;
 const line=txt=>{if(visibleStatus)visibleStatus.textContent=txt;};
 function sync(){
   trigger.setAttribute('aria-pressed',String(enabled));
   const checkbox=d.getElementById('hospitalMapEnabled');
   if(checkbox)checkbox.checked=enabled;
 }
 const edOnly=()=>d.getElementById('hospitalEdOnly')?.checked!==false;
 const city=()=>{const value=String(d.getElementById('hospitalCity')?.value||'').trim().toUpperCase();return value==='__NEARBY__'?'':value;};
 function filtered(){
   if(!records)return[];
   return records.filter(p=>validPoint(p)&&(!edOnly()||p.emergencyServices===true)&&(!city()||p.city?.toUpperCase()===city()));
 }
 function popup(p){
  const m=matches[p.cmsFacilityId];
  const suffix=m?'DSHS Trauma Level '+m.level+' ('+esc(m.status)+')':'DSHS 지정등급: 미확인 (등급 없음 의미 아님)';
  const addr=[p.address,p.city,'TX',p.zip].filter(Boolean).join(', ');
  const link='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.name,addr].join(', '));
  return '<div class="healthcare-popup"><strong>'+esc(p.name)+'</strong>'+
   '<div>'+esc(addr)+'</div>'+
   '<div>CMS 응급서비스 표시: <b>'+(p.emergencyServices===true?'Yes':p.emergencyServices===false?'No':'미확인')+'</b></div>'+
   '<div>'+suffix+'</div>'+
   '<small>위치는 Census 주소 구간 기반 추정. 응급실 출입구 좌표·24시간 운영·실제 소요시간 미확인.</small>'+
   '<a href="'+link+'" target="_blank" rel="noopener noreferrer">지도 앱에서 위치와 경로 확인</a></div>';
 }
 function makeIcon(isED){
  const color=isED?'#08765c':'#546a85',icon=isED?'✚':'H';
  return L.divIcon({className:'hospital-map-pin',html:'<span class="hospital-pin-inner" style="--hospital-pin:'+color+'"><span aria-hidden="true">'+icon+'</span></span>',
   iconSize:[32,36],iconAnchor:[16,34],popupAnchor:[0,-30]});
 }
 function draw(){
  group.clearLayers();
  if(!enabled||!records)return;
  const points=filtered();
  for(const p of points){
   const marker=L.marker([p.lat,p.long],{icon:makeIcon(p.emergencyServices===true),title:p.name,alt:p.name});
   marker.bindPopup(popup(p),{maxWidth:330});marker.addTo(group);
  }
  line(points.length+'곳 표시 · 검증된 주소 추정 좌표만 표시 (전체 104개 CMS 시설 중 '+records.filter(validPoint).length+'곳 좌표 확인). 조회 결과가 0개여도 해당 지역에 병원이 없다는 뜻이 아닙니다.');
 }
 async function load(){
  if(records)return;
  if(!promise)promise=Promise.all([fetch(DATA_URL).then(r=>{if(!r.ok)throw Error('CMS 좌표 데이터 HTTP '+r.status);return r.json()}),
   fetch(TRAUMA_URL).then(r=>{if(!r.ok)throw Error('DSHS 데이터 HTTP '+r.status);return r.json()})])
   .then(([points,trauma])=>{
     if(!validDataset(points)||!Array.isArray(trauma.records)||trauma.metadata?.matchingCount!==trauma.records.length)throw Error('공식 데이터 범위 검증 실패');
     const found=new Set();
     for(const p of points.records){if(found.has(p.cmsFacilityId))throw Error('중복 CMS ID');found.add(p.cmsFacilityId)}
     for(const row of trauma.records){if(!found.has(row.cmsFacilityId)||![1,2,3,4].includes(row.level))throw Error('잘못 연결된 DSHS 등급');matches[row.cmsFacilityId]=row}
     records=points.records;
   }).finally(()=>{promise=null});
  return promise;
 }
 async function toggle(next){
   const req=++version;enabled=Boolean(next);sync();
   if(!enabled){if(map.hasLayer(group))map.removeLayer(group);group.clearLayers();line('병원 지도 꺼짐');return;}
   if(!map.hasLayer(group))group.addTo(map);
   line('CMS 병원 좌표와 DSHS 자료를 확인하는 중…');
   try{await load();if(req!==version||!enabled)return;draw();}
   catch(e){if(req!==version)return;console.error('Hospital map unavailable:',e);
     enabled=false;sync();group.clearLayers();if(map.hasLayer(group))map.removeLayer(group);
     line('병원 좌표를 검증하거나 불러오지 못했습니다. 기존 목록과 공식 링크를 이용하세요.');}
 }
 trigger.addEventListener('click',()=>toggle(!enabled));
 d.addEventListener('change',e=>{
  if(e.target?.id==='hospitalMapEnabled')toggle(e.target.checked);
  if(enabled&&['hospitalEdOnly','hospitalCity'].includes(e.target?.id))draw();
 });
 sync();line('병원 마커를 누르면 CMS 정보와 확인된 DSHS Trauma 등급을 표시합니다.');
 return {toggle,getVisibleCount:()=>enabled?filtered().length:0,validPoint,validDataset};
}
root.initHealthcareMap=initHealthcareMap;
root.HospitalNearbyReference=Object.freeze({rankNearbyCMS});
if(typeof module!=='undefined')module.exports={initHealthcareMap,validPoint,validDataset,rankNearbyCMS};
})(typeof window!=='undefined'?window:globalThis);
