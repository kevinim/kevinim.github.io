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
  const sourceNames=await page.evaluate(()=>({
   friscoIsbell:(state.zoneData.FISD||[]).filter(x=>/isbell/i.test(x.properties?.school||'')).map(x=>({school:x.properties.school,grade:x.properties.gradeLevel,grades:x.properties.grades})),
   planoAcademy:(state.zoneData.PISD_LOOKUP||[]).filter(x=>/academy/i.test(x.properties?.school||'')).map(x=>x.properties.school),
   lisdMill:(state.zoneData.LISD||[]).filter(x=>/mill.?street/i.test(x.properties?.school||'')).map(x=>x.properties.school),
   allenLowery:(state.zoneData.AISD||[]).filter(x=>/lowery/i.test(x.properties?.school||'')).map(x=>x.properties.school)
  }));
  console.log('SCHOOL BOUNDARY FOUR EXCEPTION SOURCE LABELS '+JSON.stringify(sourceNames));
  assert.ok(report.targetSix.total>200);
  assert.equal(report.targetSix.matched+report.targetSix.missing,report.targetSix.total);
  assert.equal(report.otherDistricts.total+report.targetSix.total,report.total);
  assert.equal(report.targetSix.total,273,'In-scope school directory should not unexpectedly change');
  assert.equal(report.targetSix.byDistrict,undefined);
  assert.equal(report.targetSix.missingSchools.filter(x=>x.district==='CFB').length,30);
  assert.equal(report.targetSix.missingSchools.filter(x=>x.reason==='special-campus-no-standard-zone').length,4);
  assert.equal(report.targetSix.missingSchools.filter(x=>x.district==='CFB'&&x.reason==='no-district-polygon-source').length,29);
  assert.ok(report.targetSix.missingSchools.some(x=>x.district==='CFB'&&/EARLY COLLEGE H S/i.test(x.school)&&x.reason==='special-campus-no-standard-zone'));
  assert.equal(report.targetSix.missingSchools.some(x=>/Isbell/i.test(x.school)),false,'Frisco official Isbell K-4 2026 polygons must display');
  const gradeSplit=await page.evaluate(()=>{
   const selected=state.schools.find(x=>x.district==='FISD'&&/Isbell Elementary/i.test(x.name));
   return window.SchoolBoundaryMatch.findSchoolBoundary(selected,state.zoneData.FISD||[],(name,district)=>scoreRecord(name,district)).features.map(f=>({school:f.properties.school,grades:f.properties.grades}));
  });
  assert.equal(gradeSplit.length,2);
  assert.ok(gradeSplit.every(x=>x.grades==='K-4'));
  await page.evaluate(async ()=>{
   const school=state.schools.find(x=>x.district==='FISD'&&/Isbell Elementary/i.test(x.name));
   await schoolClicked(school);
  });
  assert.ok((await page.locator('#zoneNotice').innerText()).includes('Isbell 세부 학년 주의'));

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
  await page.evaluate(async()=>{
   const early=state.schools.find(x=>x.district==='CFB'&&/EARLY COLLEGE H S/i.test(x.name));
   if(!early)throw Error('CFB Early College high school missing from browser directory');
   await schoolClicked(early);
  });
  const earlyReason=await page.locator('#zoneNotice').innerText();
  assert.ok(earlyReason.includes('별도 지원·추첨'),earlyReason);
  assert.ok((await page.locator('#zoneNotice a').getAttribute('href')).includes('earlycollege.cfbisd.edu'));
  console.log('PASS school boundary auto display, per-school source footnote, district coverage audit');
  console.log('Page JavaScript errors: '+JSON.stringify(errors.slice(0,6)));
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL school boundary coverage and click browser QA: '+String(e.stack||e));process.exitCode=1});
