'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'.github/workflows');
const pendingElsewhere=new Set(['public-release-security.yml','verify-main-bootstrap-extraction.yml']);
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.yml')&&!pendingElsewhere.has(x));
const uses=/^\s*(?:-\s*)?uses:\s*([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)@([^\s#]+)/gm;

test('test-only and browser workflows reference immutable action commits',()=>{
 assert.ok(files.length>=36,'unexpected workflow count; audit required');
 let pinned=0;
 for(const name of files){
  const contents=fs.readFileSync(path.join(dir,name),'utf8');
  const actions=[...contents.matchAll(uses)];
  assert.ok(actions.length>0,name+' has no action references');
  for(const hit of actions){
   assert.match(hit[2],/^[0-9a-f]{40}$/,name+' uses floating '+hit[1]);
   pinned++;
  }
  assert.doesNotMatch(contents,/^\s*pull_request_target:/m,name+' uses elevated PR event');
  assert.doesNotMatch(contents,/\bwrite-all\b/,name+' grants broad token writes');
  const top=contents.match(/^permissions:\s*\n((?:[ \t]+[^\n]+\n)+)/m);
  assert.ok(top&&/^[ \t]+contents:\s*read\s*$/m.test(top[1]),name+' missing root-level read-only permissions');
 }
 assert.ok(pinned>=100,'unexpectedly low pinned action count');
});
