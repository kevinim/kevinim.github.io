#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8765/';

async function labels(page) {
  return page.locator('#map .area-label span').allTextContents();
}
async function zoom(page, ll, level) {
  await page.evaluate(({ll, level}) => {
    map.stop();
    map.setView(ll, level, {animate: false});
  }, {ll, level});
  await page.waitForTimeout(350);
}

(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    for (const width of [1280,390]) {
      const page = await browser.newPage({viewport:{width,height:850}});
      const errors = [];
      page.on('pageerror', e => errors.push(String(e.message||e)));
      await page.goto(base,{waitUntil:'domcontentloaded',timeout:80000});
      await page.waitForFunction(()=>window.AreaLabelHierarchy && typeof map!=='undefined' && map && Object.keys(state.polys).length>200,{timeout:100000});
      await page.locator('#countyLanguage').selectOption('en');
      await zoom(page,[33.07,-96.82],10);
      const broad = await labels(page);
      const counts = broad.reduce((acc,x)=>(acc[x]=(acc[x]||0)+1,acc),{});
      assert.ok(broad.includes('Plano'),'Selected city must have a label at broad zoom: '+JSON.stringify(broad));
      assert.ok(Object.values(counts).every(n=>n===1),'Repeated city names at broad zoom: '+JSON.stringify(counts));
      assert.ok(!broad.some(x=>/750[0-9]{2}/.test(x)),'Broad zoom should not show ZIP IDs');
      await zoom(page,[33.078,-96.825],12);
      const medium = await labels(page);
      assert.ok(medium.some(x=>/NW Plano|North Plano|West Plano/.test(x)),
        'Intermediate zoom must expose existing directional metadata: '+JSON.stringify(medium));
      await zoom(page,[33.078,-96.825],13);
      const close = await labels(page);
      assert.ok(close.some(x=>x.includes('75024')),
        'Close zoom must show ZIP before click: '+JSON.stringify(close));
      const schoolState = await page.evaluate(()=>({count:schoolGroup.getLayers().length,zip:state.zip,
        schoolDirectory:state.schools.length,selectedPolygon:!!state.polys[state.zip]}));
      assert.ok(schoolState.schoolDirectory>0&&schoolState.selectedPolygon,
        'Label work must retain existing school and ZIP data: '+JSON.stringify(schoolState));
      await page.locator('#zipOverlay').uncheck();
      assert.equal((await labels(page)).length,0,'Hiding ZIP overlay must hide place labels');
      await page.locator('#zipOverlay').check();
      assert.ok((await labels(page)).length>0,'Re-enabling ZIP overlay must restore labels');
      assert.deepEqual(errors,[],'No JavaScript errors on '+width+'px map: '+errors.join(' | '));
      console.log('PASS map-label browser '+width+'px',JSON.stringify({broad,medium:medium.slice(0,8),close:close.slice(0,8)}));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1});
