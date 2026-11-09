#!/usr/bin/env node
// Live regression check. Network required; intentionally NOT included in offline CI.
// Run: node scripts/check-public-address-finders-live.mjs
// Frisco official Finder UI results are recorded snapshots, NOT live API responses.
// Prosper official Infofinder is directly queried on every run.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {inFriscoBorder,inGeometry,schoolKey}=require('./attendance-geo-audit.cjs');
const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const samples=read('tests/public-address-finder-crosscheck-2026.json').records;
async function json(url,stage){
 // External Esri and Infofinder can transiently time out. Retry transport-only
 // failures but NEVER turn unknown or mismatching school assignments into pass.
 let last;
 for(let attempt=1;attempt<=3;attempt++){
  const started=Date.now();
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(27000),cache:'no-store'});
   if(!res.ok){
    const error=new Error('official_source_http_'+res.status);
    error.retryable=res.status===429||res.status>=500;
    throw error;
   }
   const data=await res.json();if(data?.error)throw Error('official_source_application_error');
   console.log('SOURCE_OK stage='+stage+' attempt='+attempt+' latency_ms='+(Date.now()-started));
   return data;
  }catch(err){
   last=err;
   const text=String(err?.message||err);
   const retryable=err?.retryable===true||/timeout|abort|fetch failed|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(text);
   if(!retryable||attempt===3)break;
   console.warn('TRANSIENT stage='+stage+' attempt='+attempt+'/3 latency_ms='+(Date.now()-started));
   await new Promise(resolve=>setTimeout(resolve,450*attempt));
  }
 }
 const err=new Error('official_source_'+(/timeout|abort|ETIMEDOUT/i.test(String(last?.message||last))?'timeout':'request_failure'));
 err.stage=stage;err.kind=last?.retryable===true||/timeout|abort|fetch failed|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(String(last?.message||last))?'external-service-unavailable':'source-or-data-error';
 throw err;
}
const [frisco,prosper]=await Promise.all([
 json('https://static.friscoisd.org/js/json/school.borders.2627.json','frisco-boundary-download'),
 json('https://kevinim.github.io/prosper-attendance-2026.geojson','prosper-gis-published')
]);
if(!Array.isArray(frisco)||frisco.length!==75||prosper?.features?.length!==31)throw Error('Official GIS coverage count changed; review before claiming validation');
let good=0,errors=[];
const diagnostics=[];
for(const [index,item] of samples.entries()){
 const sampleId=item.district+'-'+(index+1);
 let stage='esri-geocode';
 try{
  const u=new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
  for(const [k,v] of Object.entries({SingleLine:item.address,f:'json',outFields:'Match_addr,Addr_type,Region,Postal',maxLocations:'3',countryCode:'USA',forStorage:'false'}))u.searchParams.set(k,v);
  const candidates=await json(u,'esri-geocode');
  const c=candidates.candidates?.[0];
  if(!c||c.score<95||!['PointAddress','Subaddress'].includes(c.attributes?.Addr_type)||String(c.attributes?.Postal||'').slice(0,5)!==item.zip)throw Error('No precise match: '+JSON.stringify(c));
  const pt=[c.location.x,c.location.y];
  const meters=Math.hypot((pt[0]-item.point[0])*111000*Math.cos(pt[1]*Math.PI/180),(pt[1]-item.point[1])*111000);
  if(meters>70)throw Error('Esri point drift: '+meters.toFixed(1)+'m');
  if(item.district==='FISD'){
   const type={Elementary:'elementary','Middle School':'middle','High School':'high'};
   const hits=frisco.filter(z=>inFriscoBorder(pt,z.border));
   const actual=Object.fromEntries(hits.map(z=>[type[z.type],z.name]));
   if(hits.length!==3||['elementary','middle','high'].some(k=>schoolKey(actual[k])!==schoolKey(item.officialSchools[k])))throw Error('Frisco GIS differs from district Finder UI snapshot: '+JSON.stringify(actual));
  }else if(item.district==='PROSPER'){
   const features=prosper.features.filter(f=>inGeometry(pt,f.geometry));
   const actual=Object.fromEntries(features.map(f=>[f.properties.gradeLevel,String(f.properties.schoolCode||'').padStart(3,'0')]));
   const officialUrl=new URL('https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation');
   for(const [k,v] of Object.entries({clientId:'PI5FFG7RYZ1',x:pt[0].toFixed(8),y:pt[1].toFixed(8),schoolId:'-1',gradeId:'-1'}))officialUrl.searchParams.set(k,v);
   stage='prosper-infofinder';
   const official=await json(officialUrl,'prosper-infofinder');
   if(official.resultCode!==200||!Array.isArray(official.schools)||official.schools.length!==3)throw Error('Official Infofinder response invalid');
   const officialCodes=official.schools.map(s=>String(s.schoolCode||'').padStart(3,'0')).sort();
   const expected=Object.values(item.officialCodes).sort();
   if(Object.keys(actual).length!==3||['elementary','middle','high'].some(k=>actual[k]!==item.gisCodes[k])||JSON.stringify(officialCodes)!==JSON.stringify(expected))throw Error('Prosper official/GIS disagreement: '+JSON.stringify({actual,officialCodes}));
  }else throw Error('unsupported district');
  good++;diagnostics.push({sampleId,status:'matched',providerStage:stage});
  console.log('MATCH '+sampleId);
 }catch(err){
  const failedStage=err.stage||stage;
  const reason=err.kind||'data-mismatch-or-invalid-source';
  errors.push({sampleId,stage:failedStage,reason});
  diagnostics.push({sampleId,status:'inconclusive-or-failed',providerStage:failedStage,reason});
  console.error('FAIL sample='+sampleId+' stage='+failedStage+' category='+reason);
 }
}
console.log('PUBLIC ADDRESS CHECK: '+good+'/'+samples.length+' matched; '+errors.length+' need review. Public facilities are not residential enrollment approvals.');
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/public-address-source-crosscheck.json',JSON.stringify({schemaVersion:1,status:errors.length?'inconclusive-or-failed':'passed',total:samples.length,matched:good,diagnostics},null,2)+'\n');
if(errors.length)process.exitCode=1;
