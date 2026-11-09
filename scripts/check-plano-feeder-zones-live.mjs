#!/usr/bin/env node
// Live, independent cross-LAYER checks against separately published feeder chains.
// Run: node scripts/check-plano-feeder-zones-live.mjs
// No private home-address input; 50 interior samples per official ES polygon.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {inGeometry,schoolKey,interiorPoints}=require('./attendance-geo-audit.cjs');
const feeders=JSON.parse(readFileSync(new URL('../plano-official-feeder-reference-2026.json',import.meta.url),'utf8'));
const url='https://services4.arcgis.com/uBV8NRVfoRJv7qWn/arcgis/rest/services/Plano_ISD_School_Districts/FeatureServer';
function transient(error){
 const reason=String(error?.message||error)+' '+String(error?.cause?.code||'')+' '+
  (error?.cause?.errors||[]).map(x=>String(x?.code||x?.message||'')).join(' ');
 return /fetch failed|ETIMEDOUT|ENETUNREACH|ECONNRESET|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|TimeoutError|HTTP (?:429|50[0-9])/i.test(reason);
}
const writeHealth=result=>{
 mkdirSync('artifacts',{recursive:true});
 writeFileSync('artifacts/plano-feeder-source-health.json',JSON.stringify({
  checkedAt:new Date().toISOString(),source:'official-Plano-Finder-ArcGIS',
  certifiedCurrentYear:false,independentResidentAddressVerified:false,...result
 },null,2)+'\n');
};
async function readLevel(n){
 const u=new URL(url+'/'+n+'/query');
 for(const [k,v] of Object.entries({f:'geojson',where:'1=1',outFields:'EntityName,Grade',outSR:'4326',returnGeometry:'true',resultRecordCount:'2000'}))u.searchParams.set(k,v);
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(u,{signal:AbortSignal.timeout(30000),cache:'no-store'});
   if(!r.ok)throw Error('Plano official layer '+n+': HTTP '+r.status);
   const j=await r.json();
   if(j?.type!=='FeatureCollection'||!Array.isArray(j.features))throw Error('Plano source format changed for layer '+n);
   return j.features;
  }catch(e){
   if(!transient(e)||attempt===2)throw e;
   await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1200));
  }
 }
}
try{\nconst [senior,high,middle,elementary]=await Promise.all([0,1,2,3].map(readLevel));
if([senior.length,high.length,middle.length,elementary.length].join(',')!=='3,6,11,44')throw Error('Plano official Finder zone shape counts changed; inspect before continuing');
const expected=new Map();
for(const row of feeders.feeders){
 for(const el of row.elementary){
  const key=schoolKey(el),list=expected.get(key)||[];
  list.push({middle:row.middle,high:row.high,senior:row.seniorHigh});
  expected.set(key,list);
 }
}
function matchedAt(point,group){
 return group.filter(z=>inGeometry(point,z.geometry)).map(z=>z.properties.EntityName);
}
let testedPolygons=0,testedPoints=0,errors=[];
for(let i=0;i<elementary.length;i++){
 const school=elementary[i].properties.EntityName,possibilities=expected.get(schoolKey(school))||[];
 const points=interiorPoints(elementary[i].geometry,50);
 if(!possibilities.length||points.length!==50){errors.push({school,polygon:i,issue:'missing feeder or 50 interior points',pointCount:points.length});continue}
 let error=null;
 for(const point of points){
  const m=matchedAt(point,middle),h=matchedAt(point,high),s=matchedAt(point,senior);
  if([m.length,h.length,s.length].some(k=>k!==1)){error={school,polygon:i,issue:'overlap/gap',point,found:{m,h,s}};break}
  if(!possibilities.some(x=>schoolKey(x.middle)===schoolKey(m[0])&&schoolKey(x.high)===schoolKey(h[0])&&schoolKey(x.senior)===schoolKey(s[0]))){error={school,polygon:i,issue:'official feeder contradiction',point,found:{m,h,s}};break}
  testedPoints++;
 }
 testedPolygons++;if(error)errors.push(error);
}
console.log('PLANO CROSSCHECK: '+testedPolygons+'/'+elementary.length+' polygons, '+testedPoints+' verified inside points, '+errors.length+' mismatches.');
if(errors.length){
 console.error(JSON.stringify(errors.slice(0,30),null,2));
 writeHealth({status:'DATA_MISMATCH',verificationCompleted:true,
  verifiedPolygons:testedPolygons,verifiedInteriorPoints:testedPoints,
  mismatches:errors.length});
 process.exitCode=1;
}else{
 writeHealth({status:'MATCHED_ADVISORY',verificationCompleted:true,
  verifiedPolygons:testedPolygons,verifiedInteriorPoints:testedPoints,
  mismatches:0});
}

}catch(e){
 if(transient(e)){
  writeHealth({status:'SOURCE_UNAVAILABLE',verificationCompleted:false,verifiedPolygons:0,
   mismatchStatus:'NOT_EVALUATED',reason:'official-service-transport-unavailable'});
  console.warn('PLANO_SOURCE_UNAVAILABLE: transport failed after retries; NO official geometry or feeder validation is certified this run. Independent release gate stays NO_GO.');
 }else{
  writeHealth({status:'DATA_OR_SOURCE_CONTRACT_FAILURE',verificationCompleted:false,
   mismatchStatus:'REQUIRES_REVIEW'});
  console.error('PLANO_SOURCE_CHECK_FAILED '+String(e?.message||e));
  process.exitCode=1;
 }
}
