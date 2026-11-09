'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {DISTRICT_REGISTRY,districtPolygonStatus,districtZoneDisplay}=require('../district-registry.js');
const {resolveAssignment}=require('../school-assignment.js');
const {classify}=require('../school-zone-ui.js');
const {plan}=require('../home-assignment-map.js');
const f={type:'Feature',properties:{school:'Ben Milam',campusId:'057905184',gradeLevel:'elementary'},
 geometry:{type:'Polygon',coordinates:[[[-96.8,32.8],[-96.79,32.8],[-96.79,32.81],[-96.8,32.8]]]}};
test('Dallas source cannot be used for assignment unless current public GIS was read live',()=>{
 assert.equal(DISTRICT_REGISTRY['057905'].zoneKey,'057905');
 assert.equal(DISTRICT_REGISTRY['057905'].address,'polygon');
 assert.equal(DISTRICT_REGISTRY['057905'].currency,'published');
 assert.equal(districtPolygonStatus('057905',{}),null);
 assert.equal(districtZoneDisplay('057905',{}),'historical');
 assert.equal(districtPolygonStatus('057905',{'057905':true}),'publisher-provisional');
 assert.equal(districtZoneDisplay('057905',{'057905':true}),'published');
});
test('address point-in-polygon candidate stays provisional, with orange/source-verification warning',()=>{
 const a=resolveAssignment({polygons:[{district:'057905',status:'publisher-provisional',features:[f]}]});
 assert.equal(a.status,'publisher-provisional');assert.equal(a.district,'057905');
 const p=plan(a,'published');assert.equal(p.kind,'publisher-unconfirmed');
 assert.equal(p.features.length,1);
 assert.match(p.message,/최종 배정/);
 const ui=classify({matchStatus:'matched',sourceReady:true,
  schoolType:'elementary',displayMode:'published'});
 assert.equal(ui.kind,'provisional');
 assert.match(ui.explanation,/미완료/);
});
test('app cannot highlight the previous-year source as a verified 2026-27 school assignment',()=>{
 const a=resolveAssignment({polygons:[],ready:true});
 assert.equal(a.status,'unavailable');
 assert.equal(plan(a,'historical').features.length,0);
});
