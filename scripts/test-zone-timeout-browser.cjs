#!/usr/bin/env node
'use strict';
// Regression: one hung external finder server must not leave every district
// "loading" forever. The MetroStudy portal (Lewisville + McKinney finders) is
// made to never respond; with a short test timeout the dashboard must finish
// loading, keep other districts working and explain the failed ones.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE=process.env.SITE_URL||'http://127.0.0.1:8765/';
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.addInitScript(()=>{window.__zoneFetchTimeoutMs=2500});
  await page.route('**/portal.metrostudygis.com/**',()=>{/* hang: never fulfil */});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&state.zoneReady===true,null,{timeout:60000});
  const s=await page.evaluate(()=>({frisco:(state.zoneData.FISD||[]).length,lisdErr:state.zoneLoadErrors.LISD||'',mkErr:state.zoneLoadErrors['043907']||'',failed:!!state.assignmentLoadFailed}));
  assert.ok(s.frisco>50,'other districts still load: '+JSON.stringify(s));
  assert.ok(s.lisdErr&&s.mkErr,'hung sources become explicit errors: '+JSON.stringify(s));
  const note=await page.evaluate(async()=>{zoneGroup.clearLayers();await schoolClicked(state.schools.find(x=>x.district==='043907'&&x.type==='elementary'));await new Promise(r=>setTimeout(r,300));return document.getElementById('zoneNotice').innerText});
  assert.ok(!note.includes('불러오는 중'),'McKinney school must not stay "loading": '+note);
  assert.ok(note.includes('로딩되지 않았습니다'),'McKinney school explains the load failure: '+note);
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS hung finder server: loading completes, other districts work, failed districts explained '+JSON.stringify(s));
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL zone timeout browser QA: '+String(e.stack||e));process.exitCode=1});
