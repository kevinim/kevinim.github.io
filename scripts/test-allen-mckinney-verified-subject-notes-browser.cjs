#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:8765/',out='artifacts/tea-allen-subject-uat';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools.length>1500&&
     state.ratingIndex?.size>100&&typeof window.TEAAllenMcKinneyReview?.validate==='function',
     null,{timeout:110000});
   async function select(id){
    const success=await page.evaluate(id=>{
     const school=state.schools.find(x=>scoreRecord(x.name,x.district)?.id===id);
     if(!school)return false;
     const scope=document.getElementById('schoolScope');
     if(scope)scope.value='all';
     state.schoolQuery=school.name.toLowerCase();
     state.level='all';state.ratingFilter='all';
     drawList();
     const current=[...document.querySelectorAll('#schoolList button.school[data-sid]')].find(button=>{
      const record=state.schools[Number(button.dataset.sid)];
      return record&&scoreRecord(record.name,record.district)?.id===id;
     });
     if(!current)return false;
     current.click();
     return true;
    },id);
    assert.equal(success,true,'school list failed to activate TEA '+id);
    await page.waitForFunction(id=>document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"]')!==null,
      id,{timeout:40000});
    await page.waitForFunction(id=>document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"] .tea-allen-subject-review')!==null,
      id,{timeout:60000});
    const state=await page.evaluate(id=>{
     const panel=document.querySelector('#detailContent .tea-insights-panel[data-campus="'+id+'"]');
     const addon=panel?.querySelector('.tea-allen-subject-review');
     if(!addon)return null;
     const bounds=addon.getBoundingClientRect();
     return {id:addon.dataset.campus,counts:panel.querySelectorAll('.tea-allen-subject-review').length,
      label:addon.getAttribute('aria-label'),text:addon.textContent,
      link:addon.querySelector('a')?.href||'',right:bounds.right,width:bounds.width,
      peims:panel.querySelectorAll('.tea-peims-counts').length};
    },id);
    assert.ok(state,id+' missing subject note');
    assert.equal(state.id,id);
    assert.equal(state.counts,1,'no duplicate student notes');
    assert.equal(state.peims,1,'existing PEIMS count component must survive');
    assert.ok(state.link.startsWith('https://rptsvr1.tea.texas.gov/'));
    assert.ok(state.width>100&&state.right<=width+4,'subject notes must fit '+width+'px viewport');
    return state;
   }
   const allen=await select('043901001');
   assert.match(allen.text,/사회 86%/);assert.match(allen.text,/과학 43%/);
   assert.match(allen.text,/종합등급의 원인/);
   assert.match(allen.text,/학생 인종/);
   await page.locator('#detailContent .tea-allen-subject-review').screenshot({
    path:out+'/'+width+'-allen-high.png',animations:'disabled'
   });
   const elementary=await select('043901002');
   assert.match(elementary.text,/과학 90%/);assert.match(elementary.text,/수학 60%/);
   const paired=await select('043901201');assert.match(paired.text,/연계 평가/);
   assert.doesNotMatch(paired.text,/강점:.*\d+%/);
   const paired2=await select('043907125');assert.match(paired2.text,/연계 평가/);
   const nr=await select('043907005');assert.match(nr.text,/Not Rated/);
   assert.doesNotMatch(nr.text,/가장 높은 공개 과목/);
   await page.close();
   console.log('PASS '+width+'px: source-verified Allen subjects, paired schools, Not Rated and PEIMS preservation');
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});
