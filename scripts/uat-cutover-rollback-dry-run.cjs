#!/usr/bin/env node
'use strict';
// Synthetic, NO-NETWORK cutover/rollback safety rehearsal.
// NEVER copies the real dashboard or family data to an artifact, changes DNS,
// touches Cloudflare/GitHub settings, or authorizes a release.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {renderLanding,normalizeUatUrl}=require('./build-family-entry.cjs');
const {validate}=require('./validate-environment-plan.cjs');

const SENTINEL='.tx-synthetic-rollback-rehearsal';
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
function listFiles(root){
 const files=[];
 function walk(dir,rel=''){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
   const name=rel?rel+'/'+ent.name:ent.name;
   if(!/^[a-zA-Z0-9_.\/-]+$/.test(name)||name.includes('..'))
    throw Error('unsafe_fixture_path');
   const full=path.join(dir,ent.name);
   const stat=fs.lstatSync(full);
   if(stat.isSymbolicLink()||(!stat.isDirectory()&&!stat.isFile()))
    throw Error('fixture_symlink_or_unsupported_entry');
   if(stat.isDirectory())walk(full,name);
   else files.push(name);
  }
 }
 walk(root);return files.sort();
}
function snapshot(root){
 const out={};
 for(const name of listFiles(root))out[name]=sha(fs.readFileSync(path.join(root,name)));
 return out;
}
function assertSnapshot(root,reference){
 assert.deepEqual(snapshot(root),reference,'Private backup integrity mismatch; cutover must abort');
}
function copyVerified(source,target){
 const original=snapshot(source);
 if(fs.existsSync(target))throw Error('rollback_target_already_exists');
 fs.cpSync(source,target,{recursive:true,force:false,errorOnExist:true});
 assertSnapshot(target,original);
 return original;
}
function syntheticFixture(root){
 fs.mkdirSync(path.join(root,'assets'),{recursive:true});
 // All content is fictional. Never use actual site HTML, family addresses,
 // school assignment datasets or any user-specific information.
 fs.writeFileSync(path.join(root,'index.html'),
  '<!doctype html><title>SYNTHETIC TEST ONLY</title><h1>Mock school explorer</h1>');
 fs.writeFileSync(path.join(root,'schools.json'),'{"schools":[{"name":"Fictional Test School"}]}');
 fs.writeFileSync(path.join(root,'assets','demo.js'),'window.syntheticOnly=true;');
 fs.writeFileSync(path.join(root,'robots.txt'),'User-agent: *\nDisallow: /\n');
}
function writeGateway(root,mode){
 if(!['preview','cutover'].includes(mode))throw Error('invalid_gateway_mode');
 if(fs.existsSync(root))throw Error('gateway_target_not_empty');
 fs.mkdirSync(root,{recursive:true});
 // For CUTOVER only we render a FAKE link to test the two-file contract;
 // we do NOT call the protected builder with fake owner approvals.
 const target=mode==='cutover'
  ?normalizeUatUrl('https://mock-family-uat.pages.dev/')
  :null;
 fs.writeFileSync(path.join(root,'index.html'),renderLanding(mode,target));
 fs.writeFileSync(path.join(root,'robots.txt'),'User-agent: *\nDisallow: /\n');
 const files=listFiles(root);
 assert.deepEqual(files,['index.html','robots.txt'],'Gateway must contain exactly two public files');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.doesNotMatch(html,/<script|<iframe|<form|schools\.json|demo\.js/i);
 if(mode==='preview')assert.doesNotMatch(html,/href="https:\/\/[^"]+\.pages\.dev/);
 if(mode==='cutover')assert.match(html,/mock-family-uat\.pages\.dev/);
 return {files:files.length,mode};
}
function checkPlanNotReady(plan){
 const p=JSON.parse(JSON.stringify(plan));
 const current=validate(p,{cutover:false});
 assert.equal(current.cutoverReady,false);
 assert.equal(p.familyUat.origin,null);
 assert.equal(p.familyUat.deployEnabled,false);
 assert.equal(p.publicProduction.deployEnabled,false);
 assert.equal(p.release.ownerApproved,false);
 assert.throws(()=>validate(p,{cutover:true}),/private source|hosts/);
 return true;
}
function drill({beforeGateway,afterGateway}={}){
 const liveSource=path.resolve('index.html');
 const planSource=path.resolve('deploy/environment-plan.json');
 const sourceBefore=sha(fs.readFileSync(liveSource));
 const planBefore=sha(fs.readFileSync(planSource));
 const plan=JSON.parse(fs.readFileSync(planSource,'utf8'));
 checkPlanNotReady(plan);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tx-uat-dry-run-'));
 fs.writeFileSync(path.join(root,SENTINEL),'synthetic fixture; no real site files');
 try{
  const serving=path.join(root,'served');
  const archive=path.join(root,'private-archive');
  const recovered=path.join(root,'non-served-restoration');
  syntheticFixture(serving);
  const previous=snapshot(serving);
  const backup=copyVerified(serving,archive);
  assert.deepEqual(backup,previous);
  if(typeof beforeGateway==='function')beforeGateway({root,serving,archive,backup});
  // Refuse to switch if the source private backup is corrupted.
  assertSnapshot(archive,previous);
  fs.rmSync(serving,{recursive:true,force:true});
  writeGateway(serving,'cutover');
  if(typeof afterGateway==='function')afterGateway({root,serving,archive,backup});
  // Simulate UAT failure: live gateway falls back to EMPTY, safe holding.
  // Critically DO NOT re-publish private family/dashboard assets on rollback.
  fs.rmSync(serving,{recursive:true,force:true});
  writeGateway(serving,'preview');
  const visible=listFiles(serving);
  assert.deepEqual(visible,['index.html','robots.txt']);
  // A byte-identical copy is restored to a NON-SERVED quarantine location,
  // proving backup recoverability without exposing it to anonymous visitors.
  assertSnapshot(archive,previous);
  copyVerified(archive,recovered);
  assertSnapshot(recovered,previous);
  assert.equal(sha(fs.readFileSync(liveSource)),sourceBefore,'Real index.html must be unchanged');
  assert.equal(sha(fs.readFileSync(planSource)),planBefore,'Actual deployment plan must be unchanged');
  return {
   schemaVersion:1,status:'SYNTHETIC_ROLLBACK_PASS',
   backupFileCount:Object.keys(backup).length,
   publicGatewayFileCount:visible.length,
   safeHoldingAfterFailure:true,
   originalSyntheticFilesRecoveredPrivately:true,
   realDashboardUnchanged:true,realDeploymentPlanUnchanged:true,
   privateUatConfigured:false,publicProductionDeployed:false,
   networkRequests:0,deploymentActions:0,
   releaseDecision:'NO_GO_OWNERSHIP_ACCESS_AND_MANUAL_APPROVAL_UNVERIFIED',
   caveats:['Fixture-only rehearsal: no real site backup, hosting swap, Access login or production recovery executed.',
    'Real cutover rollback must not re-publish private dashboard files; only approved holding page is safe.']
  };
 }finally{
  // Remove ONLY the fresh OS temporary directory, never a caller-supplied path
  // or checkout content. A private synthetic ownership sentinel must exist.
  if(fs.existsSync(path.join(root,SENTINEL)))
   fs.rmSync(root,{recursive:true,force:true});
 }
}
function main(args=process.argv.slice(2)){
 if(args.length!==1||args[0]!=='--dry-run')
  throw Error('Only --dry-run supported; no deploy, cutover or restore command exists');
 const result=drill();
 const out=path.resolve('artifacts/uat-cutover-dry-run');
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');
 console.log('UAT_CUTOVER_ROLLBACK '+JSON.stringify({
  status:result.status,backupFiles:result.backupFileCount,
  publicGatewayFiles:result.publicGatewayFileCount,networkRequests:0,
  deployments:0,releaseDecision:result.releaseDecision
 }));
}
if(require.main===module){
 try{main()}catch(e){
  console.error('UAT cutover dry-run BLOCKED: '+e.message);
  process.exitCode=1;
 }
}
module.exports={SENTINEL,listFiles,snapshot,assertSnapshot,copyVerified,syntheticFixture,
 writeGateway,checkPlanNotReady,drill,main};
