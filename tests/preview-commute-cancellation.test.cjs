'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {sanitizeExtractedAssets}=require('../scripts/build-public-preview.cjs');
const {context,flush}=require('./helpers/bounded-context.cjs');
test('curated preview preserves operation cancellation when substituting its approved geocoder',async()=>{
 const root=path.join(__dirname,'..');
 const safe=sanitizeExtractedAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),fs.readFileSync(path.join(root,'dashboard-main.js'),'utf8'));
 const h=context(()=>new Promise(()=>{}));let finish,signal;
 h.ctx.geocodeAddress=(_address,s)=>{signal=s;return new Promise(resolve=>{finish=resolve})};
 const start=safe.js.indexOf('async function calcCommute(){'),end=safe.js.indexOf('function gmaps(',start);
 vm.runInContext(safe.js.slice(start,end),h.ctx);
 h.el('destination').value='synthetic example A';const task=h.ctx.calcCommute();
 h.el('destination').value='synthetic example B';h.run('invalidateZipCommute()');
 finish([{location:{x:-96.7,y:33.1},address:'synthetic example A'}]);await task;await flush();
 assert.equal(h.run('state.dest'),null);assert.equal(signal?.aborted,true);
});
