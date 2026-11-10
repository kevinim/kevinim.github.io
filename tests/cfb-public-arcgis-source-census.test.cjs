'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../scripts/probe-cfb-arcgis-attendance-sources.cjs');
test('CFB public 2021 NCES point GIS cannot be treated as an attendance zone polygon',()=>{
 const x=m.sourceClassification('https://services3.arcgis.com/CFBISD_SchoolPoints/FeatureServer/3',{
  name:'Carrolltonfarmer_SchoolPoints',geometryType:'esriGeometryPoint',
  description:'NCES CCD 2021-2022 physical locations of public schools',
  fields:[{name:'NAME'}]});
 assert.equal(x.classification,'SCHOOL_POINT_NOT_ZONE');
});
test('unrelated or unverified polygons never equal official 2026–27 CFB school assignment',()=>{
 const other=m.sourceClassification('https://services8.arcgis.com/SomeOtherOrg/FeatureServer/2',{
  name:'Attendance Zones',geometryType:'esriGeometryPolygon',
  fields:[{name:'name'}]});
 assert.equal(other.classification,'POLYGON_OTHER_DISTRICT_OR_UNKNOWN_OWNER');
 const candidate=m.sourceClassification('https://services.arcgis.com/cfbisd/FeatureServer/0',{
  name:'CFBISD elementary attendance zones',geometryType:'esriGeometryPolygon',fields:[{name:'SchoolName'}]});
 assert.match(candidate.classification,/REQUIRES_OFFICIAL_YEAR_AND_PUBLISHER_CONFIRMATION/);
 const item=m.itemClassification({id:'123',title:'CFBISD 2026-27 attendance boundary',type:'Feature Service',owner:'unknown'});
 assert.equal(item.verifiedCurrentOfficialDistrictGIS,false);
});
test('source discovery accepts partial provider failures and never downloads school polygon features',async()=>{
 const fake=async url=>{
  const u=new URL(url);
  if(u.hostname==='www.arcgis.com')throw Error('ArcGIS search temporarily blocked');
  return {ok:true,json:async()=>({name:'Carrolltonfarmer_SchoolPoints',
   geometryType:'esriGeometryPoint',fields:[{name:'NAME'}]})};
 };
 const r=await m.run(fake);
 assert.equal(r.currentYearOfficialPerSchoolGISVerified,0);
 assert.equal(r.attendancePolygonsDownloaded,0);
 assert.equal(r.schoolAssignmentsApproved,0);
 assert.equal(r.inspectedKnownEndpoints,3);
 assert.equal(r.errors.length,3);
 assert.ok(m.KNOWN.every(z=>!z.url.includes('/query')));
 assert.ok(m.QUERIES.length>=3);
});
