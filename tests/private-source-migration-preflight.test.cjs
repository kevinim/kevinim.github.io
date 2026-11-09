'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {
  MANDATORY,classify,validateTrackedPath,relativeEntrypointRefs,
  collectTrackedFiles,fileInfo,audit,main
}=require('../scripts/private-source-migration-preflight.cjs');

function fixture(extra={},drop=[]){
 const mock={};
 for(const file of MANDATORY)mock[file]={text:'// test fixture',bytes:15,digest:'0'.repeat(64)};
 mock['index.html']={text:'<script src="./district-registry.js"></script><script>fetch("./schools.json")</script>',bytes:81,digest:'1'.repeat(64)};
 mock['jpm-test-data.json']={text:'{"fake":true}',bytes:13,digest:'2'.repeat(64)};
 mock['features/example.js']={text:'window.example=true',bytes:19,digest:'3'.repeat(64)};
 mock['data/test.geojson']={text:'{"type":"FeatureCollection","features":[]}',bytes:42,digest:'4'.repeat(64)};
 Object.assign(mock,extra);
 for(const key of drop)delete mock[key];
 return {
  files:Object.keys(mock).sort(),
  readFn:(_root,file)=>{
   if(!Object.hasOwn(mock,file))throw Error('not in synthetic fixture');
   return mock[file];
  }
 };
}
test('baseline is review-required, not an automatically approved private-repository transfer',()=>{
 const result=audit(fixture());
 assert.equal(result.summary.status,'PREPARED_MANUAL_SOURCE_REVIEW_REQUIRED');
 assert.equal(result.summary.autoMigrationAllowed,false);
 assert.equal(result.summary.privateRepositoryCreated,false);
 assert.equal(result.summary.hostingChanged,false);
 assert.equal(result.summary.historyMigration,'PROHIBITED_USE_CURATED_CLEAN_INITIAL_COMMIT');
 assert.equal(result.summary.unresolvedStaticReferences,0);
 assert.ok(result.summary.codeCandidates>0);
 assert.ok(result.summary.heldForReview>0);
 assert.equal(result.summary.errors.length,0);
});
test('app index and family-specific datasets are quarantined; ordinary source is only a candidate',()=>{
 assert.equal(classify('index.html'),'restricted_family_review');
 assert.equal(classify('reviewed.html'),'restricted_family_review');
 assert.equal(classify('jpm-local-commute.geojson'),'restricted_family_review');
 assert.equal(classify('data/school-zones.json'),'dataset_license_review');
 assert.equal(classify('features/theme-toggle.js'),'source_code_candidate');
 assert.equal(classify('backend/api.mjs'),'source_code_candidate');
 assert.equal(classify('scripts/verify-public-preview.cjs'),'source_code_candidate');
});
test('CI/deployment configuration is held for reauthoring, not auto-imported',()=>{
 for(const name of [
  '.github/workflows/pages.yml',
  '.github/workflows/public-release-security.yml',
  'deploy/environment-plan.json',
  'deploy/uat-access-targets.example.json',
  'wrangler.toml','CNAME','package.json'
 ])assert.equal(classify(name),'deployment_quarantine',name);
});
test('operational docs and agent handoff are reviewed before import',()=>{
 for(const name of ['HANDOFF.md','CLAUDE.md','AGENTS.md','docs/example.md','backend/README.md'])
  assert.equal(classify(name),'documentation_review',name);
});
test('source containing personal commute identifiers needs explicit human review',()=>{
 const code='const JPM_ADDRESS="not-a-real-address";';
 assert.equal(classify('features/commute/workplace-marker.js',code),'personalized_source_review');
 assert.equal(classify('features/commute/workplace-marker.js','export const ok=true;'),'source_code_candidate');
});
test('no private keys, env, build products, or Git objects can be auto-classified as source',()=>{
 for(const name of [
  '.git/config','dist/public-preview/index.html','artifacts/security/audit.json',
  'node_modules/pkg/index.js','.env','.env.production',
  'backend/credentials.json','secrets.yml','server.key','server.pem'
 ])assert.equal(classify(name),'FORBIDDEN',name);
});
test('invalid paths and escape attempts are rejected before any read',()=>{
 for(const file of ['/etc/passwd','../private','data/../../secret','./index.html','src\\windows','a//b','a/\0b'])
  assert.throws(()=>validateTrackedPath(file),/invalid_tracked_path/);
});
test('HTML literal dependency audit does not invent dynamic JS coverage',()=>{
 const r=relativeEntrypointRefs(
  '<link href="./site.css"><script src="./app.js"></script>'+
  '<script>fetch("./data/schools.json");fetch("./data/"+file);</script>'+
  '<script src="https://cdn.example.com/sdk.js"></script>'
 );
 assert.deepEqual(r.paths,['app.js','data/schools.json','site.css']);
 assert.deepEqual(r.invalid,[]);
});
test('missing static runtime dependencies fail closed',()=>{
 const f=fixture({'index.html':{text:'fetch("./no-file.json")',bytes:23,digest:'8'.repeat(64)}});
 const r=audit(f);
 assert.equal(r.summary.status,'BLOCKED');
 assert.ok(r.summary.errors.includes('missing_static_local_dependency'));
});
test('path-traversal references fail rather than being imported',()=>{
 const f=fixture({'index.html':{text:'fetch("./../untrusted.json")',bytes:29,digest:'8'.repeat(64)}});
 const r=audit(f);
 assert.equal(r.summary.status,'BLOCKED');
 assert.ok(r.summary.errors.includes('unsafe_static_local_reference'));
});
test('removing a critical runtime file blocks source readiness',()=>{
 const f=fixture({},['schools.json']);
 const r=audit(f);
 assert.equal(r.summary.status,'BLOCKED');
 assert.ok(r.summary.errors.includes('mandatory_dependency_missing'));
});
test('credential indicator returns only a kind; never raw secret in summary',()=>{
 const marker='ghp_'+'A'.repeat(36);
 const f=fixture({'features/example.js':{text:marker,bytes:marker.length,digest:'3'.repeat(64)}});
 const r=audit(f);
 assert.ok(r.summary.errors.includes('possible_credentials_present_review_and_rotate'));
 assert.ok(r.summary.credentialIndicatorKinds.includes('github-token'));
 assert.equal(JSON.stringify(r.summary).includes(marker),false);
});
test('a previously tracked secret file is an unconditional blocker',()=>{
 const f=fixture({'.env.production':{text:'DUMMY=1',bytes:7,digest:'1'.repeat(64)}});
 const r=audit(f);
 assert.ok(r.summary.errors.includes('forbidden_tracked_path'));
});
test('git index list rejects duplicates, empty and unsafe paths',()=>{
 assert.throws(()=>collectTrackedFiles({listFn:()=>''}),/no_or_duplicate/);
 assert.throws(()=>collectTrackedFiles({listFn:()=>'a.js\0a.js\0'}),/no_or_duplicate/);
 assert.throws(()=>collectTrackedFiles({listFn:()=>'a.js\0../secret\0'}),/invalid_tracked_path/);
});
test('filesystem scan forbids symlink following in a source migration inventory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'private-migration-symlink-'));
 try{
  fs.writeFileSync(path.join(dir,'target.js'),'const ok=1;');
  fs.symlinkSync(path.join(dir,'target.js'),path.join(dir,'alias.js'));
  assert.throws(()=>fileInfo(dir,'alias.js'),/unsafe_symlink/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('script rejects remote migration/deploy CLI flags and environment bypass',()=>{
 assert.throws(()=>main(['--migrate']),/audit only/);
 assert.throws(()=>main(['--deploy']),/audit only/);
 const old=process.env.AUTO_MIGRATE_SOURCE;
 try{process.env.AUTO_MIGRATE_SOURCE='true';assert.throws(()=>main([]),/audit only/);}
 finally{old===undefined?delete process.env.AUTO_MIGRATE_SOURCE:process.env.AUTO_MIGRATE_SOURCE=old;}
});
