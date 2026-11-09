'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const crime=read('data/dfw-crime-city-2023-2025.geojson');
const hospitals=read('data/healthcare/cms-dfw-census-points-2026.json');
const winter=read('data/resilience/fema-nri-dfw-winter-2025.json');
const source=read('data/resilience/source-status-2026.json');

test('crime 2025 missing rate is null, not zero or low risk',()=>{
 assert.equal(crime.features.length,195);
 const missing=crime.features.filter(f=>f.properties.years['2025'].violentRate===null);
 assert.equal(missing.length,10);
 assert.ok(missing.every(f=>f.properties.years['2025'].violentMonths<12));
 assert.ok(missing.every(f=>f.properties.years['2025'].propertyRate===null));
});
test('hospital geocode coverage and explicit unknowns are consistent',()=>{
 assert.equal(hospitals.records.length,104);
 const counts=hospitals.records.reduce((a,r)=>(a[r.geocodeStatus]=(a[r.geocodeStatus]||0)+1,a),{});
 assert.equal(counts.CENSUS_ADDRESS_RANGE_MATCH,83);
 assert.equal(counts.NOT_MATCHED,17);
 assert.equal(counts.UNVERIFIED_OR_AMBIGUOUS,4);
 assert.ok(hospitals.records.filter(r=>r.geocodeStatus!=='CENSUS_ADDRESS_RANGE_MATCH').every(r=>r.lat===null&&r.long===null));
});
test('winter hazard acquisition and map status stay in sync',()=>{
 assert.equal(winter.records.length,1734);
 assert.equal(winter.metadata.tractCount,1734);
 assert.equal(source.dimensions.filter(d=>['cold_wave','ice_storm','winter_weather'].includes(d.key)&&d.state==='ACQUIRED_FEMA_TRACT_RISK_LAYER').length,3);
 assert.equal(source.noNeighborhoodScore,true);
 assert.equal(source.noUnverifiedAddressUtility,true);
});
