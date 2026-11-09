#!/usr/bin/env node
'use strict';
// Isolated PR-browser QA. Do not use personal/home addresses.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const base=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const result={scenarios:[],screenshots:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:980}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   // Prevent tile traffic; location/route service must not receive user addresses.
   await page.route(/tile\.openstreetmap\.org|server\.arcgisonline\.com/,r=>r.fulfill({status:200,body:'',contentType:'image/png'}));
   await page.goto(base+'?area-qa='+width,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#areaQuickAssessment').waitFor({state:'visible',timeout:30000});
   assert.equal(await page.locator('.area-qa-row').count(),4);
   assert.equal(await page.locator('.kpis').isVisible(),false,'redundant KPI cards must be hidden');
   await page.waitForFunction(()=>document.querySelector('.area-qa-row:nth-child(2) .area-qa-value')?.textContent?.includes('County'),null,{timeout:30000});
   assert.match(await page.locator('.area-qa-intro').innerText(),/주소 배정/);
   await page.selectOption('#zipSelect','75013');
   await page.waitForFunction(()=>document.querySelector('.area-qa-zip')?.textContent?.includes('75013'),null,{timeout:20000});
   assert.equal((await page.locator('#k-zip').innerText()).trim(),'75013');
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools.length>20&&
      typeof state.ratingIndex!=='undefined'&&typeof map!=='undefined'&&!!map,null,{timeout:90000});
   await page.locator('button[data-target="schools"].area-qa-row').click();
   assert.equal(await page.locator('#schoolOverlay').isChecked(),true);
   if(width===1280){
     const markers=await page.evaluate(()=>({allen:state.schools.filter(s=>s.district==='AISD'&&Array.isArray(s.ll)).length,
       displayed:schoolGroup.getLayers().length,zoom:map.getZoom()}));
     assert.ok(markers.allen>=20,'Allen campus location baseline regression');
     // Marker visibility is tied to actual viewport/zoom/filters; zero at
     // Allen-selected visible viewport is a release blocker.
     await page.evaluate(()=>selectZip('75013'));
     const visible=await page.evaluate(()=>schoolGroup.getLayers().length);
     assert.ok(visible>0,'Allen visible school marker regression');
   }
   await page.selectOption('#officeSelect','schwab');
   await page.waitForFunction(()=>document.querySelector('.area-qa-row[data-target="commute"] .area-qa-value')?.textContent?.includes('별도 계산'),null,{timeout:10000});
   await page.locator('button[data-target="hazards"].area-qa-row').click();
   assert.equal(await page.locator('#femaHazardEnabled').isChecked(),true,'hazard button must enable existing layer');
   assert.ok(!errors.length,'Browser errors: '+errors.join(' ; '));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'Horizontal overflow at '+width+': '+overflow);
   mkdirSync('artifacts/area-assessment',{recursive:true});
   const shot='artifacts/area-assessment/'+width+'.png';
   await page.screenshot({path:shot,fullPage:false});result.screenshots.push(shot);
   result.scenarios.push({width,selectedZip:'75013',overflow});
   await page.close();
  }
 }finally{
  await browser.close();
  mkdirSync('artifacts/area-assessment',{recursive:true});
  writeFileSync('artifacts/area-assessment/report.json',JSON.stringify(result,null,2));
 }
 console.log('area assessment browser QA passed',JSON.stringify(result.scenarios));
})().catch(e=>{console.error(e);process.exitCode=1});
