#!/usr/bin/env node
// Recheck official Prosper ISD's public live map-click API against saved
// 2026–27 GeoJSON zone shapes and the 43 independent QA coordinates.
// Run: node scripts/check-prosper-official-locator.mjs
// Network required; do not run as part of offline PR QA.
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const fixture=read('tests/prosper-official-location-checks-2026.json');
const current=read('prosper-attendance-2026.geojson');
function ringHas(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function geometryHas(p,g){
 return g.coordinates.some(poly=>ringHas(p,poly[0])&&!poly.slice(1).some(r=>ringHas(p,r)));
}
async function lookup(test){
 const {position,gradeLevel,expectedCode}=test;
 const u=new URL(fixture.metadata.officialSearchUrl);
 for(const [k,v] of Object.entries({clientId:fixture.metadata.clientId,x:position[0].toFixed(8),y:position[1].toFixed(8),schoolId:-1,gradeId:-1}))u.searchParams.set(k,String(v));
 const r=await fetch(u,{signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('HTTP '+r.status);
 const j=await r.json();
 if(j.resultCode!==200)throw Error('Result code '+j.resultCode);
 const officialCodes=(j.schools||[]).map(s=>String(s.schoolCode).padStart(3,'0'));
 if(!officialCodes.includes(expectedCode))throw Error('Official search omitted '+gradeLevel+'/'+expectedCode+'; returned '+officialCodes.join(','));
 const matches=current.features.filter(f=>f.properties.gradeLevel===gradeLevel&&geometryHas(position,f.geometry));
 if(matches.length!==1||matches[0].properties.schoolCode!==expectedCode)
  throw Error('GIS geometry mismatch at '+JSON.stringify(position)+' expected '+expectedCode+' found '+matches.map(x=>x.properties.schoolCode).join(','));
 return true;
}
if(fixture.cases.length!==43||fixture.cases.filter(x=>x.type==='interior').length!==31||fixture.cases.filter(x=>x.type==='boundary').length!==12)throw Error('Unexpected official QA case count');
let passed=0,errors=[];
for(let i=0;i<fixture.cases.length;i+=6){
 const batch=await Promise.allSettled(fixture.cases.slice(i,i+6).map(lookup));
 for(let k=0;k<batch.length;k++){
  const x=batch[k];if(x.status==='fulfilled')passed++;
  else errors.push({case:i+k,code:fixture.cases[i+k].expectedCode,reason:String(x.reason)});
 }
}
console.log('Prosper 2026–27 official locator: '+passed+'/'+fixture.cases.length+' checks passed.');
if(errors.length){console.error(errors);process.exitCode=1}
