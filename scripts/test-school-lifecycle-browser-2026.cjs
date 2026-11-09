#!/usr/bin/env node
'use strict';
// QA-only: verify actual browser school UI excludes retired TEA records in 2026–27.
// No real residential addresses, official Finder requests, or production changes.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const root=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const out=path.join('artifacts','school-lifecycle-browser');
fs.mkdirSync(out,{recursive:true});
const closed=[
 {district:'061901',id:'061901120',name:'PALOMA CREEK EL',query:'PALOMA CREEK'},
 {district:'220906',id:'220906103',name:'DOVE EL',query:'DOVE EL'},
 {district:'220906',id:'220906108',name:'BRANSFORD EL',query:'BRANSFORD EL'}
];
const report={targetYear:'2026-27',head:'local QA branch',views:[],warnings:[],realResidentialAddressesTested:0};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(root+'?school-lifecycle-qa='+width,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#schoolSearch').waitFor();
   await page.waitForFunction(()=>typeof state!=='undefined'&&Array.isArray(state.ratings)&&state.ratings.length>=2200&&state.schools.length>1000,null,{timeout:90000});
   await page.locator('#schoolScope').selectOption('all');
   await page.locator('#ratingFilter').selectOption('all');
   await page.locator('#levels button[data-v="all"]').click();
   const model=await page.evaluate(({closed})=>{
    const names=state.schools.map(s=>({district:s.district,id:s.id||null,name:s.name}));
    const retired=closed.map(c=>({
     id:c.id,
     teaRecordPresent:state.ratings.some(r=>r.id===c.id&&r.district===c.district),
     lifecycleRetired:isRetiredCampus({district:c.district,id:c.id,name:c.name}),
     renderedInModel:names.some(s=>s.district===c.district && (s.id===c.id||s.name.toUpperCase()===c.name))
    }));
    const durham=state.schools.some(s=>s.district==='220919'&&/DURHAM/i.test(s.name));
    return {retired,durham,schoolCount:state.schools.length,ratingCount:state.ratings.length};
   },{closed});
   assert.ok(model.retired.every(x=>x.teaRecordPresent),'historical TEA records must be kept for provenance');
   assert.ok(model.retired.every(x=>x.lifecycleRetired),'current-year retirement decisions must be active');
   assert.ok(model.retired.every(x=>!x.renderedInModel),'retired campuses must not enter the active browser model');
   assert.equal(model.durham,true,'Durham must remain available in 2026–27');
   const queries=[];
   for(const c of closed){
    await page.locator('#schoolSearch').fill(c.query);
    const buttons=await page.locator('#schoolList button.school').allTextContents();
    assert.ok(!buttons.some(t=>t.toUpperCase().includes(c.name)),c.name+' unexpectedly visible at '+width);
    queries.push({campus:c.name,visibleButtons:buttons.length});
   }
   await page.locator('#schoolSearch').fill('DURHAM');
   const durhamText=await page.locator('#schoolList').innerText();
   assert.match(durhamText,/DURHAM/i,'Durham searchable in actual browser UI at '+width);
   await page.locator('#schoolList').screenshot({path:path.join(out,'durham-visible-'+width+'.png'),timeout:30000});
   await page.locator('#schoolSearch').fill('PALOMA CREEK');
   const palomaText=await page.locator('#schoolList').innerText();
   assert.match(palomaText,/검색 결과 없음/,'Paloma Creek absent from actual current list');
   await page.locator('#schoolList').screenshot({path:path.join(out,'paloma-absent-'+width+'.png'),timeout:30000});
   const widthAudit=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   assert.ok(widthAudit.scrollWidth<=width+5,'mobile/desktop horizontal overflow detected');
   assert.deepEqual(errors,[],'browser uncaught JS errors');
   report.views.push({width,model,queries,durhamVisible:true,palomaAbsent:true,overflow:false,uncaughtErrors:0});
   console.log('PASS CAMPUS_LIFECYCLE_BROWSER '+JSON.stringify(report.views[report.views.length-1]));
   await page.close();
  }
 }catch(e){
  report.warnings.push(String(e.stack||e));
  console.error('FAIL CAMPUS_LIFECYCLE_BROWSER '+String(e.stack||e));
  process.exitCode=1;
 }finally{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
