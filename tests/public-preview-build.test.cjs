'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const {sanitizeExtractedAssets,verifyExternalCspIntegrity,safeFiles}=require('../scripts/build-public-preview.cjs');
const original=fs.readFileSync('index.html','utf8');
const originalJs=fs.readFileSync('dashboard-main.js','utf8');
const safe=sanitizeExtractedAssets(original,originalJs);
const preview=safe.html+'\n'+safe.js;
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
test('public preview external sanitized script compiles with zero inline execution',()=>{
 const inline=[...safe.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(x=>!/\bsrc=/.test(x[1])&&x[2].trim());
 assert.equal(inline.length,0);
 assert.ok(safe.html.includes('<script src="./dashboard-main.js?v=3"></script>'));
 new vm.Script(safe.js);
});
test('public preview explains third-party disclosure without promising no logs',()=>{
 assert.equal(preview.includes('외부 제공업체의 로그·보존 기간까지 통제하지 않습니다'),true);
 assert.equal(preview.includes('운영 배포가 승인되지 않았습니다'),true);
});
test('fails closed on unrecognized personalized template',()=>{
 assert.throws(()=>sanitizeExtractedAssets(original.replace('id="oneHourOverlay"','id="changedOverlay"'),originalJs),/template|personal|anchor/i);
});


test('source and sanitized preview remain external-only with strict CSP',()=>{
 const before=verifyExternalCspIntegrity(original),after=verifyExternalCspIntegrity(safe.html);
 assert.equal(before.inlineHashes,0);assert.equal(after.inlineHashes,0);
 for(const s of [before.policy,after.policy]){
  assert.ok(s.includes("script-src-attr 'none'"));
  assert.ok(s.includes("object-src 'none'"));
  const script=s.split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src '));
  assert.ok(script);
  assert.ok(!script.includes('unsafe-inline'));
  assert.ok(!s.includes('sha256-'));
 }
});
test('sanitized public bootstrap is actually transformed and no private original is copied',()=>{
 assert.notEqual(safe.js,originalJs);
 assert.ok(safe.js.length>45000,'Unexpectedly empty sanitized bootstrap');
 assert.equal(/\\bJPM\\b|JPMorgan|JPM_ADDRESS|jpm-|8181 Communications|jpmMinutes/i.test(safe.js),false);
 assert.ok(safe.js.includes("fetch('./dfw-outside-public.json'"));
 assert.ok(safe.html.includes('./features/area-assessment.js'));
 assert.ok(safe.html.includes('./features/west-dfw/official-finder.js'));
});
test('tampering with sensitive template or injecting personal markers fails closed',()=>{
 assert.throws(()=>sanitizeExtractedAssets(original,originalJs.replace('const OFFICES=','const JPM_ADDRESS="private";const OFFICES=')),/private|personal|identifier/i);
 assert.throws(()=>sanitizeExtractedAssets(original,originalJs+'\\n// JPM_ADDRESS'),/private office reference|personal|identifier/i);
});
test('fail closed on unsafe or unexpected source policy',()=>{
 assert.throws(()=>sanitizeExtractedAssets(original.replace("script-src-attr 'none'","script-src-attr 'unsafe-inline'"),originalJs),/CSP|unsafe|protect/i);
 assert.throws(()=>sanitizeExtractedAssets(original.replace("https://unpkg.com;","https://unpkg.com 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';"),originalJs),/CSP|inline|hash/i);
});
test('legacy uploaded-GeoJSON modules never ship in the curated public preview',()=>{
 const selected=safeFiles();
 for(const file of ['features/reviewed-bootstrap.js','features/geojson-upload-guard.js','dashboard-main.js']){
  assert.ok(!selected.includes(file),'privacy/release isolation required for '+file);
 }
});
