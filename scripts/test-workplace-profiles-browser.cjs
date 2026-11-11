#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mkdirSync}=require('node:fs');

(async()=>{
 let browser;
 try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1360]){
   const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(url=>url.hostname==='geocode.arcgis.com'&&url.pathname.endsWith('/suggest'),route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({suggestions:[{text:'123 Demo Street, Plano, TX, 75024',magicKey:'MOCK123',isCollection:false}]})
   }));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForSelector('#workplacesPanel',{timeout:30000});
   assert.equal(await page.evaluate(()=>localStorage.getItem('tx-dashboard-workplaces-v1')),null,'No workplace should save before explicit registration');
   assert.equal(await page.locator('#destination').inputValue(),'','No default personal office');
   await page.locator('#destination').fill('123 Demo');
   await page.locator('#destinationSuggestions button').first().waitFor({state:'visible',timeout:20000});
   await page.locator('#destination').press('ArrowDown');
   assert.equal(await page.locator('#destination').getAttribute('aria-activedescendant'),'destinationSuggestion-0');
   await page.locator('#destination').press('Enter');
   assert.equal(await page.locator('#destination').inputValue(),'123 Demo Street, Plano, TX, 75024');
   await page.locator('#workplacesPanel > summary').click();
   await page.locator('#workplaceName').fill('Example Office');
   await page.locator('#workplaceUseCurrent').click();
   assert.equal(await page.locator('#workplaceAddress').inputValue(),'123 Demo Street, Plano, TX, 75024');
   // Merely preparing a form must not save personal information.
   assert.equal(await page.evaluate(()=>localStorage.getItem('tx-dashboard-workplaces-v1')),null);
   await page.locator('#workplaceSave').click();
   const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('tx-dashboard-workplaces-v1')));
   assert.equal(records.length,1);
   assert.equal(records[0].name,'Example Office');
   assert.equal(records[0].address,'123 Demo Street, Plano, TX, 75024');
   assert.equal(await page.locator('#officeSelect').inputValue(),'saved:'+records[0].id);
   await page.locator('#destinationClear').click();
   assert.equal(await page.locator('#destination').inputValue(),'');
   await page.locator('#officeSelect').selectOption('saved:'+records[0].id);
   assert.equal(await page.locator('#destination').inputValue(),records[0].address,'Saved office selectable as destination');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForSelector('#workplaceList .workplace-entry',{timeout:30000});
   assert.equal(await page.locator('#officeSelect option[value^="saved:"]').count(),1,'Saved office survives reload on same browser');
   await page.locator('#workplacesPanel > summary').click();
   await page.locator('#workplaceList .workplace-entry-actions button').filter({hasText:'수정'}).click();
   await page.locator('#workplaceName').fill('Other Office');
   await page.locator('#workplaceAddress').fill('234 Example Avenue, Allen, TX 75013');
   await page.locator('#workplaceSave').click();
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('tx-dashboard-workplaces-v1'))))[0].name,'Other Office');
   assert.equal(await page.locator('#destination').inputValue(),'234 Example Avenue, Allen, TX 75013');
   await page.locator('#workplaceList .workplace-entry-actions button').filter({hasText:'삭제'}).click();
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('tx-dashboard-workplaces-v1'))),[]);
   assert.equal(await page.locator('#officeSelect option[value^="saved:"]').count(),0);
   assert.equal(await page.locator('#destination').inputValue(),'');
   assert.deepEqual(errors.filter(x=>/SyntaxError|ReferenceError|Uncaught/.test(x)),[]);
   if(width===390){
    const scroll=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll.scroll<=scroll.viewport+3,'Mobile horizontal overflow '+JSON.stringify(scroll));
   }
   mkdirSync('artifacts/feature-integration',{recursive:true});
   await page.screenshot({path:'artifacts/feature-integration/workplace-'+width+'.png',fullPage:true,timeout:30000});
   await context.close();
  }
  console.log('PASS commute autocomplete and workplace local-storage registration/edit/delete on mobile and desktop');
 }catch(error){console.error('FAIL workplace browser:',error.stack||error);process.exitCode=1}
 finally{await browser?.close()}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
