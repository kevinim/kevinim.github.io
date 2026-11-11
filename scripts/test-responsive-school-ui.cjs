#!/usr/bin/env node
'use strict';
// Real Chromium mobile-width audit of site at the PR commit on localhost.
// This test does not send private user addresses or alter external services.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const widths=[320,375,390,430,480,720,1280];
const url=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const folder=path.join('artifacts','responsive-ui');
mkdirSync(folder,{recursive:true});
const report={url,views:[],addressClear:{},issues:[],testedAt:new Date().toISOString()};
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of widths){
      const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
      await page.route('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestions:[]})}));
      await page.goto(url+'?responsive-check='+width,{waitUntil:'domcontentloaded',timeout:90000});
      await page.locator('#homeAddress').waitFor();
      await page.locator('#schoolSettings').waitFor();
      const issueList=[];
      const state=await page.evaluate(()=>{
        const box=(selector)=>{
          const el=document.querySelector(selector);if(!el)return null;
          const r=el.getBoundingClientRect();
          return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,
            scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
        };
        const grouped=['#levels','#ratingFilter','#schoolOverlay','#historicOverlay','#referenceBoundaryOverlay'];
        return {
          styleLinks:document.querySelectorAll('link[rel="stylesheet"]').length,
           renderBundleLoaded:[...document.styleSheets].some(sheet=>
             sheet.href&&sheet.href.includes('/features/first-render-ui.bundle.css')&&
             sheet.cssRules.length>20),
           oldSourcesLinked:[...document.querySelectorAll('link[rel="stylesheet"]')]
             .some(link=>/(?:theme-toggle|map-control-contrast|track-b-reference-warning|sourced-cost|first-fold-ux|school-reference-preview)\.css/.test(link.href)),
           viewport:innerWidth,
          docScroll:document.documentElement.scrollWidth,
          bodyScroll:document.body.scrollWidth,
          schoolGroup:box('#schoolSettings'),
          areaGroup:box('.area-settings'),
          commuteGroup:box('.commute-settings'),
          map:box('#map'),
          top:box('.top'),
          homeWrap:box('.home-address-autocomplete'),
          homeInput:box('#homeAddress'),
          homeCard:box('.home-controls'),
          officeCard:box('.office-controls'),
          mapBox:box('.mapbox'),
          filterCard:box('.filter-panel'),
          privacyDisclosureClosed:!!document.querySelector('#homePrivacyDetails')&&!document.querySelector('#homePrivacyDetails').open,
          clear:box('#homeClear'),
          schoolControls:grouped.map(k=>({key:k,box:box(k),inside:document.querySelector('#schoolSettings').contains(document.querySelector(k))})),
          segments:[...document.querySelectorAll('#levels button')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom}}),
          labels:[...document.querySelectorAll('.school-visibility-options .check')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom}}),
          kpis:[...document.querySelectorAll('.kpi')].map(e=>{const r=e.getBoundingClientRect();return {right:r.right,left:r.left,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}}),
        };
      });
      assert.ok(state.schoolControls.every(x=>x.inside),'All school settings should be grouped together at '+width);
       assert.equal(state.styleLinks,10,'Six first-paint stylesheets should become one at '+width);
       assert.equal(state.renderBundleLoaded,true,'Compiled CSS must load and contain rules at '+width);
       assert.equal(state.oldSourcesLinked,false,'No original CSS link should remain at '+width);
      assert.equal(state.privacyDisclosureClosed,true,'Detailed privacy notice must be closed by default at '+width);
      if(width<=720){
        assert.ok(state.homeCard&&state.mapBox&&state.officeCard&&state.filterCard,
          'All home/map/commute/filter panels are present at '+width);
        assert.ok(state.homeCard.bottom<=state.mapBox.y+2,
          'Map should follow address search, not appear above it at '+width);
        assert.ok(state.mapBox.y<state.officeCard.y,
          'Map should appear before commute controls on mobile at '+width);
        assert.ok(state.mapBox.y<state.filterCard.y,
          'Map should appear before long filter settings on mobile at '+width);
      }
      assert.equal(await page.locator('#homeClear').isVisible(),false,'X initially hidden at '+width);
      await page.locator('#homeAddress').fill('3400 Legacy Dr, Plano, TX');
      assert.equal(await page.locator('#homeClear').isVisible(),true,'X appears when address typed at '+width);
      await page.locator('#homeClear').click();
      assert.equal(await page.locator('#homeAddress').inputValue(),'','X empties address at '+width);
      assert.equal(await page.locator('#homeClear').isVisible(),false,'X hides after clearing at '+width);
      assert.equal(await page.locator('#homeCandidates').innerText(),'','X clears home candidates at '+width);
      if(width===1280){
        // Simulate a returned geocoder candidate through the real selection handler.
        // This tests the post-search HOME pin and home state, without sending a private address.
        await page.waitForFunction(()=>typeof useHomeCandidate==='function'&&typeof map!=='undefined'&&!!map&&
          typeof state!=='undefined'&&Array.isArray(state.schools)&&state.schools.length>0,null,{timeout:90000});
        const accepted=await page.evaluate(()=>{
          document.getElementById('homeAddress').value='3400 Legacy Dr, Plano, TX 75024';
          syncHomeClearVisibility();
          return useHomeCandidate({address:'3400 Legacy Dr, Plano, TX 75024',
            location:{x:-96.807,y:33.076},score:99});
        });
        assert.equal(accepted,true,'test address candidate should create a house marker');
        assert.equal(await page.evaluate(()=>!!home&&!!homeMarker),true,'selected home should have a visible marker');
        assert.equal(await page.locator('#homeClear').isVisible(),true,'X should show after a successful home selection');
        await page.locator('#homeClear').click();
        assert.equal(await page.evaluate(()=>home===null&&homeMarker===null),true,'X must clear selected home and map marker');
        assert.equal(await page.locator('#homeAddress').inputValue(),'','X must also empty the completed search input');
        assert.equal(await page.locator('#homeClear').isVisible(),false,'X hides after clearing a completed search');
        report.addressClear.postSearchPin='pass';
      }
      const maxScroll=Math.max(state.docScroll,state.bodyScroll);
      if(maxScroll>width+2)issueList.push('document horizontal overflow '+maxScroll+'px (viewport '+width+'px)');
      const gb=state.schoolGroup,ab=state.areaGroup,cb=state.commuteGroup;
      if(!gb||!ab||!cb)issueList.push('missing settings card');
      else {
        if(gb.x<-1||gb.right>width+1)issueList.push('school card extends beyond viewport');
        if(ab.bottom>gb.y+2)issueList.push('area/school cards overlap');
        if(gb.bottom>cb.y+2)issueList.push('school/commute cards overlap');
      }
      if(state.segments.some((r,i,a)=>i>0&&r.y===a[i-1].y&&r.x<a[i-1].right-2))issueList.push('school-type segmented buttons overlap');
      if(state.labels.some((r,i,a)=>i>0&&r.y<a[i-1].bottom-2))issueList.push('school toggles overlap vertically');
      if(state.homeWrap && state.homeInput &&
          (state.homeInput.right>state.homeWrap.right+1||state.homeInput.x<state.homeWrap.x-1))issueList.push('address input outside its wrapper');
      // Existing KPI wrapping may be a preexisting regression, but must still be visible in QA output.
      if(state.kpis.some(k=>k.right>width+2||k.left<-2))issueList.push('KPI card extends beyond viewport');
      if(issueList.length)report.issues.push({width,items:issueList});
      report.views.push({width,documentScroll:maxScroll,groupedSchoolControls:true,clearButton:'pass',issues:issueList});
      await page.screenshot({path:path.join(folder,'viewport-'+width+'.png'),fullPage:true,timeout:30000});
      await page.close();
    }
    report.addressClear={result:'pass',behavior:'visible after typing, clears input/candidates, hidden after clear',widths};
    writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
    assert.equal(report.issues.length,0,'Responsive overlap/overflow found: '+JSON.stringify(report.issues));
    console.log('PASS mobile UI, inline X and grouped school controls '+JSON.stringify(report.views));
  }catch(err){
    writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.error('FAIL responsive UI audit: '+(err.stack||err));
    process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
