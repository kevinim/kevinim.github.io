#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8765/';
const leafletJs=fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'));
const leafletCss=fs.readFileSync(require.resolve('leaflet/dist/leaflet.css'));

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[],external=[];
   page.on('pageerror',error=>errors.push(String(error)));
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return route.continue();
    if(u.hostname==='unpkg.com'&&/\/leaflet@1\.9\.4\/dist\/leaflet\.js$/.test(u.pathname))
      return route.fulfill({status:200,contentType:'text/javascript',body:leafletJs});
    if(u.hostname==='unpkg.com'&&/\/leaflet@1\.9\.4\/dist\/leaflet\.css$/.test(u.pathname))
      return route.fulfill({status:200,contentType:'text/css',body:leafletCss});
    external.push(u.hostname);
    return route.abort();
   });
   let asset=0;
   page.on('response',r=>{if(r.url().includes('/dashboard-main.js?v=1')&&r.status()===200)asset++});
   try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>typeof map!=='undefined'&&map&&typeof state!=='undefined'&&
      state.schools?.length>0&&document.querySelector('#zipSelect')?.options?.length>3,
      {timeout:25000}).catch(async e=>{const snap=await page.evaluate(()=>({
        map:typeof map,schoolCount:typeof state==='undefined'?'no state':state.schools?.length,
        zipOptions:document.querySelector('#zipSelect')?.options?.length,
        errors:document.querySelector('#mapLoadStatus')?.textContent
      }));throw Error('Main bootstrapping timed out: '+JSON.stringify(snap)+' '+String(e))});
    const b=await page.evaluate(()=>({
      mapReady:!!map && typeof map.getZoom==='function',
      mapContainer:!!document.querySelector('.leaflet-container'),
      markers:schoolGroup.getLayers().length,
      schools:state.schools.length,
      zip:state.zip,
      zipOptions:document.querySelector('#zipSelect').options.length,
      onMap:typeof drawSchools==='function',
      onHome:typeof calculateHomeCommute==='function',
      policy:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content
    }));
    assert.equal(asset,1,'same-origin extracted dashboard-main.js must load exactly once');
    assert.ok(b.mapReady&&b.mapContainer&&b.onMap&&b.onHome,'map/home globals must be initialized');
    assert.ok(b.schools>0&&b.zipOptions>3,'school directory and ZIP filter must populate');
    assert.match(b.policy||'',/script-src 'self' https:\/\/unpkg\.com 'unsafe-inline'/,
      'CSP remains unchanged pending event-handler refactor');
    assert.ok(b.markers>=0,'school layer object exists');

    const selections=await page.locator('#zipSelect option').evaluateAll(
      elements=>elements.map(x=>x.value).filter(Boolean));
    const next=selections.find(x=>x!==b.zip);
    assert.ok(next,'second ZIP option exists');
    await page.locator('#zipSelect').selectOption(next);
    assert.equal(await page.evaluate(()=>state.zip),next,'ZIP change event still works');
    await page.locator('#schoolScope').selectOption('all');
    const school=page.locator('#schoolList button.school').first();
    await school.waitFor({timeout:25000});
    await school.click();
    const picked=await page.evaluate(()=>({
      selected:state.selectedSchool?.name||null,
      text:document.querySelector('#detailContent')?.innerText||''
    }));
    assert.ok(picked.selected&&picked.text.includes(picked.selected),
      'school click and detail must survive JS extraction');
    assert.ok(errors.every(x=>!/(ReferenceError|SyntaxError|not defined|Cannot access)/i.test(x)),
      'no bootstrap load-order errors: '+JSON.stringify(errors.slice(0,8)));
    console.log('PASS main extracted JS loads exactly once, map + ZIP + school click + address UI ready, width='+width);
    console.log('NOTE third-party test traffic blocked, count='+external.length);
   }finally{await page.close();}
  }
  console.log('PASS offline staged main-bootstrap smoke, mobile + desktop. NOT a full school assignment test.');
 }finally{await browser.close();}
})().catch(e=>{console.error('Bootstrap browser QA failed:',e.stack||String(e));process.exitCode=1});
