#!/usr/bin/env node
'use strict';
// Read-only automated QA of the ACTUAL PUBLIC GitHub Pages URL.
// No private addresses, credentials, uploads or production state mutations.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const BASE=(process.env.DASHBOARD_BASE_URL||'https://kevinim.github.io/').replace(/\/?$/,'/');
const DIR='artifacts/live-postdeploy';
mkdirSync(DIR,{recursive:true});
const report={site:BASE,startedAt:new Date().toISOString(),viewports:[],issues:[],warnings:[]};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function verify(browser,width){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 const jsErrors=[],httpFailures=[];
 page.on('pageerror',e=>jsErrors.push(String(e.message||e).slice(0,280)));
 page.on('response',r=>{
  if(r.url().startsWith(BASE)&&r.status()>=400)httpFailures.push({status:r.status(),path:new URL(r.url()).pathname});
 });
 await page.addInitScript(()=>{
  window.__liveCspViolations=[];
  document.addEventListener('securitypolicyviolation',e=>{
   window.__liveCspViolations.push({directive:e.violatedDirective,uri:e.blockedURI});
  });
 });
 const entry={width,checks:[],warnings:[],schoolZipCounts:[]};
 try{
  await page.goto(BASE+'?postdeploy-live-qa='+width+'-'+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForSelector('.leaflet-container',{timeout:75000});
  await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&typeof selectZip==='function'&&typeof window.getSchoolBoundaryCoverage==='function',null,{timeout:110000});
  const basic=await page.evaluate(()=>{
   const policy=document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content||'';
   const r=document.getElementById('map')?.getBoundingClientRect();
   return {policy,schools:state.schools.length,leaflet:typeof L!=='undefined',
    mapWidth:r?.width||0,mapHeight:r?.height||0,
    scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,
    polygons:window.getSchoolBoundaryCoverage().targetSix};
  });
  assert.ok(basic.leaflet&&basic.mapWidth>200&&basic.mapHeight>150,'Live Leaflet map must be visible and sized');
  assert.ok(basic.schools>=1500,'Live school directory failed to load');
  assert.equal(basic.polygons.matched+basic.polygons.missing,basic.polygons.total,
   'School polygon coverage inventory inconsistent');
  assert.ok(basic.polygons.total>=250&&basic.polygons.matched>=200,
   'Core six district school boundary links substantially regressed');
  for(const required of ["default-src 'self'","connect-src 'self'","img-src 'self'","script-src-attr 'none'","object-src 'none'"])
   assert.ok(basic.policy.includes(required),'Live CSP missing '+required);
  const script=basic.policy.split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src '))||'';
  assert.ok(!script.includes("'unsafe-inline'")&&!script.includes("'unsafe-eval'"),'Live CSP permits inline/eval scripts');
  if(width<=430)assert.ok(basic.scrollWidth<=width+5,
   'Mobile document horizontal overflow: '+basic.scrollWidth+'px vs '+width);
  entry.checks.push('Live Leaflet, school inventory, polygon coverage and deployed CSP directives');
  entry.schoolInventory={total:basic.schools,core:basic.polygons};

  // Test the original Allen 75013 zero-markers regression, including a second visit.
  const zips=await page.evaluate(async()=>{
   const results=[];
   state.showSchools=true;state.level='all';state.ratingFilter='all';
   for(const zip of ['75093','75013','75034','75013']){
    selectZip(zip);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    syncMapSize();drawSchools();
    const bounds=map.getBounds();
    results.push({zip,markers:schoolGroup.getLayers().length,
      nearbyAllen:state.schools.filter(s=>s.district==='AISD'&&s.ll&&bounds.contains(s.ll)).length,
      size:map.getSize().x+'x'+map.getSize().y,
      status:document.getElementById('schoolMapStatus')?.textContent?.slice(0,185)});
   }
   return results;
  });
  entry.schoolZipCounts=zips;
  for(const item of zips)assert.ok(item.markers>0,
   'School markers disappear when switching ZIP to '+item.zip+' at '+width+'px: '+JSON.stringify(item));
  assert.ok(zips[1].nearbyAllen>0&&zips[3].nearbyAllen>0,
   'Allen school markers are not visible after ZIP 75013 selection/revisit');
  entry.checks.push('Repeated Plano→Allen→Frisco→Allen viewport school markers');

  // Frisco known zone: the official/current polygon should auto-open on selection.
  const boundary=await page.evaluate(async()=>{
   const school=state.schools.find(s=>s.district==='FISD'&&/Isbell Elementary/i.test(s.name));
   if(!school)throw Error('Isbell Elementary not present in live school list');
   await schoolClicked(school);
   return {count:zoneGroup.getLayers().length,notice:document.getElementById('zoneNotice')?.textContent||'',
     selected:state.selectedSchool?.name};
  });
  assert.ok(boundary.count>0,'Frisco school click did not draw boundary automatically');
  assert.ok(boundary.notice.length>5,'School zone/source disclaimer missing');
  entry.boundary={school:boundary.selected,polygonLayers:boundary.count,notice:boundary.notice.slice(0,250)};
  entry.checks.push('Known Frisco elementary school click shows boundary and source disclaimer');

  // Synthetic short query; do not enter or transmit any residential address.
  const address=page.locator('#homeAddress');
  await address.fill('Pla');
  assert.equal(await page.locator('#homeClear').isVisible(),true,
   'Address clear X should appear for typed input');
  await page.locator('#homeClear').click();
  assert.equal(await address.inputValue(),'','Address clear X must empty input');
  assert.equal(await page.locator('#homeClear').isVisible(),false,
   'Address clear X must hide after clearing');
  entry.checks.push('Search field clear X works with a non-address test string');

  if(width===1366){
   // Only enable locally bundled NRI data. Do not depend on FEMA's separate remote NFHL service.
   if(await page.locator('#auxiliaryDataDetails').count())await page.locator('#auxiliaryDataDetails > summary').click();
   const panel=page.locator('#phase2HazardPanel');
   if(!(await panel.evaluate(node=>node.open)))await page.locator('#phase2HazardPanel > summary').click();
   await page.locator('#femaHazardEnabled').check();
   await page.waitForFunction(()=>document.getElementById('femaHazardStatus')?.textContent?.includes('1,734'),null,{timeout:70000});
   entry.checks.push('Live FEMA NRI overlay loads 1,734 tracts');
   await page.locator('#femaHazardEnabled').uncheck();
   assert.equal(await page.locator('#zipOverlay').isChecked(),true,
    'ZIP overlay should restore after NRI toggle');
   const flood=page.locator('#nfhlFloodPanel');
   if(!(await flood.evaluate(node=>node.open)))await page.locator('#nfhlFloodPanel > summary').click();
   await page.locator('#nfhlEnabled').check();
   if(await page.evaluate(()=>map.getZoom()<14)){
    assert.match(await page.locator('#nfhlStatus').innerText(),/줌 14/,
      'NFHL must not issue broad-area real-time queries below zoom 14');
    entry.checks.push('NFHL broad-area query guard requires zoom 14');
   }
   await page.evaluate(()=>map.setView([32.778,-96.813],15));
   await page.waitForFunction(()=>{
    const t=document.getElementById('nfhlStatus')?.textContent||'';
    return t.includes('NFHL 공식 실시간 조회')||t.includes('조회에 실패했습니다')||t.includes('서비스를 사용할 수 없습니다');
   },null,{timeout:65000}).catch(()=>{});
   const nfhlStatus=await page.locator('#nfhlStatus').innerText();
   entry.nfhlStatus=nfhlStatus;
   if(nfhlStatus.includes('NFHL 공식 실시간 조회')&&/\d+개 홍수구역/.test(nfhlStatus))
    entry.checks.push('Live FEMA NFHL responds with a flood-zone overlay');
   else entry.warnings.push('External FEMA NFHL response unavailable or empty: '+nfhlStatus.slice(0,180));
   await page.locator('#nfhlEnabled').uncheck();
   assert.equal(await page.locator('#zipOverlay').isChecked(),true,
    'ZIP overlay should restore after NFHL toggle');

   const txwrap=page.locator('#txwrapWHPPanel');
   if(!(await txwrap.evaluate(node=>node.open)))await page.locator('#txwrapWHPPanel > summary').click();
   await page.locator('#txwrapWHPEnabled').check();
   await sleep(4000);
   const raster=await page.locator('#txwrapWHPStatus').innerText();
   entry.txwrapStatus=raster;
   if(/불러올 수 없|확인할 수 없어|타일 오류|실패/.test(raster))
    entry.warnings.push('External TxWRAP raster availability not confirmed: '+raster);
   else entry.checks.push('TxWRAP overlay control enabled without immediate service error');
   await page.locator('#txwrapWHPEnabled').uncheck();
   assert.equal(await page.locator('#zipOverlay').isChecked(),true,
    'ZIP overlay should restore after wildfire raster toggle');
   const grid=page.locator('#gridResiliencePanel');
   assert.equal(await grid.count(),1,'Winter/grid resilience panel must exist');
   if(!(await grid.evaluate(node=>node.open)))await page.locator('#gridResiliencePanel > summary').click();
   await page.locator('#winterMapEnabled').check();
   await page.waitForFunction(()=>/FEMA 2025.*(?:1734|1,734)개 Census tract/.test(
    document.getElementById('winterMapStatus')?.textContent||''),null,{timeout:60000});
   entry.winterStatus=await page.locator('#winterMapStatus').innerText();
   entry.checks.push('Winter NRI tract overlay loads and labels address-level outage limitation');
   await page.locator('#winterMapEnabled').uncheck();
   assert.equal(await page.locator('#zipOverlay').isChecked(),true,
    'ZIP overlay should restore after winter hazard toggle');
  }
  const violations=await page.evaluate(()=>window.__liveCspViolations||[]);
  entry.cspViolations=violations;
  assert.deepEqual(violations,[],
   'Live app features violated CSP: '+JSON.stringify(violations));
  assert.deepEqual(jsErrors,[],'Live app Javascript exceptions: '+JSON.stringify(jsErrors));
  assert.deepEqual(httpFailures,[],'Published same-origin assets returned errors: '+JSON.stringify(httpFailures));
  entry.checks.push('No unsolicited CSP violations, JS exceptions, or local asset errors');
  await page.screenshot({path:path.join(DIR,'live-'+width+'.png'),fullPage:true,timeout:45000});
  return entry;
 }catch(e){
  entry.error=String(e.stack||e).slice(0,4000);
  entry.cspViolations=await page.evaluate(()=>window.__liveCspViolations||[]).catch(()=>[]);
  entry.jsErrors=jsErrors;
  entry.httpFailures=httpFailures;
  await page.screenshot({path:path.join(DIR,'failure-'+width+'.png'),fullPage:true,timeout:20000}).catch(()=>{});
  throw Object.assign(new Error(entry.error),{details:entry});
 }finally{await page.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1366,390]){
   try{report.viewports.push(await verify(browser,width))}
   catch(e){report.issues.push({width,error:String(e.message||e),details:e.details});continue}
  }
 }finally{
  await browser.close().catch(()=>{});
  report.completedAt=new Date().toISOString();
  report.status=report.issues.length?'FAIL':'PASS';
  writeFileSync(path.join(DIR,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
 if(report.issues.length){
  console.error('LIVE POSTDEPLOY QA FAILED '+JSON.stringify(report.issues).slice(0,8500));
  process.exitCode=1;
 }else console.log('LIVE POSTDEPLOY QA PASSED '+JSON.stringify(report.viewports.map(x=>({width:x.width,checks:x.checks,zip:x.schoolZipCounts,csp:x.cspViolations}))));
})().catch(e=>{console.error(e);process.exitCode=1});
