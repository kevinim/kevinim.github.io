'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {probe,run}=require('../scripts/probe-dfw-official-links.cjs');
const {audit,load}=require('../scripts/audit-dfw-district-integrity.cjs');
const officialUrl='https://www.allenisd.org/page/findaschool';
test('HEAD 200 establishes HTTP reachability, never address finder operation',async()=>{
 const r=await probe(officialUrl,async()=>({status:200}));
 assert.deepEqual(r,{httpStatus:200,status:'HTTP_RESPONDED_FINDER_NOT_TESTED'});
});
test('redirect, blocked provider and missing page cannot become successful Finder',async()=>{
 for(const [s,expected] of [[302,'REDIRECT_REQUIRES_REVIEW'],
  [403,'BLOCKED_OR_RATE_LIMITED_INCONCLUSIVE'],[429,'BLOCKED_OR_RATE_LIMITED_INCONCLUSIVE'],
  [404,'HTTP_NOT_FOUND_MANUAL_REVIEW']]){
  assert.equal((await probe(officialUrl,async()=>({status:s}))).status,expected);
 }
});
test('HEAD 405 falls back to GET without search parameters',async()=>{
 const methods=[];
 const r=await probe(officialUrl,async(url,opt)=>{
  assert.equal(url,officialUrl);
  assert.equal(opt.redirect,'manual');
  methods.push(opt.method);return {status:opt.method==='HEAD'?405:200};
 });
 assert.deepEqual(methods,['HEAD','GET']);
 assert.equal(r.status,'HTTP_RESPONDED_FINDER_NOT_TESTED');
});
test('unapproved URL is refused without calling network',async()=>{
 let called=false;
 const r=await probe('https://example.invalid/evil',async()=>{called=true;return {status:200}});
 assert.equal(called,false);
 assert.equal(r.status,'UNTRUSTED_URL_REFUSED');
});
test('offline default reports all districts but never issues an HTTP request',async()=>{
 const source=audit(load());
 let called=false;
 const result=await run(source,{live:false,fetchImpl:()=>{called=true;throw Error('network called')}});
 assert.equal(called,false);
 assert.equal(result.records.length,108);
 assert.equal(result.assignmentCertified,false);
 assert.equal(result.lookupOperationalCertified,false);
 assert.equal(result.liveHttpProbeExecuted,false);
 assert.equal(result.records.filter(x=>x.url).length,source.summary.registeredOfficialGuidance);
});

test('HEAD-only 404 and 500 must be corroborated using same-URL GET before failure',async()=>{
 for(const head of [404,500]){
  const requests=[];
  const result=await probe(officialUrl,async(url,opt)=>{
   requests.push({url,method:opt.method,redirect:opt.redirect});
   return {status:opt.method==='HEAD'?head:200};
  });
  assert.deepEqual(requests.map(r=>r.method),['HEAD','GET']);
  assert.ok(requests.every(x=>x.url===officialUrl&&x.redirect==='manual'));
  assert.equal(result.status,'HTTP_RESPONDED_FINDER_NOT_TESTED');
  assert.equal(result.httpStatus,200);
  assert.equal(result.headHttpStatus,head);
  assert.equal(result.confirmationMethod,'GET');
 }
});
test('GET-confirmed 404 is still not a proven residential assignment',async()=>{
 const methods=[];
 const result=await probe(officialUrl,async(_url,opt)=>{methods.push(opt.method);return {status:404}});
 assert.deepEqual(methods,['HEAD','GET']);
 assert.equal(result.status,'HTTP_NOT_FOUND_MANUAL_REVIEW');
 assert.equal(result.headHttpStatus,404);
});
