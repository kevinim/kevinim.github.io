#!/usr/bin/env node
'use strict';
/**
 * Isolated browser negatives using the REAL reviewed.html external application
 * functions and the REAL Leaflet polygon renderer.
 *
 * No public URL, address, vendor request or exfiltration endpoint is touched.
 * Markup-looking values only toggle an inert local JS flag if XSS occurs.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'reviewed.html'),'utf8');
const guard=fs.readFileSync(path.join(ROOT,'features/geojson-upload-guard.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(ROOT,'features/reviewed-bootstrap.js'),'utf8');
assert.ok(html.includes('src="./features/geojson-upload-guard.js?v=1"'),'reviewed.html must load GeoJSON validator');
assert.ok(html.includes('src="./features/reviewed-bootstrap.js?v=1"'),'reviewed.html must load bootstrap');
assert.ok(bootstrap.includes('async function loadBoundaryFile'),'must test actual uploader');
const payload='<img src=x onerror="window.__gisQaExecuted=1">';
const second='<svg onload="window.__gisQaExecuted=2"></svg>';
const polygon={
 type:'Polygon',
 coordinates:[[
  [-96.81,33.09],[-96.78,33.09],[-96.78,33.12],
  [-96.81,33.12],[-96.81,33.09],
 ]],
};
const geojson={type:'FeatureCollection',features:[{
 type:'Feature', properties:{
  school:'Example Elementary School',YearUpdated:payload,notes:second,
  maybeLink:'javascript:window.__gisQaExecuted=3',
 },geometry:polygon,
}]};

async function setup(browser,width){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 // The local scenario has no script/CDN or tile requests.
 await page.route('**/*',r=>r.abort());
 await page.setContent('<!doctype html><html><body><div id="map" style="height:400px;width:600px"></div>'+
  '<div id="toast"></div><div id="zoneNotice"></div></body></html>');
 await page.addScriptTag({content:fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'),'utf8')});
 await page.addScriptTag({content:guard});
 await page.addScriptTag({content:bootstrap});
 await page.evaluate(()=>{
  window.__gisQaExecuted=0;
  // Legacy DOMContentLoaded initialization is intentionally NOT triggered:
  // it would fetch unrelated school data and map tiles.
  map=L.map('map',{zoomControl:false,attributionControl:false}).setView([33.10,-96.80],12);
  zoneGroup=L.featureGroup().addTo(map);
  state.allen=false;
  state.selectedSchool={name:'Example Elementary School',district:'PISD',type:'elementary'};
 });
 return {page,errors};
}

async function uploadAsFile(page,payloadText){
 return page.evaluate(async data=>{
  const f=new File([data],'local-audit.geojson',{type:'application/geo+json'});
  await loadBoundaryFile({target:{files:[f]}});
  return {loaded:!!state.uploaded,features:state.uploaded?.features?.length||0,
    layers:zoneGroup.getLayers().length,
    notice:document.getElementById('zoneNotice')?.innerText||'',
    toast:document.getElementById('toast')?.textContent||''};
 },payloadText);
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const {page,errors}=await setup(browser,width);
   try{
    const r=await uploadAsFile(page,JSON.stringify(geojson));
    assert.equal(r.loaded,true);
    assert.equal(r.features,1);
    assert.equal(r.layers,1,'valid school polygon must still render in Leaflet');
    assert.ok(r.notice.includes('1개 경계가 표시'));
    assert.equal(await page.locator('img[onerror],svg[onload],a[href^="javascript:"]').count(),0,
      'uploaded GIS properties became executable browser DOM');
    await page.waitForTimeout(90);
    assert.equal(await page.evaluate(()=>window.__gisQaExecuted),0,
      'malicious-looking GeoJSON attribute was executed');
    assert.deepEqual(errors,[]);
    console.log('PASS local uploaded school GeoJSON with hostile-looking properties; actual Leaflet polygon still draws; width='+width);

    const malformed=await uploadAsFile(page,JSON.stringify({type:'FeatureCollection',features:'invalid'}));
    assert.ok(malformed.toast.includes('GeoJSON 파일 오류'));
    const nonJson=await uploadAsFile(page,'not JSON at all');
    assert.ok(nonJson.toast.includes('GeoJSON 파일 오류'));
    assert.equal(await page.evaluate(()=>window.__gisQaExecuted),0);
    console.log('PASS malformed uploaded file rejection through actual legacy function; width='+width);

    const remote=await page.evaluate(async data=>{
      state.uploaded=null;
      state.allen=true;
      state.selectedSchool={name:'Allen High School',district:'AISD',type:'high'};
      const feature={type:'Feature',properties:{SchoolName:'Allen High School',YearUpdated:data[0]},
        geometry:data[1]};
      window.fetch=async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[feature]})});
      await drawBoundary();
      return {note:document.getElementById('zoneNotice').innerText,layers:zoneGroup.getLayers().length};
    },[payload,polygon]);
    assert.equal(remote.layers,1,'valid Allen source polygon still draws');
    assert.ok(remote.note.includes(payload),'the label should be displayed as literal text');
    assert.equal(await page.locator('#zoneNotice img[onerror],#zoneNotice svg[onload]').count(),0);
    await page.waitForTimeout(90);
    assert.equal(await page.evaluate(()=>window.__gisQaExecuted),0,'remote GIS vintage label executed');
    assert.deepEqual(errors,[]);
    console.log('PASS external Allen GIS metadata is escaped before HTML insertion; width='+width);
   }finally{await page.close();}
  }
  console.log('PASS six isolated GIS negative-input browser checks (2 viewport sizes x 3 cases).');
  console.log('LIMITATION: isolated browser tests are not a complete penetration test or provider licensing certification.');
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL GIS browser QA:',e.stack||String(e));process.exitCode=1});
