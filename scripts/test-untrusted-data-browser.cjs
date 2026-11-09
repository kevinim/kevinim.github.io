#!/usr/bin/env node
'use strict';
// Security regression (issue #77): data from external services and user input
// must never execute as HTML. Every string in responses from the address,
// destination, parcel and school-finder services is replaced with an inert
// marker payload; typed inputs get the same payload. The payload only bumps a
// page counter if it ever executes — nothing is sent to real services because
// those requests are answered locally.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE=process.env.SITE_URL||'http://127.0.0.1:8765/';
const PROBE='"><img src=x data-probe=1 onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=(window.__xss||0)+1">';

const poison=(v,keep)=>{
 if(Array.isArray(v))return v.map(x=>poison(x,keep));
 if(v&&typeof v==='object'){const o={};for(const [k,x] of Object.entries(v))o[k]=keep(k,x)?x:poison(x,keep);return o}
 return typeof v==='string'?v+PROBE:v;
};
// Keep fields the app needs for control flow (geometry, ids, codes, years, URLs
// it never renders) so the rendering paths are actually reached.
const KEEP=new Set(['type','geometryType','spatialReference','wkid','latestWkid','SCHL_YEAR','CLASS','GRADES','CAMPUS_ID','title','layerType','geometry','coordinates','rings','x','y','Addr_type','Postal','Status','score','matchType','url','id','itemId','f','format','location','extent']);
const keep=(k,x)=>KEEP.has(k)||typeof x!=='string';

(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  const seen=new Set();
  // Esri geocoding: answer with a real-shaped candidate whose text is poisoned.
  await page.route(/geocode\.arcgis\.com\/.*(findAddressCandidates|suggest)/,route=>{
   const u=route.request().url();seen.add('esri');
   const body=u.includes('suggest')
    ?{suggestions:[{text:'1550 Edelweiss Dr, Allen, TX, 75002, USA'+PROBE,magicKey:'k1',isCollection:false}]}
    :{candidates:[{address:'1550 Edelweiss Dr, Allen, Texas, 75002'+PROBE,location:{x:-96.6505,y:33.0948},score:100,
      attributes:{Match_addr:'1550 Edelweiss Dr, Allen, Texas, 75002'+PROBE,Addr_type:'PointAddress',Postal:'75002',City:'Allen'+PROBE,Region:'Texas',StAddr:'1550 Edelweiss Dr'+PROBE,Score:100}}]};
   route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.route(/nominatim\.openstreetmap\.org/,route=>{seen.add('nominatim');route.fulfill({contentType:'application/json',
   body:JSON.stringify([{lat:'33.0700',lon:'-96.8200',display_name:'8181 Communications Pkwy, Plano'+PROBE,name:'Office'+PROBE}])})});
  await page.route(/router\.project-osrm\.org/,async route=>{seen.add('osrm');try{const r=await route.fetch();const j=await r.json();route.fulfill({contentType:'application/json',body:JSON.stringify(poison(j,(k,x)=>typeof x!=='string'||k==='code'))})}catch{route.fulfill({contentType:'application/json',body:'{"code":"Ok","routes":[],"durations":[[0]]}'})}});
  // Parcel service and school finders: real responses, every string poisoned.
  for(const re of [/services2\.arcgis\.com\/uXyoacYrZTPTKD3R/,/portal\.metrostudygis\.com/,/services4\.arcgis\.com\/uBV8NRVfoRJv7qWn/,/static\.friscoisd\.org/]){
   await page.route(re,async route=>{seen.add(re.source.slice(0,24));const r=await route.fetch();const t=await r.text();
    let j;try{j=JSON.parse(t)}catch{return route.fulfill({response:r})}
    route.fulfill({response:r,body:JSON.stringify(poison(j,keep))})});
  }
  await page.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI))});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true,null,{timeout:100000});
  // 1) School zones from poisoned finders (Plano, Lewisville, McKinney, Frisco).
  await page.evaluate(async()=>{
   for(const d of ['PISD','LISD','043907','FISD']){
    const s=state.schools.find(x=>x.district===d&&x.type==='elementary'&&x.ll);if(!s)continue;
    zoneGroup.clearLayers();await schoolClicked(s);await new Promise(r=>setTimeout(r,250));
    zoneGroup.eachLayer(l=>l.eachLayer?.(p=>p.fire?.('click')));
   }
  });
  // 2) Home address flow with poisoned typed text and poisoned Esri results.
  await page.locator('#homeAddress').fill('1550 Edelweiss'+PROBE);
  await page.waitForTimeout(800);
  await page.locator('#homeForm').evaluate(f=>f.requestSubmit());
  await page.waitForFunction(()=>typeof home!=='undefined'&&home?.assignment,null,{timeout:30000}).catch(()=>{});
  await page.waitForTimeout(800);
  await page.evaluate(()=>{if(typeof homeMarker!=='undefined'&&homeMarker)homeMarker.fire('click')});
  // 3) Parcel check (poisoned Collin CAD) if the button is present.
  const parcel=page.locator('button:has-text("필지")').first();
  if(await parcel.count()){await parcel.click().catch(()=>{});await page.waitForTimeout(2500)}
  // 4) Compare box, destination search, school search with typed payloads.
  const add=page.locator('button:has-text("비교함에 추가")').first();if(await add.count())await add.click().catch(()=>{});
  await page.evaluate(()=>{if(typeof clearHome==='function')clearHome()});
  await page.locator('#destination').fill('Office'+PROBE);
  await page.locator('#calcCommute').click().catch(()=>{});
  await page.waitForTimeout(3000);
  await page.locator('#schoolSearch').fill('allen'+PROBE);
  await page.waitForTimeout(400);
  const r=await page.evaluate(()=>({xss:window.__xss||0,probeNodes:document.querySelectorAll('[data-probe]').length,shownAsText:(document.body.innerText.match(/onerror=/g)||[]).length+[...document.querySelectorAll('.leaflet-popup-content,.leaflet-tooltip')].filter(e=>e.innerText.includes('onerror=')).length}));
  console.log('untrusted-data probe '+JSON.stringify({...r,servicesExercised:[...seen]}));
  assert.equal(r.xss,0,'injected markup executed: '+JSON.stringify(r));
  assert.equal(r.probeNodes,0,'injected markup became DOM elements: '+JSON.stringify(r));
  assert.ok(seen.has('esri')&&seen.size>=4,'probe must reach the external-data paths: '+[...seen]);
  assert.ok(r.shownAsText>0,'poisoned text must be rendered (as inert text) to prove the paths were exercised: '+JSON.stringify(r));
  console.log('PASS untrusted service responses and typed input never execute as HTML');
  // CSP: the page's own features cause no violations, and the policy is active.
  for(const id of ['crimeMapToggle']){await page.locator('#'+id).click().catch(()=>{});await page.waitForTimeout(1500)}
  for(const id of ['femaHazardEnabled','winterMapEnabled','txwrapWHPEnabled']){await page.evaluate(id=>{const e=document.getElementById(id);if(e){e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}},id);await page.waitForTimeout(2500)}
  await page.evaluate(()=>{const b=[...document.querySelectorAll('button,input[type=checkbox]')].find(x=>/hospital|병원/i.test(x.id+x.textContent));if(b){if(b.type==='checkbox'){b.checked=true;b.dispatchEvent(new Event('change',{bubbles:true}))}else b.click()}});
  await page.waitForTimeout(2000);
  const ownViolations=await page.evaluate(()=>window.__csp.slice());
  assert.deepEqual(ownViolations,[],'page features must not trigger CSP violations: '+JSON.stringify(ownViolations));
  const blocked=await page.evaluate(()=>new Promise(res=>{document.addEventListener('securitypolicyviolation',e=>res(e.violatedDirective),{once:true});const s=document.createElement('script');s.src='https://example.invalid/injected.js';document.head.appendChild(s);setTimeout(()=>res(null),3000)}));
  assert.ok(blocked&&blocked.startsWith('script-src'),'CSP must block scripts from unlisted hosts: '+blocked);
  console.log('PASS CSP active (foreign script blocked) with no violations from site features');
  if(errors.length)console.log('page errors (non-fatal for this probe): '+JSON.stringify(errors.slice(0,5)));
 }finally{await browser?.close().catch(()=>{})}
})().catch(e=>{console.error('FAIL untrusted data browser QA: '+String(e.stack||e));process.exitCode=1});
