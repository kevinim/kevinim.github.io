'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {summarizeNoaa,summarizeCrime}=require('../features/area-assessment-core.js');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const counties=read('county-scopes.json'),storms=read('data/area-noaa-counts-2024-2025.json'),
 crime=read('data/dfw-crime-zip-cities-2023-2025.json'),demo=read('dfw-demographics.json');
const matrix=[
 {zip:'75013',area:'Allen',county:'Collin County',city:'Allen'},
 {zip:'75034',area:'Frisco',county:'Collin County',city:'Frisco'},
 {zip:'75093',area:'West Plano',county:'Collin County',city:'Plano'},
 {zip:'75006',area:'Carrollton / CFB vicinity',county:'Dallas County',city:'Carrollton'}
];
test('Allen, Frisco, Plano and Carrollton representative ZIPs exist in existing source snapshots',()=>{
 assert.deepEqual(storms.years,[2024,2025]);
 assert.deepEqual(crime.metadata.years,[2023,2024,2025]);
 for(const area of matrix){
  assert.ok(demo.data.some(d=>d.z===area.zip),'missing demographic ZIP '+area.zip);
  const county= countiesSafe(area.zip);
  assert.equal(county,area.county,area.area+' primary county');
  const weather=summarizeNoaa(storms.summary,county);
  assert.equal(weather.status,'available',area.area+' NOAA snapshot');
  assert.ok(weather.hail>=0&&weather.flood>=0);
  const police=summarizeCrime(crime,area.zip);
  assert.equal(police.status,'available',area.area+' FBI rate coverage');
  assert.equal(police.city,area.city,area.area+' city name');
  assert.equal(police.year,'2025');
  assert.ok(police.violent>=0&&police.property>=0);
 }
});
function countiesSafe(zip){
 const code=counties.zipCounty?.[zip];
 return counties.counties?.[code]?.name||null;
}
test('ZIP overlap and school district labels must not be misrepresented as home-level safety or assignment',()=>{
 const mixed=summarizeCrime(crime,'75056');
 assert.equal(mixed.status,'mixed','Lewisville / The Colony mixed-city ZIP must not pick one city');
 assert.match(mixed.message,/여러 관할/);
 assert.equal(summarizeCrime(crime,'99999').status,'unknown');
 const cfbDistrict=read('school-data-provenance.json').districts.find(d=>d.code==='CFB');
 assert.ok(cfbDistrict&&cfbDistrict.status==='lookup-only');
 assert.equal(cfbDistrict.geometryUse.includes('does not have an authorized per-campus geometry export'),true);
});
