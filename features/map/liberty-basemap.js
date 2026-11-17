/* Liberty vector basemap adapter for the existing Leaflet school/GIS map.
 * Loads pinned MapLibre v5 + MapLibre/Leaflet UMD only when Liberty is requested.
 * Never replaces, redraws, or reprojects campus, home, boundary or hazard layers.
 * On any failed dependency/style load, the caller keeps its existing OSM fallback.
 */
(function(root){
 'use strict';
 const STYLE='https://tiles.openfreemap.org/styles/liberty';
 const JS='https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.js';
 const CSS='https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.css';
 const LEAFLET='https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js';
 const DEPENDENCY_TIMEOUT=15000;
 const STYLE_TIMEOUT=18000;
 let dependencies;
 function attach(tag,url){
  return new Promise((resolve,reject)=>{
   let timer;
   const element=document.createElement(tag);
   const cleanup=()=>{clearTimeout(timer);element.onload=null;element.onerror=null};
   const fail=()=>{cleanup();element.remove();reject(new Error('Liberty resource unavailable'))};
   element.onload=()=>{cleanup();resolve()};
   element.onerror=fail;
   if(tag==='script'){element.src=url;element.async=true;element.crossOrigin='anonymous'}
   else{element.rel='stylesheet';element.href=url;element.crossOrigin='anonymous'}
   timer=setTimeout(fail,DEPENDENCY_TIMEOUT);
   document.head.appendChild(element);
  });
 }
 function ensureLoaded(){
  if(root.L?.maplibreGL&&root.maplibregl)return Promise.resolve();
  if(!dependencies){
   dependencies=Promise.all([
    attach('link',CSS),
    (async()=>{
     if(!root.maplibregl)await attach('script',JS);
     if(!root.L?.maplibreGL)await attach('script',LEAFLET);
    })()
   ]).then(()=>{
    if(!root.maplibregl||typeof root.L?.maplibreGL!=='function')
     throw new Error('Liberty map adapter missing');
   }).catch(error=>{dependencies=null;throw error});
  }
  return dependencies;
 }
 async function create(map){
  if(!map||!root.L)throw new Error('Leaflet map unavailable');
  await ensureLoaded();
  let layer=null;
  try{
   layer=root.L.maplibreGL({style:STYLE,interactive:false});
   layer.addTo(map);
   const gl=layer.getMaplibreMap?.();
   if(!gl)throw new Error('Liberty WebGL map unavailable');
   await new Promise((resolve,reject)=>{
    let ended=false,timer;
    const done=(error)=>{
     if(ended)return;ended=true;clearTimeout(timer);
     gl.off?.('load',onLoad);gl.off?.('error',onError);
     if(error)reject(error);else resolve();
    };
    const onLoad=()=>done();
    const onError=event=>done(new Error('Liberty style failed: '+String(event?.error?.message||'request error')));
    gl.on('load',onLoad);gl.on('error',onError);
    timer=setTimeout(()=>done(new Error('Liberty style timeout')),STYLE_TIMEOUT);
    if(gl.loaded?.())done();
   });
   return layer;
  }catch(error){
   if(layer&&map.hasLayer?.(layer))map.removeLayer(layer);
   throw error;
  }
 }
 root.TXLibertyBasemap=Object.freeze({create,styleUrl:STYLE});
})(window);
