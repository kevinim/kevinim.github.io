'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assertVersionedMainBootstrap}=require('../scripts/dashboard-bootstrap-contract.cjs');
const good=v=>'<meta http-equiv="Content-Security-Policy"><script src="./dashboard-main.js?v='+v+'"></script>';
test('approved cache versions are not pinned to an obsolete version',()=>{
 assert.equal(assertVersionedMainBootstrap(good(3)).version,3);
 assert.equal(assertVersionedMainBootstrap(good(5)).version,5);
 assert.equal(assertVersionedMainBootstrap(good(29)).version,29);
});
test('duplicate, unversioned, alternate URL, inline, and noncanonical tags fail closed',()=>{
 for(const v of [
  good(5)+good(6),
  '<script src="./dashboard-main.js"></script>',
  '<script src="https://evil.example/dashboard-main.js?v=5"></script>',
  '<script src="./dashboard-main.js?v=5" onload="x()"></script>',
  '<script src="./dashboard-main.js?v=0"></script>',
  '<script src="./dashboard-main.js?v=5">evil()</script>',
  '<script src="./dashboard-main.js?v=999999999999999999999"></script>',
  ''
 ])assert.throws(()=>assertVersionedMainBootstrap(v),/bootstrap/i);
});
test('real UAT entrypage contains exactly one canonical main bootstrap',()=>{
 const fs=require('node:fs');const html=fs.readFileSync('index.html','utf8');
 assert.ok(assertVersionedMainBootstrap(html).version>=1);
});
