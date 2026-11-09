#!/usr/bin/env node
'use strict';
// Actual dashboard browser: school links and school-name HTML cannot become script execution.
// Localhost source, mocked Leaflet CDN and no external GIS/geocoder calls.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const BASE=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const leaflet=fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];
   page.on('pageerror',err=>errors.push(String(err.message||err)));
   await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(BASE))return route.continue();
    if(url==='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
     return route.fulfill({status:200,contentType:'text/javascript',body:leaflet});
    return route.abort();
   });
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.TrustedLinkPolicy&&typeof drawDetail==='function'&&
      typeof state!=='undefined'&&Array.isArray(state.schools)&&state.schools.length>0,null,{timeout:60000});
   const result=await page.evaluate(()=>{
    const school=state.schools.find(x=>x.type==='elementary'&&x.district==='PISD'&&x.ll)||
      state.schools.find(x=>x.type==='elementary'&&x.ll);
    if(!school)throw Error('No school record for real DOM test');
    const original=OFFICIAL[school.district];
    const originalSelected=state.selectedSchool;
    const payload='<img src=x data-sink-probe onerror="window.__schoolXss=1">';
    try{
      OFFICIAL[school.district]='javascript:window.__schoolXss=2';
      state.selectedSchool={...school,name:payload};
      drawDetail();
      const area=document.getElementById('detailContent');
      const schoolLink=[...area.querySelectorAll('a')].find(a=>a.textContent.includes('학군'))||null;
      const allLinks=[...area.querySelectorAll('a')].map(a=>a.getAttribute('href'));
      const sanitizedSchoolLink=schoolLink?.getAttribute('href');
      const injected=area.querySelectorAll('[data-sink-probe]').length;
      const textLiteral=area.textContent.includes(payload);
      // The production validator must also prevent unsafe href assignments
      // in the separate DOM-generated official evidence link.
      const link=document.createElement('a');
      const rejected=window.TrustedLinkPolicy.setOfficialAnchor(link,'javascript:alert(1)');
      const disabled=!link.hasAttribute('href');
      const accepted=window.TrustedLinkPolicy.setOfficialAnchor(link,original);
      return {sanitizedSchoolLink,allLinks,injected,textLiteral,executed:window.__schoolXss||0,
       rejected,disabled,accepted,restoredLink:link.getAttribute('href')};
    }finally{
      OFFICIAL[school.district]=original;
      state.selectedSchool=originalSelected;
      drawDetail();
    }
   });
   assert.ok(result.textLiteral,'hostile-looking school name should be displayed as inert text');
   assert.equal(result.injected,0);
   assert.equal(result.executed,0);
   assert.equal(result.sanitizedSchoolLink,'https://txschools.gov/');
   assert.ok(result.allLinks.every(u=>typeof u==='string'&&u.startsWith('https://')));
   assert.equal(result.rejected,false);
   assert.equal(result.disabled,true);
   assert.equal(result.accepted,true);
   assert.ok(result.restoredLink.startsWith('https://'));
   assert.deepEqual(errors,[],'unexpected page errors: '+errors.join(' | '));
   console.log('PASS school HTML sink and exact-host outbound link guard, '+width+'px');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('FAIL trusted outbound link browser QA '+String(err.stack||err));process.exitCode=1});
