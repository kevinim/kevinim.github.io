'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {extractCspMeta,parseDirectives,analyzeCspPage,checkCurrentRepo}=
 require('../scripts/audit-csp-readiness.cjs');

test('both current HTML entrypoints enforce hash-locked CSP and reject inline handler attributes',()=>{
 const rows=checkCurrentRepo();
 assert.deepEqual(rows.map(r=>r.name),['index.html','reviewed.html']);
 assert.ok(rows.every(r=>!r.errors.length),JSON.stringify(rows));
 for(const r of rows){
  assert.equal(r.summary.inlineScriptBlocks,1,r.name);
  assert.equal(r.summary.inlineHashes,1,r.name);
  assert.equal(r.summary.allowsUnsafeInline,false,r.name);
  assert.equal(r.summary.inlineEventAttributes,0,r.name);
  assert.ok(r.warnings.some(x=>x.includes('connect-src absent')));
 }
});
test('current source still uses pinned hash-backed inline bootstrap (not unsafe-inline)',()=>{
 for(const r of checkCurrentRepo()){
  assert.ok(r.summary.inlineScriptBytes>10000,r.name);
  assert.match(r.summary.policy,/script-src-attr 'none'/);
  assert.doesNotMatch(r.summary.policy,/'unsafe-inline'/);
 }
});
test('missing CSP is a regression',()=>{
 assert.ok(analyzeCspPage('<script>1</script>','sample').errors.some(e=>e.includes('missing source-level')));
});
test('CSP declared after executable scripts is rejected',()=>{
 const html='<script>window.x=1</script><meta http-equiv="Content-Security-Policy" content="script-src \'self\'; script-src-attr \'none\'; object-src \'none\'; base-uri \'self\'">';
 assert.ok(analyzeCspPage(html,'sample').errors.some(e=>e.includes('after scripts')));
});
test('permissive script sources or missing handler prohibition fail closed',()=>{
 const doc='<meta http-equiv="Content-Security-Policy" content="script-src * \'unsafe-eval\' \'unsafe-inline\'; object-src *; base-uri *">';
 const r=analyzeCspPage(doc,'sample');
 assert.ok(r.errors.some(e=>e.includes("'unsafe-eval'")));
 assert.ok(r.errors.some(e=>e.includes("'unsafe-inline'")));
 assert.ok(r.errors.some(e=>e.includes('script-src-attr')));
});
test('script hash mismatch is detected after an inline bootstrap edit',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 const altered=html.replace("const DATA=[","const DATA=[/*test-inert-mismatch*/");
 assert.notEqual(altered,html);
 assert.ok(analyzeCspPage(altered,'index.html').errors.some(x=>x.includes('changed without updating')));
});
test('unsafe inline event attribute in HTML is detected',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../reviewed.html'),'utf8');
 const altered=html.replace('</body>','<button onclick="window.x=1">Click</button></body>');
 assert.ok(analyzeCspPage(altered,'reviewed.html').errors.some(e=>e.includes('literal inline HTML event handler')));
});
test('clean external-only policy passes without inline hashes',()=>{
 const html='<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; script-src-attr \'none\'; object-src \'none\'; base-uri \'self\'; form-action \'self\'; connect-src \'self\'; img-src \'self\'">';
 const r=analyzeCspPage(html,'sample');
 assert.deepEqual(r.errors,[]);
 assert.equal(r.summary.allowsUnsafeInline,false);
 assert.equal(r.summary.inlineScriptBlocks,0);
 assert.equal(r.summary.missingConnectSrc,false);
});
test('CSP meta parser returns exact policy',()=>{
 const policy="script-src 'self'; script-src-attr 'none'; object-src 'none'; base-uri 'self'";
 const html='<meta http-equiv="Content-Security-Policy" content="'+policy+'">';
 assert.equal(extractCspMeta(html).value,policy);
 assert.deepEqual(parseDirectives(policy).get('object-src'),["'none'"]);
});
