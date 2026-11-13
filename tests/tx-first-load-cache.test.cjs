'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','dashboard-main.js'),'utf8');
const start=source.indexOf('function loadInitialDashboardSources(){');
const end=source.indexOf("document.addEventListener('DOMContentLoaded'",start);
assert.ok(start>0&&end>start,'Production first-load parallel fetch helper must exist');
const helper=source.slice(start,end);

function startRequests(){
 const requests=[],pending=new Map();
 const fetch=(url,opts)=>{
  requests.push({url,opts});
  return new Promise((resolve,reject)=>pending.set(url,{resolve,reject}));
 };
 const start=vm.runInNewContext(helper+'\nloadInitialDashboardSources;', {fetch});
 return {requests,pending,request:start()};
}
const response=data=>({ok:true,json:async()=>data});

test('both independent TX bootstrap JSON requests start concurrently, in source order',async()=>{
 const r=startRequests();
 assert.deepEqual(r.requests.map(x=>x.url),['./dfw-demographics.json','./dfw-outside-public.json']);
 assert.ok(r.requests.every(x=>x.opts.cache==='default'),'Static JSON must respect browser HTTP cache');
 // Resolve second request first; no dependency should block its network start.
 r.pending.get('./dfw-outside-public.json').resolve(response({type:'neighbor'}));
 r.pending.get('./dfw-demographics.json').resolve(response({type:'dfw'}));
 const results=await r.request;
 assert.deepEqual(results.map(x=>x.status),['fulfilled','fulfilled']);
 assert.deepEqual(results.map(x=>x.value.type),['dfw','neighbor']);
});

test('one failed source does not abort the independent source or bootstrap',async()=>{
 const r=startRequests();
 r.pending.get('./dfw-demographics.json').reject(Error('HTTP 503'));
 r.pending.get('./dfw-outside-public.json').resolve(response({type:'neighbor'}));
 const results=await r.request;
 assert.equal(results[0].status,'rejected');
 assert.equal(results[1].status,'fulfilled');
 assert.equal(results[1].value.type,'neighbor');
 assert.match(source,/if\(dfwResult\.status!=='fulfilled'\)throw dfwResult\.reason/);
 assert.match(source,/if\(neighborResult\.status!=='fulfilled'\)throw neighborResult\.reason/);
 assert.match(source,/\binit\(\);\s*\}\);/);
});

test('NCES and TEA ratings use parallel requests, keeping NCES fallback',()=>{
 const start=source.indexOf('async function loadRatings(){');
 const end=source.indexOf('async function loadExtra2026SchoolLocations(){',start);
 assert.ok(start>=0&&end>start);
 const body=source.slice(start,end);
 assert.match(body,/Promise\.allSettled\(\[/);
 assert.match(body,/fetch\('\.\/tea-ratings-2026\.json',\{cache:'default'\}\)/);
 assert.match(body,/fetch\('\.\/nces-locations-2024\.json',\{cache:'default'\}\)/);
 assert.match(body,/if\(ratingsResult\.status!=='fulfilled'\)throw ratingsResult\.reason/);
 assert.match(body,/locationsResult\.status!=='fulfilled'/);
 assert.match(body,/학교 위치 자료 일부를 불러오지 못했습니다/);
});

test('cacheable public static site assets and live publisher requests retain distinct policies',()=>{
 for(const [file,cache] of [
  ['dfw-zcta-boundaries.geojson','default'],
  ['schools.json','default'],
  ['schools2026-1.json','default']
 ]){
  if(file==='schools2026-1.json'){
   assert.match(source,/const paths=\['\.\/schools2026-1\.json'/);
   assert.match(source,/fetch\(path,\{cache:'default'\}\)/);
  }else assert.ok(source.includes("fetch('./"+file+"',{cache:'"+cache+"'})"),file+' browser cache policy');
 }
 // Do not cache or fabricate the official current attendance boundaries.
 assert.ok(source.includes("fetch('./plano-official-feeder-reference-2026.json',{cache:'no-store'})"));
 assert.ok(source.includes('loadBoundaryData()'));
 assert.ok(source.includes('window.ConditionalSchoolRelease'));
});
