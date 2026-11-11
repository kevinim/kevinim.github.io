'use strict';
// CFB school-zone *reference* overlay only. Not used by residence assignment.
// AG03 supplies FeatureCollection later via CFBZoneOverlay.setGeoJSON(collection).
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)Object.defineProperty(root,'CFBZoneOverlay',{value:api,writable:false,configurable:false});
})(typeof window!=='undefined'?window:null,function(root){
 const GRADES=new Set(['elementary','middle','high']);
 // Independently approved AG04 source IDs must be reviewed in a separate PR.
 // An incoming "official-verified" property cannot approve its own geometry.
 const APPROVED_SOURCE_IDS=Object.freeze([]);
 const approved=new Set(APPROVED_SOURCE_IDS);
 const BBOX={minLon:-97.5,maxLon:-96.4,minLat:32.5,maxLat:33.4};
 let records=[],layer=null,selected=null,allowDraft=false,invalidCount=0;
 const byId=id=>typeof document!=='undefined'?document.getElementById(id):null;
 const schoolKey=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
 function ringsOf(g){
  if(!g||!['Polygon','MultiPolygon'].includes(g.type))return null;
  if(!Array.isArray(g.coordinates))return null;
  return g.type==='Polygon'?g.coordinates.flatMap(p=>[p]):g.coordinates.flatMap(p=>p);
 }
 function validGeometry(g){
  const rings=ringsOf(g);
  if(!rings||!rings.length||rings.length>100)return false;
  let points=0;
  for(const ring of rings){
   if(!Array.isArray(ring)||ring.length<4)return false;
   points+=ring.length;if(points>12000)return false;
   for(const p of ring){
    if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||
       p[0]<BBOX.minLon||p[0]>BBOX.maxLon||p[1]<BBOX.minLat||p[1]>BBOX.maxLat)return false;
   }
   const a=ring[0],b=ring[ring.length-1];
   if(a[0]!==b[0]||a[1]!==b[1])return false;
  }
  return true;
 }
 function normalize(f){
  if(f?.type!=='Feature'||!validGeometry(f.geometry))return null;
  const p=f.properties||{},year=String(p.schoolYear||'').replace('–','-');
  if(p.district!=='CFB'||!GRADES.has(p.gradeLevel)||!schoolKey(p.school)||
     !['2025-26','2026-27'].includes(year))return null;
  if(!['reconstructed','official-verified'].includes(p.geometryStatus))return null;
  const source=String(p.sourceId||'').trim();
  // Never upgrade draft source based on a self-declared status in GeoJSON.
  const verified=p.geometryStatus==='official-verified'&&approved.has(source);
  return {feature:f,school:schoolKey(p.school),grade:p.gradeLevel,year,
   kind:verified?'verified':'draft',source};
 }
 function clearLayer(){
  if(layer){
   try{layer.clearLayers();const m=typeof map!=='undefined'?map:null;if(m)m.removeLayer(layer)}
   catch(e){/* No map is safer than stale geometry. */}
   layer=null;
  }
 }
 function status(message,kind){
  const el=byId('cfbZoneReferenceStatus');
  if(el){el.textContent=message;el.dataset.state=kind||'unavailable'}
 }
 function setGeoJSON(data){
  clearLayer();selected=null;records=[];invalidCount=0;
  if(!data||data.type!=='FeatureCollection'||!Array.isArray(data.features)||
     data.features.length>120)throw new Error('CFB FeatureCollection 형식 또는 크기 오류');
  const unique=new Set();
  for(const feature of data.features){
   const r=normalize(feature);
   if(!r){invalidCount++;continue}
   const key=[r.school,r.grade,r.year].join('|');
   if(unique.has(key)){invalidCount++;continue}
   unique.add(key);records.push(r);
  }
  status(records.length
   ?'CFB 학교별 지도 경계 '+records.length+'개를 참고 자료로 수신했습니다. 학교를 선택해야 표시됩니다.'
   :'CFB 학교별 확인 가능한 경계가 없습니다. 공식 Finder에서 학교를 확인하세요.',
   'unavailable');
  return Object.freeze({accepted:records.length,rejected:invalidCount,verified:records.filter(x=>x.kind==='verified').length});
 }
 function currentMap(){try{return typeof map!=='undefined'?map:null}catch{return null}}
 function showForSchool(s){
  clearLayer();
  selected=(s&&s.district==='CFB'&&GRADES.has(s.type)&&schoolKey(s.name))?
   {school:schoolKey(s.name),grade:s.type,campus:s}:null;
  if(!selected){status('CFB 초·중·고 학교를 선택하면 연결된 참고 경계를 확인할 수 있습니다.','unavailable');return 'unavailable'}
  const matches=records.filter(r=>r.school===selected.school&&r.grade===selected.grade);
  if(matches.length!==1){
   status(matches.length?'동일 학교 경계가 중복됩니다. 표시를 중단했습니다.':
    '이 학교의 검증된 GIS 경계가 없습니다. 위치 마커만 표시하며 배정은 공식 Finder에서 확인하세요.',
    'unavailable');return 'unavailable';
  }
  const match=matches[0];
  if(match.kind==='draft'&&!allowDraft){
   status('추정 경계는 기본 숨김입니다. 참고용 표시를 직접 허용해야 확인할 수 있으며 실제 배정에 사용할 수 없습니다.','draft-hidden');
   return 'draft-hidden';
  }
  const m=currentMap();
  if(!m||typeof L==='undefined'||typeof L.layerGroup!=='function'){
   status('학교 지도 준비 전입니다. 경계는 표시하지 않았습니다.','unavailable');return 'unavailable';
  }
  try{
   const verified=match.kind==='verified';
   layer=L.layerGroup().addTo(m);
   const polygon=L.geoJSON(match.feature,{interactive:false,style:{
    color:verified?'#16866b':'#df8e22',weight:3,
    dashArray:verified?null:'7 6',
    fillColor:verified?'#5cc8aa':'#f4bc71',fillOpacity:verified?.17:.12
   }}).addTo(layer);
   const bounds=polygon.getBounds();
   if(bounds?.isValid?.())m.fitBounds(bounds,{padding:[30,30],maxZoom:14,animate:false});
   status(verified
    ?'검증 경계 표시 · '+match.year+' · 지도의 학교 경계는 등록 확정이 아닙니다. 공식 Finder에서 주소를 확인하세요.'
    :'재구성 추정 경계 (참고용) · '+match.year+' · GIS 미인증 · 실제 주택 배정과 자동 연결되지 않습니다.',
    verified?'verified':'draft-visible');
   return verified?'verified':'draft-visible';
  }catch(e){
   clearLayer();status('지도 경계 표시 실패. 기존 학교 정보와 공식 Finder는 계속 이용할 수 있습니다.','error');
   return 'error';
  }
 }
 function reset(){
  selected=null;allowDraft=false;clearLayer();
  const checkbox=byId('cfbShowDraftZone');if(checkbox)checkbox.checked=false;
  status('경계 미확인 · 공식 Finder에서 초·중·고 학교를 수동 확인하세요.','unavailable');
 }
 function setDraftVisibility(on){
  allowDraft=on===true;
  const checkbox=byId('cfbShowDraftZone');
  if(checkbox)checkbox.checked=allowDraft;
  if(!allowDraft)clearLayer();
  if(selected?.campus)return showForSchool(selected.campus);
  if(!allowDraft)status('추정 경계 숨김 · 실제 배정은 공식 Finder에서 확인하세요.','draft-hidden');
  return allowDraft;
 }
 function init(){
  const host=byId('cfbOfficialManualBridge');
  if(!host||byId('cfbZoneReferenceControls'))return;
  const wrap=document.createElement('div');wrap.id='cfbZoneReferenceControls';wrap.className='cfb-zone-reference';
  const heading=document.createElement('strong');heading.textContent='학교 경계 · 참고 지도';
  const legend=document.createElement('p');legend.className='cfb-zone-legend';
  legend.textContent='공식 검증: 초록 실선 · 재구성 추정: 주황 점선 · 경계 없음: 마커만';
  const label=document.createElement('label');label.className='cfb-zone-optin';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='cfbShowDraftZone';
  const span=document.createElement('span');span.textContent='미검증 재구성 경계를 참고용으로 표시 (기본 꺼짐)';
  label.append(checkbox,span);
  const info=document.createElement('p');info.id='cfbZoneReferenceStatus';info.className='source';
  info.setAttribute('role','status');info.setAttribute('aria-live','polite');
  wrap.append(heading,legend,label,info);host.appendChild(wrap);
  checkbox.addEventListener('change',()=>setDraftVisibility(checkbox.checked));
  reset();
  byId('homeAddress')?.addEventListener('input',reset);
  byId('homeClear')?.addEventListener('click',reset);
  byId('homeForm')?.addEventListener('submit',reset);
  byId('cfbManualReset')?.addEventListener('click',reset);
  byId('cfbCloseInlineFinder')?.addEventListener('click',reset);
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
 return Object.freeze({setGeoJSON,showForSchool,reset,setDraftVisibility,
  getSummary:()=>Object.freeze({features:records.length,verified:records.filter(x=>x.kind==='verified').length,
    overlayVisible:!!layer,
    rejected:invalidCount,draftVisible:allowDraft,automaticAssignmentApproved:false}),
  validGeometry});
});
