'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {COHORTS,statusCell,compareCohort}=require('../scripts/audit-legacy-tea-peims-district-prs.cjs');
const keys=['native','asian','black','hispanic','multi','white','pacific'];
const counts=()=>Object.fromEntries(keys.map((key,i)=>[key,i===0?{status:'published',count:4}:i===1?{status:'suppressed',publishedMask:'<10'}:{status:'not-listed'}]));
const source=()=>({schoolYear:'2025-26',campuses:{'043910001':{counts:counts()}}});
const candidate=()=>({schoolYear:'2025-26',teaDistrictId:'043910',campuses:{'043910001':{counts:counts()}}});
const cohort={pr:999,district:'043910',n:1};
test('six immutable source PR SHA guards are unique and 495 candidates stay in scope',()=>{
 assert.equal(COHORTS.length,6);
 assert.equal(new Set(COHORTS.map(x=>x.pr)).size,6);
 assert.equal(new Set(COHORTS.map(x=>x.sha)).size,6);
 assert.equal(COHORTS.reduce((n,x)=>n+x.n,0),495);
 for(const x of COHORTS)assert.match(x.sha,/^[a-f0-9]{40}$/);
});
test('public count, masked, unlisted and exact campus ID preserve canonical semantics',()=>{
 const result=compareCohort(source(),candidate(),cohort);
 assert.deepEqual([result.published,result.suppressed,result.unlisted],[1,1,5]);
 assert.equal(result.exactStatusAndPublishedCountMatch,true);
 assert.equal(result.wholeCampusSharesNotImplied,true);
});
test('fail closed on source drift, stale/different district or suppressed count inference',()=>{
 let b=candidate();b.campuses['043910001'].counts.native.count=5;
 assert.throws(()=>compareCohort(source(),b,cohort),/published count changed/);
 b=candidate();b.campuses['043910001'].counts.asian.count=1;
 assert.throws(()=>compareCohort(source(),b,cohort),/protected\/absent category/);
 b=candidate();b.campuses['043910001'].counts.asian.publishedMask='<5';
 assert.throws(()=>compareCohort(source(),b,cohort),/mask threshold changed/);
 b=candidate();b.campuses['043910001'].counts.black.status='published';b.campuses['043910001'].counts.black.count=0;
 assert.throws(()=>compareCohort(source(),b,cohort),/status changed/);
 b=candidate();b.teaDistrictId='043905';
 assert.throws(()=>compareCohort(source(),b,cohort),/district ID changed/);
});
test('masked null is never a zero percentage or a school-wide demographic conclusion',()=>{
 assert.deepEqual(statusCell({status:'suppressed',publishedMask:'<10'}),{status:'suppressed',count:null,mask:'<10'});
 assert.deepEqual(statusCell({status:'not-listed'}),{status:'not-listed',count:null,mask:null});
 assert.throws(()=>statusCell({status:'suppressed',count:0}),/protected\/absent category/);
});