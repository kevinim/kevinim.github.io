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
