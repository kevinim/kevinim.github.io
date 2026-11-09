#!/usr/bin/env node
// Read-only audit against the LIVE GitHub Pages origin. No house/workplace
// address is sent; no page state is mutated. Never print old file contents.
import assert from 'node:assert/strict';

const ORIGIN='https://kevinim.github.io';
const retired=[
  {name:'legacy-commute-isochrone',path:'/jpm-60min-isochrone-2026-11-04.geojson'},
  {name:'legacy-commute-time',path:'/jpm-road-times-2026-11-04.json'},
  {name:'legacy-outside-zip',path:'/jpm-outside-dfw.json'}
];
const marker=String(Date.now());
async function get(path,cacheBust=false){
 const url=new URL(path,ORIGIN);
 if(cacheBust)url.searchParams.set('audit',marker);
 const response=await fetch(url,{
  redirect:'manual',
  headers:{'Cache-Control':'no-cache','Pragma':'no-cache'},
  signal:AbortSignal.timeout(20000)
 });
 return response;
}
async function main(){
 const main=await get('/');
 assert.equal(main.status,200,'public homepage did not respond successfully');
 const html=await main.text();
 assert.match(html,/<input\s+id="destination"\s+value=""/);
 assert.match(html,/<option\s+value="custom"\s+selected>/);
 assert.match(html,/id="oneHourOverlay"\s+hidden\s+disabled/);
 assert.doesNotMatch(html,/JPM_ADDRESS|jpmMinutes|8181\s+Communications/i);
 const source=await get('/dashboard-main.js',true);
 assert.equal(source.status,200,'public JS missing');
 const code=await source.text();
 assert.ok(code.length>40000,'unexpectedly tiny JS response');
 assert.doesNotMatch(code,/JPM_ADDRESS|jpmMinutes|jpm-(?:road-times|60min-isochrone|outside-dfw)|8181\s+Communications/i);
 const results=[];
 for(const entry of retired){
  const plain=await get(entry.path);
  const fresh=await get(entry.path,true);
  results.push({name:entry.name,status:plain.status,cacheBypassStatus:fresh.status});
  assert.ok([404,410].includes(plain.status),entry.name+': retired asset still HTTP-accessible or unexpectedly redirected, status='+plain.status);
  assert.ok([404,410].includes(fresh.status),entry.name+': retired asset still HTTP-accessible with cache-bust, status='+fresh.status);
 }
 const oldPage=await get('/reviewed.html');
 // Legacy entry-point status is informational pending a separate release decision.
 console.log('LIVE_PUBLIC_PRIVACY_AUDIT_PASS '+JSON.stringify({
  origin:ORIGIN,html:main.status,js:source.status,retired:results,
  legacyReviewedEntryPointHttpStatus:oldPage.status,
  historicGitObjectsNotPurged:true
 }));
}
main().catch(e=>{console.error('LIVE_PUBLIC_PRIVACY_AUDIT_FAIL: '+(e?.message||String(e)));process.exitCode=1});
