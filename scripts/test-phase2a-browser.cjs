#!/usr/bin/env node
'use strict';
// Free GitHub Actions regression smoke test of the real browser risk-map UI.
const {chromium}=require('playwright');
const {mkdirSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 let browser;
 const dir='artifacts/phase2a-browser';
 mkdirSync(dir,{recursive:true});
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1380,height:1040},deviceScaleFactor:1});
  let riskFetches=0,txwrapTileFetches=0,noaaFetches=0;
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,280)));
  page.on('request',r=>{if(r.url().includes('phase2a-fema-nri-dfw-2025.geojson'))riskFetches++;if(r.url().includes('/TxWRAP/wildfire_hazard_potential/MapServer/tile/'))txwrapTileFetches++;if(r.url().includes('noaa-storm-events-dfw-2024-2025.json'))noaaFetches++});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForSelector('.leaflet-container',{timeout:80000});
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),false);
  assert.equal(riskFetches,0,'FEMA snapshot must not load during the initial dashboard render');
  assert.equal(noaaFetches,0,'NOAA historical source must not load during the initial dashboard render');
  assert.equal(await page.locator('#lisdApartmentSection').count(),0,'Unwanted Lewisville panel reappeared');
  assert.equal(await page.locator('#cfbFeederSection').count(),0,'Unwanted CFB feeder panel reappeared');
  await page.locator('#auxiliaryDataDetails > summary').click();
  await page.locator('#phase2HazardPanel > summary').click();
  await page.locator('#femaHazardEnabled').check();
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('Census tract')&&
   document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),{timeout:0},{timeout:80000});
  assert.equal(riskFetches,1,'One official risk snapshot must be requested after opt-in');
  assert.equal(await page.locator('#zipOverlay').isChecked(),false,'ZIP demographic shading must be temporarily hidden');
  const legend=page.locator('#femaHazardLegend');
  assert.equal(await legend.isVisible(),true);
  assert.ok((await legend.innerText()).includes('내륙 홍수'));
  assert.ok((await legend.innerText()).includes('FEMA 2025'));
  const painted=await page.locator('#femaHazardLegend .fema-legend-swatches span').allTextContents();
  assert.equal(painted.length,5,'Exactly 5 sequential red severity levels, not 7 mixed statuses');
  assert.equal(await page.locator('#femaHazardLegend .fema-legend-absent div').count(),2);
  assert.ok((await legend.innerText()).includes('자료 없음:'));
  assert.ok((await legend.innerText()).includes('등급 없음:'));
  const colors=await page.locator('#femaHazardLegend .fema-legend-swatches i').evaluateAll(els=>els.map(x=>getComputedStyle(x).backgroundColor));
  assert.deepEqual(colors,['rgb(255, 241, 241)','rgb(255, 209, 209)','rgb(255, 158, 158)','rgb(239, 88, 88)','rgb(185, 28, 28)']);

  await page.selectOption('#femaHazardType','wfir');
  assert.ok((await legend.innerText()).includes('산불'));
  assert.ok((await legend.innerText()).includes('등급 없음:'));
  await page.locator('#femaHazardOpacity').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.selectOption('#femaHazardType','hrcn');
  assert.ok((await legend.innerText()).includes('허리케인'));
  await page.locator('#femaHazardEnabled').uncheck();
  assert.equal(await legend.isVisible(),false);
  assert.equal(await page.locator('#zipOverlay').isChecked(),true,'Original ZIP overlay should be restored when hazard layer disabled');
  await page.locator('#femaHazardEnabled').check();
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),{timeout:0},{timeout:40000});
  assert.equal(riskFetches,1,'Re-enabling must reuse cached risk data without another request');
  // NFHL is a separate regulatory flood map, not the NRI relative-risk
  // census-tract layer. It must not issue a nationwide vector query at zoom 11.
  await page.locator('#nfhlFloodPanel > summary').click();
  // The live FEMA NFHL service is independently checked by the deployed
  // production smoke. Locally, deterministic map rendering tests MUST NOT
  // fail solely because FEMA happens to have a transient outage.
  const deterministicNFHLMatcher=/\/NFHL\/MapServer\/28\/query\?/;
  const deterministicFlood={type:'FeatureCollection',features:[{
   type:'Feature',properties:{SFHA_TF:'T',FLD_ZONE:'AE',ZONE_SUBTY:null,DFIRM_ID:'TESTTX'},
   geometry:{type:'Polygon',coordinates:[[[-96.82,32.77],[-96.81,32.77],[-96.81,32.78],[-96.82,32.78],[-96.82,32.77]]]}
  }]};
  await page.route(deterministicNFHLMatcher,route=>route.fulfill({
   status:200,contentType:'application/geo+json',
   headers:{'access-control-allow-origin':'*'},body:JSON.stringify(deterministicFlood)
  }));
  await page.locator('#nfhlEnabled').check();
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),false);
  assert.ok((await page.locator('#nfhlStatus').innerText()).includes('줌 14'));
  assert.ok(await page.locator('#nfhlLegend').isVisible());
  assert.equal(await page.locator('#nfhlLegend i').count(),2);
  const nfhlColors=await page.locator('#nfhlLegend i').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
  assert.deepEqual(nfhlColors,['rgb(185, 28, 28)','rgb(255, 171, 171)']);
  await page.evaluate(()=>map.setView([32.778,-96.813],15));
  await page.waitForFunction(()=>{
   const text=document.getElementById('nfhlStatus')?.textContent||'';
   return text.includes('NFHL 공식 실시간 조회')||text.includes('조회에 실패했습니다');
  },null,{timeout:90000});
  const nfhlResult=await page.locator('#nfhlStatus').innerText();
  assert.ok(nfhlResult.includes('NFHL 공식 실시간 조회'),'Deterministic FEMA NFHL browser query should render the official data shape: '+nfhlResult);
  assert.ok(nfhlResult.includes('홍수구역 도형'));
  assert.equal(await page.locator('#zipOverlay').isChecked(),false);
  await page.locator('#nfhlEnabled').uncheck();
  assert.equal(await page.locator('#nfhlLegend').isVisible(),false);
  assert.equal(await page.locator('#zipOverlay').isChecked(),true);
  await page.unroute(deterministicNFHLMatcher);

  // Resilience regression: make FEMA return HTTP 503 once, then a VALID
  // synthetic polygon via a local Playwright network stub. No provider
  // availability is assumed by this deterministic recovery test.
  let fakeNFHLRequests=0;
  const fakeFlood={type:'FeatureCollection',features:[{
   type:'Feature',properties:{SFHA_TF:'T',FLD_ZONE:'AE',ZONE_SUBTY:null,DFIRM_ID:'TESTTX'},
   geometry:{type:'Polygon',coordinates:[[[-96.82,32.77],[-96.81,32.77],[-96.81,32.78],[-96.82,32.78],[-96.82,32.77]]]}
  }]};
  const nfhlMatcher=/\/NFHL\/MapServer\/28\/query\?/;
  await page.route(nfhlMatcher,async route=>{
   fakeNFHLRequests++;
   if(fakeNFHLRequests===1){
    await route.fulfill({status:503,contentType:'application/json',
     headers:{'access-control-allow-origin':'*'},body:'{"error":"transient test 503"}'});
   }else{
    await route.fulfill({status:200,contentType:'application/geo+json',
     headers:{'access-control-allow-origin':'*'},body:JSON.stringify(fakeFlood)});
   }
  });
  await page.locator('#nfhlEnabled').check();
  await page.waitForFunction(()=>document.getElementById('nfhlStatus')?.textContent?.includes('1개 홍수구역 도형'),null,{timeout:22000});
  assert.equal(fakeNFHLRequests,2,'NFHL retry must recover after a simulated single HTTP 503');
  assert.ok((await page.locator('#nfhlStatus').innerText()).includes('2회 시도 후 복구'));
  assert.equal(await page.locator('#zipOverlay').isChecked(),false);
  await page.locator('#nfhlEnabled').uncheck();
  assert.equal(await page.locator('#zipOverlay').isChecked(),true);
  await page.unroute(nfhlMatcher);
  console.log('PASS FEMA NFHL automatic recovery from synthetic HTTP 503 without manual checkbox retry');
  await page.locator('#femaHazardEnabled').check();
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),null,{timeout:45000});
  assert.equal(await page.locator('#nfhlEnabled').isChecked(),false);
  console.log('PASS NFHL GeoJSON browser render (deterministic): low-zoom guard, red severity colors, retry from 503, NRI mutual exclusion and ZIP recovery; actual provider health checked separately in production smoke');
  // Separate official Texas A&M wildfire potential layer: it must be lazy,
  // keep the source-native palette, and not masquerade as an NRI hazard score.
  assert.equal(txwrapTileFetches,0,'TxWRAP tiles must not download before opt-in');
  await page.locator('#txwrapWHPPanel > summary').click();
  await page.locator('#txwrapWHPEnabled').check();
  await page.waitForFunction(()=>document.getElementById('txwrapWHPStatus')?.textContent?.includes('지도 타일 '),null,{timeout:85000});
  assert.ok(txwrapTileFetches>0,'Official TxWRAP map tiles were not requested');
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),false);
  assert.equal(await page.locator('#nfhlEnabled').isChecked(),false);
  assert.equal(await page.locator('#zipOverlay').isChecked(),false);
  assert.equal(await page.locator('#txwrapWHPLegend').isVisible(),true);
  assert.ok((await page.locator('#txwrapWHPLegend').innerText()).includes('원본 등급'));
  const txwrapLoadedText=await page.locator('#txwrapWHPStatus').innerText();
  const successfulTileCount=Number(txwrapLoadedText.match(/지도 타일 (\d+)개 로딩 확인/)?.[1]||0);
  assert.ok(successfulTileCount>0,'Expected at least one Leaflet tileload event from the official Texas A&M imagery');
  await page.locator('#txwrapWHPOpacity').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#femaHazardEnabled').check();
  assert.equal(await page.locator('#txwrapWHPEnabled').isChecked(),false,'Enabling FEMA NRI should disable TxWRAP');
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),null,{timeout:45000});
  await page.locator('#femaHazardEnabled').uncheck();
  assert.equal(await page.locator('#zipOverlay').isChecked(),true,'ZIP colors must recover after exiting wildfire overlay');
  console.log('PASS TxWRAP official wildfire potential tiles: opt-in, raster loads, original palette attribution, opacity and FEMA exclusivity');
  // The complete official NOAA source snapshot is lazy and must reconcile
  // both year filters. The county/category filter is NOT a property-risk map.
  assert.equal(noaaFetches,0,'NOAA 2024–25 historical snapshot should remain lazy');
  await page.locator('#noaaStormHistoryPanel > summary').click();
  await page.waitForFunction(()=>document.getElementById('noaaStormTotal')?.textContent==='606건',null,{timeout:25000});
  assert.equal(noaaFetches,1);
  assert.equal(await page.locator('#noaaStormMonthly .brow').count(),12);
  assert.ok((await page.locator('#noaaStormStatus').innerText()).includes('미래 위험도/발생 일수 아님'));
  assert.ok((await page.locator('#noaaStormSourceDetails').innerText()).includes('SHA-256'));
  await page.selectOption('#noaaStormYear','2024');
  assert.equal(await page.locator('#noaaStormTotal').innerText(),'563건');
  await page.selectOption('#noaaStormCounty','COLLIN');
  await page.selectOption('#noaaStormCategory','hail');
  assert.equal(await page.locator('#noaaStormTotal').innerText(),'34건');
  await page.selectOption('#noaaStormYear','2025');
  assert.equal(await page.locator('#noaaStormTotal').innerText(),'33건');
  await page.selectOption('#noaaStormCategory','wildfire');
  assert.ok((await page.locator('#noaaStormTotal').innerText()).endsWith('건'));
  assert.equal(noaaFetches,1,'NOAA county/year filtering should reuse cached snapshot');
  console.log('PASS NOAA official Storm Events county-coded 2024/2025 history: original 563+606 events, 12 months, Collin hail and cache');
  // Regression: hazard heatmap was effectively undiscoverable because it
  // lives inside a collapsed details panel, with no map-level activation.
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),false);
  // Plain-language icon chips on the map: no developer labels, no panel pop-open.
  const chipText=await page.locator('#hazardMapQuickToggle').innerText();
  for(const word of ['홍수','산불','폭풍'])assert.ok(chipText.includes(word),'Hazard chip missing: '+word);
  assert.ok(!/Phase/i.test(chipText));
  assert.ok(!/Phase\s*2/i.test(await page.locator('#phase2HazardPanel > summary').innerText()),'Panel title must not show developer phase labels');
  const panelWasOpen=await page.locator('#phase2HazardPanel').evaluate(el=>el.open);
  const chip=k=>page.locator('#hazardMapQuickToggle .hazard-chip[data-hazard="'+k+'"]');
  await chip('ifld').click();
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),true);
  assert.equal(await page.locator('#femaHazardType').inputValue(),'ifld');
  assert.equal(await page.locator('#phase2HazardPanel').evaluate(el=>el.open),panelWasOpen,'Chip must not expand the detail panel');
  await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),null,{timeout:45000});
  assert.equal(await chip('ifld').getAttribute('aria-pressed'),'true');
  assert.ok(await page.locator('#femaHazardLegend').isVisible());
  // Switching chips changes hazard type and keeps the layer on.
  await chip('wfir').click();
  assert.equal(await page.locator('#femaHazardType').inputValue(),'wfir');
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),true);
  assert.equal(await chip('wfir').getAttribute('aria-pressed'),'true');
  assert.equal(await chip('ifld').getAttribute('aria-pressed'),'false');
  await chip('hrcn').click();
  assert.equal(await page.locator('#femaHazardType').inputValue(),'hrcn');
  // Tapping the active chip turns the layer off and restores ZIP colors.
  await chip('hrcn').click();
  assert.equal(await page.locator('#femaHazardEnabled').isChecked(),false);
  assert.equal(await page.locator('#zipOverlay').isChecked(),true);
  assert.equal(await page.locator('#hazardMapQuickToggle .hazard-chip[aria-pressed="true"]').count(),0);
  console.log('PASS map-level flood/wildfire/storm icon chips toggle and switch the hazard layer and restore ZIP');
  // City crime map: police chip, lazy data, legend, exclusivity with hazards, ZIP restore.
  const crimeState=()=>page.evaluate(()=>({crime:document.getElementById('crimeMapToggle').getAttribute('aria-pressed'),fema:document.getElementById('femaHazardEnabled').checked,zip:document.getElementById('zipOverlay').checked,legend:!document.getElementById('crimeLegend').hidden}));
  assert.equal((await crimeState()).zip,true);
  await page.locator('#crimeMapToggle').click();
  await page.waitForFunction(()=>/\d+개 도시/.test(document.getElementById('crimeStatus').textContent),null,{timeout:45000});
  assert.deepEqual(await crimeState(),{crime:'true',fema:false,zip:false,legend:true});
  assert.equal(await page.locator('#crimePanel').evaluate(el=>el.open),false,'crime chip must not expand the detail panel');
  assert.ok((await page.locator('#crimeLegend').innerText()).includes('인구 10만 명당'));
  await page.locator('#crimeLegend button[data-cat="property"]').click();
  assert.ok((await page.locator('#crimeLegend .fema-legend-title').innerText()).startsWith('재산 범죄'));
  const plano=await page.evaluate(()=>{let out=null;map.eachLayer(l=>{if(!out&&l.feature?.properties?.city==='Plano'){l.fire('click');out=true}});return out});
  assert.ok(plano,'Plano city polygon present');
  await page.waitForSelector('.leaflet-popup-content');
  assert.ok((await page.locator('.leaflet-popup-content').innerText()).includes('주소별 위험이 아닙니다'));
  await page.locator('.hazard-chip[data-hazard="ifld"]').click();
  await page.waitForFunction(()=>document.getElementById('femaHazardEnabled').checked,null,{timeout:15000});
  assert.equal((await crimeState()).crime,'false','hazard layer switches crime off');
  await page.locator('.hazard-chip[data-hazard="ifld"]').click();
  await page.waitForTimeout(300);
  assert.equal((await crimeState()).zip,true,'ZIP colors restored after crime -> hazard -> off');
  console.log('PASS city crime map: police chip, lazy FBI data, legend categories, popup caveat, hazard exclusivity, ZIP restore');
  // Crime on -> winter map on: winter must stay on (it used to cancel itself).
  if(await page.locator('#winterMapEnabled').count()){
   await page.locator('#crimeMapToggle').click();
   await page.waitForFunction(()=>document.getElementById('crimeMapToggle').getAttribute('aria-pressed')==='true');
   await page.evaluate(()=>{const e=document.getElementById('winterMapEnabled');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))});
   await page.waitForTimeout(1500);
   const w=await crimeState().then(async s=>({...s,winter:await page.locator('#winterMapEnabled').isChecked()}));
   assert.equal(w.winter,true,'winter map stays on after switching from crime: '+JSON.stringify(w));
   assert.equal(w.crime,'false');assert.equal(w.zip,false);
   await page.evaluate(()=>{const e=document.getElementById('winterMapEnabled');e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}))});
   await page.waitForTimeout(500);
   assert.equal((await crimeState()).zip,true,'ZIP colors restored after crime -> winter -> off');
   console.log('PASS crime -> winter map switch keeps winter on and restores ZIP colors');
  }
  await page.locator('#zipSelect').selectOption('75093');
  await page.waitForSelector('#crimeZipTrend',{timeout:20000});
  const zipCrime=await page.locator('#zipInsights').innerText();
  assert.ok(zipCrime.includes('Plano')&&/2023 .*2024 .*2025 /.test(zipCrime)&&/[▲▼―]/.test(zipCrime),'ZIP detail shows city 3-year counts and trend');
  console.log('PASS ZIP detail shows the cities it lies in with 2023-2025 counts and trend');
  await page.screenshot({path:dir+'/fema-overlay.png',timeout:30000});
  console.log('PASS Phase2A browser: full 1,734 tract data loads lazily, flood/wildfire/hurricane switch, official No Rating, ZIP restore, cached reload');
  console.log('Phase2A nonfatal page errors (other providers may be blocked): '+JSON.stringify(errors.slice(0,6)));
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL Phase2A browser QA:',e.stack||e);process.exitCode=1});
