'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {plan,featureIsZoned}=require('../home-assignment-map.js');
const shape=(school,gradeLevel)=>({type:'Feature',properties:{school,gradeLevel},
 geometry:{type:'Polygon',coordinates:[[[-96.8,33.1],[-96.7,33.1],[-96.7,33.2],[-96.8,33.1]]]}});
test('2026-27 official GIS candidate displays but not as confirmed enrollment',()=>{
 const a={status:'current',district:'FISD',features:[shape('Sample Elementary','elementary')]};
 const p=plan(a,'official');assert.equal(p.kind,'current-gis');assert.equal(p.features.length,1);
 assert.equal(p.markerCandidates,true);assert.match(p.message,/후보/);
 assert.match(p.message,/공식 Finder/);
});
test('Finder-linked school geometry remains explicitly year-unverified',()=>{
 const a={status:'finder-current',district:'PISD',features:[shape('Sample School','elementary')]};
 const p=plan(a,'finder');assert.equal(p.kind,'finder-linked');
 assert.match(p.message,/원본 학년도가 다를 수/);
 assert.equal(plan(a,'historical').features.length,0);
});
test('boundary caution permits visible reference with prominent warning',()=>{
 const p=plan({status:'boundary-review',district:'PROSPER',
  features:[shape('Sample School','high')]},'official');
 assert.equal(p.review,true);assert.equal(p.features.length,1);
 assert.match(p.message,/경계 근처/);
});
test('fail closed on address ambiguity, conflict, non-current year, unavailable and malformed shapes',()=>{
 const f=shape('Sample','middle');
 for(const status of ['needs-address-verification','conflict','reference','loading','error','unavailable',
   'feeder-review','apartment-split-review']){
  const p=plan({status,district:'FISD',features:[f]},'official');
  assert.equal(p.features.length,0,status);
  assert.equal(p.markerCandidates,false,status);
 }
 assert.equal(plan({status:'current',district:'FISD',features:[{type:'Feature',geometry:null}]},'official').features.length,0);
 assert.equal(plan({status:'current',district:'FISD',features:Array(25).fill(f)},'official').features.length,0);
 assert.equal(featureIsZoned(f),true);
 assert.equal(featureIsZoned(shape('Sample','invalid')),false);
});
test('Allen official street table may highlight schools, but cannot draw old zones',()=>{
 const p=plan({status:'unverified-year',district:'AISD'},'historical');
 assert.equal(p.kind,'table-only');assert.equal(p.features.length,0);
 assert.equal(p.markerCandidates,true);
});
test('no household, geocoder calls or third-party URLs are constructed by presentation module',()=>{
 const a={status:'current',district:'FISD',address:'SHOULD_NOT_LEAK',
  features:[shape('Example School','elementary')]};
 const p=plan(a,'official');
 assert.ok(!JSON.stringify(p).includes('SHOULD_NOT_LEAK'));
 assert.equal(Object.hasOwn(p,'url'),false);
});

test('Dallas published 2026-updated polygons may be shown as unconfirmed but never current-year verified',()=>{
 const a={status:'publisher-provisional',district:'057905',features:[shape('Ben Milam','elementary')]};
 const p=plan(a,'published');
 assert.equal(p.kind,'publisher-unconfirmed');
 assert.equal(p.features.length,1);
 assert.equal(p.markerCandidates,true);
 assert.match(p.message,/2026년 7월/);
 assert.match(p.message,/미완료/);
 assert.equal(plan(a,'historical').features.length,0);
 assert.equal(plan({status:'publisher-boundary-review',district:'057905',features:a.features},'published').review,true);
});
