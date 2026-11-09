#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const base=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={viewports:[]};
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:960}});
   const errors=[],epaCalls=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route(/tile\.openstreetmap\.org|server\.arcgisonline\.com/,r=>
     r.fulfill({status:200,body:'',contentType:'image/png'}));
   await page.route('https://www.fueleconomy.gov/ws/rest/vehicle/**',async r=>{
     const url=r.request().url();epaCalls.push(url);
     let body=null;
     if(url.includes('/menu/year'))body={menuItem:[{text:'2017',value:'2017'}]};
     else if(url.includes('/menu/make'))body={menuItem:[{text:'Honda',value:'Honda'}]};
     else if(url.includes('/menu/model'))body={menuItem:[{text:'Accord',value:'Accord'}]};
     else if(url.includes('/menu/options'))body={menuItem:[{text:'4 cyl Automatic',value:'38145'}]};
     else if(url.endsWith('/38145'))body={comb08:30,year:2017,make:'Honda',
       model:'Accord',fuelType1:'Regular Gasoline'};
     if(!body)return r.fulfill({status:404,body:'{}',headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}});
     await r.fulfill({status:200,body:JSON.stringify(body),
      headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}});
   });
   await page.goto(base+'?commute-source-qa='+width,{waitUntil:'domcontentloaded',timeout:90000});
   const toll=page.locator('#tollCostPanel');
   await toll.waitFor({state:'attached',timeout:30000});
   assert.equal(await toll.evaluate(el=>el.open),false,'cost details should start folded');
   await page.locator('#tollCostPanel > summary').click();
   await page.locator('#smartCommutePanel').waitFor({state:'visible',timeout:15000});
   assert.equal(await page.locator('#smartLegacyAdvanced').evaluate(el=>el.open),false,
     'manual toll input must be hidden in advanced drawer');
   assert.equal(await page.locator('#tollOut').isVisible(),false);
   await page.waitForFunction(()=>document.querySelector('#smartGasStatus')?.textContent?.includes('3.3431'),null,{timeout:30000});
   const gasText=await page.locator('#smartGasStatus').innerText();
   assert.match(gasText,/AAA Dallas 평균/);
   assert.match(gasText,/2026-11-08/);
   await page.locator('#smartVehicleYear').selectOption('2017',{timeout:30000});
   await page.locator('#smartVehicleMake').selectOption('Honda',{timeout:30000});
   await page.locator('#smartVehicleModel').selectOption('Accord',{timeout:30000});
   await page.locator('#smartVehicleOption').selectOption('38145',{timeout:30000});
   await page.waitForFunction(()=>document.querySelector('#smartVehicleStatus')?.textContent?.includes('30 MPG'),null,{timeout:30000});
   assert.equal(await page.locator('#tollMpg').inputValue(),'30');
   assert.equal(await page.locator('#tollFuel').inputValue(),'3.3431');
   // Simulates verified OSRM callback to preexisting distance integration,
   // never inventing a toll quote or free-route ETA.
   await page.evaluate(()=>{
     document.querySelector('#tollDays').value='20';
     document.querySelector('#tollDays').dispatchEvent(new Event('change',{bubbles:true}));
     window.noteCommuteRouteDistance(32186.88,'zip');
   });
   await page.waitForFunction(()=>document.querySelector('#smartFastResult')?.textContent?.includes('$89.15'),
     null,{timeout:15000});
   const out=await page.locator('#smartFastResult').innerText();
   const avoid=await page.locator('#smartAvoidResult').innerText();
   assert.match(out,/월 전체비용 미산정/);
   assert.match(out,/톨요금 미확인/);
   assert.match(avoid,/아직.*미연결|산정하지 않습니다/);
   assert.equal((await page.locator('#smartAvoidLink').getAttribute('href'))?.includes('avoid=tolls')||false,true);
   assert.ok(epaCalls.length>=5,'EPA vehicle chained calls failed');
   await page.locator('#smartLegacyAdvanced > summary').click();
   assert.equal(await page.locator('#tollOut').isVisible(),true,'manual fallback must remain available');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'Unexpected horizontal scroll overflow at '+width+': '+overflow);
   assert.equal(errors.length,0,'JS errors: '+errors.join(' | '));
   mkdirSync('artifacts/sourced-commute',{recursive:true});
   await page.locator('#tollCostPanel').screenshot({path:'artifacts/sourced-commute/'+width+'.png'});
   report.viewports.push({width,gasText,epaCalls:epaCalls.length,overflow});
   await page.close();
  }
 }finally{
   await browser.close();
   mkdirSync('artifacts/sourced-commute',{recursive:true});
   writeFileSync('artifacts/sourced-commute/qa.json',JSON.stringify(report,null,2));
 }
 console.log('Source-based commute UI QA PASS '+JSON.stringify(report.viewports));
})().catch(e=>{console.error(e);process.exitCode=1});
