'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const gateway=require('../scripts/build-family-entry.cjs');
const base=path.resolve('dist/family-entry-test');

test('preview entry is a public, non-authenticating holding page without dashboard assets',()=>{
 const h=gateway.renderLanding('preview',null);
 assert.match(h,/가족용 지도/);
 assert.match(h,/이 안내 페이지 자체는 공개 주소/);
 assert.doesNotMatch(h,/href="https:\/\/[^"]+pages\.dev/);
 assert.doesNotMatch(h,/fetch\(|<script|<form|JPM|jpm-|지도 데이터/);
 assert.match(h,/noindex,nofollow/);
});
test('cutover link is HTTPS and restricted to canonical Cloudflare Pages host',()=>{
 const url=gateway.normalizeUatUrl('https://tx-family-uat.pages.dev/');
 assert.equal(url,'https://tx-family-uat.pages.dev/');
 const html=gateway.renderLanding('cutover',url);
 assert.match(html,/href="https:\/\/tx-family-uat.pages.dev\/"/);
 for(const bad of [
  'http://tx-family-uat.pages.dev',
  'https://kevinim.github.io',
  'https://example.com',
  'https://tx-family-uat.pages.dev@attacker.test',
  'https://tx-family-uat.pages.dev/evil',
  'https://tx-family-uat.pages.dev/?token=abc',
  'https://fake.tx-family-uat.pages.dev'
 ])assert.throws(()=>gateway.normalizeUatUrl(bad));
});
test('cutover fails closed unless all owner and Access attestations exist',()=>{
 const names=['UAT_ACCESS_VERIFIED','UAT_PRIVATE_DEPLOY_VERIFIED','UAT_ANONYMOUS_DENIAL_VERIFIED','FAMILY_ENTRY_OWNER_GO','FAMILY_UAT_URL'];
 const prev=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try{
  for(const n of names)delete process.env[n];
  assert.throws(()=>gateway.build('cutover',base),/not confirmed/);
  for(const n of names.slice(0,4))process.env[n]='confirmed';
  assert.throws(()=>gateway.build('cutover',base),/UAT host/);
 }finally{for(const n of names)prev[n]===undefined?delete process.env[n]:process.env[n]=prev[n];}
});
test('preview writes only index.html and robots.txt to isolated dist directory',()=>{
 try{
  const result=gateway.build('preview',base);
  assert.equal(result.deployPerformed,false);
  assert.deepEqual(fs.readdirSync(base).sort(),['index.html','robots.txt']);
  assert.doesNotMatch(fs.readFileSync(path.join(base,'index.html'),'utf8'),/\bJPM\b|personal|ghp_[A-Za-z0-9]{20}/i);
  assert.match(fs.readFileSync(path.join(base,'robots.txt'),'utf8'),/Disallow: \//);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test('builder refuses directory traversal and source deletion',()=>{
 assert.throws(()=>gateway.build('preview','.'),/under dist/);
 assert.throws(()=>gateway.build('preview','dist'),/under dist/);
 assert.throws(()=>gateway.build('preview','../somewhere'),/under dist/);
});
