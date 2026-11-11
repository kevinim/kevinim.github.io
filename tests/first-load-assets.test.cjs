'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {collectAssets,siteFile,summarize}=require('../scripts/audit-first-load-assets.cjs');

test('parses local, external scripts and stylesheets regardless of link attribute order',()=>{
 const html='<script src="./a.js?v=1"></script><script src="https://example.org/lib.js"></script>'+
  '<link rel="stylesheet" href="./a.css"><link href="./b.css?v=2" rel="stylesheet">';
 assert.deepEqual(collectAssets(html),{
  scripts:['./a.js?v=1','https://example.org/lib.js'],
  styles:['./a.css','./b.css?v=2']
 });
});
test('site file resolver blocks traversal and treats remote URLs as external',()=>{
 const root=path.resolve('/tmp/asset-fixture');
 assert.equal(siteFile(root,'https://example.org/a.js'),null);
 assert.equal(siteFile(root,'//example.org/a.js'),null);
 assert.equal(siteFile(root,'../secret.js'),null);
 assert.equal(siteFile(root,'./src/a.js?v=2'),path.join(root,'src','a.js'));
});
test('reports local bytes, missing and duplicates without treating this as a HAR',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-inventory-'));
 try{
  fs.writeFileSync(path.join(root,'a.js'),'hello');
  fs.writeFileSync(path.join(root,'a.css'),'x');
  const html='<script src="./a.js?v=1"></script><script src="./a.js?v=2"></script>'+
   '<link rel="stylesheet" href="./a.css"><script src="./not-found.js"></script>';
  const result=summarize(root,html);
  assert.equal(result.scriptTags,3);
  assert.equal(result.stylesheetLinks,1);
  assert.equal(result.missing.length,1);
  assert.equal(result.duplicates.length,1);
  assert.equal(result.localReferences,3);
  assert.equal(result.localReferencedBytes,11);
  assert.equal(result.scope,'STATIC_HTML_REFERENCES_ONLY');
  assert.equal(result.workflowFileCount,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
