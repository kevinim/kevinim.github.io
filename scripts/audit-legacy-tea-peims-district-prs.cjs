#!/usr/bin/env node
'use strict';
/**
 * Read-only provenance QA: compare six archived candidate PEIMS district
 * batches to the immutable current canonical 2025-26 ethnicity aggregation.
 * This is campus ID + seven public status/count parity; not home assignment.
 * PR refs must be fetched read-only and exact SHA pinned by the caller.
 */
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const GROUPS=['native','asian','black','hispanic','multi','white','pacific'];
const COHORTS=Object.freeze([
 {pr:234,sha:'a3552298db8dfcdebe90abf10c6401284739b6c7',path:'data/tea-peims-2025-26/plano-isd.json',district:'043910',n:69},
 {pr:236,sha:'197ae32ff8e7e77e485b79fccd5997d418789e75',path:'data/tea-peims-2025-26/frisco-isd.json',district:'043905',n:76},
 {pr:240,sha:'b20e53a1adb9da76ef10fe8893e080c27de94251',path:'data/tea-peims-2025-26/prosper-isd.json',district:'043912',n:32},
 {pr:241,sha:'c43e8a69352e76276b21e8fcb804978fc3e93141',path:'data/tea-peims-2025-26/denton-isd.json',district:'061901',n:46},
 {pr:242,sha:'dac5e4d3fcd8f8b022690fa6de79ab7fb3bc9f7d',path:'data/tea-peims-2025-26/dallas-isd.json',district:'057905',n:237},
 {pr:243,sha:'b07468541d46007024315af6538af2f1b01b2251',path:'data/tea-peims-2025-26/irving-isd.json',district:'057912',n:35}
]);
function statusCell(cell){
 assert.ok(cell&&typeof cell==='object','missing source category cell');
 assert.ok(['published','suppressed','not-listed'].includes(cell.status),'invalid source cell status');
 if(cell.status==='published'){
  assert.ok(Number.isSafeInteger(cell.count)&&cell.count>=0,'published value missing or invalid');
  return {status:'published',count:cell.count,mask:null};
 }
 assert.ok(cell.count==null,'protected/absent category must not have a numeric count');
 return {status:cell.status,count:null,mask:cell.status==='suppressed'?(cell.publishedMask||null):null};
}
function compareCohort(canonical,stage,cohort){
 assert.equal(canonical.schoolYear,'2025-26');
 assert.equal(stage.schoolYear,'2025-26');
 assert.equal(stage.teaDistrictId,cohort.district,'district ID changed');
 const ids=Object.keys(stage.campuses||{});
 assert.equal(ids.length,cohort.n,'wrong candidate campus count');
 const unique=new Set(ids);
 assert.equal(unique.size,cohort.n,'duplicate campus ID');
 let published=0,suppressed=0,unlisted=0;
 for(const id of ids){
  assert.match(id,/^\d{9}$/);
  assert.equal(id.slice(0,6),cohort.district,'cross-district campus');
  const actual=stage.campuses[id],expected=canonical.campuses?.[id];
  assert.ok(expected,'campus absent from canonical TEA source: '+id);
  assert.ok(actual.counts&&expected.counts,'missing category collections');
  for(const group of GROUPS){
   const left=statusCell(actual.counts[group]),right=statusCell(expected.counts[group]);
   assert.equal(left.status,right.status,'status changed '+id+' '+group);
   if(left.status==='published'){
    assert.equal(left.count,right.count,'published count changed '+id+' '+group);
    published++;
   }else if(left.status==='suppressed'){
    // Compare exact protection threshold when both source snapshots publish it.
    if(left.mask!==null&&right.mask!==null)assert.equal(left.mask,right.mask,'mask threshold changed '+id+' '+group);
    suppressed++;
   }else unlisted++;
  }
  assert.deepEqual(Object.keys(actual.counts).sort(),GROUPS.slice().sort(),'non-canonical categories '+id);
 }
 return {pr:cohort.pr,district:cohort.district,campuses:ids.length,cells:ids.length*7,published,suppressed,unlisted,
   exactStatusAndPublishedCountMatch:true,wholeCampusSharesNotImplied:true};
}
function git(args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:2*1024*1024}).trim()}
function run(){
 const canonical=JSON.parse(fs.readFileSync('data/tea-ethnicity-2025-26-priority.json','utf8'));
 const results=[];
 for(const cohort of COHORTS){
  const actualSha=git(['rev-parse','refs/audit/pr'+cohort.pr]);
  assert.equal(actualSha,cohort.sha,'candidate PR head moved; do not close until re-reviewed #'+cohort.pr);
  const json=git(['show',cohort.sha+':'+cohort.path]);
  const stage=JSON.parse(json);
  const result=compareCohort(canonical,stage,cohort);
  results.push(result);
  process.stdout.write('PASS #'+cohort.pr+' '+result.campuses+' campuses / '+result.cells+' public TEA category statuses and counts\n');
 }
 assert.equal(results.reduce((n,r)=>n+r.campuses,0),495);
 process.stdout.write(JSON.stringify({status:'PASS',scope:'source-subset parity only, not certified residential geography',totalCampuses:495,results},null,2)+'\n');
}
module.exports={COHORTS,GROUPS,statusCell,compareCohort};
if(require.main===module)run();
