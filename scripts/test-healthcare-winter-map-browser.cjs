#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const folder='artifacts/health-winter-map';
mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const width of [390,1360]){
    const page=await browser.newPage({viewport:{width,height:920},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:95000});
    await page.waitForSelector('#healthcareMapQuickToggle');
    await page.waitForSelector('#winterMapQuickToggle');
    await page.waitForSelector('#hospitalMapEnabled',{state:'attached',timeout:90000});
    await page.locator('#healthcareMapQuickToggle').click();
    await page.waitForFunction(()=>document.querySelector('#healthcareMapStatus')?.textContent?.includes('곳 표시'),null,{timeout:90000});
    const count=await page.locator('.hospital-map-pin').count();
    assert.ok(count>30&&count<=83,'invalid hospital marker count '+count);
    assert.equal(await page.locator('#healthcareMapQuickToggle').getAttribute('aria-pressed'),'true');
    assert.ok((await page.locator('#healthcareMapStatus').innerText()).includes('좌표 확인'));
    await page.locator('#healthcarePanel>summary').click();
    await page.waitForSelector('#hospitalCity option[value="PLANO"]',{timeout:35000});
    await page.locator('#hospitalCity').selectOption('PLANO');
    await page.waitForTimeout(250);
    const smaller=await page.locator('.hospital-map-pin').count();
    assert.ok(smaller>0&&smaller<count,'City filter must shrink hospitals '+smaller+'/'+count);
    await page.locator('.hospital-map-pin').first().click();
    await page.waitForSelector('.healthcare-popup',{timeout:15000});
    assert.ok((await page.locator('.healthcare-popup').innerText()).includes('CMS 응급서비스'));
    await page.locator('#healthcareMapQuickToggle').click();
    assert.equal(await page.locator('.hospital-map-pin').count(),0);
    await page.locator('#winterMapQuickToggle').click();
    await page.waitForFunction(()=>document.querySelector('#winterMapLegend')?.textContent?.includes('한파')&&
      document.querySelector('#winterMapQuickToggle')?.getAttribute('aria-pressed')==='true',null,{timeout:90000});
    await page.waitForFunction(()=>document.querySelectorAll('.leaflet-femaWinterPane-pane path').length>200,null,{timeout:45000});
    assert.ok(!(await page.locator('#winterMapLegend').isHidden()));
    await page.locator('#gridResiliencePanel>summary').click();
    await page.locator('#winterHazardType').selectOption('istm');
    assert.ok((await page.locator('#winterMapLegend').innerText()).includes('얼음폭풍'));
    assert.equal(await page.locator('#winterMapEnabled').isChecked(),true);
    await page.locator('#winterMapQuickToggle').click();
    assert.equal(await page.locator('#winterMapLegend').isHidden(),true);
    assert.equal(await page.locator('#winterMapQuickToggle').getAttribute('aria-pressed'),'false');
    await page.locator('#zipSelect').selectOption('75013');
    await page.waitForFunction(()=>typeof schoolGroup!=='undefined'&&schoolGroup.getLayers().length>0,null,{timeout:60000});
    const sizes=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
    assert.ok(sizes.document<=sizes.viewport+2,'mobile horizontal overflow '+JSON.stringify(sizes));
    assert.deepEqual(errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x)),[],'page runtime errors '+errors.join(' | '));
    results.push({width,pointMarkers:count,planoMarkers:smaller,winter:'PASS',schools:'PASS',horizontalOverflow:false});
    await page.screenshot({path:folder+'/width-'+width+'.png',fullPage:true,timeout:30000});
    await page.close();
  }
  writeFileSync(folder+'/results.json',JSON.stringify(results,null,2)+'\n');
  console.log('PASS geo-coded hospital points, official DSHS trauma, FEMA winter polygons, mobile and school regression '+JSON.stringify(results));
 }catch(e){writeFileSync(folder+'/results.json',JSON.stringify({results,error:String(e)},null,2));console.error('FAIL healthcare winter map browser smoke: '+(e.stack||e));process.exitCode=1;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
