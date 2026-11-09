'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {audit,auditSensitiveScript,scanAssetReferences}=require('../scripts/audit-runtime-privacy-assets.cjs');
test('actual current pages have existing first-party dependencies and nonpersistent address scripts',()=>{
 const result=audit(path.resolve(__dirname,'..'));
 assert.deepEqual(result.errors,[],JSON.stringify(result.errors));
 assert.ok(result.referencedAssets>30);
});
test('private address history cannot be added to browser storage without CI blocking it',()=>{
 for(const bad of ['window.localStorage.setItem("address",x)',
                   'sessionStorage.setItem("location",x)',
                   'indexedDB.open("homes")',
                   'document.cookie="search="+x',
                   'navigator.sendBeacon("/metrics",x)']){
  assert.equal(auditSensitiveScript('home-lookup-v2.js',bad).length,1);
 }
});
test('raw console telemetry and browser history mutations in address handlers are blocked',()=>{
 assert.match(auditSensitiveScript('texas-address-suggest.js','console.info(value)')[0],/console/);
 assert.match(auditSensitiveScript('home-lookup-v2.js','history.replaceState({}, "", value)')[0],/history/);
 assert.deepEqual(auditSensitiveScript('home-lookup-v2.js','input.textContent = value;'),[]);
});
test('local assets are checked without counting external CDN URLs',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tx-security-assets-'));
 try{
  fs.mkdirSync(path.join(root,'features'));
  fs.writeFileSync(path.join(root,'features','ok.js'),'');
  const valid=scanAssetReferences('<script src="./features/ok.js?v=5"></script><script src="https://unpkg.com/test.js"></script>',root,'index.html');
  assert.deepEqual(valid.errors,[]);
  assert.deepEqual(valid.assets,['features/ok.js']);
  const missing=scanAssetReferences('<script src="./missing.js?v=8"></script>',root,'index.html');
  assert.match(missing.errors.join(' '),/missing referenced static asset/);
  const traversal=scanAssetReferences('<script src="./../../private.js"></script>',root,'index.html');
  assert.match(traversal.errors.join(' '),/escaped publication root/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
