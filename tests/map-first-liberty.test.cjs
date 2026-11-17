'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
const runtime=read('dashboard-main.js');
const adapter=read('features/map/liberty-basemap.js');
const layout=read('features/map-first-split.css');

test('Liberty default is added to production only, with pinned lazy resources and narrow CSP policy',()=>{
 assert.match(html,/<option value="liberty">Liberty · OpenFreeMap<\/option>/);
 assert.match(html,/<script src="\.\/features\/map\/liberty-basemap\.js\?v=1"><\/script><script src="\.\/dashboard-main\.js\?v=10"><\/script>/);
 assert.match(html,/worker-src 'self' blob:/);
 assert.match(html,/connect-src [^"]*https:\/\/tiles\.openfreemap\.org/);
 assert.match(html,/img-src [^"]*https:\/\/tiles\.openfreemap\.org/);
 assert.doesNotMatch(html.match(/script-src [^;]+;/)[0],/unsafe-inline|unsafe-eval/);
 assert.match(adapter,/https:\/\/tiles\.openfreemap\.org\/styles\/liberty/);
 assert.match(adapter,/maplibre-gl@5\.5\.0/);
 assert.match(adapter,/@maplibre\/maplibre-gl-leaflet@0\.1\.4/);
 assert.match(runtime,/setBaseMap\(el\('baseMap'\)\?\.querySelector/);
 assert.match(runtime,/baseMapGeneration/);
 assert.match(runtime,/Liberty 지도를 불러오지 못해 OpenStreetMap으로 전환/);
});

test('split layout keeps school list left, map right, and restores a single column on mobile',()=>{
 assert.match(html,/features\/map-first-split\.css\?v=1/);
 assert.match(layout,/@media \(min-width: 1060px\)/);
 assert.match(layout,/\.shell>\.main>\.section\s*\{[\s\S]*?grid-column:1/);
 assert.match(layout,/\.shell>\.main>\.mapcol\s*\{[\s\S]*?grid-column:2/);
 assert.match(layout,/\.mapbox\s*\{[\s\S]*?position:sticky/);
 assert.match(layout,/@media \(max-width:720px\)/);
 assert.match(html,/id="schoolList"/);
 assert.match(html,/id="map"/);
 assert.match(html,/data-grade="B_PLUS"/);
});

function harness(layerFactory){
 const map={
  layers:new Set(),
  hasLayer(layer){return this.layers.has(layer)},
  removeLayer(layer){this.layers.delete(layer)}
 };
 const L={maplibreGL:layerFactory};
 const rootWindow={L,maplibregl:{}};
 const context={window:rootWindow,document:{head:{appendChild(){throw Error('No network expected')}},createElement(){throw Error('No network expected')}},setTimeout,clearTimeout,console};
 vm.runInNewContext(adapter,context,{filename:'liberty-basemap.js'});
 return {map,api:rootWindow.TXLibertyBasemap};
}
test('Liberty adapter creates a Leaflet-compatible vector layer without changing school layers',async()=>{
 const schoolLayer={id:'school'},gisLayer={id:'gis'};
 const gl={loaded:()=>true,on(){},off(){}};
 const h=harness(opts=>({
  addTo(map){map.layers.add(this);this.options=opts;return this},
  getMaplibreMap(){return gl}
 }));
 h.map.layers.add(schoolLayer);h.map.layers.add(gisLayer);
 const vector=await h.api.create(h.map);
 assert.ok(h.map.hasLayer(vector));
 assert.ok(h.map.hasLayer(schoolLayer));
 assert.ok(h.map.hasLayer(gisLayer));
 assert.equal(vector.options.style,'https://tiles.openfreemap.org/styles/liberty');
});

test('Liberty adapter removes a partially created vector layer when WebGL fails',async()=>{
 const h=harness(()=>({
  addTo(map){map.layers.add(this);return this},
  getMaplibreMap(){return null}
 }));
 await assert.rejects(h.api.create(h.map),/WebGL map unavailable/);
 assert.equal(h.map.layers.size,0);
});
