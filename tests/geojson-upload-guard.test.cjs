'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {LIMITS,assertFileSize,validate}=require('../features/geojson-upload-guard.js');
const R=[[-96.7,33.1],[-96.6,33.1],[-96.6,33.2],[-96.7,33.1]];
const feature=(geometry,name='Test School')=>({type:'Feature',properties:{SchoolName:name,other:'<img src=x onerror=alert(1)>'},geometry});
const polygon=points=>({type:'Polygon',coordinates:[points]});
const collection=(...features)=>({type:'FeatureCollection',features});
const good=()=>collection(feature(polygon(R)));

test('file size must be nonempty and at most 4 MiB',()=>{
 assert.doesNotThrow(()=>assertFileSize(LIMITS.fileBytes));
 for(const size of [0,-1,NaN,Infinity,LIMITS.fileBytes+1,'1234'])
  assert.throws(()=>assertFileSize(size),TypeError);
});

test('valid TX Polygon passes; unneeded properties are stripped',()=>{
 const source=good(),result=validate(source);
 assert.equal(result.stats.features,1);
 assert.equal(result.stats.vertices,4);
 assert.deepEqual(result.geojson.features[0].properties,{school:'Test School'});
 assert.deepEqual(result.geojson.features[0].geometry.coordinates,[R]);
 assert.equal(source.features[0].properties.other,'<img src=x onerror=alert(1)>');
});

test('valid MultiPolygon with multiple polygons and a hole passes',()=>{
 const hole=[[-96.68,33.12],[-96.67,33.12],[-96.67,33.13],[-96.68,33.12]];
 const obj=collection(feature({type:'MultiPolygon',coordinates:[[R,hole],[R]]}));
 const result=validate(obj);
 assert.equal(result.stats.vertices,12);
 assert.equal(result.geojson.features[0].geometry.type,'MultiPolygon');
});

test('reject invalid root, unbounded counts, unknown geometry and names',()=>{
 for(const obj of [null,{},[],{type:'FeatureCollection',features:'bad'},collection(),
  collection(feature({type:'Point',coordinates:[-96.7,33.1]})),
  collection(feature(polygon(R),'')),
  collection(feature(polygon(R),'x'.repeat(200))),
  collection(feature(polygon(R),{some:'object'})),
  collection({type:'Feature',properties:{school:'Any'},geometry:null}),
  collection({type:'Feature',properties:{school:'Any'},geometry:polygon(R),other:'ignored'},null)]){
  assert.throws(()=>validate(obj),TypeError);
 }
 const tooMany=collection(...Array.from({length:LIMITS.features+1},()=>feature(polygon(R))));
 assert.throws(()=>validate(tooMany),TypeError);
});

test('reject coordinate injections, malformed rings, non-finite values, bad nesting',()=>{
 const invalid=[
  [[-96.7,33.1],[-96.6,33.1],[-96.6,33.2]], // unclosed
  [[-96.7,33.1],[-96.6,33.1],[-96.6,33.2],[-96.71,33.1]], // wrong closure
  [[-180,33.1],[-96.6,33.1],[-96.6,33.2],[-180,33.1]],
  [[-96.7,0],[-96.6,33.1],[-96.6,33.2],[-96.7,0]],
  [[-96.7,NaN],[-96.6,33.1],[-96.6,33.2],[-96.7,NaN]],
  [[-96.7,'33.1'],[-96.6,33.1],[-96.6,33.2],[-96.7,'33.1']],
  [[],[-96.6,33.1],[-96.6,33.2],[]],
 ];
 for(const ring of invalid)assert.throws(()=>validate(collection(feature(polygon(ring))),TypeError);
 assert.throws(()=>validate(collection(feature({type:'MultiPolygon',coordinates:[]}))),TypeError);
 assert.throws(()=>validate(collection(feature({type:'Polygon',coordinates:[R,...Array.from({length:LIMITS.ringsPerPolygon},()=>R)]}))),TypeError);
});

test('reject excessive ring complexity, per-feature and total vertex counts',()=>{
 const dense=Array.from({length:LIMITS.ringVertices+1},()=>[-96.7,33.1]);
 assert.throws(()=>validate(collection(feature(polygon(dense)))),TypeError);
 const ring=Array.from({length:2001},(_,i)=>i===2000?[-96.7,33.1]:[-96.7+i*0.00001,33.1]);
 const multi={type:'MultiPolygon',coordinates:Array.from({length:7},()=>[ring])};
 assert.throws(()=>validate(collection(feature(multi))),TypeError);
 const one=feature({type:'MultiPolygon',coordinates:Array.from({length:16},()=>[ring])});
 assert.throws(()=>validate(collection(one,one)),TypeError);
});

test('reject invalid properties rather than passing attacker objects to Leaflet',()=>{
 const obj=good();obj.features[0].properties={school:{toString:'not callable'}};
 assert.throws(()=>validate(obj),TypeError);
 const obj2=good();obj2.features[0].properties={school:'Real\u0000School'};
 assert.throws(()=>validate(obj2),TypeError);
});
