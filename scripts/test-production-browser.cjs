#!/usr/bin/env node
'use strict';
// Browser smoke against the ACTUALLY DEPLOYED GitHub Pages site, not localhost.
// No accounts, private home addresses, or mutations of external websites.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const base=(process.env.DASHBOARD_BASE_URL||'https://kevinim.github.io/').replace(/\/?$/,'/');
const dir='artifacts/production-browser';
mkdirSync(dir,{recursive:true});

(async()=>{
 let browser;
 const result={target:base,checkedAt:new Date().toISOString(),checks:[],issues:[],warnings:[]};
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1380,height:900},deviceScaleFactor:1});
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(String(error?.message||error)));
  await page.goto(base+'?production-smoke='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForSelector('.leaflet-container',{timeout:70000});
  await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true,null,{timeout:100000});
  const dashboard=await page.evaluate(()=>{
   const cov=window.getSchoolBoundaryCoverage();
   const code=schoolClicked.toString();
   const drawAt=code.indexOf('drawBoundary()'),geoAt=code.indexOf('await geocodeSchool(s)');
   return {total:cov.total,core:cov.targetSix,codeDrawsBeforeGeocoding:drawAt>=0&&geoAt>=0&&drawAt<geoAt};
  });
  assert.ok(dashboard.total>=1500,'Production school directory appears to have failed loading');
  assert.ok(dashboard.core.total>=250 && dashboard.core.matched>=200,
   'Production core school polygon coverage unexpectedly declined');
  assert.equal(dashboard.core.matched+dashboard.core.missing,dashboard.core.total);
  assert.equal(dashboard.codeDrawsBeforeGeocoding,true,
   'Production is still serving the old schoolClicked, which waits for geocoding before drawing school boundary');
  result.school={total:dashboard.total,coreTotal:dashboard.core.total,coreMatched:dashboard.core.matched,
   coreMissing:dashboard.core.missing,drawBeforeGeocoding:true};
  result.checks.push('Live Leaflet map, full school directory and immediate school boundary render code');

  await page.evaluate(async()=>{
   const isbell=state.schools.find(s=>s.district==='FISD'&&/Isbell Elementary/i.test(s.name));
   if(!isbell)throw Error('Frisco Isbell school not found');
   await schoolClicked(isbell);
   if(!zoneGroup.getLayers().length)throw Error('No polygon drawn for Isbell on live Pages');
  });
  assert.ok((await page.locator('#zoneNotice').innerText()).includes('Isbell 세부 학년 주의'));
  result.checks.push('Live Frisco school click draws official K-4 polygon with grade exception');

  await page.locator('#phase2HazardPanel > summary').click();
  await page.locator('#nfhlFloodPanel > summary').click();
  assert.equal(await page.locator('#nfhlEnabled').isChecked(),false);
  assert.equal(await page.locator('#zipOverlay').isChecked(),true);
  await page.locator('#nfhlEnabled').check();
  // At the broad default zoom, NFHL must refuse to fetch a huge geographic slice.
  assert.ok((await page.locator('#nfhlStatus').innerText()).includes('줌 14'));
  await page.evaluate(()=>map.setView([32.778,-96.813],15));
  let liveNFHL=false, count=0;
  result.nfhlObservations=[];
  // The remote FEMA map service can be intermittently unavailable even if
  // dashboard code is healthy. Retry and distinguish provider outages from
  // application failures; the JSON artifact records each observation.
  for(let attempt=1;attempt<=3;attempt++){
   if(attempt>1){
    await page.locator('#nfhlEnabled').uncheck();
    await page.locator('#nfhlEnabled').check();
   }
   await page.waitForFunction(()=>{
    const t=document.getElementById('nfhlStatus')?.textContent||'';
    return t.includes('NFHL 공식 실시간 조회')||t.includes('조회에 실패했습니다');
   },null,{timeout:85000});
   const floodStatus=await page.locator('#nfhlStatus').innerText();
   result.nfhlObservations.push({attempt,status:floodStatus});
   count=Number(floodStatus.match(/(\d+)개 홍수구역 도형/)?.[1]||0);
   if(floodStatus.includes('NFHL 공식 실시간 조회')&&count>0){liveNFHL=true;break}
   if(attempt<3)await page.waitForTimeout(1300);
  }
  result.nfhlPolygonCount=liveNFHL?count:0;
  result.nfhlService=liveNFHL?'available':'unavailable-or-empty';
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),false);
  assert.equal(await page.locator('#zipOverlay').isChecked(),false);
  assert.equal(await page.locator('#nfhlLegend i').count(),2);
  if(liveNFHL){
   result.checks.push('Live FEMA NFHL query returns painted zones with two red classes and hides ZIP');
  }else{
   result.warnings.push('FEMA external NFHL service did not return nonempty flood zones after 3 attempts; verify at MSC. Dashboard core smoke remains meaningful.');
   result.checks.push('NFHL UI controls, legend and ZIP isolation work; external provider response unavailable (see warnings)');
  }
  await page.locator('#nfhlEnabled').uncheck();
  assert.equal(await page.locator('#zipOverlay').isChecked(),true);
  await page.locator('#femaHazardEnabled').check();
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),null,{timeout:80000});
  assert.equal(await page.locator('#nfhlEnabled').isChecked(),false);
  result.checks.push('Live NRI 1,734-tract model remains independent and NFHL restores ZIP');
  assert.deepEqual(jsErrors,[],'Live dashboard JavaScript errors: '+jsErrors.join(' | '));
  await page.screenshot({path:dir+'/deployed-dashboard.png',timeout:30000});
  result.status=result.warnings.length?'pass-with-provider-warning':'pass';
  console.log('DEPLOYED PAGES BROWSER SMOKE '+JSON.stringify(result));
 }catch(error){
  result.status='fail';result.issues.push(String(error.stack||error));
  console.error('FAIL DEPLOYED PAGES BROWSER SMOKE '+JSON.stringify(result));
  process.exitCode=1;
 }finally{
  writeFileSync(dir+'/production-smoke.json',JSON.stringify(result,null,2)+'\n');
  await browser?.close().catch(()=>{});
 }
})().catch(error=>{console.error(error);process.exitCode=1});
