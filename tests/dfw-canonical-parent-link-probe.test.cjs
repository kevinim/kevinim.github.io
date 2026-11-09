'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {probe,run}=require('../scripts/probe-canonical-dfw-parent-link-repairs.cjs');
const manifest=JSON.parse(fs.readFileSync('data/dfw-canonical-parent-links-remediation-2026.json','utf8'));
test('same-URL read-only GET reports HTTP success without certifying 2026-27 assignments',async()=>{
 for(const row of manifest.repairs){
  let calls=0;
  const x=await probe(row,async(url,options)=>{
   assert.equal(url,row.newUrl);assert.equal(options.method,'GET');
   assert.equal(options.redirect,'manual');assert.equal(options.headers.Accept,'text/html');
   calls++;return {status:200};
  });
  assert.equal(calls,1);
  assert.equal(x.status,'GET_HTTP_RESPONDED_FINDER_NOT_TESTED');
  assert.equal(x.actualAddressSchoolAssignmentVerified,false);
 }
});
test('redirect, GET 404, and server 500 are not presented as working finders',async()=>{
 const row=manifest.repairs[0];
 for(const [code,label] of [[302,'REDIRECT_REQUIRES_REVIEW'],
  [404,'CONFIRMED_GET_NOT_FOUND'],[500,'HTTP_OR_SERVICE_ERROR_INCONCLUSIVE'],
  [403,'BLOCKED_INCONCLUSIVE']]){
  const x=await probe(row,async()=>({status:code}));
  assert.equal(x.status,label);assert.equal(x.actualAddressSchoolAssignmentVerified,false);
 }
});
test('unapproved website or false school polygon certificate is rejected before HTTP',async()=>{
 for(const mutation of [{newUrl:'https://example.invalid/fake'},
  {certifications:{...manifest.repairs[0].certifications,currentYearSchoolLevelGIS:true}}]){
  let calls=0;
  await assert.rejects(async()=>probe({...manifest.repairs[0],...mutation},
   async()=>{calls++;return {status:200}}),/UNTRUSTED_OR_FALSELY_CERTIFIED/);
  assert.equal(calls,0);
 }
});
test('exact two-source remediation report never becomes production signoff',async()=>{
 const r=await run({manifest,live:false});
 assert.equal(r.records.length,2);
 assert.equal(r.verifiedRealAddressAssignments,0);
 assert.equal(r.verifiedCurrentGIS,0);
 assert.equal(r.release,'NO_GO');
});
