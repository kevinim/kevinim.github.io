#!/usr/bin/env node
'use strict';
// Synthetic public geometry only: no residential address or external Finder calls.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=process.cwd();
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end();}
});
async function run(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const port=server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:850}});
   await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForFunction(()=>typeof map!=='undefined'&&!!map&&typeof drawHomeAssignmentMap==='function'&&
    !!window.HomeAssignmentMap&&typeof home!=='undefined',{timeout:30000});
   const result=await page.evaluate(()=>{
    const coords=[-96.8,33.1],point=[33.12,-96.79];
    const box={type:'Feature',properties:{school:'Synthetic School QA',gradeLevel:'elementary',grades:'K-5'},
     geometry:{type:'Polygon',coordinates:[[
      [-96.85,33.08],[-96.75,33.08],[-96.75,33.15],[-96.85,33.15],[-96.85,33.08]
     ]]}};
    const tempSchool={name:'Synthetic School QA',type:'elementary',district:'FISD',ll:point};
    state.schools.push(tempSchool);state.level='all';state.ratingFilter='all';state.showSchools=true;state.showHistoric=true;
    map.setView([coords[1],coords[0]],12,{animate:false});
    home={address:'PUBLIC SYNTHETIC QA ONLY',ll:[coords[1],coords[0]],geocodeQuality:{usableForSchoolCandidate:true},
     assignment:{status:'current',district:'FISD',features:[box]}};
    const mount=document.getElementById('homeSchoolInfo');mount.replaceChildren();
    const el=document.createElement('div');el.id='homeMapAssignmentStatus';mount.appendChild(el);
    drawHomeAssignmentMap();drawSchools();
    const loaded={layers:homeZoneGroup.getLayers().length,
     active:document.getElementById('homeMapAssignmentStatus').dataset.visible,
     marker:schoolGroup.getLayers().some(m=>m.options?.icon?.options?.html?.includes('home-match')),
     source:document.getElementById('homeMapAssignmentStatus').dataset.evidence};
    home.assignment={status:'needs-address-verification',district:'FISD',features:[box]};
    drawHomeAssignmentMap();
    const blocked=homeZoneGroup.getLayers().length;
    home=null;drawHomeAssignmentMap();drawSchools();
    return {loaded,blocked,cleared:homeZoneGroup.getLayers().length};
   });
   assert.equal(result.loaded.layers,0,'unapproved synthetic home must not draw a polygon at '+width);
   assert.equal(result.loaded.active,'false','unapproved home zone must remain hidden at '+width);
   assert.equal(result.loaded.marker,false,'unapproved marker must not be promoted at '+width);
   assert.equal(result.loaded.source,'conditional-hold');
   assert.equal(result.blocked,0,'unverified address cannot draw zones');
   assert.equal(result.cleared,0,'clear removes map overlays');
   // Allen reference-only school rail: real campus directory, synthetic in-memory
   // source row, and actual Conditional GO release policy; no geocoding/PII.
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools.filter(s=>s.district==='AISD').length>=20,
    null,{timeout:30000});
   const allen=await page.evaluate(()=>{
    const row=['Synthetic Reference St','1','Evans','Ereckson','Lowery','Allen High School'];
    const unapproved=window.ConditionalSchoolRelease.apply({district:'AISD',status:'unverified-year',allen:row});
    home={address:'SYNTHETIC ALLEN PUBLIC QA',ll:[33.11,-96.68],
     geocodeQuality:{usableForSchoolCandidate:true},assignment:unapproved,
     schoolSourceDistrict:'AISD',schoolSourceStatus:'unverified-year',allenAddressReference:row};
    state.showSchools=true;
    renderAddressSchoolPriority();drawSchools();drawList();
    const initial={
     kind:addressSchoolView()?.kind,release:home.assignment.status,
     cards:document.getElementById('homeAssignmentPrioritySchools').querySelectorAll('.home-assignment-school').length,
     names:[...document.getElementById('homeAssignmentPrioritySchools').querySelectorAll('.home-school-main strong')].map(x=>x.textContent),
     status:document.getElementById('homeAssignmentPriorityStatus').textContent,
     rail:document.getElementById('schoolAddressNotice').textContent,
     mapPins:referenceCampusGroup?.getLayers().length||0,
     autoZones:homeZoneGroup.getLayers().length
    };
    home.schoolSourceStatus='conflict';home.assignment={district:'AISD',status:'conflict'};
    home.allenAddressReference=null;renderAddressSchoolPriority();drawSchools();drawList();
    const blocked={kind:addressSchoolView()?.kind,
     cards:document.getElementById('homeAssignmentPrioritySchools').querySelectorAll('.home-assignment-school').length,
     pins:referenceCampusGroup?.getLayers().length||0};
    home=null;renderAddressSchoolPriority();drawSchools();drawList();
    return {initial,blocked};
   });
   assert.equal(allen.initial.kind,'allen-reference','Allen street-table reference must reach address-first UI');
   assert.equal(allen.initial.release,'conditional-finder-only','Allen school assignment must remain uncertified');
   assert.equal(allen.initial.cards,4,'Show E/M/freshman/high reference school cards');
   assert.deepEqual(allen.initial.names,['Evans','Ereckson','Lowery','Allen High School']);
   assert.match(allen.initial.status,/학년도 미표기/);
   assert.match(allen.initial.rail,/배정은 교육청에서 확인/);
   assert.ok(allen.initial.mapPins>=3,'Map must show linked Allen campus location pins');
   assert.equal(allen.initial.autoZones,0,'No 2019/2023 GIS as current home zone');
   assert.equal(allen.blocked.kind,'unverified');
   assert.equal(allen.blocked.cards,0);
   assert.equal(allen.blocked.pins,0);
   console.log('PASS Allen reference-only E/M/9/10–12 address rail at '+width+'px');

   // Synthetic residence-school review UI: no actual home address, API, or
   // fabricated school assignments. Verify visible four-step Plano flow.
   await page.evaluate(()=>{
    const labels={elementary:'Haun Elementary',middle:'Robinson Middle',
     high:'Jasper High',senior:'Plano West Senior High'};
    const raw={district:'PISD',status:'finder-current',
     features:Object.entries(labels).map(([gradeLevel,school])=>({
      type:'Feature',properties:{gradeLevel,school},geometry:{
       type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}
     }))};
    window.__reviewSyntheticItem={geocodeQuality:{usableForSchoolCandidate:true},
     assignment:{status:'conditional-finder-only',district:'PISD'}};
    window.HomeResidentialSchoolCheck.mount(document.getElementById('homeAssignmentPriority'),
     window.__reviewSyntheticItem,raw,DISTRICT_REGISTRY,window.TrustedLinkPolicy.official);
   });
   const review=page.locator('#homeResidentialSchoolCrosscheck');
   await review.waitFor();
   assert.equal(await review.getByRole('link',{name:'학군 공식 주소 검색기 열기'}).getAttribute('href'),
    'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder');
   const expected=[
    ['초등','Haun Elementary'],['중등','Robinson Middle'],
    ['고등','Jasper High'],['Senior High','Plano West Senior High']
   ];
   for(const [level,name] of expected)
    await review.locator('input[aria-label="공식 검색기 '+level+' 학교명"]').fill(name);
   await review.locator('select[aria-label="공식 검색기 결과 학년도"]').selectOption('2026–27');
   await review.locator('input[type=checkbox]').check();
   await review.getByRole('button',{name:'학교급별 결과 비교'}).click();
   assert.match(await review.locator('[role=status]').innerText(),/4\/4개 일치/);
   assert.match(await review.locator('[role=status]').innerText(),/독립 검증 아님/);
   assert.equal(await page.evaluate(()=>window.__reviewSyntheticItem.assignment.status),
    'conditional-finder-only','manual results must never write home.assignment');
   // P0 regression: stale comparison invalidates on edit, mismatch and GIS source drift.
   await review.locator('input[aria-label="공식 검색기 Senior High 학교명"]').fill('SYNTHETIC WRONG SENIOR');
   assert.match(await review.locator('[role=status]').innerText(),/다시 비교해야 합니다/);
   await review.getByRole('button',{name:'학교급별 결과 비교'}).click();
   assert.match(await review.locator('[role=status]').innerText(),/3\/4개 일치/);
   assert.match(await review.locator('[role=status]').innerText(),/1개 불일치/);
   const drift=await page.evaluate(()=>{
    const raw={district:'PISD',status:'finder-current',features:[
     ['elementary','Haun Elementary'],['middle','Robinson Middle'],
     ['high','SYNTHETIC CHANGED HIGH'],['senior','Plano West Senior High']
    ].map(([gradeLevel,school])=>({type:'Feature',properties:{gradeLevel,school},
     geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}))};
    window.HomeResidentialSchoolCheck.mount(document.getElementById('homeAssignmentPriority'),
     window.__reviewSyntheticItem,raw,DISTRICT_REGISTRY,window.TrustedLinkPolicy.official);
    return {result:window.__reviewSyntheticItem.residentialSchoolReview.result,
     status:document.querySelector('#homeResidentialSchoolCrosscheck [role=status]').textContent,
     approval:window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals};
   });
   assert.equal(drift.result,null,'Changed GIS source must invalidate previous result');
   assert.match(drift.status,/직접 비교 전/);
   assert.equal(drift.approval,0);
   await page.evaluate(()=>document.getElementById('homeResidentialSchoolCrosscheck')?.remove());
   // LISD: 4 school stages include 9th-grade intermediate. Apartment override
   // must block all user-entered matches, not silently certify a home address.
   await page.evaluate(()=>{
    const raw={district:'LISD',status:'finder-current',features:[
     ['elementary','SYNTHETIC LISD EL'],['middle','SYNTHETIC LISD MID'],
     ['intermediate','SYNTHETIC LISD NINTH'],['high','SYNTHETIC LISD HIGH']
    ].map(([gradeLevel,school])=>({type:'Feature',properties:{gradeLevel,school},
     geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}))};
    window.__lisdTest={geocodeQuality:{usableForSchoolCandidate:true},
     assignment:{district:'LISD',status:'conditional-finder-only'}};
    window.HomeResidentialSchoolCheck.mount(document.getElementById('homeAssignmentPriority'),
     window.__lisdTest,raw,DISTRICT_REGISTRY,window.TrustedLinkPolicy.official);
   });
   const lisd=page.locator('#homeResidentialSchoolCrosscheck');
   await lisd.waitFor();
   assert.equal(await lisd.getByRole('link',{name:'학군 공식 주소 검색기 열기'}).getAttribute('href'),
    'https://www.lisd.net/resources/families/school-locator');
   assert.match(await lisd.innerText(),/아파트는 공식 Find an Apartment/);
   assert.match(await lisd.innerText(),/GIS 적용 연도 미확인/);
   assert.equal(await lisd.locator('p.source[data-footnotes-keep]').count(),2,
    'Source-year and official apartment warnings must never be hidden as footnotes');
   for(const [grade,name] of [['초등','SYNTHETIC LISD EL'],['중등','SYNTHETIC LISD MID'],
    ['9학년','SYNTHETIC LISD NINTH'],['고등','SYNTHETIC LISD HIGH']])
    await lisd.locator('input[aria-label="공식 검색기 '+grade+' 학교명"]').fill(name);
   await lisd.locator('select[aria-label="공식 검색기 결과 학년도"]').selectOption('2026–27');
   await lisd.locator('input[type=checkbox]').check();
   await lisd.getByRole('button',{name:'학교급별 결과 비교'}).click();
   assert.match(await lisd.locator('[role=status]').innerText(),/4\/4개 일치/);
   assert.match(await lisd.locator('[role=status]').innerText(),/독립 검증 아님/);
   await lisd.locator('select[aria-label="주거 형태"]').selectOption('apartment');
   assert.match(await lisd.locator('[role=status]').innerText(),/다시 비교해야 합니다/);
   await lisd.getByRole('button',{name:'학교급별 결과 비교'}).click();
   assert.match(await lisd.locator('[role=status]').innerText(),/0\/4개 일치/);
   assert.equal(await lisd.locator('[data-crosscheck-level]').
    filter({hasText:'아파트용 공식 검색기에서 재확인 필요'}).count(),4);
   assert.equal(await lisd.locator('[data-crosscheck-level]:visible').count(),4,
    'Per-school apartment blockers must remain visible outside optional footnotes');
   const denied=await page.evaluate(()=>{
    const x=window.__lisdTest;
    const vals=Array.from({length:localStorage.length},(_,i)=>localStorage.getItem(localStorage.key(i)))
     .concat(Array.from({length:sessionStorage.length},(_,i)=>sessionStorage.getItem(sessionStorage.key(i))));
    return {status:x.residentialSchoolReview.result.status,
     certified:x.residentialSchoolReview.result.certified,
     independent:x.residentialSchoolReview.result.independentOfficialLookup,
     original:x.assignment.status,piiStored:vals.some(v=>/SYNTHETIC LISD (EL|MID|NINTH|HIGH)/.test(String(v))),
     approvals:window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals};
   });
   assert.equal(denied.status,'not-independent-verification');
   assert.equal(denied.certified,false);
   assert.equal(denied.independent,false);
   assert.equal(denied.original,'conditional-finder-only');
   assert.equal(denied.piiStored,false);
   assert.equal(denied.approvals,0);
   await page.evaluate(()=>{
    window.__lisdTest.geocodeQuality.usableForSchoolCandidate=false;
    const raw={district:'LISD',status:'finder-boundary-review',features:[]};
    window.HomeResidentialSchoolCheck.mount(document.getElementById('homeAssignmentPriority'),
     window.__lisdTest,raw,DISTRICT_REGISTRY,window.TrustedLinkPolicy.official);
   });
   assert.equal(await page.evaluate(()=>window.__lisdTest.residentialSchoolReview.result),null);
   assert.match(await lisd.innerText(),/주소 좌표가 불확실/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+5),
    'LISD apartment/9th-grade review overflows '+width+'px');
   await page.evaluate(()=>{document.getElementById('homeResidentialSchoolCrosscheck')?.remove();
    delete window.__lisdTest;});
   console.log('PASS P0 Plano drift and LISD apartment, 9th grade, precision fail-closed at '+width+'px');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+5),
    'new school comparison must not horizontally overflow at '+width+' px');
   await page.evaluate(()=>document.getElementById('homeResidentialSchoolCrosscheck')?.remove());
   await page.evaluate(()=>delete window.__reviewSyntheticItem);
   console.log('PASS address-first synthetic E/M/High/Senior comparison at '+width+'px');
   console.log('PASS home auto-school overlay at '+width+'px (synthetic geometry only)');
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
}
run().catch(e=>{console.error(e);process.exitCode=1;server.close()});
