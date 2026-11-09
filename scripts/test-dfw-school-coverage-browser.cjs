#!/usr/bin/env node
'use strict';
// Local PR snapshot only, no personal residential addresses or live API submissions.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const URL='http://127.0.0.1:8765/';
const folder='artifacts/dfw-school-coverage-ui';
fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[],csp=[],requests=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('request',r=>{if(r.url().includes('dfw-school-coverage-matrix-2026.json'))requests.push(r.url())});
   await page.addInitScript(()=>{
    document.addEventListener('securitypolicyviolation',e=>{
     window.__dfwCsp=(window.__dfwCsp||[]).concat(e.violatedDirective+':'+e.blockedURI);
    });
   });
   try{
    await page.goto(URL,{waitUntil:'domcontentloaded',timeout:75000});
    await page.locator('#dfwSchoolCoveragePanel > summary').waitFor();
    assert.equal(await page.locator('#dfwSchoolCoveragePanel').evaluate(x=>x.open),false,'panel must stay folded by default');
    assert.equal(requests.length,0,'large coverage file must lazy-load, not block initial map');
    await page.locator('#dfwSchoolCoveragePanel > summary').click();
    await page.locator('#dfwSchoolCoverageContent .dfw-coverage-stats').waitFor({timeout:45000});
    assert.equal(requests.length,1,'opening panel should request coverage dataset once');
    const summary=await page.locator('#dfwSchoolCoverageContent .dfw-coverage-stats').innerText();
    assert.match(summary,/37\/108/,'full ISD denominator must appear');
    assert.match(summary,/34\.3%/);
    assert.match(summary,/71/);
    assert.match(summary,/152/);
    assert.doesNotMatch(summary,/GIS 34\.3%|배정선 34\.3%/);
    let rows=page.locator('#dfwSchoolCoverageContent tbody tr');
    assert.equal(await rows.count(),20,'initial P0 table should show only 20 entries');
    assert.match(await rows.first().innerText(),/WAXAHACHIE ISD/);
    assert.match(await rows.first().innerText(),/18/);
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('Waxahachie');
    assert.equal(await rows.count(),1);
    assert.match(await rows.first().innerText(),/WAXAHACHIE ISD/);
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('');
    await page.locator('#dfwSchoolCoverageContent select').selectOption('P1');
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('Arlington');
    assert.equal(await rows.count(),1);
    assert.match(await rows.first().innerText(),/ARLINGTON ISD/);
    const newSource=await page.locator('#dfwSchoolCoverageContent tbody a').first().getAttribute('href');
    assert.ok(newSource&&newSource.startsWith('https://www.aisd.net/'),'new district link must pass exact-host policy');
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('');
    assert.ok(await rows.count()>0);
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('Carrollton');
    assert.equal(await rows.count(),1,'CFB is parent route linked but lacks school polygons');
    const cfb=await rows.first().innerText();
    assert.match(cfb,/CARROLLTON-FARMERS BRANCH/);
    assert.match(cfb,/GIS|참고 매칭|공식 안내 연결/);
    const official=page.locator('#dfwSchoolCoverageContent tbody a').first();
    const dest=await official.getAttribute('href');
    assert.ok(dest&&dest.startsWith('https://www.cfbisd.edu/'),'approved district link must remain');
    assert.equal(await official.getAttribute('rel'),'noopener noreferrer');
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('');
    await page.locator('#dfwSchoolCoverageContent select').selectOption('all');
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('UPLIFT');
    assert.equal(await rows.count(),1,'non-ISD school networks must be explicitly included');
    assert.match(await rows.first().innerText(),/입학 방식 확인 필요|별도 운영기관/);
    assert.match(await rows.first().innerText(),/링크 검증 필요/);
    await page.locator('#dfwSchoolCoveragePanel > summary').click();
    await page.locator('#dfwSchoolCoveragePanel > summary').click();
    assert.equal(requests.length,1,'reopening should use cached table without duplicate fetch');
    const dim=await page.evaluate(()=>({
      viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
      csp:window.__dfwCsp||[],mapPresent:!!document.querySelector('#map')
    }));
    assert.ok(dim.mapPresent,'existing school map must remain');
    if(width===390)assert.ok(dim.scrollWidth<=dim.viewport+5,
      'coverage panel must not create mobile page horizontal overflow '+JSON.stringify(dim));
    assert.deepEqual(dim.csp,[],'no unexpected CSP violations');
    assert.deepEqual(errors,[],'no app JavaScript exceptions');
    await page.screenshot({path:path.join(folder,'coverage-'+width+'.png'),fullPage:true,timeout:40000});
    console.log('PASS DFW-wide coverage dashboard '+width+'px, lazy load, P0/P1, charter, official links, mobile');
   }finally{await page.close()}
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('FAIL DFW-wide coverage browser:',err.stack||err);process.exitCode=1});
