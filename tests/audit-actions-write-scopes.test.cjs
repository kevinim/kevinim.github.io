'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {assess,writes,audit}=require('../scripts/audit-actions-write-scopes.cjs');
const root=path.resolve(__dirname,'../.github/workflows');
const SAFE=[
  'on:', '  pull_request:', 'permissions:', '  contents: read',
  'jobs:', '  check:', '    runs-on: ubuntu-latest', '    steps:',
  '      - run: node --check script.js'
].join('\n');
test('existing workflow inventory has no unexpected elevated workflow',()=>{
 const files=Object.fromEntries(fs.readdirSync(root).filter(n=>/\.ya?ml$/.test(n))
   .map(n=>[n,fs.readFileSync(path.join(root,n),'utf8')]));
 const r=audit(files);
 assert.deepEqual(r.errors,[]);
 assert.ok(r.workflows>=50);
 assert.deepEqual(r.writers.map(x=>x.name),['build-phase2a-fema-hazards.yml','noaa-storm-snapshot.yml']);
 assert.ok(r.warnings.some(x=>x.code==='existing_persisted_checkout_credentials'));
});
test('read-only workflow stays read-only and nested write overrides are detected',()=>{
 assert.deepEqual(writes(SAFE),[]);
 assert.deepEqual(assess('ordinary.yml',SAFE).errors,[]);
 const elevated=SAFE.replace('    runs-on:', '    permissions:\n      contents: write\n    runs-on:');
 assert.deepEqual(writes(elevated),['contents']);
 assert.ok(assess('ordinary.yml',elevated).errors.includes('new_write_permission:contents'));
});
test('existing write writer requires same-repository PR guard',()=>{
 const elevated=SAFE.replace('    runs-on:', '    permissions:\n      contents: write\n    runs-on:');
 assert.ok(assess('build-phase2a-fema-hazards.yml',elevated).errors.includes('missing_same_repo_guard'));
});
test('pull_request_target, write-all, and new persistent checkout token are rejected',()=>{
 assert.ok(assess('other.yml',SAFE+'\npull_request_target:\n').errors.includes('pull_request_target_not_allowed'));
 assert.ok(assess('other.yml',SAFE+'\npermissions: write-all\n').errors.includes('write_all_not_allowed'));
 assert.ok(assess('other.yml',SAFE+'\n  persist-credentials: true\n').errors.includes('new_persisted_checkout_credentials'));
});
