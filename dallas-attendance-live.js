'use strict';
// Public publisher-supplied Dallas ISD GIS only. No residential point queries or writes.
const HOST='https://services.arcgis.com/RfrtTbYxQ8YIhjWT/ArcGIS/rest/services';
const SOURCES=Object.freeze([
 Object.freeze({level:'elementary',service:'Elementary_Attendance_Boundaries',nameField:'ELEM_DESC',campusField:'SLN',minFeatures:80}),
 Object.freeze({level:'middle',service:'Middle_Attendance_Boundaries',nameField:'MIDDLE',campusField:'MID_SLN',minFeatures:12}),
 Object.freeze({level:'high',service:'High_Attendance_Boundaries',nameField:'HIGH',campusField:'HIGH_SLN',minFeatures:10})
]);
const PREFIX='057905';
function sourceUrl(spec){return HOST+'/'+spec.service+'/FeatureServer/0'}
async function getJSON(url,fetchImpl){
 const r=await fetchImpl(url,{cache:'no-store'});
 if(!r.ok)throw Error('Dallas ArcGIS source HTTP '+r.status);
 const j=await r.json();
 if(j.error)throw Error('Dallas ArcGIS source error '+j.error.code);
 return j;
}
function shapeValid(feature){
 if(feature?.type!=='Feature'||!['Polygon','MultiPolygon'].includes(feature.geometry?.type))return false;
 const polys=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 if(!Array.isArray(polys)||!polys.length)return false;
 return polys.every(poly=>Array.isArray(poly)&&poly.length>0&&poly.every(ring=>
  Array.isArray(ring)&&ring.length>=4&&ring.every(pt=>
   Array.isArray(pt)&&pt.length>=2&&Number.isFinite(pt[0])&&Number.isFinite(pt[1])&&
   pt[0]>-98&&pt[0]<-96&&pt[1]>32&&pt[1]<34)));
}
function normalizeFeature(f,spec){
 if(!shapeValid(f))throw Error('invalid_dallas_polygon_'+spec.level);
 const p=f.properties||{};
 const name=String(p[spec.nameField]||'').trim();
 const sln=Number(p[spec.campusField]);
 if(!name||name.length>100||!Number.isInteger(sln)||sln<1||sln>999)
  throw Error('invalid_dallas_campus_name_or_code_'+spec.level);
 return {type:'Feature',properties:{
  school:name,gradeLevel:spec.level,campusId:PREFIX+String(sln).padStart(3,'0'),
  sourceVintage:'GIS last edited July 22 2026; campus-year independently unverified',
  sourceDistrict:PREFIX,sourceEvidence:'publisher public GIS, not certified address assignment'
 },geometry:f.geometry};
}
function buildQuery(spec,limit=2000){
 const u=new URL(sourceUrl(spec)+'/query');
 u.searchParams.set('where','1=1');
 u.searchParams.set('outFields',spec.campusField+','+spec.nameField);
 u.searchParams.set('returnGeometry','true');
 u.searchParams.set('outSR','4326');
 u.searchParams.set('f','geojson');
 u.searchParams.set('resultRecordCount',String(limit));
 return u.toString();
}
async function load(fetchImpl=fetch){
 if(typeof fetchImpl!=='function')throw Error('missing_fetch');
 const all=[],summary=[];
 for(const spec of SOURCES){
  const base=sourceUrl(spec);
  const meta=await getJSON(base+'?f=pjson',fetchImpl);
  if(meta.type!=='Feature Layer'||meta.geometryType!=='esriGeometryPolygon'||
   !meta.fields?.some(f=>f.name===spec.nameField)||
   !meta.fields?.some(f=>f.name===spec.campusField)||
   !meta.advancedQueryCapabilities||meta.capabilities?.indexOf('Query')===-1)
   throw Error('unexpected_dallas_source_schema_'+spec.level);
  // Last edit is in 2026, but this alone does not prove 2026-27 campus boundaries.
  const edited=meta.editingInfo?.lastEditDate??meta.lastEditDate;
  if(!Number.isFinite(edited)||edited<Date.UTC(2026,6,1))
   throw Error('dallas_source_vintage_unverified_'+spec.level);
  const geo=await getJSON(buildQuery(spec),fetchImpl);
  if(geo.type!=='FeatureCollection'||!Array.isArray(geo.features)||
   geo.features.length<spec.minFeatures||geo.features.length>1800||
   geo.exceededTransferLimit===true)
   throw Error('dallas_campus_count_unexpected_'+spec.level);
  const groups=geo.features.map(f=>normalizeFeature(f,spec));
  const keys=new Set(groups.map(f=>f.properties.campusId));
  if(keys.size<Math.min(spec.minFeatures,groups.length)*.7)
   throw Error('dallas_campus_codes_nonunique_'+spec.level);
  summary.push({level:spec.level,featureCount:groups.length,distinctCampuses:keys.size,
   lastEditUTC:new Date(edited).toISOString(),officialService:base,
   campusYearConfirmed:false,independentAddressAssignmentChecked:false});
  all.push(...groups);
 }
 return {features:all,summary,sourceYearVerified:false};
}
const api=Object.freeze({SOURCES,PREFIX,sourceUrl,shapeValid,normalizeFeature,buildQuery,load});
if(typeof module!=='undefined')module.exports=api;
if(typeof window!=='undefined')window.DallasAttendanceLive=api;
