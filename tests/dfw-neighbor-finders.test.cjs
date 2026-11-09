'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const registry=require('../district-registry.js').DISTRICT_REGISTRY;
const links=require('../trusted-link-policy.js');
const ui=require('../school-zone-ui.js');
const file=name=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'));
const manifest=file('data/dfw-neighbor-official-school-links-2026.json');
const tea=file('tea-ratings-2026.json');
test('26 sourced districts are real TEA 2026 LEA identifiers, not a city or guessed ZIP',()=>{
 assert.equal(manifest.districts.length,26);
 assert.equal(new Set(manifest.districts.map(x=>x.code)).size,26);
 const codes=new Set(tea.data.map(x=>x.district));
 for(const d of manifest.districts){
  assert.ok(/^\d{6}$/.test(d.code),'numeric TEA code '+d.code);
  assert.ok(codes.has(d.code),'missing TEA campus LEA '+d.code);
  assert.equal(registry[d.code].en,d.en);
  assert.equal(registry[d.code].ko,d.ko);
  assert.equal(registry[d.code].official,d.url);
  assert.equal(registry[d.code].lookupKind,d.kind);
 }
});
test('official district URLs use exact approved HTTPS hosts and contain no address or query parameters',()=>{
 for(const d of manifest.districts){
  const u=new URL(d.url);
  assert.equal(u.protocol,'https:');
  assert.equal(u.search,'');
  assert.equal(u.hash,'');
  assert.equal(u.username,'');
  assert.equal(u.password,'');
  assert.equal(u.port,'');
  assert.equal(links.official(d.url),d.url);
  assert.ok(links.APPROVED_HOSTS.includes(u.hostname));
  assert.equal(d.sourceVerified,'official-district-website');
  assert.ok(d.sourceYear.length>15);
  assert.ok(registry[d.code].officialNote?.length>20,'no provenance caveat '+d.code);
 }
 assert.equal(links.official('https://www.melissaisd.org.evil.example/'),null);
 assert.equal(links.official('https://www.dallasisd.org:443/'),null);
 assert.equal(links.official('javascript:window.xss=1'),null);
});
test('all neighbor codes are external navigation only, not fabricated GIS or auto-enrollment',()=>{
 for(const d of manifest.districts){
  const x=registry[d.code];
  assert.equal(x.zoneKey,null);
  assert.equal(x.currency,null);
  assert.equal(x.address,null);
  const expected=d.kind==='choice-process'?'choice-only':d.kind==='official-map'?'map-only':
   d.kind==='official-inquiry'?'inquiry-only':'finder-only';
  assert.equal(ui.classify({matchStatus:'no-district-polygon-source',sourceReady:true,schoolType:'elementary',
   officialKind:d.kind,officialUrl:d.url,displayMode:'historical'}).kind,expected,d.code);
 }
});
test('Garland choice and HEB temporarily unavailable address locator are never represented as regular address assignment',()=>{
 assert.equal(registry['057909'].lookupKind,'choice-process');
 assert.match(registry['057909'].officialNote,/Choice of School/);
 assert.equal(registry['220916'].lookupKind,'official-map');
 assert.match(registry['220916'].officialNote,/중단/);
 assert.equal(registry['199901'].lookupKind,'official-inquiry');
 assert.match(registry['199901'].officialNote,/버스/);
 assert.match(registry['043903'].officialNote,/2027–28/);
 assert.match(registry['043911'].officialNote,/2026–27/);
 assert.match(registry['129902'].officialNote,/2027–28/);
});
