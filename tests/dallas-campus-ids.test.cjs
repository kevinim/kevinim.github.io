'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeName,compareCampusIdentities}=require('../scripts/audit-dallas-campus-ids.cjs');
const f=(id,school,level)=>({type:'Feature',properties:{campusId:id,school,gradeLevel:level}});
test('public school identity aliases normalize without guessing assignment',()=>{
 assert.equal(normalizeName('BEN MILAM EL'),normalizeName('Ben Milam Elementary'));
 assert.equal(normalizeName('BRYAN ADAMS H S'),normalizeName('Bryan Adams High School'));
});
test('TEA IDs, missing IDs, name disagreements and grade counts are individually audited',()=>{
 const zones=[f('057905184','Ben Milam','elementary'),f('057905058','A New Name','middle'),f('057905999','Unknown','high')];
 const ratings=[{id:'057905184',officialName:'BEN MILAM EL'}, {id:'057905058',officialName:'OLD NAME MIDDLE'}];
 const out=compareCampusIdentities(zones,ratings);
 assert.deepEqual(out.totals,{polygons:3,mappedById:2,unmatchedId:1,nameDisagreements:1});
 assert.equal(out.byLevel.elementary.mappedById,1);
 assert.equal(out.byLevel.middle.nameDisagreements,1);
 assert.equal(out.byLevel.high.unmatchedId,1);
 assert.deepEqual(out.unmatchedIds.map(x=>x.campusId),['057905999']);
 assert.equal(out.schoolYearOfGISConfirmed,false);
 assert.equal(out.officialAddressFinderIndependentlyVerified,false);
 assert.equal(out.readyForProduction,false);
});
test('invalid or duplicate campus identities cannot silently certify',()=>{
 assert.throws(()=>compareCampusIdentities([f('05790501','X','elementary')],[]),/invalid level/);
 assert.throws(()=>compareCampusIdentities([f('057905100','X','freshman')],[]),/invalid level/);
 const out=compareCampusIdentities([f('057905184','A','elementary'),f('057905184','A','middle')],[{id:'057905184',name:'A'}]);
 assert.equal(out.duplicates.length,1);
 assert.equal(out.readyForProduction,false);
});
