'use strict';
// TxWRAP official Wildfire Hazard Potential raster (WildEST model).
// NOT a history of ignitions, a live fire map, or a parcel-specific safety claim.
// ArcGIS MapServer is a native Web Mercator fused cache, served on demand only.
const TXWRAP_WHP_TILES='https://gis.texaswildfirerisk.com/server/rest/services/TxWRAP/wildfire_hazard_potential/MapServer/tile/{z}/{y}/{x}';
const TXWRAP_WHP_SERVICE='https://gis.texaswildfirerisk.com/server/rest/services/TxWRAP/wildfire_hazard_potential/MapServer';
const TXWRAP_WHP_EXPLAINER='https://tfsweb.tamu.edu/wildfire-and-other-disasters/burn-bans-and-information/wildfire-risk/';
const TXWRAP_WHP_MAX_NATIVE_ZOOM=17;

function createTxWrapWHPOverlay(map,documentRef){
 const doc=documentRef||document;
 const toggle=doc.getElementById('txwrapWHPEnabled');
 const status=doc.getElementById('txwrapWHPStatus');
 const legend=doc.getElementById('txwrapWHPLegend');
 const opacityControl=doc.getElementById('txwrapWHPOpacity');
 const zip=doc.getElementById('zipOverlay');
 const nri=doc.getElementById('femaHazardEnabled');
 const nfhl=doc.getElementById('nfhlEnabled');
 if(!map||!toggle||!status||!legend||!opacityControl)return null;
 let layer=null,savedZip=null,received=0,errored=0;
 const setStatus=(message,error=false)=>{
  status.textContent=message;
  status.dataset.state=error?'warning':'ready';
 };
 const opacity=()=>Math.max(.25,Math.min(.85,Number(opacityControl.value)/100||.55));
 function restoreZip(){
  if(savedZip!==null&&zip){
   zip.checked=savedZip;
   zip.dispatchEvent(new Event('change'));
   savedZip=null;
  }
 }
 function disable(message,failed=false){
  if(layer&&map.hasLayer(layer))map.removeLayer(layer);
  toggle.checked=false;
  restoreZip();
  legend.hidden=true;
  setStatus(message||'TxWRAP 산불 위험잠재력 레이어 꺼짐',failed);
 }
 function onTileError(){
  if(!toggle.checked)return;
  errored++;
  // Never leave a partially loaded raster visible as if the whole area was covered.
  disable('공식 TxWRAP 산불 위험잠재력 지도 타일을 모두 확인할 수 없어 표시하지 않습니다. 공식 TxWRAP 사이트에서 확인하세요.',true);
 }
 function onTileLoad(){
  if(!toggle.checked)return;
  received++;
  if(errored===0)setStatus('Texas A&M Forest Service 공식 TxWRAP WHP · 지도 타일 '+received+
   '개 로딩 확인 · 산불 장기 위험잠재력 모델이며 현재 화재 위치나 개별 주택 안전 판정이 아닙니다.');
 }
 function onChange(){
  if(!toggle.checked){disable();return}
  // Hazard layers use different units; never mix their color scales.
  if(nri?.checked){nri.checked=false;nri.dispatchEvent(new Event('change'))}
  if(nfhl?.checked){nfhl.checked=false;nfhl.dispatchEvent(new Event('change'))}
  if(savedZip===null&&zip){
   savedZip=zip.checked;
   if(zip.checked){zip.checked=false;zip.dispatchEvent(new Event('change'))}
  }
  if(!map.getPane('txwrapWHPPane')){
   map.createPane('txwrapWHPPane');
   const pane=map.getPane('txwrapWHPPane');
   pane.style.zIndex='392';
   pane.style.pointerEvents='none';
  }
  if(!layer){
   layer=L.tileLayer(TXWRAP_WHP_TILES,{
    pane:'txwrapWHPPane',minZoom:6,maxZoom:18,maxNativeZoom:TXWRAP_WHP_MAX_NATIVE_ZOOM,
    opacity:opacity(),tileSize:256,attribution:'Wildfire Hazard Potential © Texas A&M Forest Service / TxWRAP'
   });
   layer.on('tileload',onTileLoad);
   layer.on('tileerror',onTileError);
  }
  errored=0;received=0;
  layer.setOpacity(opacity());
  legend.hidden=false;
  setStatus('TxWRAP 공식 산불 위험잠재력 지도 타일을 불러오는 중…');
  if(!map.hasLayer(layer))layer.addTo(map);
 }
 toggle.addEventListener('change',onChange);
 opacityControl.addEventListener('input',()=>{if(layer)layer.setOpacity(opacity())});
 legend.hidden=true;
 setStatus('선택 시 공식 TxWRAP 산불 위험잠재력 지도를 불러옵니다.');
 return {setEnabled:onChange,disable:()=>disable(),getLoadedTileCount:()=>received};
}
if(typeof module!=='undefined')module.exports={TXWRAP_WHP_TILES,TXWRAP_WHP_SERVICE,TXWRAP_WHP_EXPLAINER,TXWRAP_WHP_MAX_NATIVE_ZOOM};
if(typeof window!=='undefined')window.createTxWrapWHPOverlay=createTxWrapWHPOverlay;
