'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classify}=require('../school-zone-ui.js');
const base={matchStatus:'matched',sourceReady:true,schoolType:'elementary',officialUrl:'https://www.cfbisd.edu/students/school-maps-locator-system'};
test('finder-derived reviewed boundaries are never represented as official',()=>{
 const x=classify({...base,displayMode:'finder-derived-reviewed'});
 assert.equal(x.kind,'estimated');assert.match(x.label,/추정/);assert.match(x.explanation,/공식 GIS가 아니며/);
});
test('unreviewed finder-derived geometry must be withheld',()=>{
 const x=classify({...base,displayMode:'finder-derived-unreviewed'});
 assert.equal(x.kind,'unverified');assert.match(x.label,/표시 보류/);
});
test('no matched geometry cannot be called estimated',()=>{
 const x=classify({...base,matchStatus:'no-district-polygon-source',displayMode:'finder-derived-reviewed'});
 assert.equal(x.kind,'finder-only');
});


test('synthetic reviewed CFB candidate can pass valid 2026-2027 year, while missing approval remains NO_GO',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {spawnSync}=require('node:child_process');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-finder-gate-'));
 const candidate={
  schemaVersion:1,district:'CFB',schoolYear:'2026-2027',
  sourceType:'official-finder-derived-estimate',finderTermsReviewed:true,
  reviewerApproved:true,
  features:[{type:'Feature',
   properties:{level:'elementary',campusId:'057903001',campusName:'Synthetic Elementary',
    provenance:'finder-derived-estimate',reviewed:true,independentHoldoutCount:3,
    independentHoldoutMismatches:0,uncertaintyDocumented:true,
    sourceCheckedAt:'2026-11-09T00:00:00Z'},
   geometry:{type:'Polygon',coordinates:[[
    [-96.93,32.94],[-96.929,32.94],[-96.929,32.941],
    [-96.93,32.941],[-96.93,32.94]]]}}]
 };
 const file=path.join(folder,'synthetic-only.json');
 const run=()=>{
  fs.writeFileSync(file,JSON.stringify(candidate));
  return spawnSync(process.execPath,['scripts/validate-cfb-finder-derived-boundaries.cjs',file],
   {cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
 };
 try{
  let out=run();
  assert.equal(out.status,0,'Reviewed synthetic fixture must be technically testable: '+out.stdout+out.stderr);
  assert.match(out.stdout,/"status":"REVIEW_READY"/);
  candidate.reviewerApproved=false;out=run();
  assert.notEqual(out.status,0);
  assert.match(out.stdout,/permission_or_review_missing/);
  candidate.reviewerApproved=true;candidate.schoolYear='2025';out=run();
  assert.notEqual(out.status,0);
  assert.match(out.stdout,/year_missing/);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
