'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validate,safeCandidateUrl,inspect,run}=require('../scripts/probe-dfw-107-candidate-routes.cjs');
const root=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=()=>load('data/dfw-107-parent-route-qa-candidate-2026.json');
const main=()=>load('data/dfw-school-coverage-matrix-2026.json');

test('107 official navigation candidates are pinned to PR173, not falsely promoted to main',()=>{
 const source=manifest(),m=main(),r=validate(source,m);
 assert.deepEqual(r.errors,[]);
 assert.equal(r.candidates.length,107);
 assert.equal(source.sourcePullRequest,173);
 assert.equal(m.summary.publicISDsWithRegisteredParentRoute,29);
 assert.equal(source.unregistered[0].code,'249904');
 assert.equal(new Set(r.candidates.map(d=>d.code)).size,107);
 assert.equal(new Set(r.candidates.map(d=>d.url)).size,107);
});
test('fail before sending HTTP when fake Chico source or 108th entry is invented',async()=>{
 const source=manifest(),m=main();source.unregistered=[];
 let called=false;
 const result=await run({manifest:source,main:m,live:true,fetchImpl:()=>{called=true;throw Error('unexpected')}});
 assert.equal(result.status,'INVALID_INPUT_NO_REQUESTS');
 assert.equal(called,false);
 assert.match(result.errors.join('|'),/CHICO_TEXAS_MISSING_ROUTE_GUARD/);
});
test('fail before HTTP on altered existing 29 official main URL records',()=>{
 const source=manifest(),m=main();
 source.districts.find(d=>d.code==='043901').url='https://example.com/other';
 const result=validate(source,m);
 assert.match(result.errors.join('|'),/MAIN_REGISTERED_URL_CHANGED_IN_QA_043901/);
});
test('reject internal/private and insecure candidate hosts',()=>{
 for(const u of ['http://example.org','https://localhost/x','https://127.0.0.1/x',
  'https://10.0.0.1/x','https://192.168.1.2/','https://user:pass@example.org/']){
  assert.equal(safeCandidateUrl(u),false,u);
 }
 assert.equal(safeCandidateUrl('https://www.allenisd.org/page/findaschool'),true);
});
test('PR173 source probe status separates 2xx from redirects, failures, and blocked services',async()=>{
 const cases=[[200,'HTTP_RESPONDED_FINDER_NOT_TESTED'],[302,'REDIRECT_REQUIRES_REVIEW'],
  [403,'BLOCKED_OR_RATE_LIMITED_INCONCLUSIVE'],[429,'BLOCKED_OR_RATE_LIMITED_INCONCLUSIVE'],
  [404,'HTTP_NOT_FOUND_REVIEW'],[500,'HTTP_ERROR_INCONCLUSIVE']];
 for(const [status,expected] of cases){
  assert.equal((await inspect('https://example.org/',async()=>({status}))).status,expected);
 }
});
test('running all 107 candidate checks never makes a residence assignment claim',async()=>{
 const source=manifest(),m=main();const calls=[];
 const result=await run({manifest:source,main:m,live:true,fetchImpl:async(url,opts)=>{
  calls.push([url,opts.method,opts.redirect]);return {status:200};
 }});
 assert.equal(result.records.length,107);
 assert.equal(calls.length,107);
 assert.ok(calls.every(x=>x[1]==='HEAD'&&x[2]==='manual'));
 assert.equal(result.sourceIsUnmergedQAOnly,true);
 assert.equal(result.mainGuidanceRoutes,29);
 assert.equal(result.candidateGuidanceRoutes,107);
 assert.equal(result.resultCounts.HTTP_RESPONDED_FINDER_NOT_TESTED,107);
 assert.equal(result.verifiedFinderOperations,0);
 assert.equal(result.verifiedResidentialAssignments,0);
 assert.equal(result.release,'NO_GO');
 assert.equal(result.currentYearGISRate,null);
});
