#!/usr/bin/env node
'use strict';
// QA-only public GIS SERVICE METADATA discovery; no private address query,
// no zone geometry fetch, no redistribution and no auto school assignment.
const fs=require('node:fs'),path=require('node:path');
const QUERIES=Object.freeze([
 '"Carrollton-Farmers Branch" attendance zones',
 'CFBISD School Attendance Boundaries',
 '"Carrollton Farmers Branch" school zoning'
]);
const KNOWN=Object.freeze([
 {id:'cfb-public-2021-nces-points',url:'https://services3.arcgis.com/KkgpUIloCxkczPwY/ArcGIS/rest/services/CFBISD_SchoolPoints/FeatureServer/3',expect:'point'},
 {id:'similarly-named-school-boundary-metadata',url:'https://services8.arcgis.com/A76GjgcBUTTcwFGS/arcgis/rest/services/Schools_with_Attendance_Boundary/FeatureServer/0',expect:'unknown'},
 {id:'third-party-attendance-zones',url:'https://services8.arcgis.com/K3KZyCukvfGuGXEj/ArcGIS/rest/services/Schools_zones_8a46b5816cd64546b662104bcb090ec4/FeatureServer/2',expect:'unknown'}
]);
function urlForSearch(q){
 const u=new URL('https://www.arcgis.com/sharing/rest/search');
 for(const [k,v] of Object.entries({q,sortField:'modified',sortOrder:'desc',num:'50',f:'json'}))u.searchParams.set(k,v);
 return u.toString();
}
async function jsonAt(url,fetchFn=fetch){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),18000);
 try{
  const r=await fetchFn(url,{signal:ctrl.signal,headers:{'Accept':'application/json'}});
  if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json();
  if(!j||typeof j!=='object'||j.error)throw Error('invalid provider metadata or error');
  return j;
 }finally{clearTimeout(timer)}
}
function normalizeText(v){return String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,360)}
function sourceClassification(url,metadata){
 const geom=metadata?.geometryType||'unknown',fields=metadata?.fields||[],
  keys=new Set(fields.map(x=>String(x.name||'').toLowerCase()));
 const title=normalizeText(metadata?.name||metadata?.serviceDescription||metadata?.description);
 const text=normalizeText([metadata?.name,metadata?.description,metadata?.copyrightText,
  metadata?.serviceDescription].join(' '));
 const cfbName=/(?:cfbisd|carrollton[ -]?farmers[ -]?branch)/i.test(text+' '+url);
 const zoneName=/(attendance|boundary|zoning|school.zone)/i.test(text);
 const schoolFields=['schoolname','school_name','campus','campusid','name','school'].some(k=>keys.has(k));
 const form=geom==='esriGeometryPoint'?'SCHOOL_POINT_NOT_ZONE':
  geom!=='esriGeometryPolygon'?'NO_SCHOOL_ZONE_POLYGON':
  !cfbName?'POLYGON_OTHER_DISTRICT_OR_UNKNOWN_OWNER':
  !zoneName||!schoolFields?'CFB_POLYGON_WITHOUT_SCHOOL_ASSIGNMENT_PROOF':
   'POSSIBLE_CFB_ZONE_GIS_REQUIRES_OFFICIAL_YEAR_AND_PUBLISHER_CONFIRMATION';
 return {geometryType:geom,classification:form,cfbIdentityMentioned:cfbName,
  attendanceZoneMentioned:zoneName,schoolNameColumnPresent:schoolFields,
  serviceTitle:title};
}
function itemClassification(x){
 const title=normalizeText(x?.title),desc=normalizeText(x?.description);
 return {id:String(x?.id||'').slice(0,40),title,kind:String(x?.type||'').slice(0,70),
  owner:String(x?.owner||'').slice(0,90),modified:x?.modified||null,
  url:typeof x?.url==='string'&&/^https:\/\//i.test(x.url)?x.url:null,
  cfbLabel:/(?:cfbisd|carrollton[ -]?farmers[ -]?branch)/i.test(title+' '+desc),
  schoolZoneLabel:/(attendance|zoning|zone|boundary)/i.test(title+' '+desc),
  verifiedCurrentOfficialDistrictGIS:false};
}
async function run(fetchFn=fetch){
 const sources=[],candidates=[],errors=[];
 for(const source of KNOWN){
  try{
   const u=new URL(source.url);u.searchParams.set('f','json');
   const m=await jsonAt(u.toString(),fetchFn);
   sources.push({id:source.id,url:source.url,...sourceClassification(source.url,m),
     layerId:m.id??null,lastEditDate:m.editingInfo?.lastEditDate||null,
     releasedForCurrentSchoolYear:false,redistributionRightsVerified:false});
  }catch(e){errors.push({source:source.id,reason:String(e?.message||e).slice(0,140)})}
 }
 for(const term of QUERIES){
  try{
   const j=await jsonAt(urlForSearch(term),fetchFn);
   if(!Array.isArray(j.results))throw Error('not ArcGIS public search response');
   candidates.push(...j.results.map(itemClassification).filter(x=>x.cfbLabel||x.schoolZoneLabel)
    .slice(0,50));
  }catch(e){errors.push({query:term,reason:String(e?.message||e).slice(0,140)})}
 }
 const unique=[...new Map(candidates.map(c=>[c.id,c])).values()];
 const prioritized=unique.filter(x=>x.cfbLabel&&x.schoolZoneLabel);
 const report={asOf:new Date().toISOString(),type:'public-metadata-only',queries:QUERIES,
  inspectedKnownEndpoints:sources.length,searchCandidateCount:unique.length,
  cfbZoneTitleCandidates:prioritized.length,sourceRecords:sources,
  candidateItems:prioritized.slice(0,35),
  errors,
  currentYearOfficialPerSchoolGISVerified:0,
  attendancePolygonsDownloaded:0,schoolAssignmentsApproved:0,
  policy:'ALL CANDIDATES REQUIRE DISTRICT OWNERSHIP, SCHOOL-YEAR, SCHOOL ID, CURRENT FINDER AND RIGHTS VERIFICATION; NO AUTOMATIC APPROVAL'};
 if(process.env.CFB_SOURCE_CENSUS_ARTIFACT==='1'){
  const output=path.join(process.cwd(),'artifacts','cfb-public-source-census');
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
 console.log('CFB_PUBLIC_GIS_SOURCE_AUDIT '+JSON.stringify({
  services:sources.map(x=>({id:x.id,geometry:x.geometryType,status:x.classification})),
  possibleItems:prioritized.map(x=>({id:x.id,title:x.title,kind:x.kind,owner:x.owner,url:x.url})),
  errors,verifiedOfficialCurrentSchoolZones:0
 }));
 return report;
}
if(require.main===module)run().then(r=>{
 if(r.inspectedKnownEndpoints===0&&r.searchCandidateCount===0){console.error('NO_PUBLIC_ARCGIS_METADATA_FETCHED');process.exitCode=1}
}).catch(e=>{console.error('CFB_PUBLIC_SOURCE_AUDIT_FAILED',String(e));process.exitCode=1});
module.exports={QUERIES,KNOWN,urlForSearch,sourceClassification,itemClassification,jsonAt,run};
