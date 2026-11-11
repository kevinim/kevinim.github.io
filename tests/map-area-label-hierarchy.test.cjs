'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildCandidates, cityFor, directionalDetail} = require('../features/map/area-label-hierarchy.js');
const zips = [
  {z:'75093',name:'West Plano',ll:[33.02,-96.815]},
  {z:'75024',name:'NW Plano',ll:[33.078,-96.825]},
  {z:'75025',name:'North Plano',ll:[33.095,-96.745]},
  {z:'75035',name:'East Frisco',ll:[33.155,-96.752]},
  {z:'75034',name:'West Frisco',ll:[33.113,-96.86]},
  {z:'75057',name:'Lewisville',ll:[33.045,-96.982]},
  {z:'75067',name:'Lewisville',ll:[33.014,-96.977]},
  {z:'76247',name:'Northlake',ll:[33.115,-97.25]}
];
const places = {'75093':'Plano','75024':'Plano','75025':'Plano','75035':'Frisco','75034':'Frisco','75057':'Lewisville','75067':'Lewisville','76247':'Northlake'};

test('broad zoom renders only one label for each canonical city', () => {
  for (const zoom of [7,9,10]) {
    const labels = buildCandidates(zips, places, zoom, '75093');
    assert.deepEqual(labels.map(x=>x.name).sort(), ['Plano','Frisco','Lewisville','Northlake'].sort());
    assert.equal(labels.filter(x=>x.name==='Plano').length, 1);
    assert.equal(labels.filter(x=>x.name==='Frisco').length, 1);
    assert.equal(labels.filter(x=>x.name==='Lewisville').length, 1);
    assert.equal(labels[0].name, 'Plano', 'selected city takes priority');
    assert.equal(labels[0].count, 3);
  }
});
test('middle zoom exposes existing directional ZIP descriptions without making up others', () => {
  const labels = buildCandidates(zips, places, 11, '75093');
  assert.equal(labels.find(x=>x.zip==='75093').name, 'West Plano');
  assert.equal(labels.find(x=>x.zip==='75024').name, 'NW Plano');
  assert.equal(labels.find(x=>x.zip==='75035').name, 'East Frisco');
  assert.equal(labels.find(x=>x.zip==='75057').name, 'Lewisville · 75057');
  assert.equal(labels.find(x=>x.zip==='76247').name, 'Northlake · 76247');
});
test('close zoom displays the ZIP next to directional details', () => {
  const labels = buildCandidates(zips, places, 13, '75093');
  assert.equal(labels.find(x=>x.zip==='75093').name, 'West Plano · 75093');
  assert.equal(labels.find(x=>x.zip==='75035').name, 'East Frisco · 75035');
  assert.equal(labels.length, zips.length);
});
test('no fabricated directions; city names that start with a direction remain intact', () => {
  assert.equal(directionalDetail('Northlake','Northlake'),'');
  assert.equal(directionalDetail('Southlake','Southlake'),'');
  assert.equal(directionalDetail('North Richland Hills','North Richland Hills'),'');
  assert.equal(directionalDetail('Plano City Center','Plano'),'');
  assert.equal(directionalDetail('Carrollton North','Carrollton'),'Carrollton North');
  assert.equal(cityFor({z:'76247',name:'Northlake'},places),'Northlake');
});
test('invalid/offscreen records do not create labels; centroids are finite', () => {
  const x = buildCandidates([...zips,{z:'00000',name:'Plano',ll:[NaN,0]}],places,9,'75093');
  assert.equal(x.length,4);
  assert.ok(x.every(g=>g.ll.every(Number.isFinite)));
});
test('HTML and main dashboard load the helper, keep the existing ZIP and school layers', () => {
  const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const main = fs.readFileSync(path.join(__dirname,'../dashboard-main.js'),'utf8');
  assert.match(html, /features\/map\/area-label-hierarchy\.js\?v=1/);
  assert.match(html, /\.area-label\.city span/);
  assert.match(main, /AreaLabelHierarchy\.buildCandidates/);
  assert.match(main, /zipGroup\.clearLayers\(\)/);
  assert.match(main, /drawSchools\(\)/);
  assert.match(main, /map\.on\('moveend'/);
});
