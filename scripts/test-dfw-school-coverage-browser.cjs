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
   const errors=[],csp=[],requests=[],localityRequests=[],rendererRequests=[],publicSourceRequests=[],vintageSourceRequests=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('request',r=>{
    if(r.url().includes('dfw-school-coverage-matrix-2026.json'))requests.push(r.url());
     if(r.url().includes('/features/dfw-school-coverage-renderer.js'))rendererRequests.push(r.url());
    if(r.url().includes('tea-texasworks-locality-2026.json'))localityRequests.push(r.url());
     if(r.url().includes('dfw-cfb-denton-public-source-status-20261120.json'))publicSourceRequests.push(r.url());
     if(r.url().includes('dfw-plano-lewisville-source-vintage-20261120.json'))vintageSourceRequests.push(r.url());
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
    assert.equal(publicSourceRequests.length,0,'CFB/Denton public source evidence must also lazy-load');
    assert.equal(vintageSourceRequests.length,0,'Plano/Lewisville vintage evidence must never block initial map');
    await page.locator('#dfwSchoolCoveragePanel > summary').click();
    await page.locator('#dfwSchoolCoverageContent .dfw-coverage-stats').waitFor({timeout:45000});

    // UX-07: a real browser checks focusable horizontal table and mobile hit targets.
    await page.waitForFunction(()=>{
      const content=document.getElementById('dfwSchoolCoverageContent');
      return content?.getAttribute('aria-busy')==='false';
    });
    const coverageContent=page.locator('#dfwSchoolCoverageContent');
    assert.equal(await coverageContent.getAttribute('aria-live'),'off',
      'the full table should not flood screen-reader live announcements');
    const tableRegion=coverageContent.locator('.dfw-coverage-table-wrap');
    assert.equal(await tableRegion.getAttribute('role'),'region');
    assert.equal(await tableRegion.getAttribute('aria-label'),'DFW 학군별 학교 배정 연결 현황');
    await tableRegion.focus();
    assert.equal(await tableRegion.evaluate(node=>document.activeElement===node),true,
      'horizontal table region must be keyboard focusable');
    if(width===390){
      const controlHeights=await coverageContent.locator(
        '.dfw-coverage-filter input, .dfw-coverage-filter select, button.dfw-coverage-more'
      ).evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length>0)
        .map(node=>node.getBoundingClientRect().height));
      assert.ok(controlHeights.length>=3 && controlHeights.every(height=>height>=44),
        'mobile search/select/quick-jump controls require >=44px height: '+controlHeights);
    }

    assert.equal(rendererRequests.length,1,'Opening panel should load the approved same-origin JS renderer exactly once');
     assert.equal(requests.length,1,'opening panel should request coverage dataset once');
    assert.equal(localityRequests.length,1,'TexasWorks physical-locality evidence must load only when panel opens');
    assert.equal(publicSourceRequests.length,1,'CFB/Denton public source evidence loads once after panel expands');
    assert.equal(vintageSourceRequests.length,1,'Plano/Lewisville status loads only on expansion');
    const summary=await page.locator('#dfwSchoolCoverageContent .dfw-coverage-stats').innerText();
    assert.match(summary,/108\/108/,'official ISD parent navigation denominator must appear');
    assert.match(summary,/100%/);
    assert.match(summary,/1/);
    assert.match(summary,/152/);
    assert.doesNotMatch(summary,/GIS 99\.1%|배정선 99\.1%/);
    let rows=page.locator('#dfwSchoolCoverageContent tbody tr');
    assert.equal(await rows.count(),1,'empty P0 includes exactly one non-data placeholder row');
    assert.match(await rows.first().innerText(),/검색 조건에 맞는 학군이 없습니다/);
    assert.match(await page.locator('#dfwSchoolCoverageContent .dfw-coverage-help[role=status]').innerText(),/0개 학군/);
    await page.locator('#dfwSchoolCoverageContent select').selectOption('P1');
    await page.locator('#dfwSchoolCoverageContent input[type=search]').fill('Chico');
    assert.equal(await rows.count(),1);
    assert.match(await rows.first().innerText(),/CHICO ISD/);
    assert.match(await rows.first().innerText(),/3/);
    const chicoUrl=await page.locator('#dfwSchoolCoverageContent tbody a').first().getAttribute('href');
    assert.equal(chicoUrl,'https://www.chicoisdtx.net/District/Department/68-Enrollment-Registration');
    assert.match(await rows.first().innerText(),/GIS|학교별/);
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
    const cfbDetail=rows.first().locator('details.dfw-source-disposition');
    assert.equal(await cfbDetail.count(),1,'CFB historical/current evidence must be explicit');
    await cfbDetail.locator('summary').click();
    const cfbEvidence=await cfbDetail.innerText();
    assert.match(cfbEvidence,/2025–26/);
    assert.match(cfbEvidence,/2020년 최종 수정/);
    assert.match(cfbEvidence,/2026–27/);
    assert.match(cfbEvidence,/현행 학교별 GIS 0개/);
    assert.match(cfbEvidence,/배정 미인증/);
    await page.locator('[data-district-code="061901"]').click();
    assert.equal(await rows.count(),1,'Denton quick-find must show one official district');
    const denton=rows.first();
    assert.match(await denton.innerText(),/DENTON ISD/);
    const dentonDetail=denton.locator('details.dfw-source-disposition');
    assert.equal(await dentonDetail.count(),1);
    await dentonDetail.locator('summary').click();
    const dentonEvidence=await dentonDetail.innerText();
    assert.match(dentonEvidence,/2026–27/);
    assert.match(dentonEvidence,/PDF 39개/);
    assert.match(dentonEvidence,/QA 전용/);
    assert.match(dentonEvidence,/20.6m/);
    assert.match(dentonEvidence,/100m/);
    assert.doesNotMatch(dentonEvidence,/배정 인증 완료/);
    await page.locator('[data-district-code="057903"]').click();
    assert.equal(await rows.count(),1,'CFB quick-find should restore the source row');
    assert.match(await rows.first().innerText(),/CARROLLTON-FARMERS BRANCH/);
    await page.locator('[data-district-code="043910"]').click();
    assert.equal(await rows.count(),1,'Plano quick source should isolate official district');
    assert.match(await rows.first().innerText(),/PLANO ISD/);
    const planoEvidence=rows.first().locator('details.dfw-source-disposition');
    assert.equal(await planoEvidence.count(),1);
    await planoEvidence.locator('summary').click();
    const planoText=await planoEvidence.innerText();
    assert.match(planoText,/2026–27/);
    assert.match(planoText,/2025–26/);
    assert.match(planoText,/2019–20/);
    assert.match(planoText,/초44·중11·고6·Senior High 3/);
    assert.match(planoText,/Jackson Elementary/);
    assert.match(planoText,/확정 배정/);
    assert.equal(await planoEvidence.locator('a').getAttribute('href'),
      'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder');
    await page.locator('[data-district-code="061902"]').click();
    assert.equal(await rows.count(),1,'Lewisville quick-find shows one district');
    assert.match(await rows.first().innerText(),/LEWISVILLE ISD/);
    const lisdEvidence=rows.first().locator('details.dfw-source-disposition');
    assert.equal(await lisdEvidence.count(),1);
    await lisdEvidence.locator('summary').click();
    const lisdText=await lisdEvidence.innerText();
    assert.match(lisdText,/2026–27/);
    assert.match(lisdText,/고등학교 2025–26/);
    assert.match(lisdText,/174행/);
    assert.match(lisdText,/Budget Suites/);
    assert.match(lisdText,/4단계/);
    assert.match(lisdText,/Find an Apartment/);
    assert.match(lisdText,/미인증/);
    assert.equal(await lisdEvidence.locator('a').getAttribute('href'),
      'https://www.lisd.net/resources/families/school-locator');
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
