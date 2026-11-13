#!/usr/bin/env node
'use strict';
/*
 * Repeatable, read-only TX relocation dashboard browser benchmark.
 * Baseline and candidate are locally served from pinned Git revisions.
 * No private addresses, accounts or real external service lookups are used.
 * Metrics: browser PerformanceNavigationTiming, first contentful paint,
 * core TEA + ZCTA map readiness, same-origin resource transfer and synchronous
 * marker reconciliation CPU. CPU timing is NOT equivalent to visual FPS.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const BASELINE=process.env.TX_PERF_BASELINE_URL||'http://127.0.0.1:8766/';
const CANDIDATE=process.env.TX_PERF_CANDIDATE_URL||'http://127.0.0.1:8765/';
const OUT=path.resolve(process.env.TX_PERF_OUTPUT||'artifacts/performance/tx-map-load.json');
const VIEWPORTS=[{name:'mobile',width:390,height:844},{name:'desktop',width:1366,height:900}];
const waitMs=90000;
function local(url){
 const parsed=new URL(url);
 return ['127.0.0.1','localhost'].includes(parsed.hostname);
}
const rnd=n=>Number.isFinite(n)?Math.round(n*10)/10:null;
async function caseRun(browser,url,viewport,label){
 const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},serviceWorkers:'block',reducedMotion:'reduce'});
 // Block third-party APIs and tile trackers; the CDN only supplies the required
 // pinned Leaflet 1.9.4 JS/CSS so local map code is exercised in Chromium.
 await context.route('**/*',route=>{
  const requestUrl=route.request().url();
  if(local(requestUrl)||requestUrl.startsWith('https://unpkg.com/leaflet@1.9.4/'))return route.continue();
  return route.abort();
 });
 const page=await context.newPage();
 const pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(String(e.message||e).slice(0,240)));
 await page.addInitScript(()=>{
  window.__txPerf={start:performance.now(),longTasks:[]};
  try{
   new PerformanceObserver(list=>{
    for(const entry of list.getEntries())window.__txPerf.longTasks.push({duration:entry.duration,startTime:entry.startTime});
   }).observe({entryTypes:['longtask']});
  }catch{}
 });
 const samples=[];
 for(const pass of ['cold','warm']){
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:waitMs});
  // Core readiness is deliberately independent of remote Finder and GIS:
  // all grades/ZIP shapes/schools must be loaded for the area map.
  await page.waitForFunction(()=>{
   try{return typeof map!=='undefined'&&map?.getSize?.().x>0&&
    typeof state!=='undefined'&&state.schools.length>150&&
    state.ratings.length>500&&Object.keys(state.polys).length>150}
   catch{return false}
  },null,{timeout:waitMs,polling:100});
  const result=await page.evaluate(()=>{
   const p=performance,nav=p.getEntriesByType('navigation')[0];
   const resources=p.getEntriesByType('resource');
   const self=location.origin;
   const sameOrigin=resources.filter(r=>r.name.startsWith(self+'/'));
   const paints=p.getEntriesByType('paint');
   const fcp=paints.find(r=>r.name==='first-contentful-paint')?.startTime||null;
   const sorted=sameOrigin.slice().sort((a,b)=>(b.transferSize||0)-(a.transferSize||0));
   const transfer=sameOrigin.reduce((n,r)=>n+(r.transferSize||0),0);
   const totalDecoded=sameOrigin.reduce((n,r)=>n+(r.decodedBodySize||0),0);
   // After the page is ready, compute real school marker draw JS cost at 12x.
   map.stop();map.setZoom(12,{animate:false});drawSchools();
   const costs=[];
   for(let i=0;i<12;i++){
    const t=p.now();drawSchools();costs.push(p.now()-t);
   }
   costs.sort((a,b)=>a-b);
   return {
    dclMs:nav?.domContentLoadedEventEnd??null,
    fcpMs:fcp,
    coreReadyMs:p.now(),
    schoolCount:state.schools.length,ratedCount:state.ratings.length,
    zipShapes:Object.keys(state.polys).length,
    visibleMarkerCount:schoolGroup.getLayers().length,
    resourceRequests:sameOrigin.length,
    transferBytes:transfer,decodedBytes:totalDecoded,
    longestTasksMs:window.__txPerf.longTasks.sort((a,b)=>b.duration-a.duration).slice(0,3),
    markerRedrawMedianMs:costs[Math.floor(costs.length/2)],
    markerRedrawWorstMs:costs[costs.length-1],
    topTransferred:sorted.slice(0,5).map(r=>({name:new URL(r.name).pathname,bytes:r.transferSize,durationMs:r.duration}))
   };
  });
  samples.push({pass,...result});
 }
 await context.close();
 return {label,viewport:viewport.name,samples,pageErrors};
}
function percent(base,next){
 if(!(base>0)||!Number.isFinite(next))return 'n/a';
 return rnd((next/base-1)*100)+'%';
}
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const cases=[];
  for(const v of VIEWPORTS){
   for(const [label,url] of [['baseline',BASELINE],['candidate',CANDIDATE]]){
    const result=await caseRun(browser,url,v,label);
    cases.push(result);
    console.log('TX MAP PERF',v.name,label,JSON.stringify(result.samples.map(x=>({
     pass:x.pass,dcl:rnd(x.dclMs),fcp:rnd(x.fcpMs),
     coreReady:rnd(x.coreReadyMs),staticTransfer:x.transferBytes,
     requests:x.resourceRequests,markers:x.visibleMarkerCount,
     redrawMs:rnd(x.markerRedrawMedianMs)
    }))));
   }
  }
  const comparisons=[];
  for(const v of VIEWPORTS)for(const pass of ['cold','warm']){
   const before=cases.find(x=>x.viewport===v.name&&x.label==='baseline').samples.find(x=>x.pass===pass);
   const after=cases.find(x=>x.viewport===v.name&&x.label==='candidate').samples.find(x=>x.pass===pass);
   const row={viewport:v.name,pass,
    baselineReadyMs:rnd(before.coreReadyMs),candidateReadyMs:rnd(after.coreReadyMs),
    coreReadyChange:percent(before.coreReadyMs,after.coreReadyMs),
    baselineDclMs:rnd(before.dclMs),candidateDclMs:rnd(after.dclMs),
    baselineFcpMs:rnd(before.fcpMs),candidateFcpMs:rnd(after.fcpMs),
    baselineTransferredKB:rnd(before.transferBytes/1024),
    candidateTransferredKB:rnd(after.transferBytes/1024),
    transferChange:percent(before.transferBytes,after.transferBytes),
    baselineMarkerRedrawMs:rnd(before.markerRedrawMedianMs),
    candidateMarkerRedrawMs:rnd(after.markerRedrawMedianMs)};
   comparisons.push(row);
   assert.ok(after.schoolCount>=before.schoolCount*.95,'School directory shrank: '+JSON.stringify(row));
   assert.ok(after.ratedCount>=before.ratedCount*.95,'Official TEA data shrank: '+JSON.stringify(row));
   assert.ok(after.zipShapes>=before.zipShapes*.95,'ZIP geometry missing: '+JSON.stringify(row));
   assert.ok(after.visibleMarkerCount>0,'No rendered TX school markers: '+JSON.stringify(row));
   // Guard only catastrophic regressions. Report variation; one CI runner is NOT
   // a scientifically stable performance experiment and should not gate small deltas.
   assert.ok(after.coreReadyMs<Math.max(before.coreReadyMs*2.5,20000),
    'Critical map readiness >2.5x baseline or 20s: '+JSON.stringify(row));
  }
  const output={scope:'Texas relocation / Area Intelligence (not job-search)',
   measuredAt:new Date().toISOString(),environment:'GitHub Actions Linux Chromium, local HTTP',
   methodology:'1 cold and 1 warm navigation per viewport and revision; third-party APIs offline except pinned Leaflet CDN; no real address searches',
   limitations:['Single-run results are directional, not statistical proof',
     'Local HTTP hosting does not reproduce GitHub Pages CDN/cache headers',
     'Core readiness excludes live official Finder boundary verification',
     'Sync marker redraw CPU is not visual FPS or user-visible interaction latency'],
   cases,comparisons};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(output,null,2)+'\n');
  const summary=['### TX relocation map baseline vs candidate — Chromium local benchmark','','| Viewport | Visit | Base map ready (ms) | Candidate (ms) | Change | Base transfer (KB) | Candidate (KB) |','|---|---|---:|---:|---:|---:|---:|'];
  for(const row of comparisons)summary.push('| '+[row.viewport,row.pass,row.baselineReadyMs,row.candidateReadyMs,row.coreReadyChange,row.baselineTransferredKB,row.candidateTransferredKB].join(' | ')+' |');
  summary.push('','Local Chromium, one cold and one warm run per viewport; network noise; third-party APIs off. See JSON artifact for FCP, DCL, resource detail and limitations.\n');
  console.log(summary.join('\n'));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary.join('\n')+'\n');
 }catch(e){console.error('TX map performance budget FAILED:',e.stack||e);process.exitCode=1}
 finally{await browser?.close()}
})();
