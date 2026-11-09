#!/usr/bin/env node
'use strict';
// Optional read-only liveness probe: URL status is NOT a working address-to-school Finder.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const {audit,load}=require('./audit-dfw-district-integrity.cjs');
const {official}=require('../trusted-link-policy.js');
async function probe(url,fetchImpl=fetch){
 if(!url) return {status:'NO_VERIFIED_OFFICIAL_ROUTE',httpStatus:null};
 if(official(url)!==url) return {status:'UNTRUSTED_URL_REFUSED',httpStatus:null};
 let response;
 try{
  response=await fetchImpl(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(10000)});
  // Many CMS/CDN hosts reject HEAD while GET is healthy. Confirm 404/5xx with GET
  // before reporting an unusable official page; no redirect or home-address data.
  const headHttpStatus=response.status;
  const getConfirmed=[404,405,410,500,501,502,503,504].includes(headHttpStatus);
  if(getConfirmed)
   response=await fetchImpl(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000)});
  const s=response.status;
  return {...(getConfirmed?{headHttpStatus,confirmationMethod:'GET'}:{}),
   httpStatus:s,status:s>=200&&s<300?'HTTP_RESPONDED_FINDER_NOT_TESTED':
   s>=300&&s<400?'REDIRECT_REQUIRES_REVIEW':
   [401,403,429].includes(s)?'BLOCKED_OR_RATE_LIMITED_INCONCLUSIVE':
   [404,410].includes(s)?'HTTP_NOT_FOUND_MANUAL_REVIEW':'HTTP_ERROR_INCONCLUSIVE'};
 }catch(e){return {status:'NETWORK_OR_TLS_INCONCLUSIVE',httpStatus:null,
  errorType:String(e.name||'Error').slice(0,60)};}
}
async function run(report,{live=false,fetchImpl=fetch}={}){
 const records=report.districts.map(x=>({code:x.code,name:x.name,url:x.officialFinderAvailability.url}));
 const results=[];
 for(let i=0;i<records.length;i+=4){
  const batch=records.slice(i,i+4);
  const rows=await Promise.all(batch.map(async r=>({...r,...(live?await probe(r.url,fetchImpl):
   {status:r.url?'REGISTERED_URL_NOT_PROBED':'NO_VERIFIED_OFFICIAL_ROUTE',httpStatus:null})})));
  results.push(...rows);
 }
 const counts={};for(const r of results)counts[r.status]=(counts[r.status]||0)+1;
 return {schemaVersion:1,liveHttpProbeExecuted:live,lookupOperationalCertified:false,
  assignmentCertified:false,method:'HEAD then same-URL GET for 404/405/410/5xx; no redirects followed and no address queries',
  resultCounts:counts,records:results};
}
if(require.main===module)run(audit(load()),{live:process.argv.includes('--live')})
 .then(report=>{const out=path.join(ROOT,'artifacts','agent04-dfw-finder-link-http.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log('AGENT04_FINDER_HTTP '+JSON.stringify({live:report.liveHttpProbeExecuted,
   counts:report.resultCounts,output:out}));})
 .catch(e=>{console.error(e.stack||e);process.exitCode=1});
module.exports={probe,run};
