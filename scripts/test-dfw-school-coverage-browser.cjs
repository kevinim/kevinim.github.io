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
   const errors=[],csp=[],requests=[],localityRequests=[],rendererRequests=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('request',r=>{
    if(r.url().includes('dfw-school-coverage-matrix-2026.json'))requests.push(r.url());
     if(r.url().includes('/features/dfw-school-coverage-renderer.js'))rendererRequests.push(r.url());
    if(r.url().includes('tea-texasworks-locality-2026.json'))localityRequests.push(r.url());
   });
   await page.addInitScript(()=>{
    document.addEventListener('securitypolicyviolation',e=>{
     window.__dfwCsp=(window.__dfwCsp||[]).concat(e.violatedDirective+':'+e.blockedURI);
    });
   });
   try{
    await page.goto(URL,{waitUntil:'domcontentloaded',timeout:75000});
    await page.locator('#dfwSchoolCoveragePanel > summary').waitFor();
    assert.equal(await page.locator('#dfwSchoolCoveragePanel').evaluate(x=>x.open),false,'panel must stay folded by default');
    assert.equal(rendererRequests.length,0,'Collapsed DFW coverage renderer must not download during initial map');
     assert.equal(requests.length,0,'large coverage file must lazy-load, not block initial map');
    assert.equal(localityRequests.length,0,'TexasWorks physical-locality evidence must also lazy-load');
    await page.locator('#dfwSchoolCoveragePanel > summary').click();
    await page.locator('#dfwSchoolCoverageContent .dfw-coverage-stats').waitFor({timeout:45000});
    assert.equal(rendererRequests.length,1,'Opening panel should load the approved same-origin JS renderer exactly once');
     assert.equal(requests.length,1,'opening panel should request coverage dataset once');
    assert.equal(localityRequests.length,1,'TexasWorks physical-locality evidence must load only when panel opens');
    const summary=await page.locator('#dfwSchoolCoverageContent .dfw-coverage-stats').innerText();
    assert.match(summary,/107\/108/,'full ISD denominator must appear');
    assert.match(summary,/99\.1%/);
    assert.match(summary,/1/);
    assert.match(summary,/152/);
    assert.doesNotMatch(summary,/GIS 99\.1%|배정선 99\.1%/);
    let rows=page.locator('#dfwSchoolCoverageContent tbody tr');
    assert.equal(await rows.count(),1,'remaining unverified parent route must remain visible in P0');
    assert.match(await rows.first().innerText(),/CHICO ISD/);
    assert.match(await rows.first().innerText(),/3/);
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('Chico');
    assert.equal(await rows.count(),1);
    assert.match(await rows.first().innerText(),/CHICO ISD/);
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
    // texasworks-physical-locality: corporate administrative county is not 41 DFW schools.
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('TEXAS WORKS');
    assert.equal(await rows.count(),1,'all-operator filter should show exactly TexasWorks');
    const texasWorksText=await rows.first().innerText();
    assert.match(texasWorksText,/41/,'retained administrative TEA count');
    assert.match(texasWorksText,/DFW 11카운티 내 6/,'operator-reported physical localities');
    assert.match(texasWorksText,/범위 밖 34/);
    assert.match(texasWorksText,/명칭\/ID 추가 확인 1/);
    assert.match(texasWorksText,/집 주소의 배정학교/);
    await page.locator('#dfwSchoolCoveragePanel > summary').click();
    await page.locator('#dfwSchoolCoveragePanel > summary').click();
    assert.equal(rendererRequests.length,1,'Reopening must reuse renderer; no repeated JavaScript requests');
     assert.equal(requests.length,1,'reopening should use cached table without duplicate fetch');
    assert.equal(localityRequests.length,1,'reopening must not refetch physical-locality source');
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
