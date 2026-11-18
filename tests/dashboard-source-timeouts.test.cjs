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
  ?Promise.resolve(response([{source:'synthetic-current'}]))
  :Promise.reject(new Error('unrelated GIS source offline')));
 h.run("convertFriscoZones=j=>Array.isArray(j)&&j[0].source==='synthetic-current'?[{properties:{school:'SYNTHETIC'}}]:[]");
 await h.ctx.loadBoundaryData(['FISD']);
 assert.equal(h.run('state.zoneData.FISD.length'),1);
 assert.equal(h.run('state.sourceStatus.FISD.polygon'),'ready');
 assert.equal(h.run('state.zoneLoadErrors.FISD'),undefined);
});

test('McKinney live Finder polygon source JSON makes all E/M/H school levels ready',async()=>{
 const zones=[
  ...Array.from({length:17},(_,i)=>({properties:{gradeLevel:'elementary',school:'E'+i}})),
  ...Array.from({length:5},(_,i)=>({properties:{gradeLevel:'middle',school:'M'+i}})),
  ...Array.from({length:3},(_,i)=>({properties:{gradeLevel:'high',school:'H'+i}}))
 ];
 const raw={operationalLayers:[{title:'Elementary Boundaries',featureCollection:{
  layers:[{featureSet:{features:Array.from({length:17},()=>({attributes:{SCHL_YEAR:'2026-27'}}))}}]
 }}]};
 const h=context(url=>String(url).includes('23b28d101ba947498650f6c7b9ef251b')
  ?Promise.resolve(response(raw))
  :Promise.reject(new Error('unrelated source not requested')));
 h.ctx.__syntheticMcKinneyZones=zones;
 h.run('convertMetrostudyZones=()=>__syntheticMcKinneyZones');
 await h.ctx.loadBoundaryData(['043907']);
 assert.equal(h.run("state.sourceStatus['043907'].polygon"),'ready');
 assert.equal(h.run("state.liveFinder['043907']"),true);
 assert.equal(h.run("state.zoneData['043907'].length"),25);
 assert.equal(h.run("state.zoneLoadErrors['043907']"),undefined);
});
