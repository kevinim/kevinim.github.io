#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const METRICS=['coreReadyMs','dclMs','fcpMs','transferBytes','resourceRequests','markerRedrawMedianMs'];
function stats(values){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b),n=sorted.length;
 return {count:n,median:n?(n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2):null,min:n?sorted[0]:null,max:n?sorted[n-1]:null};
}
function providerAllowance(candidate,baseline){
 const has=html=>/<script\b[^>]*src=["'][^"']*\/features\/commute\/provider-requests\.js(?:\?[^"']*)?["']/i.test(html);
 return has(candidate)&&!has(baseline)?1:0;
}
function summarize(reports){
 assert.equal(reports.length,5,'Exactly five independent benchmark reports are required');
 const groups=[];
 for(const viewport of ['mobile','desktop'])for(const label of ['baseline','candidate'])for(const pass of ['cold','warm']){
  const samples=reports.map(report=>{
   const cases=report.cases.filter(x=>x.viewport===viewport&&x.label===label);
   assert.equal(cases.length,1,'missing or duplicate benchmark case');
   const rows=cases[0].samples.filter(x=>x.pass===pass);
   assert.equal(rows.length,1,'missing or duplicate cold/warm sample');
   assert.ok(Number.isFinite(rows[0].coreReadyMs),'invalid readiness measurement');
   return rows[0];
  });
  groups.push({viewport,label,pass,metrics:Object.fromEntries(METRICS.map(key=>[key,stats(samples.map(x=>x[key]))]))});
 }
 return {repetitions:5,methodology:'Five independent browser processes, each with a new context per viewport/revision; cold then warm navigation in that context. Report medians and observed ranges; no statistical significance claim.',groups};
}
function markdown(result){
 const round=n=>n===null?'n/a':Math.round(n*10)/10;
 const lines=['### TX map performance: five repeated comparisons','','| Viewport | Revision | Cache | Map ready median [min, max] ms | Transfer median [min, max] bytes |','|---|---|---|---:|---:|'];
 for(const row of result.groups){const ready=row.metrics.coreReadyMs,bytes=row.metrics.transferBytes;
  lines.push('| '+[row.viewport,row.label,row.pass,`${round(ready.median)} [${round(ready.min)}, ${round(ready.max)}]`,`${round(bytes.median)} [${round(bytes.min)}, ${round(bytes.max)}]`].join(' | ')+' |');
 }
 lines.push('','Local Chromium HTTP; third-party APIs offline except pinned Leaflet. Five repetitions expose variation but do not reproduce production CDN/cache or prove statistical significance. Full metrics and per-run data are attached.');
 return lines.join('\n')+'\n';
}
if(require.main===module){
 const dir=path.resolve(process.env.TX_PERF_ARTIFACT_DIR||'artifacts/performance');
 const reports=Array.from({length:5},(_,i)=>JSON.parse(fs.readFileSync(path.join(dir,'tx-map-load-'+(i+1)+'.json'),'utf8')));
 const result=summarize(reports);
 result.baselineSha=process.env.TX_PERF_BASELINE_SHA||null;result.candidateSha=process.env.GITHUB_SHA||null;
 fs.writeFileSync(path.join(dir,'tx-map-summary.json'),JSON.stringify(result,null,2)+'\n');
 console.log('TX MAP PERF SUMMARY '+JSON.stringify(result));console.log(markdown(result));
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown(result));
}
module.exports={stats,summarize,providerAllowance};
