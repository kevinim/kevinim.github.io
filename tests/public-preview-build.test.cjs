'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const {sanitizeIndex}=require('../scripts/build-public-preview.cjs');
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
