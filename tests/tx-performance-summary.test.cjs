'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {stats,summarize,providerAllowance}=require('../scripts/summarize-tx-map-performance.cjs');
test('median and range preserve observed values and do not treat missing FCP as zero',()=>{
 assert.deepEqual(stats([5,1,9,3,7]),{count:5,median:5,min:1,max:9});
 assert.deepEqual(stats([8,2]),{count:2,median:5,min:2,max:8});
 assert.deepEqual(stats([null,NaN]),{count:0,median:null,min:null,max:null});
});
function report(n){return {cases:['mobile','desktop'].flatMap(viewport=>['baseline','candidate'].map(label=>({viewport,label,pageErrors:[],samples:['cold','warm'].map(pass=>({pass,coreReadyMs:n*10,dclMs:n,fcpMs:null,transferBytes:n*100,resourceRequests:67,markerRedrawMedianMs:n/10}))})))}}
test('five independent reports aggregate each viewport, revision and cache state separately',()=>{
 const result=summarize([1,2,3,4,5].map(report));
 assert.equal(result.repetitions,5);assert.equal(result.groups.length,8);
 const row=result.groups.find(x=>x.viewport==='mobile'&&x.label==='candidate'&&x.pass==='warm');
 assert.deepEqual(row.metrics.coreReadyMs,{count:5,median:30,min:10,max:50});
 assert.equal(row.metrics.fcpMs.count,0);
 assert.throws(()=>summarize([report(1)]),/five/);
 const bad=[1,2,3,4,5].map(report);bad[2].cases.pop();assert.throws(()=>summarize(bad),/missing|duplicate/);
});
test('provider resource allowance is only the actual new guard relative to baseline',()=>{
 const html='<script src="./features/commute/provider-requests.js?v=99"></script>';
 assert.equal(providerAllowance(html,''),1);assert.equal(providerAllowance(html,html),0);
 assert.equal(providerAllowance('',html),0);
});
