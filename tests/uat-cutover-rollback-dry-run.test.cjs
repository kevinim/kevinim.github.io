'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const run=require('../scripts/uat-cutover-rollback-dry-run.cjs');
const plan=require('../deploy/environment-plan.json');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inTemp(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tx-uat-rollback-negative-'));
 try{return fn(dir)}finally{fs.rmSync(dir,{recursive:true,force:true})}
}
test('rehearsal is a fixture-only cutover and fails into a 2-file safe holding page',()=>{
 const result=run.drill();
 assert.equal(result.status,'SYNTHETIC_ROLLBACK_PASS');
 assert.equal(result.backupFileCount,4);
 assert.equal(result.publicGatewayFileCount,2);
 assert.equal(result.safeHoldingAfterFailure,true);
 assert.equal(result.originalSyntheticFilesRecoveredPrivately,true);
 assert.equal(result.realDashboardUnchanged,true);
 assert.equal(result.realDeploymentPlanUnchanged,true);
 assert.equal(result.networkRequests,0);
 assert.equal(result.deploymentActions,0);
 assert.match(result.releaseDecision,/NO_GO/);
});
test('both source index and environment manifest remain byte-identical to before rehearsal',()=>{
 const source=hash('index.html'),manifest=hash('deploy/environment-plan.json');
 run.drill();
 assert.equal(hash('index.html'),source);
 assert.equal(hash('deploy/environment-plan.json'),manifest);
});
test('default release plan remains NO-GO, unprovisioned family UAT and disabled production',()=>{
 assert.equal(run.checkPlanNotReady(plan),true);
 assert.equal(plan.familyUat.origin,null);
 assert.equal(plan.release.ownerApproved,false);
});
test('a simulated gateway never exposes a dashboard app or stale school JSON',()=>{
 inTemp(dir=>{
  const candidate=path.join(dir,'candidate');
  assert.deepEqual(run.writeGateway(candidate,'cutover'),{files:2,mode:'cutover'});
  const html=fs.readFileSync(path.join(candidate,'index.html'),'utf8');
  assert.match(html,/mock-family-uat\.pages\.dev/);
  assert.doesNotMatch(html,/schools\.json|demo\.js|<script|<iframe/);
  assert.deepEqual(run.listFiles(candidate),['index.html','robots.txt']);
  assert.throws(()=>run.writeGateway(candidate,'preview'),/not_empty/);
 });
});
test('the rollback holding page has no link or data endpoints',()=>{
 inTemp(dir=>{
  const target=path.join(dir,'safe-holding');
  run.writeGateway(target,'preview');
  const html=fs.readFileSync(path.join(target,'index.html'),'utf8');
  assert.match(html,/아직 연결되지 않았습니다/);
  assert.doesNotMatch(html,/href="https:\/\/[^"]+pages\.dev|schools\.json|demo\.js/);
  assert.deepEqual(run.listFiles(target),['index.html','robots.txt']);
 });
});
test('backups are hashed byte-for-byte and restore only to a new non-served location',()=>{
 inTemp(dir=>{
  const source=path.join(dir,'synthetic'),archive=path.join(dir,'archive'),restore=path.join(dir,'not-served');
  run.syntheticFixture(source);
  const manifest=run.copyVerified(source,archive);
  assert.equal(Object.keys(manifest).length,4);
  run.copyVerified(archive,restore);
  run.assertSnapshot(restore,manifest);
  assert.throws(()=>run.copyVerified(source,restore),/already_exists/);
 });
});
test('tampered backup blocks cutover before any simulated gateway is published',()=>{
 let gatewayInvoked=false;
 assert.throws(()=>run.drill({beforeGateway:({archive})=>{
  fs.writeFileSync(path.join(archive,'index.html'),'CORRUPTED_BACKUP');
 },afterGateway:()=>{gatewayInvoked=true;}}),/integrity mismatch/);
 assert.equal(gatewayInvoked,false);
});
test('missing backup file blocks instead of silently restoring partial private data',()=>{
 assert.throws(()=>run.drill({beforeGateway:({archive})=>{
  fs.rmSync(path.join(archive,'schools.json'));
 }}),/integrity mismatch/);
});
test('additional and tampered files invalidate the backup manifest',()=>{
 inTemp(dir=>{
  run.syntheticFixture(dir);
  const clean=run.snapshot(dir);
  fs.writeFileSync(path.join(dir,'assets','extra.json'),'{"extra":true}');
  assert.throws(()=>run.assertSnapshot(dir,clean),/integrity mismatch/);
 });
});
test('symlink in synthetic source cannot escape the archive or be published',()=>{
 inTemp(dir=>{
  const root=path.join(dir,'synthetic');
  run.syntheticFixture(root);
  fs.symlinkSync(path.join(dir,'outside'),path.join(root,'assets','symlink'));
  assert.throws(()=>run.snapshot(root),/symlink_or_unsupported/);
 });
});
test('even an injected error after gateway assembly cannot touch actual site or plan',()=>{
 const source=hash('index.html'),manifest=hash('deploy/environment-plan.json');
 assert.throws(()=>run.drill({afterGateway:()=>{throw Error('simulated_error_after_two_file_gateway');}}),
  /simulated_error_after_two_file_gateway/);
 assert.equal(hash('index.html'),source);
 assert.equal(hash('deploy/environment-plan.json'),manifest);
});
test('invalid modes, paths and direct deployment commands are unavailable',()=>{
 assert.throws(()=>run.main(['--deploy']),/Only --dry-run/);
 assert.throws(()=>run.main(['--restore','main']),/Only --dry-run/);
 assert.throws(()=>run.writeGateway('/unrelated','production'),/invalid_gateway_mode/);
});
