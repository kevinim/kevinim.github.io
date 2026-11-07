'use strict';
// Official live FEMA NFHL layer 28, NOT NRI modeled tract risk.
// This is contextual flood-zone visualization, not an effective FIRMs panel,
// Letter of Map Change, individual parcel evaluation, or insurance decision.
const NFHL_LAYER_ENDPOINT='https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';
const NFHL_SERVICE_PAGE='https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28';
const NFHL_WHERE="SFHA_TF = 'T' OR (FLD_ZONE = 'X' AND (ZONE_SUBTY LIKE '%0.2 PCT%' OR ZONE_SUBTY LIKE '%0.2 PERCENT%'))";
const NFHL_MAX_RECORDS=1000;
const NFHL_MIN_ZOOM=14;
function nfhlClassify(feature){
 const p=feature?.properties||{};
 const flag=String(p.SFHA_TF??'').trim().toUpperCase();
 const zone=String(p.FLD_ZONE??'').trim().toUpperCase();
 const subtype=String(p.ZONE_SUBTY??'').toUpperCase();
 if(flag==='T'&&['A','AE','AH','AO','AR','A99','V','VE'].includes(zone))
  return {kind:'sfha',label:'고위험 · 1% 연간 범람 가능성 구역(SFHA)',color:'#b91c1c'};
 if(zone==='X'&&/0\.2\s*(?:PCT|PERCENT)/.test(subtype))
  return {kind:'moderate',label:'중간 · 0.2% 연간 범람 가능성 구역',color:'#ffabab'};
 // Unknown/unmapped/other records get no fill; never imply low risk.
 return {kind:'none',label:'이 유형은 색칠하지 않음',color:null};
}
function nfhlLayerStyle(feature){
 const info=nfhlClassify(feature),paint=info.kind!=='none';
 return {pane:'nfhlFloodPane',color:paint?'#aa3030':'transparent',
  weight:paint?.5:0,opacity:paint?.8:0,
  fillColor:info.color||'transparent',fillOpacity:paint?.53:0,
  interactive:paint};
}
function validateNfhlResponse(data){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.error)return false;
 if(data.features.length>=NFHL_MAX_RECORDS||data.exceededTransferLimit)return false;
 return data.features.every(f=>{
  if(!f?.properties||!f?.geometry||!['Polygon','MultiPolygon'].includes(f.geometry.type))return false;
  return typeof f.properties.FLD_ZONE==='string'||typeof f.properties.SFHA_TF==='string';
 });
}
function nfhlQueryUrl(bounds){
 if(!bounds||![bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].every(Number.isFinite))
  throw Error('Invalid map bounds');
 const params=new URLSearchParams({f:'geojson',where:NFHL_WHERE,
  geometry:[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].map(v=>v.toFixed(6)).join(','),
  geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',
  outSR:'4326',outFields:'FLD_ZONE,ZONE_SUBTY,SFHA_TF,DFIRM_ID',
  returnGeometry:'true',geometryPrecision:'5',maxAllowableOffset:'0.00007',
  resultRecordCount:String(NFHL_MAX_RECORDS)});
 return NFHL_LAYER_ENDPOINT+'?'+params;
}
function createNFHLFloodOverlay(map,documentRef){
 const d=documentRef||document;
 const enabled=d.getElementById('nfhlEnabled');
 const status=d.getElementById('nfhlStatus');
 const legend=d.getElementById('nfhlLegend');
 const zip=d.getElementById('zipOverlay');
 const nri=d.getElementById('femaHazardEnabled');
 if(!map||!enabled||!status||!legend)return null;
 let layer=null,ctrl=null,seq=0,savedZip=null,lastKey=null;
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const statusText=(str,warning=false)=>{status.textContent=str;status.dataset.state=warning?'warning':'ready'};
 const popup=feature=>{
  const p=feature.properties||{},classification=nfhlClassify(feature);
  return '<div class="fema-popup"><strong>FEMA NFHL 홍수구역</strong>'+
   '<div>위험 유형: <b>'+safe(classification.label)+'</b></div>'+
   '<div>공식 Zone: '+safe(p.FLD_ZONE||'미확인')+'</div>'+
   '<div>세부구분: '+safe(p.ZONE_SUBTY||'별도 없음')+'</div>'+
   '<small>FEMA 공개 NFHL 지도 레이어 · 실제 건물·대출·보험 판정은 FEMA MSC의 유효 Flood Insurance Rate Map(FIRM)과 관련 기관에서 확인하세요.</small></div>';
 };
 function remove(){
  if(ctrl)ctrl.abort();
  ctrl=null;
  if(layer&&map.hasLayer(layer))map.removeLayer(layer);
  lastKey=null;
 }
 function restore(){
  if(savedZip!==null&&zip){zip.checked=savedZip;zip.dispatchEvent(new Event('change'));savedZip=null}
 }
 async function refresh(){
  const request=++seq;
  if(!enabled.checked){remove();restore();statusText('공식 NFHL 레이어 꺼짐');legend.hidden=true;return}
  legend.hidden=false;
  if(nri?.checked){nri.checked=false;nri.dispatchEvent(new Event('change'))}
  if(savedZip===null&&zip){
   savedZip=zip.checked;
   if(zip.checked){zip.checked=false;zip.dispatchEvent(new Event('change'))}
  }
  if(map.getZoom()<NFHL_MIN_ZOOM){
   remove();statusText('FEMA NFHL은 상세 홍수구역 지도입니다. 지도를 확대해 줌 '+NFHL_MIN_ZOOM+' 이상에서 표시합니다.');return;
  }
  const b=map.getBounds();
  if(!b.isValid()){remove();statusText('지도의 좌표를 확인하지 못했습니다.',true);return}
  const key=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(x=>x.toFixed(4)).join(',');
  if(key===lastKey&&layer&&map.hasLayer(layer))return;
  if(ctrl)ctrl.abort();
  const current=new AbortController();ctrl=current;
  if(layer&&map.hasLayer(layer))map.removeLayer(layer);
  statusText('FEMA 공식 NFHL 홍수구역을 조회하는 중…');
  try{
   const response=await fetch(nfhlQueryUrl(b),{signal:current.signal,cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const geo=await response.json();
   if(!validateNfhlResponse(geo))throw Error('공식 NFHL 응답 오류·초과건수 또는 자료 유효성 검증 실패');
   if(request!==seq||!enabled.checked)return;
   if(!map.getPane('nfhlFloodPane')){map.createPane('nfhlFloodPane');map.getPane('nfhlFloodPane').style.zIndex='395'}
   const selected=geo.features.filter(f=>nfhlClassify(f).kind!=='none');
   if(layer)layer.clearLayers();
   else layer=L.geoJSON(null,{pane:'nfhlFloodPane',style:nfhlLayerStyle,
    onEachFeature:(f,l)=>l.bindPopup(popup(f),{maxWidth:295})});
   if(selected.length)layer.addData({type:'FeatureCollection',features:selected});
   if(!map.hasLayer(layer))layer.addTo(map);
   lastKey=key;
   statusText('FEMA NFHL 공식 실시간 조회 · '+selected.length+'개 홍수구역 도형 · 줌 '+map.getZoom()+
    ' · 이 화면에서 보이지 않는다고 홍수 위험이 없다는 뜻은 아닙니다.');
  }catch(error){
   if(error?.name==='AbortError')return;
   if(request!==seq||!enabled.checked)return;
   console.warn('FEMA NFHL map query:',error);
   remove();statusText('공식 NFHL 홍수구역 조회에 실패했습니다. 더 확대하거나 FEMA Map Service Center에서 확인하세요.',true);
  }
 }
 enabled.addEventListener('change',refresh);
 map.on('moveend',()=>{if(enabled.checked)refresh()});
 legend.hidden=true;
 statusText('지도를 확대한 뒤 켜면 현재 지도 범위의 FEMA NFHL 홍수구역을 조회합니다.');
 return {refresh,disable:()=>{enabled.checked=false;return refresh()},count:()=>layer?.getLayers().length||0};
}
if(typeof module!=='undefined')module.exports={NFHL_LAYER_ENDPOINT,NFHL_WHERE,NFHL_MAX_RECORDS,NFHL_MIN_ZOOM,nfhlClassify,nfhlLayerStyle,validateNfhlResponse,nfhlQueryUrl};
if(typeof window!=='undefined')window.createNFHLFloodOverlay=createNFHLFloodOverlay;
