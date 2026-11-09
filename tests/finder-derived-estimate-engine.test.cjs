'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fixture=require('./fixtures/finder-derived-synthetic.json');
const {build}=require('../scripts/finder-derived-estimate-engine.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
test('synthetic demo creates only locally supported candidates with explicit caveat',()=>{
 const got=build(fixture);
 assert.equal(got.type,'FeatureCollection');
 assert.equal(got.metadata.demoOnly,true);
 assert.equal(got.metadata.publicationApproved,false);
 assert.equal(got.metadata.fullCoverageClaim,false);
 assert.equal(got.metadata.status,'CANDIDATE_REVIEW_REQUIRED');
 assert.equal(got.features.length,6);
 assert.deepEqual([...new Set(got.features.map(f=>f.properties.gradeLevel))].sort(),['elementary','high','middle']);
 for(const f of got.features){
  assert.equal(f.properties.publishable,false);
  assert.equal(f.properties.reviewed,false);
  assert.equal(f.properties.displayMode,'finder-derived-unreviewed');
  assert.match(f.properties.disclaimer,/not an official/i);
  assert.equal(f.properties.independentHoldoutCount,3);
  assert.deepEqual(f.geometry.coordinates[0][0],f.geometry.coordinates[0].at(-1));
 }
});
test('no independent holdouts means zero predicted polygons',()=>{
 const x=copy(fixture);x.observations=x.observations.filter(o=>o.role==='training');
 const got=build(x);assert.equal(got.features.length,0);
 assert.ok(got.metadata.diagnostics.missingIndependentHoldout>0);
});
test('mismatched official sample blocks that campus polygon',()=>{
 const x=copy(fixture);
 x.observations.find(o=>o.id==='demo-a-04').assignment.elementary='DEMO_E_B';
 const got=build(x);
 assert.equal(got.features.filter(f=>f.properties.campusId==='DEMO_E_A').length,0);
 assert.ok(got.metadata.diagnostics.assignmentConflict>0);
});
test('independent source reuse permission is mandatory outside demo',()=>{
 const x=copy(fixture);x.demoOnly=false;
 assert.throws(()=>build(x),/permission_not_verified/);
});
test('raw addresses and apartment units cannot enter audit samples',()=>{
 const x=copy(fixture);x.observations[0].address='private address';
 assert.throws(()=>build(x),/raw_household_information/);
});
test('no school year mismatch or grade-level misclassification',()=>{
 const x=copy(fixture);x.observations[0].schoolYear='2025-2026';
 assert.throws(()=>build(x),/sample_year_mismatch/);
 const y=copy(fixture);y.observations[0].assignment.high='DEMO_E_A';
 assert.throws(()=>build(y),/campus_level_assignment_mismatch/);
});
test('generic: code not hardwired to CFB, never claim district completion',()=>{
 const x=copy(fixture);x.districtCode='TEST_ISD';
 const got=build(x);assert.equal(got.metadata.district,'TEST_ISD');
 assert.equal(got.features[0].properties.district,'TEST_ISD');
 assert.equal(got.metadata.fullCoverageClaim,false);
});
test('large unsupported triangles are rejected rather than filled',()=>{
 const got=build(fixture,{maxEdgeMeters:25});
 assert.equal(got.features.length,0);
 assert.ok(got.metadata.diagnostics.tooWide>0);
});
