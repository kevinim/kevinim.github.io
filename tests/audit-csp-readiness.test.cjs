'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {extractCspMeta,parseDirectives,analyzeCspPage,checkCurrentRepo}=
 require('../scripts/audit-csp-readiness.cjs');

test('both shipped HTML entry points declare a minimum CSP before scripts',()=>{
 const pages=checkCurrentRepo();
 assert.deepEqual(pages.map(x=>x.name),['index.html','reviewed.html']);
 assert.ok(pages.every(x=>x.errors.length===0),JSON.stringify(pages));
 assert.ok(pages.every(x=>x.summary.inlineScriptBlocks>=1));
 assert.ok(pages.every(x=>x.summary.allowsUnsafeInline===true));
 assert.ok(pages.every(x=>x.warnings.some(w=>w.includes('connect-src absent'))));
});
test('current inline bootstrap is not mistakenly classified as strict CSP',()=>{
 for(const r of checkCurrentRepo()){
   assert.ok(r.summary.inlineScriptBytes>10000,r.name);
   assert.ok(r.summary.inlineEventAttributes>0,r.name);
 }
});
test('a missing meta CSP is a regression',()=>{
 assert.ok(analyzeCspPage('<script>1</script>','sample').errors.some(e=>e.includes('missing source-level')));
});
test('a CSP declared after scripts is a regression',()=>{
 const example='<script>window.x=1</script><meta http-equiv="Content-Security-Policy" content="script-src \'self\'; object-src \'none\'; base-uri \'self\'">';
 assert.ok(analyzeCspPage(example,'sample').errors.some(e=>e.includes('after scripts')));
});
test('insecure script-src and relaxed object/base policies are rejected',()=>{
 const doc='<meta http-equiv="Content-Security-Policy" content="script-src * \'unsafe-eval\' data:; object-src *; base-uri *">';
 const r=analyzeCspPage(doc,'sample');
 assert.ok(r.errors.some(e=>e.includes("'unsafe-eval'")));
 assert.ok(r.errors.some(e=>e.includes('object-src')));
 assert.ok(r.errors.some(e=>e.includes('base-uri')));
});
test('hardened external-only script-src is not incorrectly flagged as unsafe-inline',()=>{
 const doc='<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; object-src \'none\'; base-uri \'self\'; form-action \'self\'; connect-src \'self\'; img-src \'self\'">';
 const r=analyzeCspPage(doc,'sample');
 assert.deepEqual(r.errors,[]);
 assert.equal(r.summary.allowsUnsafeInline,false);
 assert.ok(!r.warnings.some(e=>e.includes('connect-src absent')));
});
test('directives are separated correctly and meta extraction is literal',()=>{
 const policy='script-src \'self\'; object-src \'none\'; base-uri \'self\'';
 const html='<meta http-equiv="Content-Security-Policy" content="'+policy+'">';
 assert.equal(extractCspMeta(html).value,policy);
 assert.deepEqual(parseDirectives(policy).get('object-src'),["'none'"]);
});
