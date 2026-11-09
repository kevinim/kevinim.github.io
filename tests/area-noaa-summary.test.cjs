'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.join(__dirname,'..');
test('lightweight NOAA regional summary is byte-pinned and faithfully copies event counts',()=>{
 const out=JSON.parse(fs.readFileSync(path.join(root,'data/area-noaa-counts-2024-2025.json'),'utf8'));
 const buf=fs.readFileSync(path.join(root,out.sourceFile));
 const blob=crypto.createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex');
 assert.equal(out.sourceBlobSha,blob,'Source snapshot changed: rebuild regional summary before deployment');
 const src=JSON.parse(buf.toString('utf8'));
 assert.equal(out.summary.length,src.summary.length);
 for(let i=0;i<out.summary.length;i++){
   const row=out.summary[i],orig=src.summary[i];
   assert.deepEqual(row,{county:orig.county,year:orig.year,category:orig.category,count:orig.count});
   assert.ok([2024,2025].includes(row.year));
   assert.ok(Number.isInteger(row.count)&&row.count>=0);
 }
 assert.match(out.unit,/not risk probability/);
});
