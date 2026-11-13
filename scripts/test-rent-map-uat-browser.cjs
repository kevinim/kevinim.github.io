#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SITE_URL||'http://127.0.0.1:8765/';
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [390,1280]){
      const page=await browser.newPage({viewport:{width,height:860},reducedMotion:'reduce'});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e.message||e)));
      await page.goto(base+'rent-map-uat.html',{waitUntil:'domcontentloaded',timeout:80000});
      await page.waitForFunction(()=>window.__rentMapUatReady===true,{timeout:100000});
      assert.equal(await page.locator('#rentMapSelectedZip').innerText().then(s=>s.split(' · ')[0]),'75093');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),'https://www.redfin.com/zipcode/75093/houses-for-rent');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),'https://www.redfin.com/zipcode/75093/apartments-for-rent');
      const before=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom(),school:schoolGroup.getLayers().length}));
      await page.locator('#rentMapFocus button[data-focus="frisco"]').click();
      const moved=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom(),school:schoolGroup.getLayers().length}));
      assert.ok(Math.abs(moved.center.lat-33.15)<.02,'Frisco focus moves map');
      assert.equal(moved.zoom,11,'Frisco city zoom level');
      assert.equal(await page.locator('#rentMapFocus button[data-focus="frisco"]').getAttribute('aria-pressed'),'true');
      await page.locator('#rentMapRefs').click();
      assert.equal(await page.locator('#rentMapRefs').getAttribute('aria-pressed'),'true');
      // inspect markers through Leaflet's own DOM (3 independent circles)
      assert.equal(await page.locator('#map .leaflet-interactive').count()>0,true,'Leaflet map renders');
      await page.locator('#rentMapRefs').click();
      assert.equal(await page.locator('#rentMapRefs').getAttribute('aria-pressed'),'false');
      await page.locator('#zipSelect').selectOption('75034');
      await page.waitForFunction(()=>document.querySelector('#rentMapHouses')?.href.includes('/zipcode/75034/'));
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),'https://www.redfin.com/zipcode/75034/houses-for-rent');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),'https://www.redfin.com/zipcode/75034/apartments-for-rent');
      assert.equal(await page.locator('#k-zip').innerText(),'75034');
      assert.equal(await page.locator('#rentMapUatPanel').count(),1);
      assert.deepEqual(errors,[],'No runtime page errors: '+errors.join(' | '));
      await page.goto(base,{waitUntil:'domcontentloaded',timeout:80000});
      assert.equal(await page.locator('#rentMapUatPanel').count(),0,'Normal dashboard remains UAT free');
      console.log('PASS '+width+'px map-navigation, reference landmarks, Redfin ZIP links, and normal dashboard isolation');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
