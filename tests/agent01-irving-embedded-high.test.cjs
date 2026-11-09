'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EXPECTED,WEBMAP,webMercatorPoint,toWGS84Polygon,extractEmbeddedHigh}=require('../scripts/agent01-irving-embedded-high.cjs');
const R=6378137,toMerc=([lon,lat])=>[lon*Math.PI/180*R,Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*R];
const coords=[[-96.99,32.81],[-96.96,32.81],[-96.96,32.83],[-96.99,32.83],[-96.99,32.81]].map(toMerc);
const create=(name)=>({attributes:{HIGH_DESC:name},geometry:{rings:[coords]}});
const item={id:WEBMAP,type:'Web Map',owner:'rzamora_IISD1',modified:1598649924000};
const map=()=>({operationalLayers:[{title:'High Schools',featureCollection:{layers:[{
 layerDefinition:{geometryType:'esriGeometryPolygon',extent:{spatialReference:{wkid:102100}}},
 featureSet:{features:EXPECTED.map(create)}
}]}}]});
test('WebMercator geometry strictly transforms to closed WGS84 Irving polygon',()=>{
 const p=webMercatorPoint(toMerc([-96.98,32.81]));
 assert(Math.abs(p[0]+96.98)<1e-8);assert(Math.abs(p[1]-32.81)<1e-8);
 const g=toWGS84Polygon({rings:[coords]});assert.equal(g.type,'Polygon');
 assert.deepEqual(g.coordinates[0][0],g.coordinates[0].at(-1));
 assert.throws(()=>toWGS84Polygon({rings:[coords,coords]}),/multi-ring/);
 assert.throws(()=>toWGS84Polygon({rings:[coords.slice(0,-1)]}),/unclosed/);
 assert.throws(()=>webMercatorPoint([0,0]),/outside Irving/);
});
test('exact embedded school identity, polygon counts and year quarantining',()=>{
 const {features,audit}=extractEmbeddedHigh(map(),item);
 assert.equal(features.length,3);assert.deepEqual(features.map(f=>f.properties.school),EXPECTED);
 assert.equal(audit.polygonCount,3);assert.equal(audit.originalCrs,'EPSG:3857');
 assert.equal(audit.webMapLastModifiedUTC,'2020-08-28T21:25:24.000Z');
 assert.equal(audit.release,'NO_GO');
 for(const f of features){
  assert.equal(f.properties.schoolYear,null);assert.equal(f.properties.campusId,null);
  assert.equal(f.properties.sourceYearVerified,false);assert.equal(f.properties.independentFinderVerified,false);
  assert.equal(f.properties.status,'QUARANTINED_HISTORICAL_UNVERIFIED');
 }
});
test('reject non-school or duplicate map polygons rather than reporting 2026-27 coverage',()=>{
 assert.throws(()=>extractEmbeddedHigh(map(),{...item,id:'wrong'}),/untrusted/);
 const z=map();z.operationalLayers[0].featureCollection.layers[0].featureSet.features[1].attributes.HIGH_DESC='Irving HS';
 assert.throws(()=>extractEmbeddedHigh(z,item),/duplicate/);
 const m=map();m.operationalLayers[0].featureCollection.layers[0].layerDefinition.geometryType='esriGeometryPoint';
 assert.throws(()=>extractEmbeddedHigh(m,item),/CRS or geometry/);
 const t=map();t.operationalLayers[0].title='High Schools (points)';
 assert.throws(()=>extractEmbeddedHigh(t,item),/missing or ambiguous/);
});
