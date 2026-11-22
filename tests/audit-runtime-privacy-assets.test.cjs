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
 assert.equal(result.checkedPages,5,'Primary, legacy and all three public UAT entrypoints must be audited');
});
test('all public entrypoint privacy notices and declared CSP are in the checked surface',()=>{
 const pages=['index.html','reviewed.html','redfin-uat.html','rent-map-uat.html','school-grade-uat.html'];
 for(const page of pages){
  const html=fs.readFileSync(path.join(__dirname,'..',page),'utf8');
  assert.match(html,/<meta\s+http-equiv="Content-Security-Policy"/i,page);
  if(page==='reviewed.html')assert.match(html,/id="legacyPrivacyNotice"/,page);
  else{
   assert.match(html,/id="homePrivacy"/,page);
   assert.match(html,/id="destinationPrivacy"/,page);
  }
 }
});
test('asset scanner fails closed for unsafe schemes and protocol-relative scripts',()=>{
 const html='<script src="data:text/javascript,alert(1)"></script>'
  +'<script src="javascript:alert(1)"></script>'
  +'<script src="http://evil.example/x.js"></script>'
  +'<script src="//evil.example/x.js"></script>'
  +'<script src="https://unpkg.com/example.js"></script>';
 const result=scanAssetReferences(html,path.resolve(__dirname,'..'),'synthetic.html');
 assert.equal(result.errors.length,4);
 assert.ok(result.errors.every(x=>x.includes('unsafe static asset URL scheme')));
});
test('asset scanner rejects symlinked dependencies, including a link into an outside directory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tx-symlink-check-'));
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'tx-symlink-outside-'));
 try{
  fs.mkdirSync(path.join(dir,'assets'));
  fs.writeFileSync(path.join(outside,'sensitive.js'),'safe synthetic fixture only');
  fs.symlinkSync(path.join(outside,'sensitive.js'),path.join(dir,'assets','external.js'));
  fs.symlinkSync(outside,path.join(dir,'external-directory'),'dir');
  for(const file of ['./assets/external.js','./external-directory/sensitive.js']){
   const check=scanAssetReferences('<script src="'+file+'"></script>',dir,'synthetic.html');
   assert.ok(check.errors.some(x=>/unsafe symlink or external static asset target/.test(x)),file);
  }
 }finally{
  fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});
 }
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
