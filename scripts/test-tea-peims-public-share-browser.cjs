#!/usr/bin/env node
'use strict';
/*
 * UAT-only browser coverage: real selected-school dashboard details at 1280 / 390 px.
 * Uses only localhost and public TEA aggregate data, never production URLs or addresses.
 */
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ROOT='http://127.0.0.1:8765/';
const OUT='artifacts/tea-public-share-uat';
const REPORT=require('../data/tea-ethnicity-2025-26-priority.json');
const CALC=require('../features/tea-peims-public-share-addon.js');
const keys=['black','hispanic','white','native','asian','pacific','multi'];
function stats(c){
 return CALC.computePublishedShare(keys.map(key=>({
  key,status:c.counts[key].status,
  count:c.counts[key].status==='published'?c.counts[key].count:null
 })));
}
const unchartable=Object.entries(REPORT.campuses)
 .find(([id,c])=>['CFB','LISD'].includes(c.district)&&stats(c)?.hasHidden&&!stats(c).canChart)?.[0];
assert.ok(unchartable,'expected at least one CFB/LISD source-suppressed low-publicity campus');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   await page.goto(ROOT,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools.length>1500
      &&state.ratingIndex?.size>100&&typeof window.CarrolltonSchoolInsights?.getPublishedCountRows==='function'
      &&typeof window.TEAPeimsPublishedShare?.computePublishedShare==='function',null,{timeout:110000});
   async function select(id){
    const chosen=await page.evaluate(id=>{
     const school=state.schools.find(s=>scoreRecord(s.name,s.district)?.id===id);
     if(!school)return null;
     document.getElementById('schoolScope').value='all';
     state.schoolQuery=school.name.toLowerCase();
     state.level='all';state.ratingFilter='all';
     drawList();
     const exact=[...document.querySelectorAll('#schoolList button.school[data-sid]')].filter(button=>{
      const record=state.schools[Number(button.dataset.sid)];
      return record && scoreRecord(record.name,record.district)?.id===id;
     });
     return {sid:exact[0]?.dataset.sid,count:exact.length,name:school.name};
    },id);
    assert.ok(chosen,'campus not selectable '+id);
    assert.equal(chosen.count,1,'exact school click ID match '+id);
    // Numeric data-sid can change when async school inventory redraws.
    // Re-resolve the immutable TEA Campus ID and activate the actual button
    // handler within one browser event loop turn (same #264 QA protection).
    const clicked=await page.evaluate(id=>{
     const current=[...document.querySelectorAll('#schoolList button.school[data-sid]')].find(button=>{
      const school=state.schools[Number(button.dataset.sid)];
      return school && scoreRecord(school.name,school.district)?.id===id;
     });
     if(!current)return false;
     current.click();
     return true;
    },id);
    assert.equal(clicked,true,'campus button detached or absent '+id);
    await page.waitForFunction(id=>document.querySelector('#detailContent .tea-insights-panel')?.dataset.campus===id,id,{timeout:30000});
    await page.waitForFunction(id=>!!document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"] .tea-peims-counts'),id,{timeout:60000});
   }
   for(const [id,knownSubtotal] of [['061902118',675],['057903122',498],['061902136',571]]){
    await select(id);
    await page.waitForFunction(id=>!!document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"] .tea-public-share-addon'),id,{timeout:30000});
    const result=await page.evaluate(id=>{
      const panel=document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"]');
      const addon=panel?.querySelector('.tea-public-share-addon');
      if(!panel||!addon)return null;
      const source=window.CarrolltonSchoolInsights.getPublishedCountRows(id);
      const stat=window.TEAPeimsPublishedShare.computePublishedShare(source);
      const stack=addon.querySelector('.tea-public-share-stack');
      const rect=addon.getBoundingClientRect();
      return {
       id:addon.dataset.campus,count:panel.querySelectorAll('.tea-public-share-addon').length,
       heading:addon.querySelector('h5')?.textContent||'',
       text:addon.textContent,
       rows:addon.querySelectorAll('.tea-public-share-legend li').length,
       originalRows:panel.querySelectorAll('.tea-peims-counts > .tea-insights-legend li').length,
       stack:!!stack,segments:stack?.childElementCount||0,
       aria:stack?.getAttribute('aria-label')||'',
       subtotal:stat?.subtotal,published:stat?.published,
       suppressed:stat?.suppressed,unlisted:stat?.unlisted,
       bounds:{left:rect.left,right:rect.right,width:rect.width},
       responsiveGrid:getComputedStyle(addon.querySelector('.tea-public-share-legend')).gridTemplateColumns
      };
    },id);
    assert.ok(result,id+' missing add-on DOM');
    assert.equal(result.id,id);assert.equal(result.count,1);
    assert.equal(result.subtotal,knownSubtotal);
    assert.equal(result.originalRows,7,'original 7-cell source list unchanged');
    assert.equal(result.rows,7);assert.equal(result.stack,true);
    assert.equal(result.published+result.suppressed+result.unlisted,7);
    assert.ok(result.segments>=2);
    assert.ok(result.heading.includes('공개된 인원 기준 비율'));
    assert.ok(result.text.includes('학교 전체 인종 구성 비율과 다릅니다'));
    assert.ok(result.aria.includes('학교 전체 학생 비율 아님'));
    assert.ok(result.bounds.width>150);
    assert.ok(result.bounds.right<=width+4,'add-on must fit viewport '+width+' at '+id+' '+JSON.stringify(result.bounds));
    await page.locator('#detailContent .tea-insights-panel[data-campus="'+id+'"] .tea-public-share-addon').screenshot({
      path:OUT+'/'+width+'-'+id+'.png',animations:'disabled',timeout:15000
    });
    // Confirm benign detail mutation cannot duplicate the add-on.
    await page.evaluate(()=>document.querySelector('#detailContent .tea-insights-panel')?.appendChild(document.createTextNode('')));
    await page.waitForTimeout(60);
    assert.equal(await page.locator('#detailContent .tea-public-share-addon').count(),1,'observer idempotent');
   }
   // A valid source can have too few disclosed groups for a 100% chart.
   await select(unchartable);
   await page.waitForFunction(id=>!!document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"] .tea-public-share-addon'),unchartable,{timeout:30000});
   const hidden=page.locator('#detailContent .tea-public-share-addon');
   assert.equal(await hidden.count(),1);
   assert.equal(await hidden.locator('.tea-public-share-stack').count(),0);
   assert.match(await hidden.textContent(),/비율 차트를 표시하지 않습니다/);
   await hidden.screenshot({path:OUT+'/'+width+'-masked-no-chart.png',animations:'disabled'});
   // On five independently reconciled, fully published schools, preserve the existing
   // school-wide denominator display and avoid a duplicate partial-subtotal chart.
   await select('043901001');
   await page.waitForFunction(id=>!!document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"] .tea-peims-counts'), '043901001',{timeout:30000});
   assert.equal(await page.locator('#detailContent .tea-public-share-addon').count(),0,'existing verified full-share panel not duplicated');
   assert.equal(await page.locator('#detailContent .tea-peims-counts .tea-insights-legend li').count(),7);
   await page.close();
   console.log('PASS '+width+'px viewport, 3 masked sample ratios, masked no-chart and audited full-denominator safeguard');
   if(errors.length)console.warn('Unrelated dashboard page errors recorded:',errors.slice(0,5));
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
