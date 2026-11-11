'use strict';
// AG01 CFB source acquisition verifier. No GuideK12 scraping, no private addresses.
// Offline by default; --live only probes listed public image HEAD + ArcGIS metadata.
const fs=require('node:fs');
const path=require('node:path');
const MANIFEST=path.resolve(__dirname,'../data/cfb-official-gis-acquisition-2026-11-10.json');
const LEVELS=new Set(['elementary','middle','high']);
const HOSTS=new Set(['www.cfbisd.edu','resources.finalsite.net','data.capitol.texas.gov','tea.texas.gov','services2.arcgis.com','services3.arcgis.com','dunaway.com']);
const validHttps=s=>{
 try {const u=new URL(s);return u.protocol==='https:'&&HOSTS.has(u.hostname);}
 catch{return false;}
};
function inspect(m){
 const errors=[],warnings=[],seen=new Set();
 if(m?.schemaVersion!==1||m?.district?.abbr!=='CFB'||m?.district?.teaDistrictId!=='057903')errors.push('bad-district-or-schema');
 if(m?.certifiedCampusAttendancePolygons!==0||m?.automaticResidenceAssignmentAllowed!==false)errors.push('unverified-campus-gis-promoted');
 if(m?.existingParallelWork?.doNotModifyPr208Files!==true)errors.push('PR208-isolation-required');
 if(!Array.isArray(m?.rasterAssets)||m.rasterAssets.length<6)errors.push('missing-published-map-inventory');
 const counts={elementary:0,middle:0,high:0};
 for(const a of m?.rasterAssets||[]){
  if(seen.has(a.id)||!a.id){errors.push('raster-id-duplicate');continue;}
  seen.add(a.id);
  if(!LEVELS.has(a.level)){errors.push(a.id+':unknown-grade');continue;}
  counts[a.level]++;
  if(a.schoolYear!=='2025-26'||a.publisher!=='CFBISD')errors.push(a.id+':unverified-source-year');
  if(a.format!=='image/raster'||a.geometryType!=='NOT_GEOGRAPHIC_GIS'||a.schoolLevelVector!==false)errors.push(a.id+':raster-mislabelled-as-GIS');
  if(!validHttps(a.assetUrl)||!validHttps(a.sourcePage))errors.push(a.id+':untrusted-url');
  if(a.license!=='no-redistribution-license-established'||a.reuseDecision!=='source-reference-only; do-not-rehost-or-auto-assign')errors.push(a.id+':rights-overclaimed');
  if(a.campusTEAIds!==null)errors.push(a.id+':cannot-infer-tea-ids-from-map');
  if(a.directBinaryFetchInThisAudit==='not-tested')warnings.push(a.id+':binary-not-directly-verified');
 }
 if(counts.elementary<3||counts.middle<2||counts.high<1)errors.push('missing-grade-or-detailed-campuses');
 const candidates=new Map((m?.gisCandidates||[]).map(x=>[x.id,x]));
 for(const id of ['tlc-2526-isd-outline','nces-2021-22-cfb-school-points','dunaway-cfb-project','cfb-guidek12-current','tea-geographic-data']){
  if(!candidates.has(id))errors.push(id+':missing-candidate');
 }
 for(const c of m?.gisCandidates||[]){
  if(c.schoolAttendancePolygon!==false)errors.push(c.id+':false-school-attendance-polygon');
  if(!validHttps(c.sourceUrl))errors.push(c.id+':untrusted-url');
 }
 if(candidates.get('tlc-2526-isd-outline')?.type!=='official-district-jurisdiction'||candidates.get('tlc-2526-isd-outline')?.geometryType!=='esriGeometryPolygon')errors.push('district-outline-type-incorrect');
 if(candidates.get('nces-2021-22-cfb-school-points')?.geometryType!=='esriGeometryPoint')errors.push('NCES-points-not-polygon');
 if(!Array.isArray(m?.sourceConflicts)||m.sourceConflicts.length<2||m.sourceConflicts.some(x=>!x.status.startsWith('UNRESOLVED_')))errors.push('conflicting-district-pages-not-flagged');
 return {verdict:errors.length?'INVALID':'REFERENCE_SOURCES_ONLY',
         certifiedCampusAttendancePolygons:0,automaticResidenceAssignmentAllowed:false,
         rasterSources:(m?.rasterAssets||[]).length,gisCandidates:(m?.gisCandidates||[]).length,
         sourceConflicts:(m?.sourceConflicts||[]).length,errors,warnings};
}
async function requestInfo(url,kind){
 const u=new URL(url);
 if(!validHttps(url))return {status:'UNTRUSTED_URL',url};
 if(kind==='arcgis')u.searchParams.set('f','pjson');
 try{
  const response=await fetch(u,{method:kind==='image'?'HEAD':'GET',headers:{'user-agent':'CFB-GIS-Provenance-Audit/1.0'},signal:AbortSignal.timeout(10000),redirect:'follow'});
  const contentType=response.headers.get('content-type')||'';
  if(kind==='image')return {status:response.ok&&contentType.startsWith('image/')?'IMAGE_RESPONSE':'UNVERIFIED_BINARY',url,httpStatus:response.status,contentType};
  if(!response.ok)return {status:'REMOTE_ERROR',url,httpStatus:response.status};
  const data=await response.json();
  return {status:data.geometryType?'LAYER_METADATA_OK':'LAYER_METADATA_UNVERIFIED',url,geometryType:data.geometryType||null,
          expectedSchoolAttendancePolygon:false};
 }catch(err){return {status:'REMOTE_UNAVAILABLE',url,reason:String(err?.name||'request_failed')};}
}
async function liveProbe(m){
 const remote=[];
 for(const c of m.gisCandidates.filter(x=>['tlc-2526-isd-outline','nces-2021-22-cfb-school-points'].includes(x.id))){
  const report=await requestInfo(c.id==='tlc-2526-isd-outline'?c.arcgisUrl:c.sourceUrl,'arcgis');
  report.id=c.id;report.expectedGeometryType=c.geometryType;
  report.typeMatches=report.geometryType===c.geometryType;
  // Inconsistent upstream metadata is a warning, never a reason to approve attendance zones.
  remote.push(report);
 }
 for(const r of m.rasterAssets){
  const report=await requestInfo(r.assetUrl,'image');report.id=r.id;remote.push(report);
 }
 return remote;
}
async function main(){
 const m=JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
 const assessment=inspect(m);
 const output={checkedAt:new Date().toISOString(),...assessment};
 if(process.argv.includes('--live'))output.liveSourceProbe=await liveProbe(m);
 console.log(JSON.stringify(output,null,2));
 if(assessment.errors.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error('CFB_ACQUISITION_CHECK_ERROR',e.message);process.exitCode=1});
module.exports={inspect,requestInfo,liveProbe};
