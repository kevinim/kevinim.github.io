#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        window.__manualSchoolCsp=[];
        document.addEventListener('securitypolicyviolation',e=>window.__manualSchoolCsp.push(e.violatedDirective));
      });
      try{
        await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:90000});
        await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools.length>1500&&window.HomeSchoolManualBridge,null,{timeout:110000});
        const hint=await page.evaluate(()=>compactHomeFinderModel('123 Synthetic Drive, Carrollton, TX 75007',{status:'unavailable'}));
        assert.equal(hint.likely,'','75007 alone must not preselect wrong school district');
        await page.evaluate(()=>{
          // Synthetic in-memory data only. Never a real residential address in CI.
          home={address:'123 Synthetic Drive, Carrollton, TX 75007',ll:[33.0,-96.85],
            geocodeQuality:{usableForSchoolCandidate:true}};
          document.getElementById('homeSchoolInfo').replaceChildren(document.createElement('div'));
        });
        await page.waitForFunction(()=>document.getElementById('homeManualSchoolBridge')?.hidden===false,{timeout:15000});
        await page.locator('#homeManualSchoolBridge summary').click();
        await page.locator('#homeManualDistrict').selectOption('LISD');
        const url=await page.locator('.home-manual-official-link').getAttribute('href');
        assert.equal(url,'https://www.lisd.net/resources/families/school-locator');
        for(const [level,name] of [['elementary','HOMESTEAD'],['middle','ARBOR CREEK'],['high','HEBRON']]){
          const found=await page.evaluate(({level,name})=>{
            const target=document.getElementById('homeManual'+level);
            const matches=[...target.options].filter(opt=>opt.value && opt.textContent.toUpperCase().includes(name));
            if(matches.length!==1)return {count:matches.length,options:target.options.length};
            target.value=matches[0].value;return {count:1,selected:matches[0].textContent};
          },{level,name});
          assert.equal(found.count,1,level+' campus catalog match '+JSON.stringify(found));
        }
        await page.getByRole('button',{name:'직접 선택한 학교를 아래에 표시'}).click();
        const panel=page.locator('#homeManualSchoolBridge');
        const state1=await panel.evaluate(el=>({
          shown:!el.hidden,
          cards:el.querySelectorAll('.home-manual-school-card').length,
          text:el.textContent,
          link:el.querySelector('a')?.href,
          width:document.documentElement.scrollWidth,
          viewport:window.innerWidth,
          csp:window.__manualSchoolCsp
        }));
        assert.equal(state1.shown,true);
        assert.equal(state1.cards,3,'manual list contains selected E/M/H regardless of school building ZIP');
        assert.match(state1.text,/HOMESTEAD|Homestead/i);
        assert.match(state1.text,/ARBOR CREEK|Arbor Creek/i);
        assert.match(state1.text,/HEBRON|Hebron/i);
        assert.match(state1.text,/배정.*인증되지|자동 배정학교 정보가 아니라/);
        assert.equal(state1.link,url,'no address appended to district official URL');
        assert.equal(state1.csp.length,0,'no CSP violation');
        if(width===390)assert.ok(state1.width<=width+5,'mobile overflow '+state1.width);
        await page.evaluate(()=>{
          home=null;
          document.getElementById('homeSchoolInfo').replaceChildren();
        });
        await page.waitForFunction(()=>document.getElementById('homeManualSchoolBridge')?.hidden===true,{timeout:15000});
        assert.equal(await page.locator('.home-manual-school-card').count(),0,'clearing home destroys selected school cards');
        assert.deepEqual(errors,[],'no JS errors');
        console.log('PASS synthetic ZIP 75007 manual school visibility and privacy at '+width+' px');
      }finally{await page.close();}
    }
  }finally{await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
