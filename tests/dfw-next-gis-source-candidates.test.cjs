'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/dfw-next-gis-source-candidates-20261121.json'),'utf8'));
const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/dfw-school-coverage-matrix-2026.json'),'utf8'));
test('four new GIS candidates are evidence only, distinct and present in 108-ISD census',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.reviewedOn,'2026-11-21');
 assert.equal(manifest.schoolAssignmentCertified,false);
 assert.equal(manifest.publicGeometryHosted,false);
 assert.equal(manifest.geometryRedistributionApproved,false);
 assert.deepEqual(manifest.districts.map(x=>x.code),['057914','043914','199901','057916']);
 assert.equal(new Set(manifest.districts.map(x=>x.code)).size,4);
 assert.equal(manifest.districts.reduce((n,x)=>n+x.inventoryCampuses,0),147);
 for(const x of manifest.districts){
  const d=matrix.districts.find(d=>d.code===x.code);
  assert.ok(d,d?.name||x.code);
  assert.equal(d.category,'public-isd');
  assert.equal(d.teaCampusRecords,x.inventoryCampuses);
  assert.equal(d.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(d.parentGuidance.status,'registered-official-source');
  assert.equal(x.installedSchoolPolygons,0);
  assert.equal(x.liveSchoolAssignmentCertified,false);
  assert.equal(x.sourceReuseRightsVerified,false);
  assert.equal(x.officialParent.startsWith('https://'),true);
 }
});
test('Mesquite polygon schema is a candidate only, not current school assignment',()=>{
 const m=manifest.districts[0];
 assert.equal(m.sourceKind,'municipal-attendance-polygon');
 assert.equal(m.publisher,'City of Mesquite');
 assert.equal(m.publisherGIS,'https://gisservice.cityofmesquite.com/arcgis/rest/services/onlinemaps/neighborhood_vitality/MapServer/6');
 assert.deepEqual(m.schoolAttributes,['ES_ZONE','MS_Zone','HS_Zone']);
 assert.equal(m.sourceGeometry,'esriGeometryPolygon');
 assert.equal(m.sourceSchoolYear,null);
 assert.equal(m.sourceLastEdited,null);
});
test('published boundary PDFs are not silently promoted to live vectors',()=>{
 for(const x of manifest.districts.slice(1)){
  assert.equal(x.publisherGIS,null);
  assert.equal(typeof x.sourceDocument,'string');
  assert.equal(x.sourceReuseRightsVerified,false);
  assert.equal(x.installedSchoolPolygons,0);
 }
 assert.equal(manifest.districts[1].sourceSchoolYear,'2026-27');
 assert.equal(manifest.districts[2].sourceSchoolYear,'2026-27');
 assert.equal(manifest.districts[3].sourceSchoolYear,null);
 const schoolRelease=fs.readFileSync(path.join(__dirname,'../features/conditional-school-release.js'),'utf8');
 assert.match(schoolRelease,/APPROVED_AUTO_DISTRICTS\s*=\s*Object\.freeze\(\{\}\)/);
});
