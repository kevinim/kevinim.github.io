'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {context,response,flush}=require('./helpers/bounded-context.cjs');
test('Esri timeout restores search control and presents retry status',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let finishLate;
 const h=context(()=>new Promise(resolve=>{finishLate=resolve}));h.loadHome();
 h.el('homeAddress').value='100 Synthetic Example Dr, Plano, TX';
 const task=h.ctx.searchHome({preventDefault(){}});await flush();
 assert.equal(h.el('homeSearch').disabled,true);
 t.mock.timers.tick(12000);await flush();
 assert.equal(h.el('homeSearch').disabled,false,'search must recover even if fetch ignores AbortSignal');
 assert.match(h.el('homeStatus').textContent,/시간|초과/);await task;
 const message=h.el('homeStatus').textContent;finishLate(response({candidates:[]}));await flush();
 assert.equal(h.el('homeStatus').textContent,message);
 assert.equal(h.run('home'),null);
});
test('explicit geocode cancellation remains AbortError rather than a timeout',async()=>{
 const h=context(()=>new Promise(()=>{}));h.loadHome();
 const controller=new AbortController(),task=h.ctx.geocodeAddress('synthetic query',controller.signal);
 let result='still pending';task.catch(error=>{result=error.name});
 controller.abort();
 await flush();
 assert.equal(result,'AbortError');
});
test('deadline also covers a response whose JSON body never completes',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const h=context(async()=>({ok:true,json:()=>new Promise(()=>{})}));h.loadHome();
 let result=null;const task=h.ctx.geocodeAddress('synthetic query',new AbortController().signal).catch(error=>{result=error.code});
 await flush();t.mock.timers.tick(12000);await flush();
 assert.equal(result,'timeout');await task;
});
test('successful JSON read removes its deadline and does not abort later',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal;
 const h=context(async(_url,init)=>{signal=init.signal;return response({candidates:[]})});h.loadHome();
 const result=await h.ctx.geocodeAddress('synthetic query',new AbortController().signal);
 assert.equal(result.length,0);t.mock.timers.tick(12000);assert.equal(signal.aborted,false);
});
