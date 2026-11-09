#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const base=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const report={viewports:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:940}});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route(/tile\.openstreetmap\.org|server\.arcgisonline\.com/,r=>r.fulfill({status:200,body:'',contentType:'image/png'}));
   await page.goto(base+'?region-compare-test='+width,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#regionCompare').waitFor({state:'visible',timeout:30000});
   await page.waitForFunction(()=>document.querySelector('#regionCompareTable thead')?.querySelectorAll('th').length===4,null,{timeout:30000});
   const defaults=await page.locator('.region-compare-select').evaluateAll(items=>items.map(x=>x.value));
   assert.deepEqual(defaults,['75013','75034','75093']);
   assert.equal(await page.locator('#regionCompareTable tbody tr th').count()>5,true);
   // Source not location-level: confirmed FBI municipality and duplicated NOAA county.
   await page.waitForFunction(()=>{
     const text=document.querySelector('#regionCompareTable')?.textContent||'';
     return text.includes('FBI 2025 · Allen 시 전체')&&
       text.includes('FBI 2025 · Frisco 시 전체')&&
       text.includes('FBI 2025 · Plano 시 전체')&&
       text.includes('NOAA 2024–25 · Collin County');
   },null,{timeout:60000});
   const sourceClaims=await page.locator('.region-compare-foot').innerText();
   assert.match(sourceClaims,/동일|같은 카운티/);
   assert.match(sourceClaims,/ZIP별 위험도/);
   await page.locator('.region-compare-select[data-slot="2"]').selectOption('75006');
   await page.waitForFunction(()=>document.querySelector('#regionCompareTable thead')?.textContent?.includes('75006'),null,{timeout:15000});
   await page.waitForFunction(()=>document.querySelector('#regionCompareTable')?.textContent?.includes('FBI 2025 · Carrollton 시 전체'),null,{timeout:20000});
   const before=await page.locator('#regionCompareTable thead th').count();
   assert.equal(before,4);
   // Prevent duplicate ZIPs.
   await page.locator('.region-compare-select[data-slot="1"]').selectOption('75013');
   assert.equal(await page.locator('.region-compare-select[data-slot="1"]').inputValue(),'75034');
   assert.match(await page.locator('#regionCompareStatus').innerText(),/중복/);
   await page.locator('#regionCompareThird').click();
   await page.waitForFunction(()=>document.querySelectorAll('#regionCompareTable thead th').length===3,null,{timeout:15000});
   assert.equal(await page.locator('.region-compare-select[data-slot="2"]').isVisible(),false);
   await page.locator('#regionCompareThird').click();
   await page.waitForFunction(()=>document.querySelectorAll('#regionCompareTable thead th').length===4,null,{timeout:15000});
   assert.equal(await page.locator('.region-compare-select[data-slot="2"]').isVisible(),true);
   // Map-facing ZIP swap is explicitly user-triggered and does not alter home address candidates.
   await page.locator('#regionCompareTable button[data-map-zip="75013"]').click();
   await page.waitForFunction(()=>document.querySelector('#k-zip')?.textContent?.trim()==='75013',null,{timeout:25000});
   await page.waitForFunction(()=>typeof state!=='undefined'&&Array.isArray(state.schools)&&state.schools.length>20&&
     typeof map!=='undefined'&&map,null,{timeout:80000});
   if(width===1280){
     const markerCount=await page.evaluate(()=>schoolGroup.getLayers().length);
     assert.ok(markerCount>0,'Allen marker set must not be emptied by comparison navigation');
   }
   // Reuse current map selection in candidate C, no address lookup.
   await page.selectOption('#zipSelect','75024');
   await page.locator('#regionCompareAddCurrent').click();
   await page.waitForFunction(()=>document.querySelector('.region-compare-select[data-slot="2"]')?.value==='75024',null,{timeout:15000});
   assert.ok(!errors.length,'Browser JS errors: '+errors.join(' | '));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'Page horizontal overflow '+overflow+'px at '+width);
   mkdirSync('artifacts/region-compare',{recursive:true});
   const screenshot='artifacts/region-compare/'+width+'.png';
   await page.locator('#regionCompare').screenshot({path:screenshot});
   report.viewports.push({width,overflow,defaults,sourceClaimsChecked:true,screenshot});
   await page.close();
  }
 }finally{
   await browser.close();
   mkdirSync('artifacts/region-compare',{recursive:true});
   writeFileSync('artifacts/region-compare/qa.json',JSON.stringify(report,null,2));
 }
 console.log('Regional comparison browser QA PASS '+JSON.stringify(report.viewports));
})().catch(err=>{console.error(err);process.exitCode=1});
