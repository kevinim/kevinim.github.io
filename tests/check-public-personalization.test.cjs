'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const gate=path.resolve(__dirname,'../scripts/check-public-personalization.cjs');
function withTemp(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tx-privacy-gate-'));try{return fn(dir)}finally{fs.rmSync(dir,{recursive:true,force:true})}}
function check(dir){return cp.spawnSync(process.execPath,[gate,dir],{encoding:'utf8'})}
test('clean generic public artifact passes',()=>withTemp(dir=>{fs.writeFileSync(path.join(dir,'index.html'),'<input id="destination" value="">');assert.equal(check(dir).status,0)}));
test('nested personalized assets block publication',()=>withTemp(dir=>{fs.mkdirSync(path.join(dir,'assets'));fs.writeFileSync(path.join(dir,'assets','jpm-road-times-2026-11-04.json'),'{}');const r=check(dir);assert.equal(r.status,1);assert.match(r.stderr,/personalized commute dataset/)}));
test('office preset blocks publication without printing actual value',()=>withTemp(dir=>{fs.writeFileSync(path.join(dir,'index.html'),'<script>const JPM_ADDRESS="sensitive";</script>');const r=check(dir);assert.equal(r.status,1);assert.doesNotMatch(r.stderr,/sensitive/)}));
