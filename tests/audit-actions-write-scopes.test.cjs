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
 assert.deepEqual(r.writers,[]);
 assert.deepEqual(r.warnings,[]);
});
test('read-only workflow stays read-only and nested write overrides are detected',()=>{
 assert.deepEqual(writes(SAFE),[]);
 assert.deepEqual(assess('ordinary.yml',SAFE).errors,[]);
 const elevated=SAFE.replace('    runs-on:', '    permissions:\n      contents: write\n    runs-on:');
 assert.deepEqual(writes(elevated),['contents']);
 assert.ok(assess('ordinary.yml',elevated).errors.includes('new_write_permission:contents'));
});
test('retired snapshot writer privileges cannot return even with same-repository guard',()=>{
 const elevated=SAFE.replace('    runs-on:', '    permissions:\n      contents: write\n    runs-on:');
 assert.ok(assess('build-phase2a-fema-hazards.yml',elevated+'\nif: github.event.pull_request.head.repo.full_name == github.repository').errors.includes('new_write_permission:contents'));
 assert.ok(assess('noaa-storm-snapshot.yml',SAFE+'\npersist-credentials: true').errors.includes('new_persisted_checkout_credentials'));
});
test('pull_request_target, write-all, and new persistent checkout token are rejected',()=>{
 assert.ok(assess('other.yml',SAFE+'\npull_request_target:\n').errors.includes('pull_request_target_not_allowed'));
 assert.ok(assess('other.yml',SAFE+'\npermissions: write-all\n').errors.includes('write_all_not_allowed'));
 assert.ok(assess('other.yml',SAFE+'\n  persist-credentials: true\n').errors.includes('new_persisted_checkout_credentials'));
 assert.ok(assess('other.yml',SAFE+'\n  "persist-credentials": "true"\n').errors.includes('new_persisted_checkout_credentials'));
 assert.ok(assess('other.yml',SAFE+'\n  "pull_request_target":\n').errors.includes('pull_request_target_not_allowed'));
});
test('unproven YAML permissions forms fail closed, including the reviewed privilege bypasses',()=>{
 for(const text of [
  'permissions: { contents: write }',
  'jobs:\n  check:\n    permissions: { contents: write }',
  "permissions:\n  contents: 'write'",
  '"permissions":\n  "contents": "write"',
  'permissions: {\n  contents: write\n}',
  'permissions: *privileges',
  'permissions: &privileges\n  contents: write',
  'jobs: { check: { permissions: { contents: write } } }',
  'jobs:\n  check:\n    <<: *privilegedJob',
  'permissions: [malformed'
 ])assert.ok(assess('test.yml',text).errors.length,text);
 assert.deepEqual(assess('test.yml','permissions:\n  contents: read # safe\n  issues: none').errors,[]);
 assert.deepEqual(assess('test.yml','permissions: {}').errors,[]);
});
test('comments on root and job permission blocks cannot hide writers from the validated scanner',()=>{
 for(const text of ['permissions: # elevated\n  contents: write','jobs:\n  check:\n    permissions: # elevated\n      contents: write']){
  assert.deepEqual(writes(text),['contents']);
  assert.ok(assess('test.yml',text).errors.includes('new_write_permission:contents'));
 }
 for(const text of ['"permiss\\u0069ons": {contents: write}','!!str permissions: {contents: write}','? permissions\n: {contents: write}'])
  assert.ok(assess('test.yml',text).errors.length,text);
});

