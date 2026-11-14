'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SITE_URL||'http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
   const errors=[],violations=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('console',msg=>{
    if(msg.type()==='error'&&/Content Security Policy|violat/i.test(msg.text()))violations.push(msg.text());
   });
   await page.goto(base+'school-grade-uat.html',{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>window.__schoolGradeZonesUatReady===true,{timeout:105000});
   assert.equal(await page.locator('#schoolGradeZonesPanel').count(),1);
   assert.equal(await page.locator('#schoolGradeThreshold').inputValue(),'B');
   assert.equal(await page.locator('#schoolGradeLevel').inputValue(),'elementary');
   assert.equal(await page.locator('#schoolGradeIncludeReference').isChecked(),false);
   const first=await page.evaluate(()=>window.__schoolGradeZonesUatDebug);
   assert.equal(first.ratingsReady,true,'TEA ratings must load');
   assert.equal(first.zoneReady,true,'Polygon loader must resolve without inventing coverage');
   // Allen is historical: default render must never silently paint old GIS as current.
   await page.locator('#schoolGradeCity').selectOption('allen');
   let status=await page.locator('#schoolGradeZoneStatus').innerText();
   assert.match(status,/선택한 조건과 검증 상태에서 표시할 학교 경계가 없습니다/);
   assert.match(await page.locator('#schoolGradeZoneDisclaimer').innerText(),/2019–23/);
   assert.equal((await page.evaluate(()=>window.__schoolGradeZonesUatDebug)).drawn,0);
   await page.locator('#schoolGradeIncludeReference').check();
   const b=await page.evaluate(()=>window.__schoolGradeZonesUatDebug);
   assert.ok(b.drawn>0,'Allen historical polygons and 2026 TEA rating join should display as reference');
   await page.locator('#schoolGradeThreshold').selectOption('A');
   const a=await page.evaluate(()=>window.__schoolGradeZonesUatDebug);
   assert.ok(a.drawn<=b.drawn,'A only is subset of B+');
   await page.locator('#schoolGradeThreshold').selectOption('C');
   const c=await page.evaluate(()=>window.__schoolGradeZonesUatDebug);
   assert.ok(c.drawn>=b.drawn,'C+ includes B+');
   await page.locator('#schoolGradeEnabled').uncheck();
   assert.equal((await page.evaluate(()=>window.__schoolGradeZonesUatDebug)).drawn,0);
   await page.locator('#schoolGradeEnabled').check();
   assert.ok((await page.evaluate(()=>window.__schoolGradeZonesUatDebug)).drawn>0);
   // CFB official campus zones not in repo; never describe reference LISD as all Carrollton.
   await page.locator('#schoolGradeCity').selectOption('carrollton');
   assert.match(await page.locator('#schoolGradeZoneDisclaimer').innerText(),/CFB는 승인된 학교별 경계가 없으며/);
   await page.locator('#schoolGradeCity').selectOption('mckinney');
   const mk=await page.evaluate(()=>window.__schoolGradeZonesUatDebug);
   assert.equal(mk.city,'mckinney');
   assert.ok(mk.drawn>=0,'McKinney live source may fail; must fail closed');
   const box=await page.locator('#schoolGradeZonesPanel').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
   assert.ok(box.scroll<=box.width+2,'No mobile horizontal overflow: '+JSON.stringify(box));
   assert.deepEqual(violations,[],'CSP violations must not appear');
   assert.deepEqual(errors,[],'Unexpected page runtime errors');
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:80000});
   assert.equal(await page.locator('#schoolGradeZonesPanel').count(),0,'Normal dashboard unchanged');
   console.log('PASS '+width+'px A/B/C, E/M/H filter, Allen reference, Carrollton provenance, normal dashboard isolation');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
