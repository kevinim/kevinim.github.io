#!/usr/bin/env node
'use strict';
// Read-only, public *advertised* 75035 houses from a third-party source.
// Esri geocode + district-linked Transfinder API + published 2026-27 GIS
// share provenance and CANNOT independently certify school enrollment.
const fs=require('node:fs');
const path=require('node:path');
const {compare,precise}=require('./prosper-public-home-crosscheck-core.cjs');
const ROOT=path.resolve(__dirname,'..');
const source=JSON.parse(fs.readFileSync(path.join(ROOT,'tests/prosper-second-zip-public-candidates-2026.json'),'utf8'));
const geo=JSON.parse(fs.readFileSync(path.join(ROOT,'prosper-attendance-2026.geojson'),'utf8'));
function checkSource(doc){
 if(doc.schemaVersion!==1||doc.district!=='PROSPER'||doc.academicYear!=='2026-27'||
  doc.independentOfficialFinderUiVerified!==false||doc.studentEligibilityCertified!==false||
  doc.productionApproved!==false||!Array.isArray(doc.candidates)||doc.candidates.length!==2||
  new Set(doc.candidates.map(x=>x.id)).size!==2||
  doc.candidates.some(x=>!x.id.startsWith('prosper-frisco-')||
   x.zip!=='75035'||!/^https:\/\/www\.compass\.com\/homedetails\//.test(x.publicListingUrl)||
   !/,\s*Frisco,\s*TX\s*75035$/.test(x.address)||
   x.listingThirdPartySchoolsAreNotAuthoritative!==true))
  throw Error('INVALID_PUBLIC_SECOND_ZIP_SOURCE');
}
function geocodeUrl(address){
 const url=new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
 for(const [key,value] of Object.entries({SingleLine:address,f:'json',
  outFields:'Match_addr,Addr_type,Region,Postal',maxLocations:'5',countryCode:'USA',forStorage:'false'}))
  url.searchParams.set(key,value);
 return url.href;
}
function finderUrl(point){
 const url=new URL('https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation');
 for(const [k,v] of Object.entries({clientId:'PI5FFG7RYZ1',x:point[0].toFixed(8),
  y:point[1].toFixed(8),schoolId:'-1',gradeId:'-1'}))
  url.searchParams.set(k,v);
 return url.href;
}
async function fetchJson(url,request=fetch){
 for(let k=0;k<2;k++){
  try{
   const res=await request(url,{signal:AbortSignal.timeout(20000)});
   if(!res.ok)throw Error('HTTP_'+res.status);
   const j=await res.json();
   if(j.error)throw Error('APPLICATION_ERROR');
   return j;
  }catch(err){
   if(k===1)throw err;
  }
 }
}
async function run({request=fetch,manifest=source,geojson=geo}={}){
 checkSource(manifest);
 const cases=[];
 for(const item of manifest.candidates){
  const entry={sampleId:item.id,zip:item.zip,
   publicListingSource:item.publicListingUrl,status:'INCONCLUSIVE',
   officialSchoolCodes:[],GISSchoolCodesByGrade:{},independentFinderUiVerified:false,
   independentReviewerApproved:false,releaseApproved:false};
  try{
   const found=await fetchJson(geocodeUrl(item.address),request);
   const candidates=(found.candidates||[]).filter(x=>precise(item.address,x))
    .sort((a,b)=>b.score-a.score);
   if(candidates.length!==1&&(
    !candidates.length||candidates[1].score>=candidates[0].score-2)){
    entry.reason='PRECISE_GEOCODE_MISSING_OR_AMBIGUOUS';
   }else{
    const candidate=candidates[0],pt=[candidate.location.x,candidate.location.y];
    const finder=await fetchJson(finderUrl(pt),request);
    const result=compare({address:item.address,candidate,locator:finder,geojson});
    entry.status=result.status;
    entry.reason=result.reasons.length?'SOURCE_INDEPENDENCE_OR_GEOMETRY_MISMATCH':null;
    entry.officialSchoolCodes=result.official.map(x=>x.code);
    entry.GISSchoolCodesByGrade=Object.fromEntries(
     Object.entries(result.geometryByGrade).map(([grade,matches])=>
      [grade,matches.map(x=>({campusId:x.campusId,code:x.code,vintage:x.vintage}))]));
    entry.preciseGeocoderStatus='YES';
   }
  }catch(e){entry.reason='NETWORK_OR_SOURCE_REQUEST_INCONCLUSIVE';}
  cases.push(entry);
 }
 const corroborated=cases.filter(x=>x.status==='OFFICIAL_POINT_GIS_CORROBORATED');
 return {schemaVersion:1,executedOn:new Date().toISOString(),district:'PROSPER',
  academicYear:'2026-27',scope:'PUBLIC_75035_SECOND_ZIP_CANDIDATES',
  candidatesChecked:cases.length,corroborated:corroborated.length,
  secondZipEvidenceCandidate:corroborated.length>=1,
  sourceLineageIndependent:false,independentFinderUiVerified:false,
  independentlyVerifiedResidentialAssignments:0,schoolEnrollmentCertified:false,
  level2PromotionAllowed:false,level1PromotionAllowed:false,
  release:'NO_GO',cases};
}
if(require.main===module)run().then(report=>{
 const p=path.join(ROOT,'artifacts/prosper-real-home/second-zip-source-crosscheck.json');
 fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n');
 console.log('PROSPER_SECOND_ZIP_SOURCE '+JSON.stringify({checked:report.candidatesChecked,
  corroborated:report.corroborated,qualifiedZipCases:report.secondZipEvidenceCandidate,
  cases:report.cases.map(x=>({sampleId:x.sampleId,status:x.status,reason:x.reason,
   codes:x.officialSchoolCodes})),independentApproval:false,release:'NO_GO'}));
}).catch(e=>{console.error('PROSPER_SECOND_ZIP_FATAL '+String(e.message||e));process.exitCode=1});
module.exports={checkSource,geocodeUrl,finderUrl,run};
