#!/usr/bin/env node
// Live regression check. Network required; intentionally NOT included in offline CI.
// Run: node scripts/check-public-address-finders-live.mjs
// Frisco official Finder UI results are recorded snapshots, NOT live API responses.
// Prosper official Infofinder is directly queried on every run.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {inFriscoBorder,inGeometry,schoolKey}=require('./attendance-geo-audit.cjs');
const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const samples=read('tests/public-address-finder-crosscheck-2026.json').records;
async function json(url){
 const res=await fetch(url,{signal:AbortSignal.timeout(27000),cache:'no-store'});
 if(!res.ok)throw Error(url+' HTTP '+res.status);
 const data=await res.json();if(data?.error)throw Error(JSON.stringify(data.error));
 return data;
}
const [frisco,prosper]=await Promise.all([
 json('https://static.friscoisd.org/js/json/school.borders.2627.json'),
 json('https://kevinim.github.io/prosper-attendance-2026.geojson')
]);
if(!Array.isArray(frisco)||frisco.length!==75||prosper?.features?.length!==31)throw Error('Official GIS coverage count changed; review before claiming validation');
let good=0,errors=[];
for(const item of samples){
 try{
  const u=new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
  for(const [k,v] of Object.entries({SingleLine:item.address,f:'json',outFields:'Match_addr,Addr_type,Region,Postal',maxLocations:'3',countryCode:'USA',forStorage:'false'}))u.searchParams.set(k,v);
  const candidates=await json(u);
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
   const official=await json(officialUrl);
   if(official.resultCode!==200||!Array.isArray(official.schools)||official.schools.length!==3)throw Error('Official Infofinder response invalid');
   const officialCodes=official.schools.map(s=>String(s.schoolCode||'').padStart(3,'0')).sort();
   const expected=Object.values(item.officialCodes).sort();
   if(Object.keys(actual).length!==3||['elementary','middle','high'].some(k=>actual[k]!==item.gisCodes[k])||JSON.stringify(officialCodes)!==JSON.stringify(expected))throw Error('Prosper official/GIS disagreement: '+JSON.stringify({actual,officialCodes}));
  }else throw Error('unsupported district');
  good++;console.log('MATCH '+item.district+' '+item.address);
 }catch(err){errors.push({address:item.address,reason:String(err)});console.error('FAIL '+item.address+' '+err)}
}
console.log('PUBLIC ADDRESS CHECK: '+good+'/'+samples.length+' matched; '+errors.length+' need review. Public facilities are not residential enrollment approvals.');
if(errors.length)process.exitCode=1;
