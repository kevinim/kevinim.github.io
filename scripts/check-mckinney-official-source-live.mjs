#!/usr/bin/env node
// McKinney public official source-year/name crosscheck. No residential addresses.
// Optional live network QA; NEVER certifies a house-to-enrollment assignment.
import {readFileSync} from 'node:fs';
const adopted=JSON.parse(readFileSync(new URL('../data/mckinney-2026-27-adopted-map-names.json',import.meta.url),'utf8'));
const METRO='https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/23b28d101ba947498650f6c7b9ef251b/data?f=json';
const ADOPTED='https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/4789/Misd/2b4531ec-510a-479a-b82f-d550714c8565/McKinney_ISD_Attendance_Zones_26_27.html?disposition=inline';
const layers=[['Elementary Boundaries','ELEM_NAME','elementary'],['Middle Boundaries','MID_NAME','middle'],['High Boundaries','HIGH_NAME','high']];
const normal=s=>String(s||'').toUpperCase()
 .replace(/\b(?:ELEMENTARY|ELEM|EL|MIDDLE|MID|HIGH|SCHOOL|HS|MS)\b/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
async function read(url,accept){
 const controller=new AbortController(),time=setTimeout(()=>controller.abort(),18000);
 try{
  const r=await fetch(url,{signal:controller.signal,headers:{accept},redirect:'follow'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const body=await r.text();
  if(body.length<1000||body.length>25_000_000)throw Error('Unexpected source size');
  return body;
 }finally{clearTimeout(time)}
}
let map,html;
try{
 [map,html]=await Promise.all([
  read(METRO,'application/json').then(JSON.parse),
  read(ADOPTED,'text/html')
 ]);
}catch(e){console.error('MCKINNEY_SOURCE_LIVE_NO_GO: official source unavailable: '+String(e?.message||e));process.exit(1)}
if(!Array.isArray(map?.operationalLayers)||!html.includes('McKinney ISD Attendance Zones')){
 console.error('MCKINNEY_SOURCE_LIVE_NO_GO: unknown official source format');process.exit(1)
}
const names=Object.create(null),years=Object.create(null),matches=Object.create(null);
const flatHtml=html.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').toUpperCase();
for(const [layerTitle,field,level] of layers){
 const layer=map.operationalLayers.find(x=>x.title===layerTitle)?.featureCollection?.layers?.[0];
 if(!Array.isArray(layer?.featureSet?.features)||layer.featureSet.features.length===0){
  console.error('MCKINNEY_SOURCE_LIVE_NO_GO: absent '+level+' layer');process.exit(1)
 }
 const records=layer.featureSet.features.map(x=>x.attributes).filter(a=>a?.[field]);
 const levels=[...new Set(records.map(a=>normal(a[field])).filter(Boolean))];
 names[level]=levels.length;
 years[level]=[...new Set(records.map(a=>String(a.SCHL_YEAR??'not-stated')))].sort();
 matches[level]=levels.filter(n=>flatHtml.includes(n)).length;
}
if(names.elementary<15||names.middle!==5||names.high!==3){
 console.error('MCKINNEY_SOURCE_LIVE_NO_GO: school count changed',JSON.stringify(names));process.exit(1)
}
if(years.elementary.some(y=>y!=='2026-27')){
 console.error('MCKINNEY_SOURCE_LIVE_NO_GO: elementary vintage changed',JSON.stringify(years.elementary));process.exit(1)
}
// Independently adopted district 2026–27 PDF map campus-name audit: this is
// a *name* comparison, NOT equivalence of GIS geometry or a residential result.
const adoptedNames=Object.create(null);
for(const level of ['elementary','middle','high']){
 const expected=new Set((adopted.names?.[level]||[]).map(normal));
 const actual=new Set(map.operationalLayers.find(x=>x.title===layers.find(x=>x[2]===level)[0])
  ?.featureCollection?.layers?.[0]?.featureSet?.features?.map(x=>normal(x.attributes?.[layers.find(y=>y[2]===level)[1]]))||[]);
 const missing=[...expected].filter(x=>!actual.has(x));
 const unexpected=[...actual].filter(x=>!expected.has(x));
 if(missing.length||unexpected.length||actual.size!==expected.size){
  console.error('MCKINNEY_ADOPTED_MAP_NAMES_NO_GO '+JSON.stringify({level,expected:expected.size,
    actual:actual.size,missing,unexpected}));process.exit(1)
 }
 adoptedNames[level]={adoptedPdf:adopted.sources[level],matched:actual.size,expected:expected.size};
}
const result={status:'SOURCE_SCHEMA_REVIEW',source:'McKinney live MetroStudy Finder + district-published 2026-27 interactive boundary map',
 levels:names,yearValues:years,
 nameAgreementCount:matches,comparedToOfficialHTML:true,
 adoptedMapSchoolNames:adoptedNames,adoptedPdfGeometryEquivalenceCertified:false,
 independentResidenceFinderResponse:false,automaticEnrollmentCertified:false};
console.log('MCKINNEY_PUBLIC_SOURCE_QA '+JSON.stringify(result));
if(['middle','high'].some(level=>years[level].some(y=>y!=='2026-27')))
 console.warn('MCKINNEY_SOURCE_NOTE: middle/high layer SCHL_YEAR not independently 2026-27 for every feature; app must disclose by school-level');
if(['middle','high'].some(level=>matches[level]===0)){
 console.error('MCKINNEY_SOURCE_LIVE_NO_GO: zero published current-map names match middle/high school layer');process.exit(1)
}
