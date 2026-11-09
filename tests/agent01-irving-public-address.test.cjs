'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CASES,pointInRing,pointInEsriPolygon,toMercator}=require('../scripts/agent01-irving-public-address-qa.cjs');
test('five public facility holdouts cover three campuses + two civic offices with zero households',()=>{
 assert.equal(CASES.length,5);
 assert.deepEqual(CASES.map(c=>c.id),['campus-barton','campus-brown','campus-farine','civic-city-hall','civic-isd-admin']);
 assert.deepEqual(CASES.map(c=>c.kind),['school-campus','school-campus','school-campus','public-civic-facility','public-civic-facility']);
 for(const c of CASES){
  assert.match(c.address,/Irving, TX 7506[012]/);
  assert.match(c.elementary,/ ES$/);
  assert.match(c.middle,/ MS$/);
  assert.match(c.high,/ HS$/);
  assert.ok(!/apartment|unit|apt|#\d/i.test(c.address));
 }
});
test('point-in-polygon honors holes and rejects out-of-region coordinates',()=>{
 const outer=[[0,0],[10,0],[10,10],[0,10],[0,0]],hole=[[2,2],[2,4],[4,4],[4,2],[2,2]];
 assert.equal(pointInRing([1,1],outer),true);
 assert.equal(pointInRing([20,20],outer),false);
 assert.equal(pointInEsriPolygon([1,1],{rings:[outer,hole]}),true);
 assert.equal(pointInEsriPolygon([3,3],{rings:[outer,hole]}),false);
 assert.equal(pointInEsriPolygon([20,20],{rings:[outer,hole]}),false);
 assert.throws(()=>toMercator([0,0]),/out of range/);
 const [x,y]=toMercator([-96.98,32.82]);assert.ok(x<-10780000&&x>-10820000&&y>3800000&&y<4000000);
});
