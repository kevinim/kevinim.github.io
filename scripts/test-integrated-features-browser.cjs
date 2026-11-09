#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
mkdirSync('artifacts/feature-integration',{recursive:true});
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1360]){
   const page=await browser.newPage({viewport:{width,height:950},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForSelector('.leaflet-container',{timeout:85000});
   await page.waitForSelector('#tollCostPanel',{timeout:50000});
   await page.locator('#tollCostPanel>summary').click();
   assert.equal(await page.locator('#tollCalculate').count(),1);
   assert.ok(await page.evaluate(()=>window.workDestinationIcon(L).options.html.includes('업무 목적지')));
   await page.evaluate(()=>window.noteCommuteRouteDistance(32186.88,'zip'));
   assert.equal(await page.locator('#tollOutMiles').inputValue(),'20');
   assert.equal(await page.locator('#tollBackMiles').inputValue(),'20');
   // Sourced commute moved legacy manual calculator into a collapsed advanced drawer.
   // Open it before manipulating hidden controls; preserve all original assertions.
   if(await page.locator('#smartLegacyAdvanced').count()){
    await page.locator('#smartLegacyAdvanced > summary').click();
    assert.equal(await page.locator('#tollOut').isVisible(),true);
   }
   await page.locator('#tollDays').fill('20');
   await page.locator('#tollOutMiles').fill('20');
   await page.locator('#tollBackMiles').fill('25');
   await page.locator('#tollMpg').fill('30');
   await page.locator('#tollFuel').fill('3');
   await page.locator('#tollOut').fill('1.25');
   await page.locator('#tollBack').fill('1.75');
   await page.locator('#tollCalculate').click();
   const amount=await page.locator('#tollResults').innerText();
   assert.ok(amount.includes('$150.00'),'TollTag scenario wrong: '+amount);
   await page.locator('#tollBack').fill('');
   await page.locator('#tollCalculate').click();
   const missing=await page.locator('#tollResults').innerText();
   assert.ok(missing.includes('미확인'),'Missing quote must not become zero: '+missing);
   await page.locator('#healthcarePanel>summary').click();
   await page.waitForFunction(()=>document.querySelectorAll('#hospitalCity option').length>3,null,{timeout:30000});
   await page.locator('#hospitalCity').selectOption('PLANO');
   await page.waitForFunction(()=>document.querySelectorAll('#hospitalList .extra-hospital').length>0,null,{timeout:10000});
   const hospital=await page.locator('#hospitalList').innerText();
   assert.ok(hospital.includes('Google Maps에서 위치·경로 확인'));
   await page.locator('#gridResiliencePanel>summary').click();
   await page.waitForFunction(()=>document.querySelectorAll('#gridResilienceData .extra-hospital').length===2,null,{timeout:30000});
   const eia=await page.locator('#gridResilienceData').innerText();
   assert.ok(eia.includes('2024년')&&eia.includes('2025년'));
   assert.ok((await page.locator('#gridResiliencePanel').innerText()).includes('동네별 정전확률'));
   if(width===1360){
    // Exercise the actual ZIP-to-work route code and marker DOM using deterministic
    // public mock data. No live third-party service calls or private addresses.
    await page.route(url=>url.hostname==='nominatim.openstreetmap.org'&&url.pathname==='/search',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify([{lat:'33.1000',lon:'-96.8200',display_name:'Test Workplace, Plano, TX'}])
    }));
    await page.route(url=>url.hostname==='router.project-osrm.org'&&url.pathname.startsWith('/table/v1/driving/'),route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify({code:'Ok',durations:[[1200]]})
    }));
    await page.route(url=>url.hostname==='router.project-osrm.org'&&url.pathname.startsWith('/route/v1/driving/'),route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({code:'Ok',routes:[{duration:1200,distance:32186.88,
       geometry:{type:'LineString',coordinates:[[-96.785,33.129],[-96.820,33.100]]}}]})
    }));
    await page.locator('#calcCommute').click();
    await page.waitForFunction(()=>document.querySelectorAll('.work-destination-pin .work-pin-body').length>=1,null,{timeout:25000});
    const workPin=await page.locator('.work-destination-pin .work-pin-body').first();
    assert.equal(await workPin.getAttribute('aria-label'),'업무 목적지');
    assert.equal(await workPin.locator('svg').count(),1,'work destination must show an SVG briefcase');
    assert.ok((await workPin.innerText()).includes('직장'));
    await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true,null,{timeout:85000});
    await page.locator('#zipSelect').selectOption('75013');
    await page.waitForFunction(()=>typeof state!=='undefined'&&state.zip==='75013'&&
      typeof schoolGroup!=='undefined'&&schoolGroup.getLayers().length>0,null,{timeout:30000});
    console.log('PASS actual mocked ZIP route displays work briefcase pin; Allen 75013 school markers remain');
   }
   if(width===390){
    const size=await page.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll<=size.screen+3,'mobile horizontal overflow: '+JSON.stringify(size));
   }
   assert.deepEqual(errors.filter(s=>/Uncaught|SyntaxError|ReferenceError/.test(s)),[]);
   await page.screenshot({path:'artifacts/feature-integration/viewport-'+width+'.png',fullPage:true,timeout:30000});
   await page.close();
  }
  console.log('PASS workplace marker and cost/healthcare/grid browser panels on desktop & mobile');
 }catch(e){console.error('FAIL feature integration:',e.stack||e);process.exitCode=1;}
 finally{await browser?.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
