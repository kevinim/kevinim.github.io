'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../features/dfw-rent-map-uat-core.js');
test('Redfin links are ZIP-scoped and HTTPS without user data',()=>{
 assert.equal(core.redfinUrl('75093','houses'),'https://www.redfin.com/zipcode/75093/houses-for-rent');
 assert.equal(core.redfinUrl('75034','apartments'),'https://www.redfin.com/zipcode/75034/apartments-for-rent');
 assert.equal(core.redfinUrl('75093','not-supported'),'https://www.redfin.com/zipcode/75093/houses-for-rent');
 for(const invalid of ['','abc','75093%2F..','75093/evil','75093?x=1','075093','75093\nabc'])assert.equal(core.redfinUrl(invalid,'houses'),'');
});
test('City navigation uses a stable deduplicated set and constrained coordinates',()=>{
 const ids=core.cities.map(x=>x.key);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(ids.includes('plano')&&ids.includes('frisco')&&ids.includes('allen')&&ids.includes('carrollton'));
 for(const city of core.cities){assert.ok(city.lat>32.7&&city.lat<33.5);assert.ok(city.lng>-97.4&&city.lng<-96.4);assert.ok(city.zoom>=9&&city.zoom<=12);}
 assert.equal(core.cityByKey('invalid'),null);
});
test('Reference markers are region-level context, not individual home markers',()=>{
 assert.equal(core.referencePlaces.length,3);
 for(const place of core.referencePlaces){assert.match(place.detail,/대략적 위치/);assert.ok(!/^\d+\s/.test(place.detail));}
});
test('Map scale descriptions reflect zoom levels',()=>{
 assert.equal(core.mapScaleLabel(10),'도시 중심 보기');
 assert.equal(core.mapScaleLabel(12),'세부 지역 보기');
 assert.equal(core.mapScaleLabel(15),'도로·학교 상세 보기');
});
test('UAT is independent and does not modify normal dashboard entry',()=>{
 const index=fs.readFileSync('index.html','utf8');
 const preview=fs.readFileSync('rent-map-uat.html','utf8');
 assert.ok(!index.includes('dfw-rent-map-uat'));
 assert.ok(preview.includes('features/dfw-rent-map-uat.js'));
 assert.ok(preview.includes('features/dfw-rent-map-uat-core.js'));
 assert.ok(preview.includes('name="robots" content="noindex,nofollow"'));
 assert.ok(preview.includes('homeForm')&&preview.includes('zipSelect'));
 const code=fs.readFileSync('features/dfw-rent-map-uat.js','utf8');
 assert.ok(!/localStorage|sessionStorage|document\.cookie|fetch\s*\(/.test(code));
 assert.ok(!/rentcast|api\.redfin|scrap/i.test(code));
});
