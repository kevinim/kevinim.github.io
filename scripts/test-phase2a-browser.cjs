#!/usr/bin/env node
'use strict';
// Free GitHub Actions regression smoke test of the real browser risk-map UI.
const {chromium}=require('playwright');
const {mkdirSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 let browser;
 const dir='artifacts/phase2a-browser';
 mkdirSync(dir,{recursive:true});
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1380,height:1040},deviceScaleFactor:1});
  let riskFetches=0;
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,280)));
  page.on('request',r=>{if(r.url().includes('phase2a-fema-nri-dfw-2025.geojson'))riskFetches++});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForSelector('.leaflet-container',{timeout:80000});
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),false);
  assert.equal(riskFetches,0,'FEMA snapshot must not load during the initial dashboard render');
  assert.equal(await page.locator('#lisdApartmentSection').count(),0,'Unwanted Lewisville panel reappeared');
  assert.equal(await page.locator('#cfbFeederSection').count(),0,'Unwanted CFB feeder panel reappeared');
  await page.locator('#phase2HazardPanel > summary').click();
  await page.locator('#femaHazardEnabled').check();
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('Census tract')&&
   document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),{timeout:0},{timeout:80000});
  assert.equal(riskFetches,1,'One official risk snapshot must be requested after opt-in');
  assert.equal(await page.locator('#zipOverlay').isChecked(),false,'ZIP demographic shading must be temporarily hidden');
  const legend=page.locator('#femaHazardLegend');
  assert.equal(await legend.isVisible(),true);
  assert.ok((await legend.innerText()).includes('내륙 홍수'));
  assert.ok((await legend.innerText()).includes('FEMA NRI 2025'));
  const painted=await page.locator('#femaHazardLegend .fema-legend-swatches span').allTextContents();
  assert.equal(painted.length,5,'Exactly 5 sequential red severity levels, not 7 mixed statuses');
  assert.equal(await page.locator('#femaHazardLegend .fema-legend-absent div').count(),2);
  assert.ok((await legend.innerText()).includes('자료 없음:'));
  assert.ok((await legend.innerText()).includes('등급 없음:'));
  const colors=await page.locator('#femaHazardLegend .fema-legend-swatches i').evaluateAll(els=>els.map(x=>getComputedStyle(x).backgroundColor));
  assert.deepEqual(colors,['rgb(255, 241, 241)','rgb(255, 209, 209)','rgb(255, 158, 158)','rgb(239, 88, 88)','rgb(185, 28, 28)']);

  await page.selectOption('#femaHazardType','wfir');
  assert.ok((await legend.innerText()).includes('산불'));
  assert.ok((await legend.innerText()).includes('등급 없음:'));
  await page.locator('#femaHazardOpacity').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.selectOption('#femaHazardType','hrcn');
  assert.ok((await legend.innerText()).includes('허리케인'));
  await page.locator('#femaHazardEnabled').uncheck();
  assert.equal(await legend.isVisible(),false);
  assert.equal(await page.locator('#zipOverlay').isChecked(),true,'Original ZIP overlay should be restored when hazard layer disabled');
  await page.locator('#femaHazardEnabled').check();
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),{timeout:0},{timeout:40000});
  assert.equal(riskFetches,1,'Re-enabling must reuse cached risk data without another request');
  await page.screenshot({path:dir+'/fema-overlay.png',timeout:30000});
  console.log('PASS Phase2A browser: full 1,734 tract data loads lazily, flood/wildfire/hurricane switch, official No Rating, ZIP restore, cached reload');
  console.log('Phase2A nonfatal page errors (other providers may be blocked): '+JSON.stringify(errors.slice(0,6)));
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL Phase2A browser QA:',e.stack||e);process.exitCode=1});
