'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const {sanitizeIndex,verifyCspIntegrity,safeFiles}=require('../scripts/build-public-preview.cjs');
const original=fs.readFileSync('index.html','utf8');
const preview=sanitizeIndex(original);
test('public preview removes personal default office and fixed commute sources',()=>{
 assert.equal(/\bJPM\b|JPMorgan|JPM_ADDRESS|jpm-|8181 Communications/i.test(preview),false);
 assert.equal(preview.includes("fetch('./dfw-outside-public.json'"),true);
 assert.equal(/<input id="destination" value=""/.test(preview),true);
 assert.equal(preview.includes('<option value="custom" selected>'),true);
 assert.equal(preview.includes("fetch('./jpm-road"),false);
 assert.equal(preview.includes('nominatim.openstreetmap.org'),false);
 assert.equal(preview.includes('const hits=await geocodeAddress(addr)'),true);
});
test('preview retains required map, school and address search hooks',()=>{
 for(const id of ['homeForm','homeAddress','officeSelect','oneHourOverlay','schoolList','map','destination']) {
  assert.equal(preview.includes('id="'+id+'"'),true,'Missing '+id);
 }
 for(const mod of ['home-lookup-v2.js','school-assignment.js','phase2a-nfhl-flood.js','texas-address-suggest.js'])
  assert.equal(preview.includes(mod),true,'Missing '+mod);
});
test('public preview inline scripts compile',()=>{
 const inline=[...preview.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean);
 assert.ok(inline.length>0);
 for(const script of inline)new vm.Script(script);
});
test('public preview explains third-party disclosure without promising no logs',()=>{
 assert.equal(preview.includes('외부 제공업체의 로그·보존 기간까지 통제하지 않습니다'),true);
 assert.equal(preview.includes('운영 배포가 승인되지 않았습니다'),true);
});
test('fails closed on unrecognized personalized template',()=>{
 assert.throws(()=>sanitizeIndex(original.replace('id="oneHourOverlay"','id="changedOverlay"')),/template|personal|anchor/i);
});


test('sanitized preview retains strict hash-based CSP and locks modified script bytes',()=>{
 const originalPolicy=verifyCspIntegrity(original);
 const sanitizedPolicy=verifyCspIntegrity(preview);
 assert.notEqual(sanitizedPolicy.token,originalPolicy.token,'sanitizer must refresh the SHA-256 digest');
 assert.ok(sanitizedPolicy.policy.includes("script-src-attr 'none'"));
 assert.ok(!sanitizedPolicy.policy.includes("'unsafe-inline'"));
 assert.ok(!sanitizedPolicy.policy.includes("'unsafe-eval'"));
 assert.ok(sanitizedPolicy.policy.includes("object-src 'none'"));
});
test('future post-sanitize bootstrap modification is detected, not silently released',()=>{
 const modified=preview.replace('const DATA=[','const DATA=[/*hostile-drift-probe*/');
 assert.notEqual(modified,preview);
 assert.throws(()=>verifyCspIntegrity(modified),/does not match/);
});
test('fail closed on mismatched source CSP or relaxed event-handler policy',()=>{
 assert.throws(
  ()=>sanitizeIndex(original.replace(/'sha256-[A-Za-z0-9+/]+=*'/,"'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='")),
  /does not match/
 );
 assert.throws(
  ()=>sanitizeIndex(original.replace("script-src-attr 'none'","script-src-attr 'unsafe-inline'")),
  /disable HTML event-handler/
 );
});
test('legacy uploaded-GeoJSON modules never ship in the curated public preview',()=>{
 const selected=safeFiles();
 for(const file of ['features/reviewed-bootstrap.js','features/geojson-upload-guard.js','dashboard-main.js']){
  assert.ok(!selected.includes(file),'privacy/release isolation required for '+file);
 }
});
