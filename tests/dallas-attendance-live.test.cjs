'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SOURCES,sourceUrl,buildQuery,shapeValid,normalizeFeature}=require('../dallas-attendance-live.js');
const polygon={type:'Feature',properties:{SLN:184,ELEM_DESC:'Ben Milam',MID_SLN:58,MIDDLE:'Spence',HIGH_SLN:24,HIGH:'North Dallas'},
 geometry:{type:'Polygon',coordinates:[[[-96.8,32.75],[-96.79,32.75],[-96.79,32.76],[-96.8,32.75]]]}};
test('publisher source scope is restricted to three exact Dallas ISD map layers',()=>{
 assert.equal(SOURCES.length,3);
 for(const s of SOURCES){
  assert.match(sourceUrl(s),/^https:\/\/services\.arcgis\.com\/RfrtTbYxQ8YIhjWT\/ArcGIS\/rest\/services\/(Elementary|Middle|High)_Attendance_Boundaries\/FeatureServer\/0$/);
  const u=new URL(buildQuery(s));assert.equal(u.searchParams.get('f'),'geojson');
  assert.equal(u.searchParams.get('returnGeometry'),'true');
  assert.equal(u.searchParams.get('outSR'),'4326');
  assert.equal(u.searchParams.get('where'),'1=1');
  assert.ok(!u.searchParams.has('address')&&!u.searchParams.has('location'));
 }
});
test('actual public district campus code can be joined to TEA school marker, never household',()=>{
 assert.equal(shapeValid(polygon),true);
 for(const s of SOURCES){
  const p=normalizeFeature(polygon,s);
  assert.equal(p.properties.sourceDistrict,'057905');
  assert.equal(p.properties.gradeLevel,s.level);
  assert.ok(/^057905\d{3}$/.test(p.properties.campusId));
  assert.match(p.properties.sourceVintage,/unverified/);
 }
 assert.equal(normalizeFeature(polygon,SOURCES[0]).properties.campusId,'057905184');
});
test('any invalid polygon or corrupt grade/campus fields fail closed',()=>{
 const bad={...polygon,geometry:{type:'Polygon',coordinates:[[[0,0],[0,1],[1,1],[0,0]]]}};
 assert.equal(shapeValid(bad),false);
 assert.throws(()=>normalizeFeature(bad,SOURCES[0]),/invalid_dallas_polygon/);
 const invalid={...polygon,properties:{ELEM_DESC:'No campus ID',SLN:null}};
 assert.throws(()=>normalizeFeature(invalid,SOURCES[0]),/invalid_dallas_campus_name_or_code/);
});
