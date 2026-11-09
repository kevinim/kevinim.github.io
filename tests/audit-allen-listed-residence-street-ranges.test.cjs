'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {review,SAMPLES}=require('../scripts/audit-allen-listed-residence-street-ranges.cjs');
const {matchAllenAddress}=require('../allen-lookup.js');
const allen=require('../allen-address-schools.json');
test('all six public listed single-family Allen home numbers have one official table row',()=>{
 const r=review();
 assert.equal(r.sampleCount,6);
 assert.equal(r.matchedRangeRecords,6);
 assert.ok(r.records.every(x=>Object.values(x.schoolCandidates).every(Boolean)));
});
test('source table has unknown year and historic GIS is not a current assignment',()=>{
 const r=review();
 assert.equal(r.sourceYearKnown,false);
 assert.equal(r.individualEnrollmentVerified,false);
 assert.equal(r.currentCampusGisVerified,false);
 assert.equal(r.releaseDecision,'NO_GO');
 assert.ok(r.records.every(x=>x.validationStatus==='SOURCE_TABLE_RANGE_MATCH_YEAR_UNVERIFIED'));
});
test('do not imply cross-city or neighboring street number is verified',()=>{
 assert.equal(matchAllenAddress('1808 Port Isabel Dr, Plano, TX 75024',allen.rows,false),null);
 assert.equal(matchAllenAddress('9 Port Isabel Dr, Allen, TX 75013',allen.rows,true),null);
});
test('specific real listing school combinations come solely from official cached rows',()=>{
 const r=review();
 const a=r.records.find(x=>x.id==='allen-port-isabel');
 const b=r.records.find(x=>x.id==='allen-silver-trace');
 assert.deepEqual(a.schoolCandidates,{elementary:'Evans',middle:'Ereckson',freshman:'Lowery',high:'Allen High School'});
 assert.deepEqual(b.schoolCandidates,{elementary:'Preston',middle:'Curtis',freshman:'Lowery',high:'Allen High School'});
});
test('duplicate public address fixture is rejected',()=>{
 assert.throws(()=>review([SAMPLES[0],SAMPLES[0]]),/duplicate_public_address/);
});
