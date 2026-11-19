'use strict';
// City-authored 2020 school polygon references: external LINK ONLY.
// These are not 2025–26 approved CFB zoning or 2026–27 home assignments.
const test=require('node:test'),assert=require('node:assert/strict');
const manifest=require('../data/cfb-historical-city-gis-links-2020.json');
const {validateHistoricCityGIS}=require('../features/cfb-approved-zone-atlas-renderer.js');
const copy=()=>structuredClone(manifest);
test('3 exact City of Carrollton polygon services are link-only historic references',()=>{
 const rows=validateHistoricCityGIS(copy());
 assert.ok(rows);
 assert.deepEqual(rows.map(x=>x.level),['elementary','middle','high']);
 assert.deepEqual(rows.map(x=>x.cfbFeatureCountIn2020Snapshot),[20,6,4]);
 assert.deepEqual(rows.map(x=>x.cfb2025DistrictAreaCoveredPercent),[74.09,98.62,99.53]);
 assert.ok(rows.every(x=>x.uri.startsWith('https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/')));
 assert.ok(rows.every(x=>x.current===false));
 assert.equal(manifest.academicYearVerified,null,'data-last-edit is not an academic year');
 assert.equal(manifest.redistributionRightsVerified,false);
 assert.equal(manifest.geometryRehosted,false);
 assert.equal(manifest.autoAddressSchoolAssignmentAllowed,false);
 assert.equal(manifest.linkedOnly,true);
 assert.deepEqual(manifest.closedAfterHistoricalBaseline,
  ['Central Elementary','Furneaux Elementary','McCoy Elementary','Long Middle School']);
});
test('historic school source is not silently promoted to newer year, licensed geometry, or an assignment',()=>{
 const mutations=[
  m=>{m.academicYearVerified='2026-27';},
  m=>{m.sourceDataLastEditedYear=2026;},
  m=>{m.redistributionRightsVerified=true;},
  m=>{m.autoAddressSchoolAssignmentAllowed=true;},
  m=>{m.currentAcademicYearClaimAllowed=true;},
  m=>{m.geometryRehosted=true;},
  m=>{m.linkedOnly=false;},
  m=>{m.historicDistrictName='Frisco ISD';},
  m=>{m.teaDistrictId='057905';},
  m=>{m.layers[0].current=true;},
  m=>{m.layers[0].lastDataEditUtc='2026-11-18T00:00:00Z';},
  m=>{m.layers[0].cfbFeatureCountIn2020Snapshot=200;},
  m=>{m.layers[0].cfb2025DistrictAreaCoveredPercent=100;},
  m=>{m.layers.push({...m.layers[1]});},
  m=>{m.closedAfterHistoricalBaseline=[];}
 ];
 for(const change of mutations){
  const m=copy();change(m);
  assert.equal(validateHistoricCityGIS(m),null);
 }
});
test('host spoof, lookalike GIS and query-injected links are rejected',()=>{
 const urls=[
 'https://services7.arcgis.com.evil.invalid/o731hPfw3YndegMz/arcgis/rest/services/ElementarySchoolZones/FeatureServer/0',
 'http://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/ElementarySchoolZones/FeatureServer/0',
 'https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/ElementarySchoolZones/FeatureServer/0?f=geojson',
 'https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/SchoolLocations/FeatureServer/0',
 'https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/MiddleSchoolZones/FeatureServer/0'
 ];
 for(const url of urls){
  const m=copy();m.layers[0].uri=url;
  assert.equal(validateHistoricCityGIS(m),null,url);
 }
});
test('historical GIS is only a passive resource linked by CFB official atlas',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync('features/cfb-approved-zone-atlas-renderer.js','utf8');
 assert.match(source,/cfbAtlasHistoricalGISLinks/);
 assert.match(source,/2020년 최종 수정/);
 assert.match(source,/validateHistoricCityGIS/);
 assert.match(source,/noopener noreferrer/);
 assert.doesNotMatch(source,/L\\.geoJSON|L\\.imageOverlay|fetch\\(layer\\.uri|APPROVED_AUTO_DISTRICTS|localStorage|sessionStorage|\\.innerHTML\\s*=/);
});
