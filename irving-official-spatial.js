'use strict';
// Read-only, opt-in browser-side query of the operational Irving ISD Locator GIS.
// Never labels 2024-25 elementary / 2025-26 middle / undated HS as certified
// 2026-27; no full address or personal data is transmitted or persisted.
(function(root){
 const MAP='8004c79f6dd144b6996e7240c5182507';
 const MAP_URL='https://iisd1.maps.arcgis.com/sharing/rest/content/items/'+MAP+'/data?f=json';
 const SOURCE_BASE='https://services2.arcgis.com/Onx5StOJQcMhME3n/arcgis/rest/services/';
 const SOURCES=Object.freeze({
  elementary:{id:'18dade44172-layer-14',title:'EL_Zones_24_25',url:SOURCE_BASE+'New_EL_Zones_24_25/FeatureServer/4'},
  middle:{id:'195aa532ade-layer-9',title:'MS_Zones_25-26',url:SOURCE_BASE+'ReBound_MS_Zones_v5/FeatureServer/5'},
  high:{id:'HS_Zone_Robust_shapefile_8340',title:'HS_Zone_Robust'}
 });
 const R=6378137;
 function required(ok,message){if(!ok)throw Error(message)}
 function wgs84([x,y]){
  required(Number.isFinite(x)&&Number.isFinite(y)&&x>-10850000&&x<-10750000&&y>3800000&&y<4000000,'Irving GIS CRS/bounds error');
  return [x/R*180/Math.PI,(2*Math.atan(Math.exp(y/R))-Math.PI/2)*180/Math.PI];
 }
 function wmPoint([lon,lat]){
  required(Number.isFinite(lon)&&Number.isFinite(lat)&&lon>-97.6&&lon<-96.5&&lat>32.3&&lat<33.4,'outside validated Irving GIS bounds');
  return [lon*R*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
 }
 function ringContains(point,ring){
  let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const [xi,yi]=ring[i],[xj,yj]=ring[j];
   if((yi>point[1])!==(yj>point[1]) && point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi)inside=!inside;
  }return inside;
 }
 function polygonContains(point,geometry){
  const polygons=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.some(rings=>rings.length&&ringContains(point,rings[0])&&!rings.slice(1).some(r=>ringContains(point,r)));
 }
 function decodeHighLayer(map,point){
  const row=(map?.operationalLayers||[]).filter(l=>l.id===SOURCES.high.id&&l.title===SOURCES.high.title);
  required(row.length===1,'official high-school source changed');
  const raw=row[0].featureCollection?.layers?.[0];
  required(raw?.layerDefinition?.geometryType==='esriGeometryPolygon'&&[3857,102100].includes(raw.layerDefinition.extent?.spatialReference?.wkid),'official high-school embedded layer invalid');
  const features=raw.featureSet?.features||[];
  required(features.length===3,'official high-school source count changed');
  const names=features.map(f=>f.attributes?.NAME);
  required(['Irving HS','Macarthur HS','Nimitz HS'].every(name=>names.includes(name))&&new Set(names).size===3,'official high-school names changed');
  const list=features.map(f=>{
   const rings=f.geometry?.rings;
   required(Array.isArray(rings)&&rings.length===1&&rings[0].length>=4,'unsupported high-school ring topology');
   const ring=rings[0].map(wgs84);
   required(ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1],'high-school polygon unclosed');
   return {type:'Feature',properties:{school:f.attributes.NAME,gradeLevel:'high',schoolYear:null,
    sourceYearVerified:false,sourceVintage:'unknown (webmap 2026; geometry historic)'},
    geometry:{type:'Polygon',coordinates:[ring]}};
  });
  const matches=list.filter(x=>polygonContains(point,x.geometry));
  required(matches.length===1,'high-school location is outside/ambiguous in current publisher GIS');
  return matches[0];
 }
 function validateMap(map){
  const list=map?.operationalLayers||[];
  for(const [grade,spec] of Object.entries(SOURCES)){
   const rows=list.filter(x=>x.id===spec.id&&x.title===spec.title);
   required(rows.length===1,'live Irving '+grade+' source missing/mismatched');
   if(spec.url)required(rows[0].url===spec.url,'live Irving '+grade+' source URL drift');
  }
  return true;
 }
 async function json(url,signal){
  const response=await fetch(url,{signal,cache:'no-store',headers:{Accept:'application/json'}});
  required(response.ok,'publisher GIS HTTP '+response.status);
  const j=await response.json();required(j&&!j.error,'publisher GIS error');
  return j;
 }
 function queryUrl(spec,point){
  const u=new URL(spec.url+'/query');
  for(const [key,value] of Object.entries({f:'geojson',where:'1=1',geometry:point.join(','),
   geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',
   outSR:'4326',outFields:'NAME',returnGeometry:'true'}))u.searchParams.set(key,value);
  return u.toString();
 }
 async function lookup(point,signal){
  required(Array.isArray(point)&&point.length===2,'no GIS coordinates');
  const [lon,lat]=point;wmPoint(point);
  // Fetch the live district WebMap, not a cached local copy. This guards
  // against changed or removed layers before any attendance-zone lookup.
  const map=await json(MAP_URL,signal);validateMap(map);
  const [el,ms]=await Promise.all(['elementary','middle'].map(grade=>json(queryUrl(SOURCES[grade],point),signal)));
  function one(fc,grade,vintage){
   required(fc?.type==='FeatureCollection'&&Array.isArray(fc.features),'unexpected official '+grade+' GIS result');
   const features=fc.features.filter(f=>f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type));
   required(features.length===1,'official '+grade+' GIS returned '+features.length+' matching zones');
   const f=features[0],school=f.properties?.NAME;
   required(typeof school==='string'&&school.length>2&&school.length<100,'official GIS school name absent');
   required(polygonContains(point,f.geometry),'returned GIS polygon does not contain requested point');
   return {type:'Feature',geometry:f.geometry,properties:{school,gradeLevel:grade,
    schoolYear:null,sourceYearVerified:false,sourceVintage:vintage}};
  }
  const features=[one(el,'elementary','2024-25 layer'),one(ms,'middle','2025-26 layer'),decodeHighLayer(map,point)];
  required(new Set(features.map(f=>f.properties.gradeLevel)).size===3,'grade match incomplete');
  return {status:'publisher-live-reference-only',yearCertified:false,addressAssignmentCertified:false,
   officialFinder:'https://iisd1.maps.arcgis.com/apps/instant/lookup/index.html?appid=f27bba7ee02141c58c8c9375431effa2',
   features,names:Object.fromEntries(features.map(f=>[f.properties.gradeLevel,f.properties.school]))};
 }
 const api=Object.freeze({lookup,validateMap,decodeHighLayer,polygonContains,wmPoint,wgs84,queryUrl,SOURCES,MAP_URL});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.IrvingOfficialSpatial=api;
})(typeof window!=='undefined'?window:null);
