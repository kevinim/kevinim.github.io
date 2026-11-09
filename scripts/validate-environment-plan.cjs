'use strict';
const fs=require('node:fs');
const path=require('node:path');

function host(value,label){
 if(typeof value!=='string'||!value)return null;
 let u;try{u=new URL(value);}catch{throw Error(label+': invalid URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||u.pathname!=='/')
  throw Error(label+': HTTPS origin only (no path, credentials, port, query, or fragment)');
 return u.hostname.toLowerCase();
}
function validate(plan,{cutover=false}={}){
 if(!plan||plan.schemaVersion!==1)throw Error('Unexpected plan schema');
 const e=plan.familyEntry,u=plan.familyUat,p=plan.publicProduction,r=plan.release;
 if(!e||!u||!p||!r)throw Error('Missing environment sections');
 const gatewayHost=host(e.origin,'familyEntry');
 if(gatewayHost!=='kevinim.github.io')throw Error('Current family entry origin must remain unchanged');
 if(e.access!=='public-landing-only'||e.futureContent!=='public-login-link-only')
  throw Error('Family gateway is public and may contain a link only, not dashboard assets');
 if(u.provider!=='Cloudflare Pages'||u.access!=='Cloudflare Access exact-email allowlist')
  throw Error('UAT must use Cloudflare Pages with exact email Access policy');
 if(p.provider!=='separate Cloudflare Pages project'||p.access!=='public'||p.distinctOriginRequired!==true)
  throw Error('Public production requires a separate provider project and origin');
 if(p.build!=='scripts/build-public-preview.cjs')throw Error('Unapproved public build command');
 const uatHost=host(u.origin,'familyUat'),prodHost=host(p.origin,'publicProduction');
 if(uatHost&&(!/^[a-z0-9-]+\.pages\.dev$/.test(uatHost)||uatHost===gatewayHost))
  throw Error('UAT must use a separately verified Cloudflare Pages origin');
 if(prodHost&&(prodHost===gatewayHost||prodHost===uatHost||!/^([a-z0-9-]+\.)+[a-z0-9-]+$/.test(prodHost)))
  throw Error('Public production must use a separate origin from family gateway and UAT');
 if(e.deployEnabled&&!cutover||u.deployEnabled&&!cutover||p.deployEnabled&&!cutover)
  throw Error('Planning mode must not enable any deployments');
 if(cutover){
  if(!uatHost||!prodHost||!u.privateSourceRepository)throw Error('UAT and production hosts plus private source required');
  for(const [name,flag] of [
   ['UAT primary hostname Access policy',u.primaryHostProtected],
   ['UAT preview alias Access policy',u.previewAliasesProtected],
   ['UAT anonymous denial test',u.anonymousTestPassed],
   ['Production redistribution rights',p.redistributionApproved],
   ['Owner release approval',r.ownerApproved],
   ['Backup and rollback exercise',r.backupAndRollbackTested],
   ['Deployment workflow configured',r.deployWorkflowConfigured]
  ])if(flag!==true)throw Error(name+' must be verified before cutover');
 }
 return {gatewayHost,uatHost,prodHost,cutoverReady:cutover};
}
function main(){
 const planPath=process.argv[2]||'deploy/environment-plan.json';
 const mode=process.argv[3]||'planning';
 if(!['planning','cutover'].includes(mode))throw Error('Use planning or cutover');
 const value=JSON.parse(fs.readFileSync(path.resolve(planPath),'utf8'));
 const result=validate(value,{cutover:mode==='cutover'});
 process.stdout.write('Environment separation plan is valid in '+mode+' mode; deployment performed: no.\n');
 if(mode==='planning'&&(value.familyEntry.deployEnabled||value.familyUat.deployEnabled||value.publicProduction.deployEnabled))
  throw Error('A planning-only manifest must not enable deployments');
 return result;
}
if(require.main===module)try{main();}catch(e){process.stderr.write('Environment gate blocked: '+e.message+'\n');process.exitCode=1;}
module.exports={host,validate};
