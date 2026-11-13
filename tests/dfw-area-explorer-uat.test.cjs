'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../features/dfw-area-explorer-uat-core.js');
const rows=[
  {z:'75093',name:'West Plano',ll:[33.018,-96.812]},
  {z:'75024',name:'NW Plano',ll:[33.080,-96.821]},
  {z:'75034',name:'West Frisco',ll:[33.115,-96.860]},
  {z:'75013',name:'West Allen',ll:[33.105,-96.685]},
  {z:'bad',name:'Bogus',ll:[33.0,-96.0]},
  {z:'75088',name:'Bad location',ll:[null,undefined]}
];
const bbox={south:32.95,north:33.15,west:-96.95,east:-96.7};
test('zoomed-out viewport groups city names, with ZIP secondary',()=>{
  const x=core.candidates(rows,{}, {zoom:10,bounds:bbox,center:[33.07,-96.82],selectedZip:'75093'});
  assert.deepEqual(x.map(r=>r.city),['Plano','Frisco']);
  assert.equal(x[0].kind,'city');
  assert.equal(x[0].count,2);
  assert.equal(x[0].selected,true);
  assert.deepEqual(x[0].zips,['75093','75024']);
});
test('zoomed-in area listing preserves known ZIP data and only visible centroids',()=>{
  const x=core.candidates(rows,{}, {zoom:12,bounds:bbox,center:[33.07,-96.82],selectedZip:'75024'});
  assert.equal(x[0].zip,'75024');
  assert.equal(x[0].selected,true);
  assert.ok(x.every(r=>r.kind==='zip'&&r.zip.length===5));
  assert.ok(x.every(r=>r.zip!=='75013'));
});
test('search is independent of viewport, handles ZIP and locality names',()=>{
  const a=core.candidates(rows,{}, {query:'west plano',zoom:10,bounds:{south:0,north:1,west:0,east:1}});
  assert.deepEqual(a.map(r=>r.zip),['75093']);
  const b=core.candidates(rows,{}, {query:'75013',zoom:10,bounds:bbox});
  assert.deepEqual(b.map(r=>r.zip),['75013']);
  const c=core.candidates(rows,{}, {query:'PlAnO',zoom:11,bounds:bbox});
  assert.deepEqual(c.map(r=>r.zip),['75024','75093']);
});
test('actual polygon hit testing supports Polygon, holes and MultiPolygon',()=>{
  const ring=[[-97,33],[-96,33],[-96,34],[-97,34],[-97,33]];
  const hole=[[-96.8,33.2],[-96.6,33.2],[-96.6,33.4],[-96.8,33.4],[-96.8,33.2]];
  assert.equal(core.containsGeoJSON({type:'Polygon',coordinates:[ring]},33.5,-96.5),true);
  assert.equal(core.containsGeoJSON({type:'Polygon',coordinates:[ring,hole]},33.3,-96.7),false);
  assert.equal(core.containsGeoJSON({type:'Polygon',coordinates:[ring]},34.5,-96.5),false);
  assert.equal(core.containsGeoJSON({type:'MultiPolygon',coordinates:[[ring]]},33.5,-96.5),true);
  assert.equal(core.containsGeoJSON({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]}}]},33.5,-96.5),true);
  assert.equal(core.containsGeoJSON({type:'Point',coordinates:[-96.5,33.5]},33.5,-96.5),false);
});
test('UAT integration is isolated and does not pretend ZIP means school assignment',()=>{
  const base=fs.readFileSync('index.html','utf8');
  const preview=fs.readFileSync('rent-map-uat.html','utf8');
  const script=fs.readFileSync('features/dfw-area-explorer-uat.js','utf8');
  assert.ok(!base.includes('dfw-area-explorer-uat'));
  assert.match(preview,/dfw-area-explorer-uat-core\.js/);
  assert.match(preview,/dfw-area-explorer-uat\.css/);
  assert.match(script,/dispatchEvent\(new Event\('change'/);
  assert.match(script,/core\.containsGeoJSON/);
  assert.ok(!/localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest/.test(script));
  assert.match(script,/학교 위치는 배정학교가 아닙니다/);
});
