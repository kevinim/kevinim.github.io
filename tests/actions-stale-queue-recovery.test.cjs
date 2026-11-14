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
  head_sha:SHA,created_at:'2026-11-11T20:55:28Z',
  updated_at:'2026-11-11T20:55:28Z',...overrides};
}
const settings={mainSha:MAIN,openHeads:new Set(),now:Date.parse('2026-11-14T01:00:00Z')};
test('only exact incident window, unopened PR, aged queued executions qualify',()=>{
 assert.equal(candidate(fixture(),settings),true);
 for(const patch of [
  {status:'completed'}, {event:'push'}, {created_at:'2026-11-12T02:00:00Z'},
  {created_at:'2026-11-11T20:16:59Z'},
  {updated_at:'2026-11-11T21:30:00Z'}, {head_sha:'not-sha'},{id:-1}
 ])assert.equal(candidate(fixture(patch),settings),false,JSON.stringify(patch));
 assert.equal(candidate(fixture(),{...settings,mainSha:SHA}),false);
 assert.equal(candidate(fixture(),{...settings,openHeads:new Set([SHA])}),false);
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
  if(path.startsWith('/pulls?'))return [{head:{sha:'c'.repeat(40)}}];
  throw Error('unexpected_path');
 };
 const records=await listAllQueued(req);
 assert.equal(records.length,101);
 const info=await preflight(req);
 assert.equal(info.openPrCount,1);
 assert.equal(info.mainSha,MAIN);
 assert.deepEqual([...info.openHeads],['c'.repeat(40)]);
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
 const done=await cancelBatch(req,[fixture()],settings,{confirm:true,limit:1});
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
 const result=await cancelBatch(req,ids.map(id=>fixture({id})),settings,{confirm:true,limit:3});
 assert.deepEqual(result,[{runId:ids[0],result:'github_409_orphan_run'}]);
 assert.equal(calls.filter(x=>x.endsWith('/cancel')).length,1);
 assert.ok(!calls.some(x=>x.includes('force-cancel')));
});
test('cancelling closed-PR incident runs never attempts current main or open PR heads',async()=>{
 const runs=[fixture(),fixture({id:9,head_sha:MAIN}),fixture({id:10,event:'push'})];
 const eligible=plan(runs,settings).eligible;
 assert.deepEqual(eligible.map(x=>x.id),[43098840916]);
 const result=await cancelBatch(async path=>{
  if(path.includes('/jobs?'))return {total_count:1,jobs:[{}]};
  return fixture({id:43098840916});
 },eligible,settings,{confirm:true,limit:1});
 assert.equal(result[0].result,'has_jobs_skip');
});
