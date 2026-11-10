#!/usr/bin/env node
'use strict';
// Independent public SCHOOL ADDRESS geocoding comparison, read-only GitHub Actions.
// Coordinates are public school facility address estimates, NEVER home addresses,
// never a district-certified campus building point or zone geometry.
const fs=require('node:fs'),path=require('node:path');
const ex=require('../data/denton-eight-campus-coordinate-exceptions-2026.json');
const nces=require('../nces-locations-2024.json');
const ROOT=path.resolve(__dirname,'..');
function distance(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||!a.every(Number.isFinite)||!b.every(Number.isFinite))return null;
 const rad=x=>x*Math.PI/180,dLat=rad(b[0]-a[0]),dLon=rad(b[1]-a[1]);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
 return Math.round(12742000*Math.asin(Math.min(1,Math.sqrt(h))));
}
function formatAddress(row,withZip=true){
 const a=row.publicCampusAddress;
 return [a.street,a.city,a.state,withZip?a.zip:null].filter(Boolean).join(', ');
}
function esriUrl(row){
 const u=new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
 for(const [key,val] of Object.entries({SingleLine:formatAddress(row),sourceCountry:'USA',maxLocations:'1',outFields:'Addr_type,Match_addr,Postal',f:'json'}))
  u.searchParams.set(key,val);
 return u.toString();
}
function censusUrl(row){
 const u=new URL('https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress');
 for(const [key,val] of Object.entries({address:formatAddress(row),benchmark:'Public_AR_Current',
  vintage:'Current_Current',format:'json'}))u.searchParams.set(key,val);
 return u.toString();
}
async function get(url,fetchFn=fetch){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
 try{
  const res=await fetchFn(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});
  if(!res.ok)throw Error('public address geocoder HTTP '+res.status);
  return await res.json();
 }finally{clearTimeout(timer)}
}
function esriCandidate(data){
 const row=data?.candidates?.[0],p=row?.location;
 if(!p||!Number.isFinite(p.y)||!Number.isFinite(p.x))return null;
 return {ll:[p.y,p.x],score:Number(row.score)||0,
  type:String(row.attributes?.Addr_type||'unknown'),
  postal:String(row.attributes?.Postal||''),label:String(row.address||'')};
}
function censusCandidate(data){
 const row=data?.result?.addressMatches?.[0],p=row?.coordinates;
 return p&&Number.isFinite(p.y)&&Number.isFinite(p.x)?
  {ll:[p.y,p.x],label:String(row.matchedAddress||'')}:null;
}
function disposition(row,esri,census,ncesPoint){
 const offset=esri&&census?distance(esri.ll,census.ll):null;
 const ncesOffset=esri&&ncesPoint?distance(esri.ll,ncesPoint.ll):null;
 const postalConflict=!!row.currentYearOfficialPdfAddressDiscrepancy;
 const twoService=!!(esri&&census&&offset!==null&&offset<=200&&esri.score>=95);
 return {schoolId:row.id,school:row.school,
  officialCampusAddressAvailable:true,
  legacyExceptionReason:row.historicalPointDiscrepancy,
  esriResponded:!!esri,esriScore:esri?.score??null,esriType:esri?.type??null,
  censusResponded:!!census,streetGeocoderSeparationMeters:offset,
  historicalNcesVsEsriMeters:ncesOffset,
  postalConflict,reviewStatus:postalConflict?'district-postal-conflict':
   twoService?'two-service-address-geocode-review-candidate':'independent-point-evidence-incomplete',
  currentSchoolSiteCoordinateCertified:false,schoolAttendancePolygonCertified:false,
  residentialAssignmentApproved:false,readyForProduction:false};
}
async function run(fetchFn=fetch){
 if(ex.exceptions.length!==8||ex.eightCurrentCampusCoordinatesVerified!==false)
  throw Error('exact eight school building exceptions and immutable NO-GO policy required');
 const ncesById=new Map(nces.data.map(x=>[x.id,x]));
 const results=[];let providerResponseCount=0;
 for(const row of ex.exceptions){
  const calls=await Promise.allSettled([get(esriUrl(row),fetchFn),get(censusUrl(row),fetchFn)]);
  const e=calls[0].status==='fulfilled'?esriCandidate(calls[0].value):null;
  const c=calls[1].status==='fulfilled'?censusCandidate(calls[1].value):null;
  if(e)providerResponseCount++;if(c)providerResponseCount++;
  const item=disposition(row,e,c,ncesById.get(row.id));
  if(calls.some(x=>x.status==='rejected'))item.providerAvailabilityNote='One or both free public geocoders unavailable';
  results.push(item);
 }
 const out={asOf:new Date().toISOString(),scope:'Eight published public school facility addresses only',
  count:results.length,providerResponseCount,currentSchoolSiteCoordinateCertifiedCount:0,
  schoolZoneApprovedCount:0,usesNoResidentialAddresses:true,
  publisherReuseOrSchoolEnrollmentCertified:false,
  reviewCandidateCount:results.filter(x=>x.reviewStatus==='two-service-address-geocode-review-candidate').length,
  results};
 if(process.env.WRITE_DENTON_GEOCODE_ARTIFACT==='1'){
  const dir=path.join(ROOT,'artifacts','denton-eight-public-geocoder');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify(out,null,2)+'\n');
 }
 for(const r of results)console.log(JSON.stringify(r));
 console.log('DENTON_8_INDEPENDENT_PUBLIC_SCHOOL_GEOCODE_AUDIT',JSON.stringify({
  total:results.length,responded:providerResponseCount,
  reviewCandidates:out.reviewCandidateCount,
  siteApproved:0,schoolZoneApproved:0
 }));
 return out;
}
if(require.main===module)run().then(o=>{
 if(o.count!==8||o.providerResponseCount===0){console.error('DENTON_GEOCODE_PROBE_NO_PUBLIC_PROVIDER_EVIDENCE');process.exitCode=1}
}).catch(e=>{console.error('DENTON_GEOCODE_PROBE_FAILED',String(e));process.exitCode=1});
module.exports={distance,formatAddress,esriUrl,censusUrl,esriCandidate,censusCandidate,disposition,run};
