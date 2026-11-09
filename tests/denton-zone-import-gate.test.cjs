'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validate}=require('../scripts/validate-denton-2026-zone-import.cjs');
const ids=[{id:'061901127',level:'elementary'},{id:'061901047',level:'middle'}];
const meta={district:'061901',schoolYear:'2026-27',crs:'EPSG:4326',sourceUrl:'https://www.dentonisd.org/families/attendance-zones',districtConfirmationUrl:'https://www.dentonisd.org/families/attendance-zones',releaseApproved:false,residentialAssignmentCertified:false};
function feature(r){return {type:'Feature',properties:{campusId:r.id,district:'061901',schoolYear:'2026-27',level:r.level},geometry:{type:'Polygon',coordinates:[[[-97.13,33.20],[-97.12,33.20],[-97.12,33.21],[-97.13,33.20]]]}};}
const sample=()=>({type:'FeatureCollection',features:ids.map(feature)});
test('synthetic staging geometry can pass but never grant enrollment or release certification',()=>{
 const a=validate(sample(),meta,ids);
 assert.equal(a.status,'STAGING_GEOMETRY_PASS_NOT_ASSIGNMENT_CERTIFIED');
 assert.equal(a.productionStatus,'NO_GO');
 assert.equal(a.currentYearEnrollmentCertified,false);
 assert.equal(a.residenceFinderHoldoutsVerified,false);
 assert.deepEqual(a.errors,[]);
});
test('missing or duplicate campus ID fails closed',()=>{
 const missing=sample();missing.features.pop();assert.equal(validate(missing,meta,ids).status,'NO_GO');
 const duplicate=sample();duplicate.features[1].properties.campusId=ids[0].id;
 assert.match(validate(duplicate,meta,ids).errors.join(' '),/duplicate|missing/);
});
test('wrong year or wrong grade quarantined',()=>{
 const y=sample();y.features[0].properties.schoolYear='2025-26';assert.equal(validate(y,meta,ids).status,'NO_GO');
 const g=sample();g.features[1].properties.level='elementary';assert.equal(validate(g,meta,ids).status,'NO_GO');
});
test('old district-wide polygon or faraway generic ArcGIS layer cannot enter Denton corpus',()=>{
 const x=sample();x.features[0].geometry.coordinates[0][0]=[-110,40];assert.equal(validate(x,meta,ids).status,'NO_GO');
 const y=sample();y.features[0].geometry.type='Point';assert.equal(validate(y,meta,ids).status,'NO_GO');
});
test('broken, nonclosed and degenerate rings fail closed',()=>{
 for(const r of [[[[-97.13,33.2],[-97.12,33.2],[-97.12,33.21],[-97.13,33.21]]],[[[-97.13,33.2],[-97.13,33.2],[-97.13,33.2],[-97.13,33.2]]]]){
  const x=sample();x.features[0].geometry.coordinates=r;assert.equal(validate(x,meta,ids).status,'NO_GO');
 }
});
test('missing official source confirmation or mismatched CRS blocked',()=>{
 assert.equal(validate(sample(),{...meta,districtConfirmationUrl:'https://example.org/'},ids).status,'NO_GO');
 assert.equal(validate(sample(),{...meta,crs:'EPSG:3857'},ids).status,'NO_GO');
});
test('forged production or address certification assertions cannot pass staging',()=>{
 assert.equal(validate(sample(),{...meta,releaseApproved:true},ids).status,'NO_GO');
 assert.equal(validate(sample(),{...meta,residentialAssignmentCertified:true},ids).status,'NO_GO');
});
test('bow-tie and collinear zero-area rings fail closed',()=>{
 const bow=sample();bow.features[0].geometry.coordinates=[[[-97.13,33.20],[-97.12,33.21],[-97.13,33.21],[-97.12,33.20],[-97.13,33.20]]];
 assert.equal(validate(bow,meta,ids).status,'NO_GO');
 const collinear=sample();collinear.features[0].geometry.coordinates=[[[-97.13,33.20],[-97.12,33.20],[-97.11,33.20],[-97.13,33.20]]];
 assert.equal(validate(collinear,meta,ids).status,'NO_GO');
});
