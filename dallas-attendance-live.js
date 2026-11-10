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

function inside(point,geom){
 const polygons=geom?.type==='Polygon'?[geom.coordinates]:geom?.type==='MultiPolygon'?geom.coordinates:[];
 function ringHas(ring){
  let inside=false;const [x,y]=point;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];
   if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
  }
  return inside;
 }
 return polygons.some(poly=>Array.isArray(poly)&&poly.length&&ringHas(poly[0])&&!poly.slice(1).some(ringHas));
}
function pointQuery(spec,[lon,lat]){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon<=-97.55||lon>=-96.3||lat<=32.35||lat>=33.25)
  throw Error('Dallas reference point out of supported geographic bounds');
 const u=new URL(sourceUrl(spec)+'/query');
 const params={where:'1=1',geometry:lon+','+lat,geometryType:'esriGeometryPoint',
  spatialRel:'esriSpatialRelIntersects',inSR:'4326',outSR:'4326',
  outFields:spec.nameField+','+spec.campusField,returnGeometry:'true',f:'geojson'};
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 return u.toString();
}
async function lookup(point,signal,fetchImpl=fetch){
 if(!Array.isArray(point)||point.length!==2)throw Error('missing Dallas reference point');
 if(signal?.aborted)throw Error('Dallas lookup cancelled');
 const [lon,lat]=point;
 // Coordinates are sent to publisher only after an explicit user click, never a typed address.
 const query=(url,opts={})=>fetchImpl(url,{...opts,signal,cache:'no-store'});
 const records=await Promise.all(SOURCES.map(async spec=>{
  const meta=await getJSON(sourceUrl(spec)+'?f=pjson',query);
  if(meta.type!=='Feature Layer'||meta.geometryType!=='esriGeometryPolygon'||
   !meta.fields?.some(f=>f.name===spec.nameField)||
   !meta.fields?.some(f=>f.name===spec.campusField)||
   !meta.capabilities?.includes('Query'))throw Error('Dallas source changed '+spec.level);
  const edited=meta.editingInfo?.lastEditDate??meta.lastEditDate;
  if(!Number.isFinite(edited)||edited<Date.UTC(2026,6,1))
   throw Error('Dallas publisher map year unconfirmed '+spec.level);
  const geo=await getJSON(pointQuery(spec,point),query);
  if(geo.type!=='FeatureCollection'||!Array.isArray(geo.features)||geo.features.length!==1||
   geo.exceededTransferLimit===true)throw Error('Ambiguous Dallas reference source '+spec.level);
  const feature=normalizeFeature(geo.features[0],spec);
  if(!inside(point,feature.geometry))throw Error('Dallas polygon does not include the inspected point '+spec.level);
  return {...feature,properties:{...feature.properties,sourceYearVerified:false,schoolYear:null,
   sourceVintage:'GIS modified '+new Date(edited).toISOString().slice(0,10)+'; school year not certified'}};
 }));
 if(new Set(records.map(f=>f.properties.gradeLevel)).size!==3)throw Error('Incomplete Dallas reference source');
 return {status:'publisher-reference-only',yearCertified:false,addressAssignmentCertified:false,
  features:records,names:Object.fromEntries(records.map(f=>[f.properties.gradeLevel,f.properties.school])),
  officialFinder:'https://www.dallasisd.org/departments/demographic-studies/find-your-school/schoolsite-locator-interactive-map'};
}
function compareReportedSchool(result,{gradeLevel,schoolName,schoolYear}={}){
 const safe={kind:'dallas',yearCertified:false,independentlyVerified:false,productionAssignmentApproved:false};
 if(result?.status!=='ready'||!result.names)return {...safe,status:'no-source',message:'Dallas 참고 GIS를 먼저 조회하세요.'};
 if(!['elementary','middle','high'].includes(gradeLevel)||!String(schoolName||'').trim())
  return {...safe,status:'missing-input',message:'학년과 공식 Finder의 학교명을 직접 입력하세요.'};
 if(schoolYear!=='2026–27')return {...safe,status:'year-unconfirmed',message:'공식 Finder 학년도가 인증되지 않았습니다.'};
 const key=x=>String(x||'').toUpperCase().replace(/\b(ELEMENTARY|MIDDLE|HIGH|SCHOOL|ES|MS|HS)\b/g,'').replace(/[^A-Z0-9]/g,'');
 const expected=key(result.names[gradeLevel]),actual=key(schoolName);
 const same=!!expected&&expected===actual;
 return {...safe,status:same?'manual-match':'manual-mismatch',
  message:same?'직접 입력한 학교명과 참고 GIS가 일치합니다. 독립 공식 조회 및 현행 배정 인증이 아닙니다.':
   '입력한 공식 학교명과 참고 GIS가 다릅니다. 반드시 Dallas ISD SchoolSite Locator에서 확인하세요.'};
}

const api=Object.freeze({SOURCES,PREFIX,sourceUrl,shapeValid,normalizeFeature,buildQuery,load,inside,pointQuery,lookup,compareReportedSchool});
if(typeof module!=='undefined')module.exports=api;
if(typeof window!=='undefined')window.DallasAttendanceLive=api;
