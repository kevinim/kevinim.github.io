'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const gate=require('../scripts/public-release-gate.cjs');

test('runtime candidate inventory excludes non-deployable material',()=>{
 assert.equal(gate.isRuntimeAsset('index.html'),true);
 assert.equal(gate.isRuntimeAsset('features/dashboard-extras.js'),true);
 assert.equal(gate.isRuntimeAsset('data/crime/source-manifest.json'),true);
 assert.equal(gate.isRuntimeAsset('HANDOFF.md'),false);
 assert.equal(gate.isRuntimeAsset('scripts/verify-main-data.mjs'),false);
 assert.equal(gate.isRuntimeAsset('reviewed.html'),false);
});
test('finds credential shape without leaking value in results',()=>{
 const fake=['ghp_','a'.repeat(36)].join('');
 const findings=gate.scanSecrets('app.js','const token="'+fake+'";');
 assert.equal(findings.length,1);
 assert.equal(findings[0].kind,'github-token');
 assert.equal(JSON.stringify(findings).includes(fake),false);
});
test('legacy commute personalization is identified only in runtime candidates',()=>{
 assert.equal(gate.scanPersonalization('index.html','const JPM_ADDRESS="example";').length,1);
 assert.equal(gate.scanPersonalization('jpm-example.json','{}')[0].kind,'personal-commute-data-file');
 assert.deepEqual(gate.scanPersonalization('scripts/demo.cjs','JPM_ADDRESS'),[]);
});
test('HTML sinks are counted for manual security review',()=>{
 assert.equal(gate.countMatches('a.innerHTML=x;b.innerHTML=y;',/\.innerHTML\s*=/g),2);
});

test('strict public-bundle allowlist rejects development content',()=>{
 assert.equal(gate.isPublishable('index.html'),true);
 assert.equal(gate.isPublishable('data/crime/source-manifest.json'),true);
 assert.equal(gate.isPublishable('assets/logo.svg'),true);
 assert.equal(gate.isPublishable('reviewed.html'),false);
 assert.equal(gate.isPublishable('PUBLIC_RELEASE_SECURITY.md'),false);
 assert.equal(gate.isPublishable('scripts/public-release-gate.cjs'),false);
 assert.equal(gate.isPublishable('.git/config'),false);
 assert.equal(gate.isPublishable('index.js.map'),false);
});
