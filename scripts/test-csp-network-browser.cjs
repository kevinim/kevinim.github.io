#!/usr/bin/env node
'use strict';
// Uses real index/reviewed source CSP policies, but isolated mock requests.
// No user addresses, public provider requests or real third-party APIs.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {extractCspMeta}=require('./audit-csp-readiness.cjs');
const root=path.resolve(__dirname,'..');
const PNG=Buffer.from(
 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+hLuoAAAAASUVORK5CYII=',
 'base64'
);
const permittedFetch=[
 'https://nominatim.openstreetmap.org/test-api',
 'https://gismaps.cityofallen.org/test-api'
];
const mainOnly='https://geocode.arcgis.com/test-api';
const blockedFetch='https://unapproved.invalid/collect?address=private';
const permittedImage='https://tile.openstreetmap.org/0/0/0.png';
const blockedImage='https://unapproved.invalid/track.png';
async function probe(browser,name,width){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 const policy=extractCspMeta(html)?.value;
 assert.ok(policy,'policy not found');
 const page=await browser.newPage({viewport:{width,height:700}});
 const network=[];
 await page.route('**/*',route=>{
  const url=route.request().url();
  network.push(url);
  if(url===permittedImage)return route.fulfill({status:200,contentType:'image/png',body:PNG});
  return route.fulfill({status:200,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},body:'{"ok":true}'});
 });
 try{
  const doc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="'+
   policy.replaceAll('"','&quot;')+'"></head><body><h1>CSP isolation</h1></body></html>';
  await page.setContent(doc,{waitUntil:'load'});
  await page.evaluate(()=>{
   window.__cspViolations=[];
   document.addEventListener('securitypolicyviolation',e=>{
    window.__cspViolations.push({directive:e.violatedDirective,blockedURI:e.blockedURI});
   });
  });
  const allowed=name==='index.html'?[...permittedFetch,mainOnly]:permittedFetch;
  for(const url of allowed){
   const res=await page.evaluate(async endpoint=>{
    try {const response=await fetch(endpoint);return response.ok && (await response.json()).ok===true;}
    catch{return false;}
   },url);
   assert.equal(res,true,name+' expected fetch endpoint was blocked: '+url);
  }
  const forbidden=await page.evaluate(async url=>{
   try{await fetch(url);return false;}catch{return true;}
  },blockedFetch);
  assert.equal(forbidden,true,'unapproved POST-like destination must be blocked');
  const allowedImage=await page.evaluate(src=>new Promise(resolve=>{
   const im=new Image();im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src=src;
  }),permittedImage);
  assert.equal(allowedImage,true,'OpenStreetMap tile must remain visible');
  const deniedImage=await page.evaluate(src=>new Promise(resolve=>{
   const im=new Image();im.onload=()=>resolve(false);im.onerror=()=>resolve(true);im.src=src;
  }),blockedImage);
  assert.equal(deniedImage,true,'unauthorized tracking image must be blocked');
  if(name==='reviewed.html'){
   const extra=await page.evaluate(async url=>{
    try{await fetch(url);return false;}catch{return true;}
   },mainOnly);
   assert.equal(extra,true,'legacy page must not send Esri geocoding requests');
  }
  const violations=await page.evaluate(()=>window.__cspViolations);
  assert.ok(violations.some(x=>x.directive==='connect-src'&&x.blockedURI.includes('unapproved.invalid')),
   'expected connect-src violation for unknown host');
  assert.ok(violations.some(x=>x.directive==='img-src'&&x.blockedURI.includes('unapproved.invalid')),
   'expected img-src violation for unknown host');
  assert.ok(!network.some(url=>url.includes('unapproved.invalid')),
   'CSP must deny unauthorized hosts before they leave the browser');
  assert.ok(allowed.every(url=>network.includes(url)),'known providers should receive allowed requests');
  assert.ok(network.includes(permittedImage),'map tile must be requested');
  console.log('PASS '+name+' width='+width+' approved fetch/tile allowed, unknown connect/image hosts blocked before network');
 }finally{await page.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const name of ['index.html','reviewed.html'])
   for(const width of [390,1280])await probe(browser,name,width);
 }finally{await browser.close()}
})().catch(e=>{console.error('CSP network browser QA failed:',e.stack||String(e));process.exitCode=1});
