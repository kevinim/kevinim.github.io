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
  // A school whose campus pin is missing must show its verified polygon
  // synchronously, rather than waiting on an unrelated geocoding request.
  const noPinResult=await page.evaluate(async()=>{
   const campus=state.schools.find(s=>s.district==='FISD'&&/Isbell Elementary/i.test(s.name));
   const oldPoint=campus.ll,oldAddress=campus.address,oldGeocode=geocodeSchool;
   let completeGeocode;
   campus.ll=null;
   campus.address=oldAddress||'Dummy address for delayed geocoding regression';
   geocodeSchool=()=>new Promise(resolve=>{completeGeocode=resolve});
   try{
    const pending=schoolClicked(campus);
    const immediate={
     layerCount:zoneGroup.getLayers().length,
     text:document.getElementById('zoneNotice').innerText,
     selected:state.selectedSchool===campus,
     referenceChecked:document.getElementById('referenceBoundaryOverlay').checked
    };
    if(typeof completeGeocode!=='function')throw Error('Missing coordinates must initiate non-blocking secondary lookup');
    completeGeocode(false);
    await pending;
    return immediate;
   }finally{
    campus.ll=oldPoint;campus.address=oldAddress;geocodeSchool=oldGeocode;
   }
  });
  assert.equal(noPinResult.selected,true);
  assert.equal(noPinResult.referenceChecked,true);
  assert.ok(noPinResult.layerCount>0,'School polygon must appear before geocoding completes');
  assert.ok(noPinResult.text.includes('Isbell 세부 학년 주의'),noPinResult.text);
  console.log('PASS Polygon rendered instantly while school pin geocoding was artificially delayed');
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
  // Regression for original user report: Allen campus markers must appear
  // automatically at wide map zoom; never require an Allen-only action button.
  assert.equal(await page.locator('#allenSchoolsShortcut').count(),0,
   'Allen shortcut must not exist: map rendering should work without it');
  const allenZoomAudits=[];
  for(const zoom of [9,10,11,13]){
   await page.evaluate(z=>{map.stop();map.setView([33.103,-96.675],z,{animate:false});},zoom);
   // Let Leaflet's moveend/zoomend handlers settle before inspecting the final
   // automatically drawn markers; do not rely on a stale prior-zoom layer.
   await page.waitForTimeout(350);
   const check=await page.evaluate(z=>{
    map.stop();map.setView([33.103,-96.675],z,{animate:false});
    drawSchools();
    const expected=state.schools.filter(s=>s.district==='AISD'&&s.ll&&s.type!=='other'&&
     map.getBounds().contains(s.ll)&&
     (state.level==='all'||s.type===state.level)&&
     (state.ratingFilter!=='rated'||score(s.name,s.district)!==null));
    const allEligible=state.schools.filter(s=>s.ll&&s.type!=='other'&&map.getBounds().contains(s.ll)&&
     (state.level==='all'||s.type===state.level)&&
     (state.ratingFilter!=='rated'||score(s.name,s.district)!==null));
    const layers=schoolGroup.getLayers();
    const names=new Set(layers.map(l=>l.options.title));
    const viewport=map.getContainer().getBoundingClientRect();
    const visibleDom=layers.filter(l=>{
     const elem=l.getElement?.();
     if(!elem)return false;
     const r=elem.getBoundingClientRect();
     const style=getComputedStyle(elem);
     return style.visibility!=='hidden'&&style.display!=='none'&&r.width>0&&r.height>0&&
      r.left<viewport.right&&r.right>viewport.left&&r.top<viewport.bottom&&r.bottom>viewport.top;
    });
    return {zoom:z,actualZoom:map.getZoom(),expected:expected.length,shown:expected.filter(s=>names.has(s.name)).length,eligible:allEligible.length,
     totalMarkers:layers.length,visibleInViewport:visibleDom.length,
     status:document.getElementById('schoolMapStatus').textContent};
   },zoom);
   assert.equal(check.totalMarkers,check.eligible,'No school may be silently omitted at zoom '+zoom+': '+JSON.stringify(check));
   assert.equal(check.actualZoom,zoom,'Map zoom must settle to requested level: '+JSON.stringify(check));
   assert.ok(check.expected>=10,'Expected more than 10 Allen campuses at zoom '+zoom+': '+JSON.stringify(check));
   assert.equal(check.shown,check.expected,'Allen markers must all render automatically at zoom '+zoom+': '+JSON.stringify(check));
   assert.ok(check.visibleInViewport>=check.expected,
    'Allen Leaflet markers must be visible in the rendered map, not only in data at zoom '+zoom+': '+JSON.stringify(check));
   allenZoomAudits.push(check);
  }
  // Guardrail: a marker can exist in Leaflet yet be visually absent because
  // a selected ZIP/district styling change sets opacity too low.
  // Exercise regional zoom with multiple selected ZIPs and every target district.
  const visibilityAudit=[];
  for(const zip of ['75093','75013']){
   for(const zoom of [9,10,11,12,13]){
    const result=await page.evaluate(({zip,zoom})=>{
     state.zip=zip;state.level='all';state.ratingFilter='all';state.showSchools=true;
     map.stop();map.setView([33.103,-96.675],zoom,{animate:false});drawSchools();
     const eligible=state.schools.filter(s=>s.ll&&s.type!=='other'&&map.getBounds().contains(s.ll));
     const layers=schoolGroup.getLayers();
     const actual=layers.map(l=>{
      const node=l.getElement();const mark=node?.querySelector('.mapmark');
      const outer=node?getComputedStyle(node):null;
      const inner=mark?getComputedStyle(mark):null;
      const opacity=(outer?Number(outer.opacity):0)*(inner?Number(inner.opacity):0);
      return {name:l.options.title,opacity,hidden:!node||!mark||outer.display==='none'||outer.visibility==='hidden'||inner.display==='none'||inner.visibility==='hidden'};
     });
     const expectedNames=eligible.map(s=>s.name);
     const actualNames=actual.map(x=>x.name);
     return {zip,zoom,eligible:eligible.length,rendered:layers.length,
      missing:expectedNames.filter(n=>!actualNames.includes(n)),
      lowOpacity:actual.filter(x=>x.hidden||!Number.isFinite(x.opacity)||x.opacity<0.9),
      byDistrict:Object.fromEntries(['AISD','PISD','FISD','PROSPER'].map(d=>[d,eligible.filter(s=>s.district===d).length]))};
    },{zip,zoom});
    assert.equal(result.rendered,result.eligible,'Marker count regression: '+JSON.stringify(result));
    assert.deepEqual(result.missing,[],'Missing school marker: '+JSON.stringify(result));
    assert.deepEqual(result.lowOpacity,[],'Visually hidden/dimmed school marker: '+JSON.stringify(result));
    visibilityAudit.push(result);
   }
  }
  assert.ok(visibilityAudit.some(r=>r.byDistrict.AISD>10),'Allen coverage required');
  assert.ok(visibilityAudit.some(r=>r.byDistrict.PISD>10),'Plano coverage required');
  writeFileSync(out+'/school-marker-visibility-guardrail.json',JSON.stringify(visibilityAudit,null,2)+'\\n');
  console.log('PASS all-district marker visibility/opacity guardrail across ZIP and zoom '+JSON.stringify(visibilityAudit));
  assert.equal(await page.locator('#schoolOverlay').isChecked(),true);
  console.log('PASS Allen campus markers automatically at zoom 9, 10, 11 and 13 without shortcut: '+JSON.stringify(allenZoomAudits));
  console.log('PASS school boundary auto display, per-school source footnote, district coverage audit');
  console.log('Page JavaScript errors: '+JSON.stringify(errors.slice(0,6)));
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL school boundary coverage and click browser QA: '+String(e.stack||e));process.exitCode=1});
