#!/usr/bin/env node
'use strict';
// Isolated browser QA for reviewed.html. Uses no private addresses and no live third-party APIs.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const BASE=process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/';
const ring=[[-96.71,33.11],[-96.67,33.11],[-96.67,33.14],[-96.71,33.11]];
const feature=(name,type='Polygon')=>({
 type:'Feature',
 properties:{SchoolName:name,unexpectedHtml:'<img src=x data-geojson-xss onerror="window.__geojsonXss=1">'},
 geometry:{type,coordinates:type==='Polygon'?[ring]:[[ring],[ring]]}
});
const asFile=(obj,name='boundary.geojson')=>({
 name,mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify(obj),'utf8')
});
const valid=name=>({type:'FeatureCollection',features:[feature(name)]});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:840}});
   const script=fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'));
   const css=fs.readFileSync(require.resolve('leaflet/dist/leaflet.css'));
   await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({contentType:'text/javascript',body:script}));
   await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({contentType:'text/css',body:css}));
   await page.route(/tile\.openstreetmap\.org/,route=>route.abort());
   await page.route(/gismaps\.cityofallen\.org/,route=>route.fulfill({contentType:'application/json',body:'{"type":"FeatureCollection","features":[]}'}));
   const errors=[];
   page.on('pageerror',error=>errors.push(String(error)));
   await page.addInitScript(()=>{window.__violations=[];document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.violatedDirective))});
   await page.goto(BASE+'reviewed.html',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>typeof state!=='undefined'&&Array.isArray(state.schools)&&state.schools.length>0&&typeof map!=='undefined'&&!!map&&!!window.SchoolGeoJSONGuard,null,{timeout:45000});
   const name=await page.evaluate(()=>{
    state.allen=false;
    const school=state.schools.find(s=>s.ll&&s.name);
    state.selectedSchool=school;
    drawDetail();
    return school.name;
   });
   await page.locator('#boundaryFile').setInputFiles(asFile(valid(name)));
   await page.waitForFunction(()=>state.uploaded?.features?.length===1);
   let result=await page.evaluate(()=>({
    count:state.uploaded.features.length,
    layerCount:zoneGroup.getLayers().length,
    hasInjectedProperty:Object.keys(state.uploaded.features[0].properties).some(k=>k!=='school'),
    injected:document.querySelectorAll('[data-geojson-xss]').length,
    csp:window.__violations
   }));
   assert.equal(result.count,1);
   assert.ok(result.layerCount>0,'Polygon must render in Leaflet at '+width);
   assert.equal(result.hasInjectedProperty,false);
   assert.equal(result.injected,0);
   assert.deepEqual(result.csp,[], 'no CSP violations');
   const multi={type:'FeatureCollection',features:[feature(name,'MultiPolygon')]};
   await page.locator('#boundaryFile').setInputFiles(asFile(multi,'multi.geojson'));
   await page.waitForFunction(()=>state.uploaded?.features?.[0]?.geometry?.type==='MultiPolygon');
   assert.ok(await page.evaluate(()=>zoneGroup.getLayers().length>0),'MultiPolygon should render');
   for(const bad of [
    asFile({type:'FeatureCollection',features:[feature(name,'Point')]},'point.geojson'),
    asFile({type:'FeatureCollection',features:[{...feature(name),geometry:{type:'Polygon',coordinates:[[[999,33],[-96.6,33],[-96.6,34],[999,33]]]}}]},'bad-coord.geojson'),
    {name:'over-limit.geojson',mimeType:'application/geo+json',buffer:Buffer.alloc(4*1024*1024+1,65)}
   ]){
    await page.locator('#boundaryFile').setInputFiles(bad);
    await page.waitForFunction(()=>state.uploaded===null);
    const rejected=await page.evaluate(()=>({layers:zoneGroup.getLayers().length,message:document.querySelector('#toast').textContent,input:document.querySelector('#boundaryFile').value}));
    assert.equal(rejected.layers,0,'invalid input must not render stale boundary');
    assert.match(rejected.message,/GeoJSON 파일 오류/);
    assert.equal(rejected.input,'','input reset allows selecting the same file again');
   }
   assert.deepEqual(errors,[],'browser page errors at '+width+': '+errors.join(' | '));
   console.log('PASS reviewed GeoJSON upload strict bounds, Polygon/MultiPolygon, rejection, XSS and CSP at '+width+'px');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('FAIL reviewed GeoJSON browser QA: '+String(e.stack||e));process.exitCode=1});
