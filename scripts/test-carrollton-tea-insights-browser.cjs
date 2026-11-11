#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT='http://127.0.0.1:8765/';
const ARTIFACTS='artifacts/carrollton-tea-insights';
const CASES=[
  ['061902118','STEM Academy at Hebron Valley Elementary'],
  ['061902008','Hebron High School'],
  ['057903102','Carrollton Elementary']
];
fs.mkdirSync(ARTIFACTS,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[],csp=[];
      page.on('pageerror',e=>errors.push(String(e.message||e)));
      await page.addInitScript(()=>{
        window.__carrolltonCsp=[];
        document.addEventListener('securitypolicyviolation',e=>window.__carrolltonCsp.push(e.violatedDirective+':'+e.blockedURI));
      });
      try{
        await page.goto(ROOT,{waitUntil:'domcontentloaded',timeout:90000});
        await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools.length>1500&&state.ratingIndex?.size>100&&window.CarrolltonSchoolInsights?.count===18,
          null,{timeout:110000});
        const results=[];
        for(const [id,label] of CASES){
          const chosen=await page.evaluate(id=>{
            const s=state.schools.find(s=>scoreRecord(s.name,s.district)?.id===id);
            if(!s)return null;
            document.getElementById('schoolScope').value='all';
            state.schoolQuery=s.name.toLowerCase();
            state.level='all';state.ratingFilter='all';
            drawList();
            return {name:s.name,district:s.district};
          },id);
          assert.ok(chosen,'campus missing from live directory '+id);
          const card=page.locator('#schoolList button.school[data-sid]');
          assert.equal(await card.count(),1,'one and only one exact campus listing '+id);
          await card.click();
          await page.waitForFunction(id=>document.querySelector('#detailContent .tea-insights-panel')?.dataset.campus===id,null,{timeout:15000},id);
          const found=await page.evaluate(()=>({
            id:document.querySelector('.tea-insights-panel')?.dataset.campus,
            summary:document.querySelector('.tea-insights-summary')?.textContent,
            domainCount:document.querySelectorAll('.tea-insights-domains dd').length,
            raceCount:document.querySelectorAll('.tea-insights-legend li').length,
            missing:!!document.querySelector('.tea-insights-missing'),
            link:[...document.querySelectorAll('.tea-insights-panel a')].map(a=>({label:a.textContent,url:a.href})),
            chart:document.querySelector('.tea-insights-stack')?.getAttribute('aria-label'),
            selected:!!state.selectedSchool,
            mapMarkers:schoolGroup.getLayers().length,
            viewport:innerWidth,
            scrollWidth:document.documentElement.scrollWidth,
            csp:window.__carrolltonCsp||[]
          }));
          assert.equal(found.id,id,'correct school joins to exact TEA ID');
          assert.ok(found.summary.length>20,'Korean insight summary visible');
          assert.ok(found.selected,'existing campus selection intact');
          assert.ok(found.link.some(x=>x.url.startsWith('https://txschools.gov/')),'official campus source included');
          if(id==='057903102'){
            assert.equal(found.raceCount,0,'unverified race must remain absent');
            assert.equal(found.missing,true,'unverified race must have clear missing label');
          }else{
            assert.equal(found.domainCount,3,'verified 2026 score components');
            assert.equal(found.raceCount,7,'all seven demographic categories with numeric labels');
            assert.equal(found.missing,false);
            assert.ok(found.chart?.includes('아시아계'),'chart needs accessible ethnic names and shares');
          }
          assert.deepEqual(found.csp,[],'CSP violation detected '+JSON.stringify(found.csp));
          if(width===390)assert.ok(found.scrollWidth<=width+5,'mobile horizontal overflow '+found.scrollWidth);
          results.push({school:label,...found});
          if(id==='061902118')await page.screenshot({path:path.join(ARTIFACTS,'campus-'+width+'.png'),fullPage:true,timeout:40000});
        }
        assert.deepEqual(errors,[],'runtime exceptions '+errors.join(','));
        fs.writeFileSync(path.join(ARTIFACTS,'qa-'+width+'.json'),JSON.stringify(results,null,2)+'\n');
        console.log('PASS Carrollton TEA campus profiles '+width+'px, '+results.length+' school selections');
      }finally{await page.close();}
    }
  }finally{await browser.close();}
})().catch(error=>{console.error('FAIL Carrollton TEA browser QA:',error.stack||error);process.exitCode=1;});
