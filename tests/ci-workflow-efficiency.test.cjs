'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const directory=path.resolve(__dirname,'../.github/workflows');
const workflows=new Map(fs.readdirSync(directory).filter(n=>n.endsWith('.yml'))
  .map(name=>[name,fs.readFileSync(path.join(directory,name),'utf8')]));
const alwaysOn=new Set(['verify-main-dashboard.yml','public-release-security.yml']);
const privilegedWriters=new Set(['build-phase2a-fema-hazards.yml','noaa-storm-snapshot.yml']);
const existingConcurrency=new Set(['tx-browser-performance.yml','denton-pdf-vector-poc.yml','denton-eight-point-gis-audit-qa.yml']);
const narrowlyScoped=[
  'audit-external-api-contract.yml','audit-gis-upload-links.yml','audit-school-provenance.yml',
  'audit-visitor-xss.yml','integration-west-dfw-qa.yml','provider-resilience-contract.yml',
  'school-data-preflight.yml','denton-eight-point-gis-audit-qa.yml',
  'live-official-school-sources.yml'
];
function prEvent(source){
 const lines=source.split(/\r?\n/);
 const start=lines.findIndex(l=>l==='  pull_request:');
 if(start<0)return null;
 const selected=[];
 for(let i=start+1;i<lines.length;i++){
  const l=lines[i];
  if(l && !l.startsWith(' ') && !l.startsWith('#'))break;
  if(/^  [A-Za-z_][\w-]*:/.test(l))break;
  selected.push(l);
 }
 return selected.join('\n');
}
test('the protected verify job remains an unfiltered, read-only main PR and main push check',()=>{
 const y=workflows.get('verify-main-dashboard.yml');
 assert.match(y,/^  pull_request:\s*\n    branches: \[main\]/m);
 assert.match(y,/^  push:\s*\n    branches: \[main\]/m);
 assert.equal(prEvent(y).includes('paths:'),false,'required verify cannot be path-skipped');
 assert.match(y,/^  verify:\s*$/m,'required check name verify must not change');
 assert.match(y,/^permissions:\s*\n  contents: read/m);
 assert.match(y,/node --test tests\/ci-workflow-efficiency\.test\.cjs/);
});
test('every main-bound PR still has core security checks and full-history scanning on main',()=>{
 const y=workflows.get('public-release-security.yml');
 assert.equal(prEvent(y).includes('paths:'),false,'cross-cutting PR security gate cannot be path-skipped');
 assert.match(y,/^  push:\s*\n    branches: \[main\]/m);
 assert.match(y,/^  schedule:/m);
 assert.match(y,/^  pr-change-secrets:/m);
 assert.match(y,/^  privacy-regression:/m);
 assert.match(y,/^  public-preview-browser-qa:/m);
 assert.match(y,/^  full-history-secrets:\s*\n(?:\s*#.*\n)*    if: \$\{\{ github\.event_name != 'pull_request' \}\}/m);
 assert.match(y,/^      - name: Scan PR change history with Gitleaks Action/m);
});
test('all PR workflows isolate the current PR and cancel only stale PR runs',()=>{
 assert.ok(workflows.size>=100,'unexpected workflow inventory shrink');
 let prCount=0,scoped=0,automatic=0;
 const labels=new Map();
 for(const [name,y] of workflows){
  const label=y.match(/^name:\s*(.*)$/m)?.[1]?.trim();
  assert.ok(label,'Missing workflow name '+name);
  const normalized=label.toLowerCase();
  assert.ok(!labels.has(normalized),'two workflows have the same concurrency name: '+labels.get(normalized)+' and '+name);
  labels.set(normalized,name);
  const p=prEvent(y);
  if(p===null)continue;
  prCount++;
  if(p.includes('paths:'))scoped++;
  else assert.ok(alwaysOn.has(name),'unscoped PR work must be justified: '+name);
  if(privilegedWriters.has(name))continue;
  assert.match(y,/^concurrency:\s*$/m,'no per-PR concurrency: '+name);
  if(!existingConcurrency.has(name)){
   assert.match(y,/^  group: tx-ci-\$\{\{ github\.workflow \}\}-\$\{\{ github\.event_name \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/m,'not isolated by PR: '+name);
   assert.match(y,/^  cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/m,'main/schedule must never auto-cancel: '+name);
   automatic++;
  }
 }
 assert.ok(prCount>=95,'lost PR quality checks');
 assert.ok(scoped>=prCount-2,'too many unconditional PR workflows');
 assert.ok(automatic>=85,'expected widespread stale-PR cancellation coverage');
});
test('scoped source/security audits still cover all their own workflow and source changes',()=>{
 for(const name of narrowlyScoped){
  const src=workflows.get(name),p=prEvent(src);
  assert.ok(p&&p.includes('paths:'),'missing path filter: '+name);
  assert.ok(p.includes(name),'PR must self-test when workflow changes: '+name);
  assert.ok(src.includes('workflow_dispatch:'),'manual deep recheck must remain: '+name);
 }
});
test('one postdeploy trigger per GitHub Pages build; manual smoke remains',()=>{
 for(const name of ['cfb-live-pages-smoke.yml','track-b-live-production-smoke.yml']){
  const y=workflows.get(name);
  assert.match(y,/^  workflow_run:\s*\n    workflows: \['pages build and deployment'\]/m);
  assert.ok(!/^\s{2}deployment_status:/m.test(y),'duplicate deployment_status runs: '+name);
  assert.match(y,/^  workflow_dispatch:/m);
  assert.match(y,/github\.event\.workflow_run\.conclusion == 'success'/);
 }
});
test('workflow YAML does not introduce PR privilege escalation',()=>{
 for(const [name,y] of workflows){
  assert.doesNotMatch(y,/^\s*pull_request_target:/m,'elevated trigger: '+name);
  assert.doesNotMatch(y,/write-all/,'write-all permissions: '+name);
 }
});
