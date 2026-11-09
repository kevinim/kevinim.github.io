#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const base=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const report={viewports:[]};
const rgbValue=raw=>(raw.match(/\d+(?:\.\d+)?/g)||[]).slice(0,3).map(Number);
const brightness=raw=>{
 const a=rgbValue(raw);
 return a.length===3?a.reduce((s,v)=>s+v,0)/3:NaN;
};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route(/tile\.openstreetmap\.org|server\.arcgisonline\.com/,route=>
     route.fulfill({status:200,body:'',contentType:'image/png'}));
   await page.goto(base+'?theme-test='+width,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#dashboardThemeToggle').waitFor({state:'visible',timeout:30000});
   await page.locator('#regionCompare').waitFor({state:'visible',timeout:30000});
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),false,'default folded');
   assert.equal(await page.locator('.region-compare-table-scroll').isVisible(),false,'folded table hidden');
   const headerHeight=(await page.locator('#regionCompare').boundingBox()).height;
   assert.ok(headerHeight<125,'folded header too large: '+headerHeight);
   const initial=await page.evaluate(()=>({
     theme:document.documentElement.dataset.theme,
     label:document.querySelector('#dashboardThemeToggle .theme-toggle-label')?.textContent,
     aria:document.querySelector('#dashboardThemeToggle')?.getAttribute('aria-pressed'),
     bg:getComputedStyle(document.body).backgroundColor
   }));
   assert.equal(initial.theme,'light');
   assert.equal(initial.aria,'false');
   assert.ok(brightness(initial.bg)>180,'light body must stay bright');
   await page.locator('#dashboardThemeToggle').click();
   const dark=await page.evaluate(()=>({
     theme:document.documentElement.dataset.theme,
     label:document.querySelector('#dashboardThemeToggle .theme-toggle-label')?.textContent,
     aria:document.querySelector('#dashboardThemeToggle')?.getAttribute('aria-pressed'),
     saved:localStorage.getItem('tx-dashboard-theme-v1'),
     bg:getComputedStyle(document.body).backgroundColor,
     panelBg:getComputedStyle(document.querySelector('.area-qa')).backgroundColor,
     mapFilter:getComputedStyle(document.querySelector('#map')).filter
   }));
   assert.equal(dark.theme,'dark');
   assert.equal(dark.aria,'true');assert.equal(dark.saved,'dark');
   assert.equal(dark.label,'일반 모드');
   assert.ok(brightness(dark.bg)<90,'dark body not applied');
   assert.ok(brightness(dark.panelBg)<95,'dashboard cards still white');
   assert.equal(dark.mapFilter,'none','risk map must not be inverted');
   // Native summary supports keyboard activation, and table is only rendered when opened.
   await page.locator('#regionCompare > summary').focus();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),true);
   await page.waitForFunction(()=>document.querySelectorAll('#regionCompareTable thead th').length===4,null,{timeout:30000});
   const darkTable=await page.evaluate(()=>({
     bg:getComputedStyle(document.querySelector('.region-compare-table thead th')).backgroundColor,
     raw:getComputedStyle(document.querySelector('.region-compare-table .region-compare-value')).color
   }));
   assert.ok(brightness(darkTable.bg)<130,'comparison header still too bright');
   assert.ok(brightness(darkTable.raw)>160,'comparison text contrast too low');
   await page.locator('#regionCompare > summary').click();
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),false);
   assert.equal(await page.locator('.region-compare-table-scroll').isVisible(),false);
   await page.reload({waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#dashboardThemeToggle').waitFor({state:'visible',timeout:30000});
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','preference lost after reload');
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),false,'comparison must default collapsed after reload');
   await page.locator('#dashboardThemeToggle').click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
   assert.equal(await page.evaluate(()=>localStorage.getItem('tx-dashboard-theme-v1')),'light');
   assert.equal(await page.locator('#dashboardThemeToggle').getAttribute('aria-pressed'),'false');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'horizontal viewport overflow '+overflow+' at '+width);
   assert.equal(errors.length,0,'JS errors: '+errors.join(' | '));
   mkdirSync('artifacts/theme-ui',{recursive:true});
   const screenshot='artifacts/theme-ui/'+width+'.png';
   await page.locator('#regionCompare').screenshot({path:screenshot});
   report.viewports.push({width,headerHeight,darkBg:dark.bg,overflow,screenshot});
   await page.close();
  }
 }finally{
   await browser.close();
   mkdirSync('artifacts/theme-ui',{recursive:true});
   writeFileSync('artifacts/theme-ui/qa.json',JSON.stringify(report,null,2));
 }
 console.log('Dark theme and compact comparison QA passed:',JSON.stringify(report.viewports));
})().catch(error=>{console.error(error);process.exitCode=1});
