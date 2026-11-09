'use strict';
// No household addresses or geocoding: publisher website -> current ArcGIS Instant
// Lookup configuration -> underlying WebMap and live zone layers. Read only.
// The app's 2026 publish/update dates do NOT certify the vintage of its 24-25
// elementary and 25-26 middle school polygon feature classes.
const fs=require('node:fs'),path=require('node:path');
const DISTRICT_PAGE='https://www.irvingisd.net/departments-services/registration/find-my-assigned-school';
const APP_ID='f27bba7ee02141c58c8c9375431effa2';
const APP_URL='https://iisd1.maps.arcgis.com/apps/instant/lookup/index.html?appid='+APP_ID;
const MAP_ID='8004c79f6dd144b6996e7240c5182507';
const ROOT='https://www.arcgis.com/sharing/rest/content/items/';
const SOURCE_BASE='https://services2.arcgis.com/Onx5StOJQcMhME3n/arcgis/rest/services/';
const SOURCES=Object.freeze({
 elementary:{id:'18dade44172-layer-14',title:'EL_Zones_24_25',url:SOURCE_BASE+'New_EL_Zones_24_25/FeatureServer/4',count:18},
 middle:{id:'195aa532ade-layer-9',title:'MS_Zones_25-26',url:SOURCE_BASE+'ReBound_MS_Zones_v5/FeatureServer/5',count:7},
 high:{id:'HS_Zone_Robust_shapefile_8340',title:'HS_Zone_Robust',count:3,embedded:true}
});
function requireOK(v,msg){if(!v)throw Error(msg);}
function verifyChain(html,app,configuration,mapItem,map){
 requireOK(typeof html==='string'&&html.includes(APP_URL),'district website no longer links exact locator');
 requireOK(app?.id===APP_ID&&app.type==='Web Mapping Application'&&app.access==='public','official locator item no longer public');
 requireOK(mapItem?.id===MAP_ID&&mapItem.type==='Web Map'&&mapItem.access==='public','referenced finder WebMap no longer public');
 requireOK(app.owner==='rzamora_IISD1'&&app.owner===mapItem.owner,'district linked ArcGIS owner changed; manual review');
 requireOK(configuration?.values?.webmap===MAP_ID,'Locator WebMap drift; manual review');
 requireOK(app.modified>=new Date('2026-08-01').getTime()&&mapItem.modified>=new Date('2026-08-01').getTime(),'locator timestamp regression');
 const declared=new Set((configuration.values.zoneLookupLayers?.layers||[]).map(l=>l.id));
 const layers=map?.operationalLayers||[],records={};
 for(const [grade,spec] of Object.entries(SOURCES)){
  requireOK(declared.has(spec.id),'source grade missing from locator lookup list: '+grade);
  const found=layers.filter(l=>l.id===spec.id);
  requireOK(found.length===1,'ambiguous or missing locator map layer: '+grade);
  const l=found[0];
  requireOK(l.title===spec.title,'school layer title changed: '+grade);
  if(spec.embedded){
   const layers=l.featureCollection?.layers;
   requireOK(Array.isArray(layers)&&layers.length===1,'missing embedded high-school polygon');
   const row=layers[0];
   requireOK(row.layerDefinition?.geometryType==='esriGeometryPolygon','high layer not polygons');
   requireOK([3857,102100].includes(row.layerDefinition?.extent?.spatialReference?.wkid),'unknown high source spatial reference');
   const f=row.featureSet?.features||[];
   requireOK(f.length===spec.count,'high school count changed');
   const names=f.map(z=>z.attributes?.NAME);
   requireOK(new Set(names).size===3&&['Irving HS','Macarthur HS','Nimitz HS'].every(x=>names.includes(x)),'high zone schools changed');
   records[grade]={source:'2026 operational finder embedded WebMap',count:f.length,sourceTitle:l.title,originalCrs:'EPSG:3857'};
  }else{
   requireOK(l.url===spec.url,'a different GIS source is in live locator: '+grade);
   records[grade]={source:l.url,sourceTitle:l.title,count:spec.count,academicYearEmbeddedInTitle:grade==='elementary'?'2024-25':'2025-26'};
  }
 }
 return {checkedSource:'Irving district publicly linked live School Locator',districtPage:DISTRICT_PAGE,locatorApp:APP_URL,
  appModifiedUTC:new Date(app.modified).toISOString(),mapModifiedUTC:new Date(mapItem.modified).toISOString(),
  owner:app.owner,webmap:MAP_ID,locatorConfigMatchesSource:true,sourceGeometryReadOnly:true,
  sourceGrades:records,publicResidentialAddressCrosschecked:false,liveBrowserSearchSuccessful:false,
  currentYearGisCertified:false,automatedHomeAssignmentCertified:false,derivativeDataReuseGranted:false,
  safeUserAction:'open current district-linked official School Locator',productionZoneLoaderAllowed:false,
  releaseState:'NO_GO_AUTOMATED_ASSIGNMENT__OFFICIAL_LOCATOR_HANDOFF_READY'};
}
async function getJson(url){
 const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('ArcGIS status '+r.status);
 const j=await r.json();
 if(j.error)throw Error('ArcGIS error '+j.error.code);
 return j;
}
async function run(){
 const [p,a,c,m,d]=await Promise.all([
  fetch(DISTRICT_PAGE,{signal:AbortSignal.timeout(30000)}).then(r=>{requireOK(r.ok,'official district landing unavailable');return r.text()}),
  getJson(ROOT+APP_ID+'?f=json'),getJson(ROOT+APP_ID+'/data?f=json'),
  getJson(ROOT+MAP_ID+'?f=json'),getJson(ROOT+MAP_ID+'/data?f=json')
 ]);
 const report=verifyChain(p,a,c,m,d);
 // No addresses, polygon geometry, secrets, or school-side data copied into repo.
 const out=path.join('artifacts','agent01-irving-live-finder');
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'locator-provenance.json'),JSON.stringify({...report,checkedAtUTC:new Date().toISOString()},null,2)+'\n');
 console.log('DISTRICT-LINKED LOCATOR SOURCE VERIFIED, NOT 2026-27 CERTIFIED: '+JSON.stringify({
  appModifiedUTC:report.appModifiedUTC,mapModifiedUTC:report.mapModifiedUTC,
  grades:Object.keys(report.sourceGrades),finderCurrent:true,schoolYearCertified:false}));
}
if(require.main===module)run().catch(e=>{console.error('OFFICIAL FINDER CHAIN NO_GO',e.message);process.exitCode=1});
module.exports={SOURCES,APP_URL,APP_ID,MAP_ID,DISTRICT_PAGE,verifyChain};
