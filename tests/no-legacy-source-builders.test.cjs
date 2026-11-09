'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const builders=[
  'scripts/build-crime-zip-cities.mjs',
  'scripts/build-mena-ancestry.mjs'
];

test('offline build entrypoints use only the generic public DFW source',()=>{
 for(const file of builders){
  const code=read(file);
  assert.match(code,/dfw-outside-public\.json/,file+' must read neutral data');
  assert.doesNotMatch(code,/jpm-(?:outside-dfw|road-times|60min-isochrone)/i,file+' references removed personal cache');
 }
});
test('public outside-ZIP dataset contains public shapes and no personal travel time',()=>{
 const x=JSON.parse(read('dfw-outside-public.json'));
 assert.ok(Array.isArray(x.data)&&x.data.length>=10);
 assert.ok(Array.isArray(x.shapes?.features)&&x.shapes.features.length===x.data.length);
 assert.deepEqual(x.minutes,{});
 const zips=x.data.map(x=>x.z);
 assert.equal(new Set(zips).size,zips.length,'duplicate ZIP');
 assert.ok(zips.every(x=>/^\d{5}$/.test(x)),'invalid ZIP code');
 assert.ok(x.data.every(x=>!Object.hasOwn(x,'jpmMinutes')),'personal commute time returned');
 assert.ok(x.shapes.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)));
});
test('public-data build steps do not resurrect retired employer assets',()=>{
 for(const file of builders){
  const code=read(file);
  assert.ok(code.includes("read('dfw-outside-public.json')")||code.includes("readFileSync('dfw-outside-public.json'"),file);
 }
});
