#!/usr/bin/env node
'use strict';
// P0 regression: Leaflet must render school markers for the area the user
// actually SEES, judged from the real container size, not from Leaflet's own
// cached size. The older guardrail compared "schools inside map.getBounds()"
// with rendered markers; when Leaflet's cached size was stale (0x0), both were
// 0 and the check passed while the live site showed "화면 내 0개".
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const out='artifacts/phase2a-browser';
mkdirSync(out,{recursive:true});
const BASE=process.env.SITE_URL||'http://127.0.0.1:8765/';
const ZIPS={'75013':'AISD','75093':'PISD'};

// Independent viewport audit: true bounds come from the container's real
// clientWidth/Height, and markers count only if their DOM box intersects the map.
const audit=()=>{
 const c=map.getContainer(),w=c.clientWidth,h=c.clientHeight,s=map.getSize();
 const trueBounds=L.latLngBounds(map.containerPointToLatLng([0,h]),map.containerPointToLatLng([w,0]));
 const eligible=state.schools.filter(x=>x.ll&&x.type!=='other'&&(state.level==='all'||x.type===state.level)&&
  (state.ratingFilter!=='rated'||score(x.name,x.district)!==null));
 const expected=eligible.filter(x=>trueBounds.contains(x.ll));
 const rect=c.getBoundingClientRect();
 const onScreen=schoolGroup.getLayers().filter(l=>{const e=l.getElement?.();if(!e)return false;const r=e.getBoundingClientRect();
  return r.width>0&&r.left<rect.right&&r.right>rect.left&&r.top<rect.bottom&&r.bottom>rect.top});
 const represented=onScreen.flatMap(l=>l.options.schoolMembers||[]);
 const ctr=map.getCenter(),sel=state.polys[state.zip];
 return {zip:state.zip,zoom:map.getZoom(),leafletSize:[s.x,s.y],containerSize:[w,h],
  center:[+ctr.lat.toFixed(4),+ctr.lng.toFixed(4)],selectedZipVisible:!!sel&&trueBounds.intersects(sel.getBounds()),
  expected:expected.length,onScreen:onScreen.length,represented:represented.length,
  missing:expected.filter(x=>!represented.includes(x)).map(x=>x.name).slice(0,5),
  expectedByDistrict:expected.reduce((a,x)=>(a[x.district]=(a[x.district]||0)+1,a),{}),
  status:document.getElementById('schoolMapStatus').textContent};
};
function checkView(r,label,{district,allowEmpty=false}={}){
 const msg=label+': '+JSON.stringify(r);
 assert.deepEqual(r.leafletSize,r.containerSize,'Leaflet cached size must equal real container size. '+msg);
 assert.ok(r.containerSize[0]>0&&r.containerSize[1]>0,'Map container must be laid out. '+msg);
 assert.deepEqual(r.missing,[],'Every school inside the visible map must have an on-screen marker. '+msg);
 assert.equal(r.represented,r.expected,'All visible campuses must be represented by point or cluster. '+msg);
 assert.ok(r.expected===0||r.onScreen>0,'School cluster or point must be on-screen. '+msg);
 if(!allowEmpty)assert.ok(r.expected>0,'Visible map must contain schools. '+msg);
 if(district)assert.ok((r.expectedByDistrict[district]||0)>0,district+' campuses must be on screen. '+msg);
 assert.ok(!r.status.includes('복구'),'Recovery fallback must not be needed. '+msg);
}
async function ready(page){
 await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true,null,{timeout:100000});
 await page.waitForTimeout(400);
}
async function settle(page){await page.waitForTimeout(450)}

(async()=>{
 let browser;const log=[];
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  // Scenario 1: map container has no layout while Leaflet initialises, then
  // gains its size WITHOUT a window resize event (hidden panel, background or
  // prerendered tab, late CSS). This is the production failure mode.
  {
   const ctx=await browser.newContext({viewport:{width:1366,height:768}});
   const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
   await page.addInitScript(()=>{const add=()=>{if(document.getElementById('hideMapAtInit'))return true;const root=document.head||document.documentElement;if(!root)return false;
    const st=document.createElement('style');st.id='hideMapAtInit';st.textContent='#map{display:none!important}';root.appendChild(st);return true};
    if(!add())new MutationObserver((_,o)=>{if(add())o.disconnect()}).observe(document,{childList:true,subtree:true})});
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:80000});await ready(page);
   const hidden=await page.evaluate(()=>map.getSize());
   assert.equal(hidden.x,0,'Precondition: Leaflet initialised with zero-size container');
   await page.evaluate(()=>document.getElementById('hideMapAtInit').remove());
   for(const zip of ['75013','75093']){
    await page.locator('#zipSelect').selectOption(zip);await settle(page);
    const r=await page.evaluate(audit);log.push({scenario:'hidden-at-init',...r});checkView(r,'hidden-at-init '+zip,{district:ZIPS[zip]});
    assert.ok(r.selectedZipVisible,'Selected ZIP polygon must be in view: '+JSON.stringify(r));
   }
   assert.deepEqual(errors,[],'No page errors');
   await ctx.close();
  }
  // Scenario 2: normal user flows on a regular viewport.
  const ctx=await browser.newContext({viewport:{width:1400,height:1000}});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:80000});await ready(page);
  for(const zip of ['75013','75093']){
   await page.locator('#zipSelect').selectOption(zip);await settle(page);
   checkView(await page.evaluate(audit),'select '+zip,{district:ZIPS[zip]});
   for(const zoom of [9,10,11,12,13]){
    await page.evaluate(z=>{map.setZoom(z,{animate:false})},zoom);await settle(page);
    const r=await page.evaluate(audit);log.push({scenario:'zoom',...r});
    assert.equal(r.zoom,zoom);checkView(r,zip+' zoom '+zoom,{district:ZIPS[zip]});
   }
   // Real mouse drag of the map, then real zoom-control clicks.
   await page.evaluate(()=>{map.setZoom(12,{animate:false})});await settle(page);
   const box=await page.locator('#map').boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2-120,box.y+box.height/2-80,{steps:8});await page.mouse.up();await settle(page);
   const dragged=await page.evaluate(audit);log.push({scenario:'drag',...dragged});checkView(dragged,zip+' after drag');
   await page.locator('.leaflet-control-zoom-out').click();await settle(page);
   checkView(await page.evaluate(audit),zip+' after zoom-out click');
   await page.locator('.leaflet-control-zoom-in').click();await settle(page);
   checkView(await page.evaluate(audit),zip+' after zoom-in click');
  }
  // Marker overlay OFF/ON.
  await page.locator('#zipSelect').selectOption('75013');await settle(page);
  await page.locator('#schoolOverlay').uncheck();await settle(page);
  assert.equal(await page.evaluate(()=>schoolGroup.getLayers().length),0,'Markers must be removed when overlay is off');
  await page.locator('#schoolOverlay').check();await settle(page);
  checkView(await page.evaluate(audit),'overlay re-enabled',{district:'AISD'});
  // Level and rating filters change the marker set consistently.
  await page.locator('#levels button[data-v="high"]').click();await settle(page);
  const high=await page.evaluate(audit);checkView(high,'high-school filter',{allowEmpty:true});
  assert.ok(await page.evaluate(()=>schoolGroup.getLayers().every(l=>(l.options.schoolMembers||[]).every(s=>s.type==='high'))),'High filter must represent only high schools');
  await page.locator('#levels button[data-v="all"]').click();await settle(page);
  if(await page.locator('#ratingFilter').count()){
   const opts=await page.locator('#ratingFilter option').evaluateAll(o=>o.map(x=>x.value));
   if(opts.includes('rated')){await page.locator('#ratingFilter').selectOption('rated');await settle(page);
    checkView(await page.evaluate(audit),'rated filter',{allowEmpty:true});
    await page.locator('#ratingFilter').selectOption(opts.find(v=>v!=='rated'));await settle(page);}
  }
  // School search narrows the list but must not hide map markers.
  await page.locator('#schoolSearch').fill('allen');await settle(page);
  checkView(await page.evaluate(audit),'school search',{district:'AISD'});
  await page.locator('#schoolSearchClear').click();await settle(page);
  // Container resize without a window resize event.
  await page.evaluate(()=>{document.getElementById('map').style.height='300px'});await settle(page);
  checkView(await page.evaluate(audit),'container shrunk',{allowEmpty:true});
  await page.evaluate(()=>{document.getElementById('map').style.height=''});await settle(page);
  checkView(await page.evaluate(audit),'container restored',{district:'AISD'});
  // Expand to local zoom so the click targets an actual campus, not a cluster.
  await page.evaluate(()=>{map.stop();map.setZoom(14,{animate:false});drawSchools()});await settle(page);
  // Clicking a school marker still shows its attendance boundary.
  const before=await page.evaluate(()=>zoneGroup.getLayers().length);
  const clicked=await page.evaluate(()=>{const l=schoolGroup.getLayers().find(l=>{const s=state.schools.find(x=>x.name===l.options.title);return s&&s.district==='AISD'});if(!l)return null;l.fire('click');return l.options.title});
  assert.ok(clicked,'An Allen marker must be clickable');
  await page.waitForFunction(n=>zoneGroup.getLayers().length>n,before,{timeout:15000});
  await settle(page);
  checkView(await page.evaluate(audit),'after school click '+clicked,{allowEmpty:true});
  // Reload keeps the selected ZIP and a correct viewport.
  await page.locator('#zipSelect').selectOption('75093');await settle(page);
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);
  const reloaded=await page.evaluate(audit);log.push({scenario:'reload',...reloaded});checkView(reloaded,'after reload');
  assert.deepEqual(errors,[],'No page errors');
  await ctx.close();
  // Layout: right column about map height, insights card right under the map.
  {
   const ctx2=await browser.newContext({viewport:{width:1440,height:900}});const p2=await ctx2.newPage();
   await p2.goto(BASE,{waitUntil:'domcontentloaded',timeout:80000});await ready(p2);
   await p2.waitForSelector('#zipInsights .insight-card');
   const lay=await p2.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();const m=r('.mapbox'),i=r('#zipInsights'),d=r('.panel.detail');
    return {mapBottom:Math.round(m.bottom),insightsTop:Math.round(i.top),detailH:Math.round(d.height),mapH:Math.round(m.height),cards:document.querySelectorAll('#zipInsights .insight-card').length,
     sameRow:new Set([...document.querySelectorAll('#zipInsights .insight-card')].map(c=>Math.round(c.getBoundingClientRect().top))).size,overflow:document.documentElement.scrollWidth>innerWidth}});
   assert.ok(lay.insightsTop-lay.mapBottom<=24,'insights card directly under the map: '+JSON.stringify(lay));
   assert.ok(lay.detailH<=lay.mapH+120,'right column about map height: '+JSON.stringify(lay));
   assert.ok(lay.cards>=2&&lay.sameRow===1,'insight cards side by side: '+JSON.stringify(lay));
   assert.equal(lay.overflow,false);
   await ctx2.close();
   console.log('PASS desktop layout: insights under map, short right column '+JSON.stringify(lay));
  }
  writeFileSync(out+'/map-viewport-sync.json',JSON.stringify(log,null,2)+'\n');
  console.log('PASS map viewport sync: hidden-at-init, 75013/75093 zoom 9-13, drag, zoom controls, overlay toggle, filters, search, container resize, school boundary click, reload');
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL map viewport sync browser QA: '+String(e.stack||e));process.exitCode=1});
