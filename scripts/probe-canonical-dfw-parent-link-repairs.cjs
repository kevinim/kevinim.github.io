#!/usr/bin/env node
'use strict';
// Safe, read-only GET verification for two parent-facing official navigation pages.
// Does not submit addresses, authenticate, crawl, or certify a school's enrollment.
const fs=require('node:fs');
const path=require('node:path');
const {official}=require('../trusted-link-policy.js');
const root=path.resolve(__dirname,'..');
function validateRecord(row){
 if(!row||!['070908','057904'].includes(row.teaDistrictCode)||
  official(row.newUrl)!==row.newUrl||!row.newUrl.startsWith('https://')||
  row.certifications?.independentRealResidentialAssignment!==false||
  row.certifications?.currentYearSchoolLevelGIS!==false)
  throw Error('UNTRUSTED_OR_FALSELY_CERTIFIED_PARENT_SOURCE');
 return row;
}
async function probe(row,fetchImpl=fetch){
 validateRecord(row);
 try{
  const resp=await fetchImpl(row.newUrl,{method:'GET',redirect:'manual',
   signal:AbortSignal.timeout(12000),headers:{'Accept':'text/html'}});
  const status=resp.status;
  const code=status>=200&&status<300?'GET_HTTP_RESPONDED_FINDER_NOT_TESTED':
   status>=300&&status<400?'REDIRECT_REQUIRES_REVIEW':
   [403,429].includes(status)?'BLOCKED_INCONCLUSIVE':
   [404,410].includes(status)?'CONFIRMED_GET_NOT_FOUND':'HTTP_OR_SERVICE_ERROR_INCONCLUSIVE';
  return {code:row.teaDistrictCode,url:row.newUrl,httpStatus:status,status:code,
   actualAddressSchoolAssignmentVerified:false};
 }catch(e){return {code:row.teaDistrictCode,url:row.newUrl,httpStatus:null,
  status:'NETWORK_OR_TLS_INCONCLUSIVE',errorType:String(e.name||'Error').slice(0,60),
  actualAddressSchoolAssignmentVerified:false};}
}
async function run({live=false,fetchImpl=fetch,manifest=JSON.parse(fs.readFileSync(path.join(root,'data/dfw-canonical-parent-links-remediation-2026.json'),'utf8'))}={}){
 if(manifest.schemaVersion!==1||manifest.repairs?.length!==2||
  manifest.verifiedAddressAssignments!==0||
  manifest.productionRelease!=='NO_GO'||
  new Set(manifest.repairs.map(x=>x.teaDistrictCode)).size!==2)
  throw Error('INVALID_SOURCE_REPAIR_MANIFEST');
 manifest.repairs.forEach(validateRecord);
 const records=live?await Promise.all(manifest.repairs.map(r=>probe(r,fetchImpl))):
  manifest.repairs.map(r=>({code:r.teaDistrictCode,url:r.newUrl,status:'NOT_PROBED',
   httpStatus:null,actualAddressSchoolAssignmentVerified:false}));
 return {schemaVersion:1,liveGETProbe:live,sourceUrlsChecked:records.length,
  verifiedRealAddressAssignments:0,verifiedCurrentGIS:0,
  release:'NO_GO',records};
}
if(require.main===module)run({live:process.argv.includes('--live')}).then(report=>{
 const dir=path.join(root,'artifacts');fs.mkdirSync(dir,{recursive:true});
 const out=path.join(dir,'dfw-canonical-parent-link-repair-http.json');
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('DFW_CANONICAL_PARENT_LINKS '+JSON.stringify(report));
}).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={validateRecord,probe,run};
