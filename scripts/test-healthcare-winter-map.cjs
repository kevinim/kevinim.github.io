'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const {validPoint,validDataset}=require('../features/healthcare/map-layer.js');
const {validScores}=require('../features/resilience/winter-map.js');
const points=read('data/healthcare/cms-dfw-census-points-2026.json');
const trauma=read('data/healthcare/dshs-trauma-facilities-2026.json');
const matched=read('data/healthcare/dshs-cms-exact-matches-2026.json');
const winter=read('data/resilience/fema-nri-dfw-winter-2025.json');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../dashboard-main.js'),'utf8');
const extra=fs.readFileSync(path.join(__dirname,'../features/dashboard-extras.js'),'utf8');
test('Census hospital coordinates have strict provenance and no fabricated unmatched pins',()=>{
 assert.equal(points.metadata.recordCount,104);
 assert.equal(points.metadata.matchedCount,83);
 assert.equal(points.metadata.unmatchedCount,21);
 assert.ok(validDataset(points));
 assert.equal(points.records.filter(validPoint).length,83);
 assert.ok(points.records.filter(p=>p.lat===null).every(p=>p.geocodeStatus!=='CENSUS_ADDRESS_RANGE_MATCH'));
 assert.ok(points.records.filter(validPoint).every(p=>p.matchedAddress.includes(', TX, '+p.zip)));
 assert.equal(new Set(points.records.map(p=>p.cmsFacilityId)).size,104);
});
test('Exact DSHS identities and source published counts confirmed; not fuzzy matched',()=>{
 assert.equal(trauma.records.length,288);
 assert.equal(trauma.metadata.count,288);
 assert.deepEqual([1,2,3,4].map(n=>trauma.records.filter(x=>x.level===n).length),[22,31,62,173]);
 assert.equal(matched.records.length,34);
 assert.equal(matched.metadata.matchingCount,34);
 assert.ok(matched.records.every(x=>x.matchMethod==='EXACT_NAME_CITY_ZIP'&&[1,2,3,4].includes(x.level)));
 assert.equal(new Set(matched.records.map(r=>r.cmsFacilityId)).size,34);
 assert.ok(matched.records.every(r=>points.records.some(p=>p.cmsFacilityId===r.cmsFacilityId)));
});
test('NRI 2025 DFW winter cold, ice and weather data are unique and state-scoped',()=>{
 assert.equal(winter.records.length,1734);
 assert.equal(winter.metadata.sourceVersion,'December 2025');
 assert.equal(winter.metadata.geography,'2020 Census Tract');
 assert.ok(validScores(winter));
 assert.equal(new Set(winter.records.map(r=>r.tract)).size,1734);
 for(const entry of winter.records)for(const key of ['coldWave','iceStorm','winterWeather']){
  const metric=entry[key];assert.ok(metric&&('rating' in metric));
  assert.ok(metric.score===null||metric.score>=0&&metric.score<=100);
 }
});
test('Map controls lazy-load independent layers and do not change old school selectors',()=>{
 for(const id of ['healthcareMapQuickToggle','winterMapQuickToggle','winterMapLegend','healthcareMapStatus','schoolOverlay','historicOverlay','referenceBoundaryOverlay']){
  assert.equal(html.split('id="'+id+'"').length-1,1,id);
 }
 assert.ok(html.includes('window.initHealthcareMap?.(map,document)'));
 assert.ok(html.includes('window.initWinterHazardMap?.(map,document)'));
 assert.ok(html.includes('features/healthcare/map-layer.js?v=2'));
 assert.ok(html.includes('features/resilience/winter-map.js?v=2'));
 for(const id of ['hospitalMapEnabled','winterMapEnabled','winterHazardType'])assert.ok(extra.includes('id="'+id+'"'));
});
