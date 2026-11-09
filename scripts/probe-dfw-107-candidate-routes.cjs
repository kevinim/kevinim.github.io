#!/usr/bin/env node
'use strict';
// Read-only HTTP liveness audit of the 107 URL inventory STAGED IN QA-ONLY PR #173.
// A 2xx response is NOT proof the Finder returns a correct campus/year/grade.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const MANIFEST='data/dfw-107-parent-route-qa-candidate-2026.json';
function safeCandidateUrl(value){
 try{
  if(typeof value!=='string'||value.length>2048) return false;
  const u=new URL(value);
  return u.protocol==='https:'&&u.username===''&&u.password===''&&
   (u.port===''||u.port==='443')&&u.hostname.indexOf('.')>0&&
   !/^(localhost|127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.)/i.test(u.hostname)&&
   !/^[0-9.]+$/.test(u.hostname)&&!u.hostname.includes('[');
 }catch{return false;}
}
function validate(manifest,main){
 const errors=[];
 const check=(ok,id)=>{if(!ok)errors.push(id)};
 check(manifest?.schemaVersion===1&&manifest?.sourcePullRequest===173&&
  /^([a-f0-9]{40})$/.test(manifest?.sourceHeadSha||''),'UNPINNED_QA_SOURCE');
 check(manifest?.noAddressQueries===true&&manifest?.noRedirectFollow===true,
  'UNSAFE_QUERY_OR_REDIRECT_POLICY');
 const candidates=Array.isArray(manifest?.districts)?manifest.districts:[];
 const unknown=Array.isArray(manifest?.unregistered)?manifest.unregistered:[];
 check(candidates.length===107&&manifest?.registeredRoutes===107,
  'UNVERIFIED_CANDIDATE_SOURCE_DENOMINATOR');
 check(unknown.length===1&&unknown[0]?.code==='249904','CHICO_TEXAS_MISSING_ROUTE_GUARD');
 const codes=new Set(),urls=new Set();
 for(const d of candidates){
  check(/^\d{6}$/.test(d.code||''),'INVALID_DISTRICT_ID');
  check(!codes.has(d.code),'DUPLICATE_DISTRICT_'+d.code);
  codes.add(d.code);
  check(safeCandidateUrl(d.url),'UNSAFE_CANDIDATE_URL_'+d.code);
  check(!urls.has(d.url),'DUPLICATE_CANDIDATE_URL_'+d.code);
  urls.add(d.url);
 }
 check(!codes.has('249904'),'UNVERIFIED_CHICO_PROMOTED');
 const publicISDs=main?.districts?.filter(d=>d.category==='public-isd')||[];
 check(publicISDs.length===108,'MAIN_PUBLIC_ISD_CENSUS');
 for(const d of publicISDs){
  const c=candidates.find(x=>x.code===d.code);
  check(d.code==='249904'?!c:!!c,'STAGED_DISTRICT_ROSTER_MISMATCH_'+d.code);
  const original=d.parentGuidance?.officialUrl;
  if(original)check(c?.url===original,'MAIN_REGISTERED_URL_CHANGED_IN_QA_'+d.code);
 }
 return {errors,candidates};
}
async function inspect(url,fetchImpl=fetch){
 let response;
 try {
  response=await fetchImpl(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(10000)});
  if([405,501].includes(response.status))
   response=await fetchImpl(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000)});
  const status=response.status;
  return {httpStatus:status,status:status>=200&&status<300?'HTTP_RESPONDED_FINDER_NOT_TESTED':
   status>=300&&status<400?'REDIRECT_REQUIRES_REVIEW':
   [401,403,429].includes(status)?'BLOCKED_OR_RATE_LIMITED_INCONCLUSIVE':
   [404,410].includes(status)?'HTTP_NOT_FOUND_REVIEW':'HTTP_ERROR_INCONCLUSIVE'};
 } catch(e){
  return {httpStatus:null,status:'NETWORK_OR_TLS_INCONCLUSIVE',errorType:String(e.name||'Error').slice(0,60)};
 }
}
async function run({manifest=read(MANIFEST),main=read('data/dfw-school-coverage-matrix-2026.json'),
 live=false,fetchImpl=fetch}={}){
 const {errors,candidates}=validate(manifest,main);
 if(errors.length)return {schemaVersion:1,status:'INVALID_INPUT_NO_REQUESTS',errors,records:[]};
 const rows=[];
 for(let i=0;i<candidates.length;i+=4){
  const group=await Promise.all(candidates.slice(i,i+4).map(async c=>({
   code:c.code,name:c.name,url:c.url,kind:c.kind,
   ...(live?await inspect(c.url,fetchImpl):{httpStatus:null,status:'NOT_PROBED'})
  })));
  rows.push(...group);
 }
 const resultCounts={};
 for(const r of rows)resultCounts[r.status]=(resultCounts[r.status]||0)+1;
 return {schemaVersion:1,status:'HTTP_ONLY_NOT_ENROLLMENT_CERTIFICATION',errors:[],
  sourcePullRequest:173,sourceHeadSha:manifest.sourceHeadSha,
  sourceIsUnmergedQAOnly:true,mainGuidanceRoutes:main.summary.publicISDsWithRegisteredParentRoute,
  candidateGuidanceRoutes:107,unregisteredTexasChico:['249904'],
  liveHttpProbeExecuted:live,verifiedFinderOperations:0,verifiedResidentialAssignments:0,
  exactAddressAssignmentRate:null,currentYearGISRate:null,release:'NO_GO',
  method:'HEAD then GET only on 405/501, no redirects, no addresses, four concurrent requests',
  resultCounts,records:rows};
}
if(require.main===module)run({live:process.argv.includes('--live')})
 .then(result=>{
  const out=path.join(ROOT,'artifacts','agent04-pr173-107-official-http.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
  console.log('AGENT04_CANDIDATE107 '+JSON.stringify({status:result.status,
   sourceHeadSha:result.sourceHeadSha,live:result.liveHttpProbeExecuted,
   candidateGuidanceRoutes:result.candidateGuidanceRoutes,
   resultCounts:result.resultCounts,errors:result.errors,output:out}));
  if(result.errors.length)process.exitCode=1;
 }).catch(e=>{console.error('AGENT04_CANDIDATE_ERROR '+(e.stack||e));process.exitCode=1});
module.exports={safeCandidateUrl,validate,inspect,run};
