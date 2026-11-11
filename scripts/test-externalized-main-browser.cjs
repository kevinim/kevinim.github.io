#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8765/';
const leafletJs=fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'));
const leafletCss=fs.readFileSync(require.resolve('leaflet/dist/leaflet.css'));

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[],external=[];
   page.on('pageerror',error=>errors.push(String(error)));
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return route.continue();
    if(u.hostname==='unpkg.com'&&/\/leaflet@1\.9\.4\/dist\/leaflet\.js$/.test(u.pathname))
      return route.fulfill({status:200,contentType:'text/javascript',body:leafletJs});
    if(u.hostname==='unpkg.com'&&/\/leaflet@1\.9\.4\/dist\/leaflet\.css$/.test(u.pathname))
      return route.fulfill({status:200,contentType:'text/css',body:leafletCss});
    external.push(u.hostname);
    return route.abort();
   });
   let asset=0;
   page.on('response',r=>{if(r.url().includes('/dashboard-main.js?v=5')&&r.status()===200)asset++});
   try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>typeof map!=='undefined'&&map&&typeof state!=='undefined'&&
      state.schools?.length>0&&document.querySelector('#zipSelect')?.options?.length>3,
      {timeout:25000}).catch(async e=>{const snap=await page.evaluate(()=>({
        map:typeof map,schoolCount:typeof state==='undefined'?'no state':state.schools?.length,
        zipOptions:document.querySelector('#zipSelect')?.options?.length,
        errors:document.querySelector('#mapLoadStatus')?.textContent
      }));throw Error('Main bootstrapping timed out: '+JSON.stringify(snap)+' '+String(e))});
    const b=await page.evaluate(()=>({
      mapReady:!!map && typeof map.getZoom==='function',
      mapContainer:!!document.querySelector('.leaflet-container'),
      markers:schoolGroup.getLayers().length,
      schools:state.schools.length,
      zip:state.zip,
      zipOptions:document.querySelector('#zipSelect').options.length,
      onMap:typeof drawSchools==='function',
      onHome:typeof calculateHomeCommute==='function',
      policy:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content
    }));
    assert.equal(asset,1,'same-origin extracted dashboard-main.js must load exactly once');
    assert.ok(b.mapReady&&b.mapContainer&&b.onMap&&b.onHome,'map/home globals must be initialized');
    assert.ok(b.schools>0&&b.zipOptions>3,'school directory and ZIP filter must populate');
    assert.ok((b.policy||'').includes("script-src 'self' https://unpkg.com;"),'strict external policy');
    const scriptPolicy=(b.policy||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src '));
   assert.ok((b.policy||'').includes("script-src-attr 'none'")&&scriptPolicy&&!scriptPolicy.includes('unsafe-inline'));
        assert.ok(b.markers>=0,'school layer object exists');

    const selections=await page.locator('#zipSelect option').evaluateAll(
      elements=>elements.map(x=>x.value).filter(Boolean));
    const next=selections.find(x=>x!==b.zip);
    assert.ok(next,'second ZIP option exists');
    await page.locator('#zipSelect').selectOption(next);
    assert.equal(await page.evaluate(()=>state.zip),next,'ZIP change event still works');
    await page.locator('#schoolScope').selectOption('all');
    // Each letter filter applies to both the directory and the map. The map
    // marker badge must expose its TEA letter, not the numeric rating score.
    await page.waitForFunction(()=>state.ratingIndex?.size>0&&
      state.schools.some(s=>s.ll&&scoreRecord(s.name,s.district)?.rating==='A'),
      null,{timeout:40000});
    for(const grade of ['A','B','C']){
      await page.locator('#schoolGradeQuick button[data-grade="'+grade+'"]').click();
      const filter=await page.evaluate(()=>{
        const candidates=[...document.querySelectorAll('#schoolList button.school[data-sid]')];
        const mapBadges=schoolGroup.getLayers().map(m=>m.getElement()?.querySelector('.school-map-grade-badge')?.textContent||'');
        return {grade:state.ratingFilter,select:document.getElementById('ratingFilter').value,
          schoolCount:candidates.length,allCorrect:candidates.every(b=>
            scoreRecord(state.schools[Number(b.dataset.sid)].name,state.schools[Number(b.dataset.sid)].district)?.rating===state.ratingFilter),
          badgesValid:mapBadges.every(b=>b===state.ratingFilter),
          pressed:document.querySelector('#schoolGradeQuick button.active')?.dataset.grade};
      });
      assert.equal(filter.grade,grade,'Quick grade filter updates application state');
      assert.equal(filter.select,grade,'Quick grade filter syncs dropdown');
      assert.ok(filter.schoolCount>0,'Filtered campus list must contain '+grade+' schools');
      assert.equal(filter.allCorrect,true,'Every filtered list school must have matching TEA grade');
      assert.equal(filter.badgesValid,true,'All rendered map campus badges must match selected grade');
      assert.equal(filter.pressed,grade,'Quick grade button remains active');
    }
    // A grade with no numeric score still belongs in grade-A.
    const noScore=await page.evaluate(()=>{
      const sample={name:'Synthetic Grade Only',district:'TEST'};
      const k='TEST|'+canonical(sample.name);
      const old=state.ratingIndex.get(k);state.ratingIndex.set(k,[{rating:'A',score:null}]);
      state.ratingFilter='A';const result=schoolPassesRatingFilter(sample);
      if(old)state.ratingIndex.set(k,old);else state.ratingIndex.delete(k);
      return result;
    });
    assert.equal(noScore,true,'Letter grade must not require numeric score');
    await page.locator('#schoolGradeQuick button[data-grade="A"]').click();
    const chosen=await page.evaluate(()=>{
      const button=[...document.querySelectorAll('#schoolList button.school[data-sid]')].find(b=>{
        const s=state.schools[Number(b.dataset.sid)];
        return Array.isArray(s?.ll)&&s.ll.length===2&&s.ll.every(Number.isFinite);
      });
      if(!button)return null;
      const campus=state.schools[Number(button.dataset.sid)];
      return {sid:button.dataset.sid,name:campus.name,ll:campus.ll};
    });
    assert.ok(chosen,'At least one TEA grade-A campus has a recorded marker coordinate');
    await page.locator('#schoolList button.school[data-sid="'+chosen.sid+'"]').click();
    const focused=await page.evaluate(()=>{
      const s=state.selectedSchool,center=map.getCenter();
      return {school:s?.name,pressed:document.querySelector('#schoolList button.school[aria-pressed="true"]')?.dataset.sid,
        focusLayers:schoolFocusGroup.getLayers().length,
        markerLabel:document.querySelector('.selected-school-campus-tooltip')?.textContent||'',
        pin:!!document.querySelector('.selected-school-campus-pin'),
        lat:center.lat,lng:center.lng,zoom:map.getZoom(),status:document.getElementById('schoolMapStatus')?.textContent||''};
    });
    assert.equal(focused.school,chosen.name,'Click selects exact school object');
    assert.equal(focused.pressed,chosen.sid,'List maintains selected emphasis');
    assert.ok(focused.focusLayers>=2&&focused.pin,'Selected campus has persistent map highlight');
    assert.ok(focused.markerLabel.includes(chosen.name),'Map explicitly labels selected campus');
    assert.ok(Math.abs(focused.lat-chosen.ll[0])<0.002&&Math.abs(focused.lng-chosen.ll[1])<0.002,
      'Map centers actual campus coordinates, not entire attendance polygon');
    assert.ok(focused.zoom>=14,'Campus is zoomed to local building');
    await page.locator('#schoolGradeQuick button[data-grade="B"]').click();
    const cleared=await page.evaluate(()=>({
      school:state.selectedSchool?.name||null,focus:schoolFocusGroup.getLayers().length,
      grade:state.ratingFilter}));
    assert.deepEqual(cleared,{school:null,focus:0,grade:'B'},
      'Filtering away the selected campus must also remove its highlighted pin');
    await page.locator('#schoolGradeQuick button[data-grade="all"]').click();
    assert.equal(await page.locator('#ratingFilter').inputValue(),'all');
    const school=page.locator('#schoolList button.school').first();
    await school.waitFor({timeout:25000});
    await school.click();
    const picked=await page.evaluate(()=>({
      selected:state.selectedSchool?.name||null,
      text:document.querySelector('#detailContent')?.innerText||''
    }));
    assert.ok(picked.selected&&picked.text.includes(picked.selected),
      'school click and detail must survive JS extraction');
    assert.ok(errors.every(x=>!/(ReferenceError|SyntaxError|not defined|Cannot access)/i.test(x)),
      'no bootstrap load-order errors: '+JSON.stringify(errors.slice(0,8)));
    console.log('PASS main extracted JS loads exactly once, map + ZIP + school click + address UI ready, width='+width);
    console.log('NOTE third-party test traffic blocked, count='+external.length);
   }finally{await page.close();}
  }
  console.log('PASS offline staged main-bootstrap smoke, mobile + desktop. NOT a full school assignment test.');
 }finally{await browser.close();}
})().catch(e=>{console.error('Bootstrap browser QA failed:',e.stack||String(e));process.exitCode=1});
