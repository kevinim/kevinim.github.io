'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {context,response,flush}=require('./helpers/bounded-context.cjs');
test('all dashboard entry points load a fresh bounded-reader guard before their consumer',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const page of ['index.html','reviewed.html','rent-map-uat.html','redfin-uat.html','school-grade-uat.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',page),'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(x=>x[1]);
  const guard=scripts.findIndex(x=>x==='./features/commute/provider-requests.js?v=2');
  const consumer=scripts.findIndex(x=>/\/(dashboard-main|reviewed-bootstrap)\.js/.test(x));
  assert.ok(guard>=0&&guard<consumer,page+': cached old guard must not precede the new consumer');
 }
});
for(const pendingUrl of ['dfw-demographics.json','dfw-outside-public.json']){
 test('bootstrap initializes once after '+pendingUrl+' exceeds its deadline',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let finishLate;
  const h=context(url=>String(url).endsWith(pendingUrl)?new Promise(r=>{finishLate=r}):Promise.resolve(response({year:2024,data:[],shapes:{features:[]},race:{}})));
  const task=h.listeners.DOMContentLoaded[0]();await flush();
  assert.equal(h.ctx.__inits,0);
  t.mock.timers.tick(12000);await flush();
  assert.equal(h.ctx.__inits,1,'fallback controls must initialize at the deadline');
  await task;finishLate(response({year:2024,data:[],shapes:{features:[]},race:{}}));await flush();
  assert.equal(h.ctx.__inits,1,'late data must not initialize or merge a second time');
 });
}
test('completed polygon sources become ready without waiting for Plano feeder reference',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const h=context(url=>{
  if(String(url).includes('plano-official-feeder'))return new Promise(()=>{});
  if(String(url).includes('static.friscoisd.org'))return Promise.resolve(response({}));
  return Promise.reject(new Error('synthetic unavailable source'));
 });
 h.run("loadPlanoLiveFinder=async()=>{throw Error('synthetic unavailable')};convertFriscoZones=()=>[{properties:{school:'Synthetic school'}}];validPlanoFeederReference=()=>true;");
 const task=h.ctx.loadBoundaryData();await flush();await flush();
 assert.equal(h.run('state.zoneReady'),true,'optional feeder must not block polygon completion');
 assert.equal(h.run("state.sourceStatus.FISD.polygon"),'ready');
 assert.equal(h.run("state.sourceStatus.PISD_LOOKUP.feeder"),'loading');
 await task;
 t.mock.timers.tick(12000);await flush();
});
test('one pending polygon does not hide a completed district readiness',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const h=context(url=>{
  if(String(url).includes('metrostudygis'))return new Promise(()=>{});
  if(String(url).includes('static.friscoisd.org'))return Promise.resolve(response({}));
  return Promise.reject(new Error('synthetic unavailable source'));
 });
 h.run("loadPlanoLiveFinder=async()=>{throw Error('synthetic unavailable')};convertFriscoZones=()=>[{properties:{school:'Synthetic school'}}];");
 h.ctx.loadBoundaryData();await flush();await flush();
 assert.equal(h.run("state.sourceStatus?.FISD?.polygon"),'ready');
 assert.equal(h.run("state.sourceStatus?.LISD?.polygon"),'loading');
 assert.equal(h.run('state.zoneReady'),false);
 t.mock.timers.tick(20000);await flush();
});

test('district source loader uses parsed JSON from TxBoundedJson, not Response.json()',async()=>{
 const h=context(url=>String(url).includes('static.friscoisd.org')
  ?Promise.resolve(response({source:'synthetic-current'}))
  :Promise.reject(new Error('unrelated GIS source offline')));
 h.run("convertFriscoZones=j=>j.source==='synthetic-current'?[{properties:{school:'SYNTHETIC'}}]:[]");
 await h.ctx.loadBoundaryData(['FISD']);
 assert.equal(h.run('state.zoneData.FISD.length'),1);
 assert.equal(h.run('state.sourceStatus.FISD.polygon'),'ready');
 assert.equal(h.run('state.zoneLoadErrors.FISD'),undefined);
});
