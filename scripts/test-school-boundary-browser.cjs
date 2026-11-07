#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const out='artifacts/phase2a-browser';
mkdirSync(out,{recursive:true});
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true,null,{timeout:100000});
  const report=await page.evaluate(()=>window.getSchoolBoundaryCoverage());
  assert.ok(report.total>60,'must test actual expanded loaded school list, not fallback only');
  assert.equal(report.matched+report.missing,report.total);
  assert.equal(report.missingSchools.length,report.missing);
  assert.ok(report.byDistrict.FISD?.total>5);
  assert.ok(report.byDistrict.PISD?.total>10);
  assert.ok(report.byDistrict.AISD?.total>1);
  assert.ok(report.byDistrict.PROSPER?.total>=1);
  assert.ok(report.byDistrict.CFB?.total>=1);
  assert.equal(report.byDistrict.CFB.matched,0,'CFB has official working address Finder but no stored per-campus GIS polygons');
  writeFileSync(out+'/school-boundary-coverage.json',JSON.stringify({generatedAt:new Date().toISOString(),...report},null,2)+'\n');
  console.log('SCHOOL BOUNDARY COVERAGE AUDIT '+JSON.stringify({total:report.total,matched:report.matched,missing:report.missing,byReason:report.byReason,byDistrict:report.byDistrict}));
  console.log('SCHOOL BOUNDARY TARGET SIX SUMMARY '+JSON.stringify(report.targetSix));
  console.log('SCHOOL BOUNDARY EXTRA DISTRICTS '+JSON.stringify(report.otherDistricts));
  console.log('SCHOOL BOUNDARY TARGET SIX MISSING SCHOOL LIST '+JSON.stringify(report.targetSix.missingSchools));
  assert.ok(report.targetSix.total>200);
  assert.equal(report.targetSix.matched+report.targetSix.missing,report.targetSix.total);
  assert.equal(report.otherDistricts.total+report.targetSix.total,report.total);
  // Test that selecting a school auto-enables the previously disabled historic
  // map checkbox and renders a historical polygon instead of an instructive notice.
  const allen=await page.evaluate(()=>{
   const report=window.getSchoolBoundaryCoverage();
   const matches=state.schools.filter(s=>s.district==='AISD'&&
    window.SchoolBoundaryMatch.findSchoolBoundary(s,state.zoneData.AISD||[],(n,d)=>scoreRecord(n,d)).status==='matched');
   return matches.map(s=>({name:s.name,type:s.type,ll:s.ll}));
  });
  if(allen.length){
   await page.locator('#referenceBoundaryOverlay').uncheck();
   await page.evaluate(async name=>{
    const s=state.schools.find(x=>x.district==='AISD'&&x.name===name);
    await schoolClicked(s);
   },allen[0].name);
   assert.equal(await page.locator('#referenceBoundaryOverlay').isChecked(),true);
   const stateAfter=await page.evaluate(()=>({layers:zoneGroup.getLayers().length,note:document.getElementById('zoneNotice').innerText}));
   assert.ok(stateAfter.layers>0,'old Allen attendance polygon must be drawn automatically on school selection');
   assert.ok(/과거 GIS 경계/.test(stateAfter.note),'explicit 2019/2023 vintage disclaimer must remain');
  }
  const noData=report.missingSchools.find(x=>x.district==='CFB')||report.missingSchools.find(x=>x.reason==='school-not-in-polygon-source');
  if(noData){
   await page.evaluate(async ({district,school})=>{
    const s=state.schools.find(x=>x.district===district&&x.name===school);
    await schoolClicked(s);
   },noData);
   const reason=await page.locator('#zoneNotice').innerText();
   assert.ok(reason.includes('경계 미표시 각주'),reason);
   assert.ok(reason.includes('GIS')||reason.includes('도형')||reason.includes('원본'),reason);
  }
  console.log('PASS school boundary auto display, per-school source footnote, district coverage audit');
  console.log('Page JavaScript errors: '+JSON.stringify(errors.slice(0,6)));
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL school boundary coverage and click browser QA: '+String(e.stack||e));process.exitCode=1});
