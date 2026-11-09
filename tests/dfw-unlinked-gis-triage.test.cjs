'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const catalog=JSON.parse(fs.readFileSync('data/dfw-unlinked-gis-triage-2026.json','utf8'));
const {DISTRICT_REGISTRY}=require('../district-registry.js');
test('2022 Northwest source can never be advertised as current 2026-27 campus assignment',()=>{
 assert.equal(DISTRICT_REGISTRY['061911'].zoneKey,null);
 const n=catalog.historicalGisCandidates.find(d=>d.teaDistrict==='061911');
 assert.ok(n);assert.equal(n.registerAsLiveZone,false);assert.equal(n.publishToMap,false);
 assert.equal(n.currentOfficialPolygonSourceFound,false);assert.equal(n.yearIndependentlyChecked,false);
 assert.equal(n.oldArcgis.length,4);
 for(const s of n.oldArcgis){assert.equal(new URL(s.url).hostname,'services3.arcgis.com');assert.match(s.lastEdit,/2022/);}
});
test('district outlines and non-DFW layers are not promoted to school-specific GIS',()=>{
 assert.equal(catalog.certifiedAdditionalDistricts,0);assert.equal(catalog.releaseReady,false);
 assert.equal(catalog.rejectedFalsePositives.length,2);
 for(const s of catalog.officialNonGisSourceGaps)assert.ok(s.source.startsWith('https://'));
 assert.ok(catalog.exclusions.some(x=>x.includes('CFB')));
 assert.ok(catalog.exclusions.some(x=>x.includes('#148')));
});
test('catalog stores neither user housing addresses nor school-assignment guesses',()=>{
 const json=JSON.stringify(catalog);
 assert.ok(!/\b\d{3,6}\s+\w+\s+(?:Rd|Street|Ave|Drive|Blvd)\b/i.test(json));
 assert.ok(!/residentialSample|privateAddress|estimatedPolygon|sampleCoordinates/i.test(json));
});
