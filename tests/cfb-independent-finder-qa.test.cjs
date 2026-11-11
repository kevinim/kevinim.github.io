'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const qa = require('../scripts/cfb-independent-finder-qa.cjs');

const SQUARE = [[0,0],[0.01,0],[0.01,0.01],[0,0.01],[0,0]];
const HOLE = [[0.004,0.004],[0.006,0.004],[0.006,0.006],[0.004,0.006],[0.004,0.004]];
const assigned = {elementary:'Thompson Elementary',middle:'Blalack Middle School',high:'Creekview High School'};
function fixture(overrides={}) {
  return {
    id: 'SYN-test1', assetType:'synthetic', point:[0.003,0.003],
    candidate:{selected:true, exactMatch:true},
    evidence:{operatorConfirmed:true,date:'2026-11-10'},
    finder:{view:'assigned-school',schoolYear:'2026-27',assigned},
    ...overrides
  };
}
function feature(grade, name, props={}, geometry={type:'Polygon',coordinates:[SQUARE]}) {
  return {type:'Feature',properties:{
    gradeLevel:grade, schoolYear:'2026-27', provisionalSchoolName:name,
    currentYearCertified:true, releaseEligible:true, isOfficialCampusBoundary:true,
    residenceAssignmentApproved:true, ...props
  },geometry};
}
function geo(features=[]) {return {type:'FeatureCollection',features};}
const E = () => feature('elementary',assigned.elementary);
const M = () => feature('middle',assigned.middle);
const H = () => feature('high',assigned.high);

test('empty evidence is exactly zero PASS/FAIL, per-grade fields remain explicit',()=>{
  const r=qa.compare([],geo());
  assert.deepEqual(r.totals,{pass:0,fail:0,warning:0,finderObservedGradeResults:0,geometryComparedGradeResults:0});
  for(const g of qa.GRADES){
    assert.equal(r.gradeSummary[g].finderObserved,0);
    assert.equal(r.gradeSummary[g].certifiedAccuracy,null);
  }
  assert.equal(r.schoolAssignmentApproved,false);
});
test('native candidate must be explicitly selected; a school directory is never proof',()=>{
  const r=qa.compare([
    fixture({id:'SYN-foo',candidate:{selected:false,exactMatch:false}}),
    fixture({id:'SYN-bar',finder:{view:'generic-catalog',schoolYear:'2026-27',assigned}})
  ],geo([E(),M(),H()]));
  assert.equal(r.totals.pass,0);
  assert.equal(r.totals.finderObservedGradeResults,0);
  assert.equal(r.totals.warning,6);
  assert.equal(r.results[0].reason,'NO_EXACT_NATIVE_AUTOCOMPLETE_SELECTION');
  assert.equal(r.results[3].reason,'GENERIC_MATCHING_RESULTS_NOT_ASSIGNMENT');
});
test('E, M, H each observe assigned school independently',()=>{
  const r=qa.compare([fixture()],geo([E(),M(),H()]));
  for(const g of qa.GRADES){
    assert.equal(r.gradeSummary[g].finderObserved,1);
    assert.equal(r.gradeSummary[g].polygonCompared,1);
    assert.equal(r.gradeSummary[g].pass,1);
    assert.equal(r.gradeSummary[g].certifiedAccuracy,1);
  }
  assert.equal(r.totals.pass,3);
  assert.equal(r.schoolAssignmentApproved,false);
});
test('failing only one grade does not halt other checks',()=>{
  const r=qa.compare([fixture()],geo([E(),M(),feature('high','Another High School')]));
  assert.equal(r.totals.pass,2);
  assert.equal(r.totals.fail,1);
  assert.equal(r.results[2].reason,'CERTIFIED_POLYGON_FINDER_MISMATCH');
  assert.equal(r.gradeSummary.high.certifiedAccuracy,0);
});
test('AG03 draft geometry match and mismatch never counted as certified PASS/FAIL',()=>{
  const draft={schoolYear:'2025-26',currentYearCertified:false,
    releaseEligible:false,isOfficialCampusBoundary:false,residenceAssignmentApproved:false,
    geometryStatus:'DRAFT_UNVERIFIED_VISUAL_ONLY'};
  const r=qa.compare([fixture()],geo([
    feature('elementary',assigned.elementary,draft),
    feature('middle','Another Middle School',{...draft,schoolYear:'2026-27'}),
    feature('high',assigned.high,{...draft,schoolYear:'2026-27'})
  ]));
  assert.equal(r.totals.pass,0);
  assert.equal(r.totals.fail,0);
  assert.equal(r.totals.warning,3);
  assert.equal(r.results[0].cause,'SCHOOL_YEAR');
  assert.equal(r.results[1].reason,'DRAFT_UNCERTIFIED_DISAGREEMENT');
  assert.equal(r.results[2].reason,'DRAFT_UNCERTIFIED_AGREEMENT');
  assert.equal(r.gradeSummary.middle.provisionalDisagreement,1);
});
test('all missing grade polygons warn, no invented school assignments',()=>{
  const r=qa.compare([fixture()],geo([]));
  assert.deepEqual(r.results.map(x=>x.reason),['NO_GRADE_POLYGONS','NO_GRADE_POLYGONS','NO_GRADE_POLYGONS']);
  assert.equal(r.totals.finderObservedGradeResults,3);
  assert.equal(r.totals.geometryComparedGradeResults,0);
});
test('point within 250m of any zone edge never receives PASS',()=>{
  const r=qa.compare([fixture({point:[0.0001,0.005]})],geo([E(),M(),H()]));
  assert.equal(r.totals.pass,0);
  assert.equal(r.boundaryAdjacent.length,3);
  assert.ok(r.results.every(x=>x.reason==='WITHIN_BOUNDARY_GUARD'));
});
test('overlapping polygons are reported as geometry ambiguity',()=>{
  const r=qa.compare([fixture()],geo([E(),E(),M(),H()]));
  assert.equal(r.results[0].reason,'OVERLAPPING_POLYGONS');
  assert.equal(r.results[0].polygonCompared,false);
  assert.equal(r.results[1].status,'PASS');
});
test('polygon coverage gaps remain WARNING, continue by grade',()=>{
  const elsewhere={type:'Polygon',coordinates:[SQUARE.map(([x,y])=>[x+2,y+2])]};
  const r=qa.compare([fixture()],geo([feature('elementary',assigned.elementary,{},elsewhere),M(),H()]));
  assert.equal(r.results[0].reason,'POLYGON_COVERAGE_GAP');
  assert.equal(r.totals.pass,2);
});
test('MultiPolygon and holes use WGS84 lon/lat, do not classify a hole as inside',()=>{
  assert.equal(qa.inspectGeometry([0.005,0.005],{type:'Polygon',coordinates:[SQUARE,HOLE]}).inside,false);
  assert.equal(qa.inspectGeometry([0.003,0.003],{type:'Polygon',coordinates:[SQUARE,HOLE]}).inside,true);
  const other=SQUARE.map(([x,y])=>[x+1,y+1]);
  assert.equal(qa.inspectGeometry([1.003,1.003],{type:'MultiPolygon',coordinates:[[SQUARE],[other]]}).inside,true);
});
test('complex base addresses remain unverified even when school polygon matches',()=>{
  const r=qa.compare([fixture({assetType:'public-complex-base'})],geo([E(),M(),H()]));
  assert.equal(r.totals.pass,0);
  assert.ok(r.results.every(x=>x.reason==='COMPLEX_BASE_NOT_UNIT_CONFIRMED'));
});
test('reject privacy-bearing field names, invalid fixture IDs and duplicate cases',()=>{
  assert.throws(()=>qa.compare([fixture({address:'private address'})],geo()),/PRIVATE_FIELD_NOT_ALLOWED/);
  assert.throws(()=>qa.compare([fixture({unit:'4B'})],geo()),/PRIVATE_FIELD_NOT_ALLOWED/);
  assert.throws(()=>qa.compare([fixture({id:'1600 S Some Street'})],geo()),/INVALID_NONIDENTIFYING_FIXTURE_ID/);
  assert.throws(()=>qa.compare([fixture(),fixture()],geo()),/DUPLICATE_FIXTURE_ID/);
});
test('JSON summary omits coordinates and source names; no third-party network operations',()=>{
  const report=qa.compare([fixture()],geo([E(),M(),H()]));
  const serialized=JSON.stringify(report);
  assert.ok(!serialized.includes('point'));
  assert.ok(!serialized.includes('Thompson'));
  assert.ok(!serialized.includes('Creekview'));
  assert.ok(!serialized.includes('2026-11-10'));
  assert.ok(serialized.includes('SYN-test1'));
});
