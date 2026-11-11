'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {inspect}=require('../scripts/check-cfb-official-gis-acquisition.cjs');
const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/cfb-official-gis-acquisition-2026-11-10.json'),'utf8'));
const clone=()=>structuredClone(manifest);
test('CFB source inventory is reference-only, never certified school geometry',()=>{
 const status=inspect(manifest);
 assert.equal(status.verdict,'REFERENCE_SOURCES_ONLY');
 assert.deepEqual(status.errors,[]);
 assert.equal(status.certifiedCampusAttendancePolygons,0);
 assert.equal(status.automaticResidenceAssignmentAllowed,false);
 assert.equal(status.rasterSources,6);
 assert.equal(manifest.existingParallelWork.doNotModifyPr208Files,true);
});
test('exact three full-grade approved images plus three additional local reference illustrations',()=>{
 assert.deepEqual(manifest.rasterAssets.filter(x=>x.scope==='districtwide-attendance-raster').map(x=>x.level),
  ['elementary','middle','high']);
 assert.deepEqual(manifest.rasterAssets.filter(x=>x.scope==='partial-reassignment-raster').map(x=>x.id),
  ['furneaux-reassignment-2025','mccoy-reassignment-2025','long-reassignment-2025']);
 assert.ok(manifest.rasterAssets.every(x=>x.schoolYear==='2025-26'&&x.campusTEAIds===null));
});
test('official Texas Legislative Council jurisdiction GIS is NOT student attendance polygon',()=>{
 const tlc=manifest.gisCandidates.find(x=>x.id==='tlc-2526-isd-outline');
 assert.equal(tlc.geometryType,'esriGeometryPolygon');
 assert.equal(tlc.schoolAttendancePolygon,false);
 assert.equal(tlc.schoolTEAId,'057903');
 assert.equal(tlc.license,'Creative Commons Attribution');
 assert.match(tlc.reuse,/jurisdiction only/);
});
test('CFBISD-labelled historic ArcGIS school points are not campus attendance boundaries',()=>{
 const nces=manifest.gisCandidates.find(x=>x.id==='nces-2021-22-cfb-school-points');
 assert.equal(nces.geometryType,'esriGeometryPoint');
 assert.equal(nces.schoolAttendancePolygon,false);
 assert.equal(nces.schoolYear,'2021-22');
});
test('district website disagreement is explicit and blocks default neighborhood-to-school inference',()=>{
 assert.deepEqual(manifest.sourceConflicts.map(x=>x.status),
  ['UNRESOLVED_OFFICIAL_PAGE_CONFLICT','UNRESOLVED_NAME_MISMATCH']);
 assert.match(manifest.sourceConflicts[0].source1,/2025-2026-rezoning/);
 assert.match(manifest.sourceConflicts[0].source2,/proposed-plan-for-mccoy-elementary/);
});
test('false school-zone promotion, fabricated reuse rights or GIS category changes fail closed',()=>{
 const a=clone();a.automaticResidenceAssignmentAllowed=true;
 assert.equal(inspect(a).verdict,'INVALID');
 const b=clone();b.rasterAssets[0].schoolLevelVector=true;
 assert.equal(inspect(b).verdict,'INVALID');
 const c=clone();c.gisCandidates[0].schoolAttendancePolygon=true;
 assert.equal(inspect(c).verdict,'INVALID');
 const d=clone();d.rasterAssets[0].license='CC BY';
 assert.equal(inspect(d).verdict,'INVALID');
 const e=clone();e.rasterAssets[1].assetUrl='http://example.com/map.png';
 assert.equal(inspect(e).verdict,'INVALID');
});
