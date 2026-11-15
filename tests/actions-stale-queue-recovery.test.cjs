'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
 candidate,plan,apiClient,listAllQueued,preflight,
 verifyJobsEmpty,cancelBatch,MAX_BATCH
}=require('../scripts/actions-stale-queue-recovery.cjs');
const SHA='a'.repeat(40),MAIN='b'.repeat(40);
function fixture(overrides={}){
 return {id:43098840916,status:'queued',event:'pull_request',
  head_sha:SHA,head_branch:'closed-incident-branch',created_at:'2026-11-11T20:55:28Z',
  updated_at:'2026-11-11T20:55:28Z',...overrides};
}
const settings={mainSha:MAIN,openHeads:new Set(),now:Date.parse('2026-11-14T01:00:00Z')};
function withPreflight(request){return (path,opts)=>path==='/branches/main'?Promise.resolve({commit:{sha:MAIN}}):path.startsWith('/pulls?')?Promise.resolve([]):request(path,opts)}
test('only exact incident window, unopened PR, aged queued executions qualify',()=>{
 assert.equal(candidate(fixture(),settings),true);
 for(const patch of [
  {status:'completed'}, {event:'push'}, {created_at:'2026-11-12T02:00:00Z'},
  {created_at:'2026-11-11T20:16:59Z'},
  {updated_at:'2026-11-11T21:30:00Z'}, {head_sha:'not-sha'},{id:-1}
 ])assert.equal(candidate(fixture(patch),settings),false,JSON.stringify(patch));
 assert.equal(candidate(fixture(),{...settings,mainSha:SHA}),false);
 assert.equal(candidate(fixture(),{...settings,openHeads:new Set([SHA])}),false);
 assert.equal(candidate(fixture({head_branch:'old-pr-branch'}),{...settings,openBranches:new Set(['old-pr-branch'])}),false);
 assert.equal(candidate(fixture(),{...settings,now:Date.parse('2026-11-11T21:00:00Z')}),false);
});
test('plan returns sorted, exclusive candidates rather than blindly cancelling all queued',()=>{
 const a=fixture({id:2,created_at:'2026-11-11T20:55:28Z',updated_at:'2026-11-11T20:55:28Z'});
 const b=fixture({id:1,created_at:'2026-11-11T20:18:30Z',updated_at:'2026-11-11T20:18:30Z'});
 const out=plan([a,fixture({event:'push'}),b,fixture({status:'in_progress'})],settings);
 assert.deepEqual(out.eligible.map(x=>x.id),[1,2]);
 assert.equal(out.excluded,2);
});
test('API client never sends unrelated URLs or token to output, and uses normal cancel only',async()=>{
 const calls=[];
 const fake=async(url,opt)=>{
  calls.push({url,method:opt.method,headers:opt.headers});
  if(opt.method==='POST')return {status:202,ok:true};
  return {status:200,ok:true,json:async()=>({ok:true})};
 };
 const req=apiClient(fake,'TEST_TOKEN');
 assert.deepEqual(await req('/actions/runs/123/cancel',{method:'POST'}),{accepted:true});
 assert.deepEqual(await req('/branches/main'),{ok:true});
 assert.equal(calls.length,2);
 assert.ok(calls[0].url.endsWith('/123/cancel'));
 assert.equal(calls[0].headers.Authorization,'Bearer TEST_TOKEN');
 for(const bad of ['https://other.example/','//evil.example','/../../other'])await assert.rejects(()=>req(bad),/invalid_api_path/);
 assert.equal(calls.length,2);
});
test('queue pagination and branch/PR preflight use only read-only endpoints',async()=>{
 let count=0;
 const calls=[];
 const req=async path=>{
  calls.push(path);
  if(path.startsWith('/actions/runs?')){
   count++;
   return {workflow_runs:count===1?Array.from({length:100},(_,i)=>fixture({id:i+1})): [fixture({id:101})]};
  }
  if(path==='/branches/main')return {commit:{sha:MAIN}};
  if(path.startsWith('/pulls?'))return [{head:{sha:'c'.repeat(40),ref:'open-pr-branch'}}];
  throw Error('unexpected_path');
 };
 const records=await listAllQueued(req);
 assert.equal(records.length,101);
 const info=await preflight(req);
 assert.equal(info.openPrCount,1);
 assert.equal(info.mainSha,MAIN);
 assert.deepEqual([...info.openHeads],['c'.repeat(40)]);
 assert.deepEqual([...info.openBranches],['open-pr-branch']);
 assert.ok(calls.every(p=>p.startsWith('/')));
});
test('zero-job check requires both total and an empty jobs collection',async()=>{
 assert.equal(await verifyJobsEmpty(async()=>({total_count:0,jobs:[]}),123),true);
 assert.equal(await verifyJobsEmpty(async()=>({total_count:1,jobs:[{}]}),123),false);
 assert.equal(await verifyJobsEmpty(async()=>({jobs:[]}),123),false);
});
test('cancel requires confirmation, bounded batch, and live revalidation',async()=>{
 const sequence=[];
 const req=async(path,opt={})=>{
  sequence.push({path,method:opt.method||'GET'});
  if(path.endsWith('/jobs?per_page=1'))return {total_count:0,jobs:[]};
  if(path.endsWith('/cancel'))return {accepted:true};
  if(path.includes('/actions/runs/'))return fixture({id:+path.split('/').at(-1)});
  throw Error('unexpected_request');
 };
 await assert.rejects(()=>cancelBatch(req,[fixture()],settings),/explicit_confirmation_required/);
 await assert.rejects(()=>cancelBatch(req,[fixture()],settings,{confirm:true,limit:MAX_BATCH+1}),/invalid_batch_size/);
 const done=await cancelBatch(withPreflight(req),[fixture()],settings,{confirm:true,limit:1});
 assert.deepEqual(done,[{runId:43098840916,result:'cancel_accepted'}]);
 assert.deepEqual(sequence.map(x=>x.method),['GET','GET','POST']);
 assert.ok(!sequence.some(x=>/force-cancel|delete/.test(x.path)));
});
test('409 from orphaned queue stops immediately, never brute-forces or force-cancels',async()=>{
 const ids=[43098840916,43098840917,43098840918];
 const calls=[];
 const req=async(path,opt={})=>{
  calls.push(path);
  if(path.endsWith('/jobs?per_page=1'))return {total_count:0,jobs:[]};
  if(path.endsWith('/cancel')){const e=Error('conflict');e.status=409;throw e;}
  const id=+path.split('/').at(-1);
  return fixture({id});
 };
 const result=await cancelBatch(withPreflight(req),ids.map(id=>fixture({id})),settings,{confirm:true,limit:3});
 assert.deepEqual(result,[{runId:ids[0],result:'github_409_orphan_run'}]);
 assert.equal(calls.filter(x=>x.endsWith('/cancel')).length,1);
 assert.ok(!calls.some(x=>x.includes('force-cancel')));
});
test('cancelling closed-PR incident runs never attempts current main or open PR heads',async()=>{
 const runs=[fixture(),fixture({id:9,head_sha:MAIN}),fixture({id:10,event:'push'})];
 const eligible=plan(runs,settings).eligible;
 assert.deepEqual(eligible.map(x=>x.id),[43098840916]);
 const result=await cancelBatch(withPreflight(async path=>{
  if(path.includes('/jobs?'))return {total_count:1,jobs:[{}]};
  return fixture({id:43098840916});
 }),eligible,settings,{confirm:true,limit:1});
 assert.equal(result[0].result,'has_jobs_skip');
});
test('unknown run branch or freshness metadata cannot qualify for cancellation',()=>{
 for(const patch of [{head_branch:undefined},{head_branch:''},{head_branch:'main'},{updated_at:undefined},{updated_at:'invalid'},{updated_at:'2026-11-11T20:00:00Z'}])
  assert.equal(candidate(fixture(patch),settings),false,JSON.stringify(patch));
});
test('preflight rejects incomplete PR protection metadata and incomplete pagination',async()=>{
 for(const pulls of [[{}],[{head:{}}],[{head:{sha:SHA,ref:''}}],[{head:{sha:'invalid',ref:'open'}}],Array.from({length:101},()=>({head:{sha:SHA,ref:'open'}}))])
  await assert.rejects(()=>preflight(async path=>path==='/branches/main'?{commit:{sha:MAIN}}:pulls));
});
test('new main or open-PR protection is refreshed after jobs verification before every POST',async()=>{
 for(const mode of ['main','open-head','open-branch']){
  const calls=[];const req=async(path,opt={})=>{
   calls.push({path,method:opt.method||'GET'});
   if(path==='/branches/main')return {commit:{sha:mode==='main'?SHA:MAIN}};
   if(path.startsWith('/pulls?'))return mode==='main'?[]:[{head:{sha:mode==='open-head'?SHA:'c'.repeat(40),ref:mode==='open-branch'?'closed-incident-branch':'new-open'}}];
   if(path.includes('/jobs?'))return {total_count:0,jobs:[]};
   if(path.endsWith('/cancel'))throw Error('must never cancel a newly protected run');
   return fixture();
  };
  const result=await cancelBatch(req,[fixture()],settings,{confirm:true,limit:1});
  assert.equal(result[0].result,'protected_skip');assert.equal(calls.some(x=>x.method==='POST'),false);
  assert.ok(calls.findIndex(x=>x.path.includes('/jobs?'))<calls.findIndex(x=>x.path==='/branches/main'));
 }
});
test('a failed protection refresh stops the batch without a cancellation POST',async()=>{
 let posts=0;await assert.rejects(()=>cancelBatch(async(path,opt={})=>{
  if(opt.method==='POST'){posts++;return {accepted:true}}
  if(path==='/branches/main')throw Error('protection unavailable');
  return path.includes('/jobs?')?{total_count:0,jobs:[]}:fixture();
 },[fixture()],settings,{confirm:true,limit:1}),/protection unavailable/);assert.equal(posts,0);
});

