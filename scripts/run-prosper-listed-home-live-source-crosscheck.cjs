#!/usr/bin/env node
'use strict';
// Truly live, read-only 2026-27 Prosper GIS ↔ Infofinder crosscheck for
// a small set of publicly advertised single-family homes.
// Point lookup is school-source corroboration, NOT a student enrollment decision.
// Never export household occupants or scrape Finder boundary data.
const {mkdirSync,writeFileSync,readFileSync}=require('node:fs');
const path=require('node:path');
const {compare,precise}=require('./prosper-public-home-crosscheck-core.cjs');
const root=path.resolve(__dirname,'..');
const samples=JSON.parse(readFileSync(path.join(root,'tests/prosper-public-listed-single-family-2026.json'),'utf8'));
const shapes=JSON.parse(readFileSync(path.join(root,'prosper-attendance-2026.geojson'),'utf8'));
const OUT=path.join(root,'artifacts/prosper-real-home');
mkdirSync(OUT,{recursive:true});
const failReasons={};
function transient(error){
 const inner=[error?.message,error?.name,error?.cause?.code,error?.cause?.message,
  ...(error?.cause?.errors||[]).map(x=>x?.code)].filter(Boolean).join(' ');
 return /fetch failed|ETIMEDOUT|ENETUNREACH|ECONNRESET|EAI_AGAIN|TimeoutError|AbortError|HTTP (?:429|50[0-4])\b/i.test(inner);
}
async function request(url,stage){
 for(let i=0;i<3;i++){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const j=await r.json();
   if(j.error)throw Error('official_service_application_error');
   return j;
  }catch(e){
   if(i===2||!transient(e)){const reason=transient(e)?'SOURCE_TEMPORARILY_UNAVAILABLE':'SOURCE_RESPONSE_INVALID';
    throw Object.assign(Error(stage+':'+reason),{category:reason});}
   await new Promise(resolve=>setTimeout(resolve,(i+1)*900));
  }
 }
}
function geocodeUrl(address){
 const u=new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
 for(const [k,v] of Object.entries({SingleLine:address,f:'json',
  outFields:'Match_addr,Addr_type,Region,Postal',maxLocations:'5',countryCode:'USA',
  forStorage:'false'}))u.searchParams.set(k,v);
 return u;
}
function officialUrl(point){
 const u=new URL('https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation');
 for(const [k,v] of Object.entries({clientId:'PI5FFG7RYZ1',x:point[0].toFixed(8),
  y:point[1].toFixed(8),schoolId:'-1',gradeId:'-1'}))u.searchParams.set(k,v);
 return u;
}
function sanitizeResult(r){
 return {status:r.status,reasons:r.reasons,
  officialCodes:r.official?.map(x=>x.code)||[],
  GIS: Object.fromEntries(Object.entries(r.geometryByGrade||{}).map(([level,arr])=>
    [level,arr.map(x=>({code:x.code,campusId:x.campusId,year:x.vintage}))])),
  liveDistrictPointLookup:true,independentVendorSource:false,
  independentOfficialFinderUi:false,independentEnrollment:false,
  releaseApproved:false};
}
(async()=>{
 const report={schemaVersion:1,executedOn:new Date().toISOString(),scope:'publicly-listed-single-family-properties',
  district:'PROSPER', academicYear:'2026–27',
  officialSite:'https://www.prosper-isd.net/page/attendance-boundaries/',
  officialPointService:'https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation',
  geographicYearSource:shapes.metadata.sourceGroupNames,
  geocodeUsedLive:true,districtPointResultsUsedLive:true,
  allSchoolsVerifiedByIndependentAuthority:false,
  householdEnrollmentVerified:false,productionReleaseApproved:false,
  targetMinimumCorroboratedProperties:2,results:[]};
 for(const sample of samples.cases){
  const row={id:sample.id,source:sample.listing,propertyType:'public-single-family-listing',
   status:'INCONCLUSIVE',reason:null};
  try{
   const j=await request(geocodeUrl(sample.address),'esri_geocoder');
   const candidates=(j.candidates||[]).filter(x=>precise(sample.address,x)).sort((a,b)=>b.score-a.score);
   if(!candidates.length){
    row.reason='NO_EXACT_LIVE_POINT_ADDRESS';
    row.geocoderDiagnostics=(j.candidates||[]).slice(0,3).map(x=>({
     address:String(x.address||'').slice(0,130),score:x.score,
     addrType:x.attributes?.Addr_type,region:x.attributes?.Region,
     zip:x.attributes?.Postal,hasPoint:Number.isFinite(x.location?.x)&&Number.isFinite(x.location?.y)
    }));
    report.results.push(row);
    console.log('PROSPER_PUBLIC_RESIDENTIAL_ADDRESS_QA '+JSON.stringify({id:row.id,status:row.status,reason:row.reason,topGeocodes:row.geocoderDiagnostics}));
    continue;
   }
   if(candidates.length>=2&&Math.hypot(candidates[0].location.x-candidates[1].location.x,
       candidates[0].location.y-candidates[1].location.y)>0.0002&&
      candidates[1].score>=candidates[0].score-2){
     row.reason='AMBIGUOUS_PRECISE_ADDRESS_LOCATION';report.results.push(row);continue;
   }
   const c=candidates[0],pt=[c.location.x,c.location.y];
   row.geocode={type:c.attributes.Addr_type,score:c.score,zip:c.attributes.Postal,
    highConfidence:true};
   const live=await request(officialUrl(pt),'prosper_official_infofinder');
   const compared=compare({address:sample.address,candidate:c,locator:live,geojson:shapes});
   Object.assign(row,sanitizeResult(compared));
   // No shape or service can self-certify enrollment.
   if(row.status==='OFFICIAL_POINT_GIS_CORROBORATED')row.reason=null;
   else {
    row.reason=compared.reasons.join(',');
    if(compared.reasons.includes('OFFICIAL_GIS_SCHOOL_CODE_MISMATCH'))failReasons[sample.id]=row.reason;
   }
  }catch(e){row.status='INCONCLUSIVE';row.reason=e.category||'OFFICIAL_OR_GEOCODER_REQUEST_FAILED';}
  report.results.push(row);
  console.log('PROSPER_PUBLIC_RESIDENTIAL_ADDRESS_QA '+JSON.stringify({
   id:row.id,status:row.status,reason:row.reason,
   officialCodes:row.officialCodes,gisCodes:row.GIS}));
 }
 report.corroborated=report.results.filter(x=>x.status==='OFFICIAL_POINT_GIS_CORROBORATED').length;
 report.noExactGeocode=report.results.filter(x=>x.reason==='NO_EXACT_LIVE_POINT_ADDRESS').length;
 report.disagreements=Object.keys(failReasons);
 report.status=report.disagreements.length?'SCHOOL_SOURCE_MISMATCH':
  report.corroborated>=report.targetMinimumCorroboratedProperties?
  'SOURCE_CORROBORATION_PASS_NOT_ENROLLMENT':'INCONCLUSIVE_INSUFFICIENT_VALID_PROPERTIES';
 const location=path.join(OUT,'official-lookup-vs-gis.json');
 writeFileSync(location,JSON.stringify(report,null,2)+'\n');
 console.log('PROSPER_PUBLIC_RESIDENTIAL_SUMMARY '+JSON.stringify({
  status:report.status,samples:samples.cases.length,corroborated:report.corroborated,
  sourceMismatches:report.disagreements.length,
  independentEnrollmentVerified:0,mapRenderVerified:false,
  sourceCorrelated:true,releaseApproved:false}));
 if(report.status!=='SOURCE_CORROBORATION_PASS_NOT_ENROLLMENT')process.exitCode=1;
})().catch(e=>{
 console.error('PROSPER_PUBLIC_RESIDENTIAL_AUDIT_FAILED '+String(e.message||e));
 process.exitCode=1;
});
