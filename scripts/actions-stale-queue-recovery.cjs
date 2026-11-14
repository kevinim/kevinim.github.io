#!/usr/bin/env node
'use strict';
/*
 * Read-only by default. An explicit, authenticated --apply only attempts
 * normal cancellation for a small batch of November 11, 2026 orphan runs.
 * Do not force-cancel, delete history, or cancel open-PR/main jobs.
 */
const REPO='kevinim/kevinim.github.io';
const API='https://api.github.com/repos/'+REPO;
const WINDOW_START=Date.parse('2026-11-11T20:17:00Z');
const WINDOW_END=Date.parse('2026-11-11T20:56:00Z');
const MAX_BATCH=25;
function candidate(run,{mainSha,openHeads=new Set(),openBranches=new Set(),now=Date.now()}={}){
 if(!run||run.status!=='queued'||run.event!=='pull_request')return false;
 if(!Number.isSafeInteger(run.id)||run.id<=0||!String(run.head_sha||'').match(/^[0-9a-f]{40}$/))return false;
 if(run.head_sha===mainSha||openHeads.has(run.head_sha)||openBranches.has(run.head_branch))return false;
 const t=Date.parse(run.created_at||'');
 if(!Number.isFinite(t)||t<WINDOW_START||t>WINDOW_END||now-t<24*3600000)return false;
 if(run.updated_at&&Date.parse(run.updated_at)>t+300000)return false;
 return true;
}
function plan(runs,settings){
 const eligible=runs.filter(run=>candidate(run,settings)).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id-b.id);
 return {total:runs.length,eligible,excluded:runs.length-eligible.length};
}
function apiClient(fetcher=fetch,token=''){
 const baseHeaders={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'tx-dashboard-queue-audit'};
 if(token)baseHeaders.Authorization='Bearer '+token;
 return async function request(path,{method='GET'}={}){
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('://')||path.includes('..')||path.includes('\\'))throw Error('invalid_api_path');
  const response=await fetcher(API+path,{method,headers:baseHeaders,signal:AbortSignal.timeout(20000)});
  if(method==='POST'&&response.status===202)return {accepted:true};
  if(!response.ok){
   const err=new Error('github_api_status_'+response.status);
   err.status=response.status;
   throw err;
  }
  return response.json();
 };
}
async function listAllQueued(request){
 const runs=[];
 for(let page=1;page<=20;page++){
  const data=await request('/actions/runs?status=queued&per_page=100&page='+page);
  if(!Array.isArray(data.workflow_runs))throw Error('unexpected_runs_response');
  runs.push(...data.workflow_runs);
  if(data.workflow_runs.length<100)return runs;
 }
 throw Error('queued_page_limit_exceeded');
}
async function preflight(request){
 const [branch,pulls]=await Promise.all([
  request('/branches/main'),request('/pulls?state=open&per_page=100')
 ]);
 if(!/^[0-9a-f]{40}$/.test(branch.commit?.sha||''))throw Error('main_sha_unavailable');
 if(!Array.isArray(pulls))throw Error('open_prs_unavailable');
 if(pulls.length===100)throw Error('open_pr_pagination_required');
 return {mainSha:branch.commit.sha,openHeads:new Set(pulls.map(p=>p.head?.sha).filter(Boolean)),openBranches:new Set(pulls.map(p=>p.head?.ref).filter(Boolean)),openPrCount:pulls.length};
}
async function verifyJobsEmpty(request,id){
 const jobs=await request('/actions/runs/'+id+'/jobs?per_page=1');
 return jobs.total_count===0&&Array.isArray(jobs.jobs)&&jobs.jobs.length===0;
}
async function inspectSample(request,eligible,limit=5){
 const results=[];
 for(const run of eligible.slice(0,limit)){
  const zero=await verifyJobsEmpty(request,run.id);
  results.push({runId:run.id,zeroJobs:zero});
 }
 return results;
}
async function cancelBatch(request,eligible,settings,{limit=5,confirm=false}={}){
 if(!confirm)throw Error('explicit_confirmation_required');
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_BATCH)throw Error('invalid_batch_size');
 const attempted=[];
 for(const snapshot of eligible.slice(0,limit)){
  const current=await request('/actions/runs/'+snapshot.id);
  if(!candidate(current,settings)||current.head_sha!==snapshot.head_sha){
   attempted.push({runId:snapshot.id,result:'changed_skip'});
   continue;
  }
  if(!await verifyJobsEmpty(request,snapshot.id)){
   attempted.push({runId:snapshot.id,result:'has_jobs_skip'});
   continue;
  }
  try{
   await request('/actions/runs/'+snapshot.id+'/cancel',{method:'POST'});
   attempted.push({runId:snapshot.id,result:'cancel_accepted'});
  }catch(err){
   attempted.push({runId:snapshot.id,result:err.status===409?'github_409_orphan_run':'api_failure_'+(err.status||'unknown')});
   // GitHub incident-era runs may reject cancellation with 409.
   // Stop instead of force-cancelling or hammering hundreds of requests.
   break;
  }
 }
 return attempted;
}
async function run(argv=process.argv.slice(2),environment=process.env){
 const apply=argv.includes('--apply'),confirm=argv.includes('--confirm-stale-20261111');
 const batchArg=argv.find(x=>x.startsWith('--limit='));
 const limit=batchArg?Number(batchArg.slice(8)):5;
 if(apply&&(!confirm||!environment.GH_TOKEN))throw Error('apply_requires_GH_TOKEN_and_explicit_confirmation');
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_BATCH)throw Error('limit_must_be_1_to_25');
 const request=apiClient(fetch,apply?environment.GH_TOKEN:(environment.GH_TOKEN||''));
 const info=await preflight(request);
 const runs=await listAllQueued(request);
 const settings={...info,now:Date.now()};
 const output=plan(runs,settings);
 const sample=await inspectSample(request,output.eligible,Math.min(5,limit));
 let attempted=[];
 if(apply)attempted=await cancelBatch(request,output.eligible,settings,{limit,confirm});
 const summary={
  mode:apply?'bounded_cancel':'read_only',
  queued:output.total,nov11ClosedPrCandidates:output.eligible.length,
  excluded:output.excluded,openPrCount:info.openPrCount,
  zeroJobSamples:sample,
  attempts:attempted,
  note:'Not a GitHub service fix. HTTP 409 is reported and stops without force-cancel.'
 };
 process.stdout.write('ACTIONS_QUEUE_RECOVERY '+JSON.stringify(summary)+'\n');
 return summary;
}
if(require.main===module)run().catch(err=>{
 console.error('ACTIONS_QUEUE_RECOVERY_ERROR '+String(err.message||'unknown'));
 process.exitCode=1;
});
module.exports={REPO,WINDOW_START,WINDOW_END,MAX_BATCH,candidate,plan,apiClient,listAllQueued,preflight,verifyJobsEmpty,inspectSample,cancelBatch,run};
