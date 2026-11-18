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
  for(const width of [325,390,1280]){
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
   page.on('response',r=>{if(r.url().includes('/dashboard-main.js?v=14')&&r.status()===200)asset++});
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
    // This offline browser deliberately blocks external MapLibre/tiles.  The
    // selected Liberty default must fail back to the existing Leaflet OSM map.
    await page.waitForFunction(()=>document.querySelector('#baseMap')?.value==='osm',
      null,{timeout:20000});
    const layout=await page.evaluate(()=>{
      const rail=document.querySelector('.main>.filter-panel').getBoundingClientRect();
      const mapcol=document.querySelector('.main>.mapcol').getBoundingClientRect();
      const mapbox=document.querySelector('.main>.mapcol>.mapbox').getBoundingClientRect();
      return {rail:{left:rail.left,right:rail.right,top:rail.top},
        mapcol:{left:mapcol.left,top:mapcol.top},mapbox:{height:mapbox.height,top:mapbox.top},
        tiles:map.getContainer().querySelectorAll('.leaflet-tile').length};
    });
    if(width>=1060){
      assert.ok(layout.mapcol.left>layout.rail.right,
        'Redfin desktop split puts the map to the right of the result/filter rail');
      assert.ok(layout.mapbox.height>=500,'Desktop map retains a large canvas');
    }else{
      assert.ok(layout.mapbox.top>=layout.rail.top,
        'Approved address-first mobile layout puts the school/filter rail before map');
    }
    assert.ok(layout.tiles>=0,'Leaflet map stays mounted when Liberty CDN fails');

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
    for(const [grade,allowed] of [['A',['A']],['B_PLUS',['A','B']],['C_PLUS',['A','B','C']]]){
      await page.locator('#schoolGradeQuick button[data-grade="'+grade+'"]').click();
      const filter=await page.evaluate(()=>{
        const eligible=state.ratingFilter==='A'?['A']:
          state.ratingFilter==='B_PLUS'?['A','B']:['A','B','C'];
        const candidates=[...document.querySelectorAll('#schoolList button.school[data-sid]')];
        const layers=schoolGroup.getLayers();
        const grades=layers.flatMap(m=>(m.options.schoolMembers||[]).map(s=>scoreRecord(s.name,s.district)?.rating));
        const mapBadges=layers.map(m=>m.getElement()?.querySelector('.school-map-grade-badge')?.textContent||'').filter(Boolean);
        return {grade:state.ratingFilter,select:document.getElementById('ratingFilter').value,
          schoolCount:candidates.length,allCorrect:candidates.every(b=>eligible.includes(
            scoreRecord(state.schools[Number(b.dataset.sid)].name,state.schools[Number(b.dataset.sid)].district)?.rating)),
          mapCorrect:grades.every(g=>eligible.includes(g)),
          pressed:document.querySelector('#schoolGradeQuick button.active')?.dataset.grade};
      });
      assert.equal(filter.grade,grade,'Minimum-grade shortcut updates application state');
      assert.equal(filter.select,grade,'Minimum-grade shortcut syncs dropdown');
      assert.ok(filter.schoolCount>0,'Filtered campus list must contain eligible '+grade+' schools');
      assert.equal(filter.allCorrect,true,'Every listed campus must meet the minimum TEA grade');
      assert.equal(filter.mapCorrect,true,'All represented map campuses meet the threshold');
      assert.equal(filter.pressed,grade,'Minimum-grade shortcut remains pressed');
    }
    await page.locator('#ratingFilter').selectOption('B');
    const exactB=await page.evaluate(()=>({
      grade:state.ratingFilter,pressed:document.querySelector('#schoolGradeQuick button.active')?.dataset.grade||null,
      correct:[...document.querySelectorAll('#schoolList button.school[data-sid]')].every(b=>{
        const s=state.schools[Number(b.dataset.sid)];return scoreRecord(s.name,s.district)?.rating==='B';
      })}));
    assert.deepEqual(exactB,{grade:'B',pressed:null,correct:true},
      'Detailed grade B selection remains B-only and is distinct from B+ shortcut');
    // Regional view must group rather than overplot hundreds of 27px icons;
    // every eligible campus remains represented in one clickable group.
    const clutter=await page.evaluate(()=>{
      const before=map.getZoom(),originalFilter=state.ratingFilter;
      state.ratingFilter='all';
      map.stop();map.setView([33.095,-96.77],10,{animate:false});
      drawSchools();
      const layers=schoolGroup.getLayers();
      const represented=layers.flatMap(l=>l.options.schoolMembers||[]);
      const clusters=layers.filter(l=>l.options.schoolMembers?.length>1);
      const counts=layers.map(l=>l.options.schoolMembers?.length||0);
      const expected=state.schools.filter(s=>s.ll&&s.type!=='other'&&
        (state.level==='all'||s.type===state.level)&&schoolPassesRatingFilter(s)&&
        map.getBounds().contains(s.ll));
      const head=clusters[0];
      const current=map.getZoom();
      if(head)head.fire('click');
      const clickedZoom=map.getZoom();
      state.ratingFilter=originalFilter;
      map.stop();map.setZoom(before,{animate:false});drawSchools();
      return {eligible:expected.length,rendered:layers.length,represented:represented.length,
        unique:new Set(represented).size,clusters:clusters.length,
        clickZoom:clickedZoom,originalZoom:current,
        bad:new Set(expected.filter(s=>!represented.includes(s))).size,
        allClustersClickable:clusters.every(l=>l.listens('click'))};
    });
    if(clutter.eligible>45){
      assert.ok(clutter.clusters>0,'Regional school markers should have visible count clusters');
      assert.ok(clutter.rendered<clutter.represented,'Clustering must reduce cluttered pin count');
      assert.equal(clutter.represented,clutter.eligible,'Every school remains represented in cluster mode');
      assert.equal(clutter.unique,clutter.eligible,'No school is duplicated or silently removed');
      assert.equal(clutter.bad,0,'No missing campus');
      assert.ok(clutter.clickZoom>clutter.originalZoom,'Cluster click should zoom into schools');
      assert.equal(clutter.allClustersClickable,true);
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
        tooltipWidth:Math.round(document.querySelector('.selected-school-campus-tooltip')?.getBoundingClientRect().width||0),
        tooltipWhitespace:getComputedStyle(document.querySelector('.selected-school-campus-tooltip')).whiteSpace,
        lat:center.lat,lng:center.lng,zoom:map.getZoom(),status:document.getElementById('schoolMapStatus')?.textContent||''};
    });
    assert.equal(focused.school,chosen.name,'Click selects exact school object');
    assert.equal(focused.pressed,chosen.sid,'List maintains selected emphasis');
    assert.ok(focused.focusLayers>=2&&focused.pin,'Selected campus has persistent map highlight');
    assert.ok(focused.markerLabel.includes(chosen.name),'Map explicitly labels selected campus');
    assert.ok(focused.tooltipWidth>=150,'Selected campus tooltip must not collapse into vertical letters');
    assert.equal(focused.tooltipWhitespace,'nowrap','School name stays on one line even on narrow screens');
    assert.ok(Math.abs(focused.lat-chosen.ll[0])<0.002&&Math.abs(focused.lng-chosen.ll[1])<0.002,
      'Map centers actual campus coordinates, not entire attendance polygon');
    assert.ok(focused.zoom>=14,'Campus is zoomed to local building');
    await page.locator('#schoolGradeQuick button[data-grade="B_PLUS"]').click();
    const retained=await page.evaluate(()=>({
      school:state.selectedSchool?.name||null,focus:schoolFocusGroup.getLayers().length,
      grade:state.ratingFilter}));
    assert.equal(retained.school,chosen.name,'Grade A campus remains selected when B+ threshold is active');
    assert.ok(retained.focus>0,'Grade A highlight remains visible under B+ threshold');
    assert.equal(retained.grade,'B_PLUS');
    await page.locator('#ratingFilter').selectOption('B');
    const cleared=await page.evaluate(()=>({
      school:state.selectedSchool?.name||null,focus:schoolFocusGroup.getLayers().length,
      grade:state.ratingFilter}));
    assert.deepEqual(cleared,{school:null,focus:0,grade:'B'},
      'Selecting exact grade B clears a selected grade A campus and its highlighted pin');
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
    // Synthetic-only residential state: never infer campus assignment from ZIP
    // or allow a high-grade nearby school to leak into an address-specific list.
    await page.evaluate(()=>{
      home={address:'SYNTHETIC ADDRESS - NOT A RESIDENCE',ll:[33.12,-96.72],
        geocodeQuality:{usableForSchoolCandidate:false}};
      state.selectedSchool=null;schoolFocusGroup.clearLayers();
      renderHome();drawSchools();drawList();
    });
    await page.waitForFunction(()=>document.querySelector('#homeManualSchoolBridge')?.hidden===false,
      null,{timeout:15000});
    const unverified=await page.evaluate(()=>({
      priorityVisible:!document.getElementById('homeAssignmentPriority').hidden,
      summary:document.getElementById('homeAssignmentPriorityStatus').textContent,
      schoolCount:document.querySelectorAll('#schoolList button.school').length,
      markers:schoolGroup.getLayers().length,
      notice:document.getElementById('schoolAddressNotice').textContent,
      approved:window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals,
      officeTop:document.querySelector('.office-controls').getBoundingClientRect().top,
      mainBottom:document.querySelector('.main').getBoundingClientRect().bottom
    }));
    assert.equal(unverified.priorityVisible,true,'address school evidence must be top-priority');
    assert.equal(unverified.summary,'배정 미확인');
    assert.equal(unverified.schoolCount,0,'ZIP campus list must be hidden until verified');
    assert.equal(unverified.markers,0,'ZIP school markers must be hidden until verified');
    assert.match(unverified.notice,/ZIP/);
    assert.equal(unverified.approved,0,'No production district can auto-certify residential assignments');
    if(width>=1060)assert.ok(unverified.officeTop>=unverified.mainBottom,
      'Desktop commute card must come after map and school information');
    await page.locator('#schoolScope').selectOption('all');
    assert.equal(await page.locator('#schoolList button.school').count(),0,
      'Changing school browse scope cannot reveal other ZIP campuses for an active address');
    await page.locator('#homeManualSchoolBridge summary').click();
    await page.locator('#homeManualDistrict').selectOption('LISD');
    const available=await page.locator('#homeManualelementary option').count();
    assert.ok(available>1,'District elementary directory must populate');
    await page.locator('#homeManualelementary').selectOption({index:1});
    await page.getByRole('button',{name:'직접 선택한 학교를 아래에 표시'}).click();
    const manual=await page.evaluate(()=>({
      count:document.querySelectorAll('#schoolList button.school').length,
      selected:window.HomeSchoolManualBridge.selectedSchools(home).length,
      status:document.getElementById('homeAssignmentPriorityStatus').textContent,
      cards:document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school').length
    }));
    assert.equal(manual.count,1,'Only the user-chosen Finder campus appears');
    assert.equal(manual.selected,1);
    assert.equal(manual.cards,1,'Top priority summary includes the chosen school');
    assert.match(manual.status,/검증 전/,'Manual selection cannot impersonate certified assignment');
    await page.evaluate(()=>clearHome());
    const restored=await page.evaluate(()=>({
      priorityHidden:document.getElementById('homeAssignmentPriority').hidden,
      count:document.querySelectorAll('#schoolList button.school').length,
      noticeHidden:document.getElementById('schoolAddressNotice').hidden
    }));
    assert.ok(restored.priorityHidden&&restored.noticeHidden&&restored.count>0,
      'Clearing address restores normal ZIP exploration and hides address warning');
    assert.ok(errors.every(x=>!/(ReferenceError|SyntaxError|not defined|Cannot access)/i.test(x)),
      'no bootstrap load-order errors: '+JSON.stringify(errors.slice(0,8)));
    console.log('PASS main extracted JS loads exactly once, map + ZIP + school click + address UI ready, width='+width);
    console.log('NOTE third-party test traffic blocked, count='+external.length);
   }finally{await page.close();}
  }
  console.log('PASS offline staged campus clustering and bootstrap smoke, 325/390/1280 viewports. NOT a school assignment test.');
 }finally{await browser.close();}
})().catch(e=>{console.error('Bootstrap browser QA failed:',e.stack||String(e));process.exitCode=1});
