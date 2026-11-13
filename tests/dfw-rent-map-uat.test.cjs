'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../features/dfw-rent-map-uat-core.js');
test('Redfin links are ZIP-scoped and HTTPS without user data',()=>{
 assert.equal(core.redfinUrl('75093','houses'),'https://www.redfin.com/zipcode/75093/houses-for-rent');
 assert.equal(core.redfinUrl('75034','apartments'),'https://www.redfin.com/zipcode/75034/apartments-for-rent');
 assert.equal(core.redfinUrl('75093','not-supported'),'');
 for(const invalid of ['','abc','75093%2F..','75093/evil','75093?x=1','075093','75093\nabc'])assert.equal(core.redfinUrl(invalid,'houses'),'');
});
test('Redfin rental deep links use Redfin-confirmed price and bedroom format',()=>{
 const f={minPrice:2000,maxPrice:3500,minBeds:3};
 assert.equal(core.redfinUrl('75093','houses',f),
   'https://www.redfin.com/zipcode/75093/rentals/filter/property-type=house,min-price=2k,max-price=3.5k,min-beds=3');
 assert.equal(core.redfinUrl('75093','apartments',{minPrice:1500,maxPrice:3000,minBeds:2,maxBeds:3}),
   'https://www.redfin.com/zipcode/75093/rentals/filter/property-type=multifamily,min-price=1.5k,max-price=3k,min-beds=2,max-beds=3');
 assert.equal(core.redfinUrl('75034','houses',{maxPrice:2750}),
   'https://www.redfin.com/zipcode/75034/rentals/filter/property-type=house,max-price=2.75k');
 assert.equal(core.redfinUrl('75034','houses',{minBeds:0,maxBeds:0}),
   'https://www.redfin.com/zipcode/75034/rentals/filter/property-type=house,min-beds=0,max-beds=0');
 assert.equal(core.redfinUrl('75034','houses',{maxPrice:900}),
   'https://www.redfin.com/zipcode/75034/rentals/filter/property-type=house,max-price=900');
 assert.equal(core.redfinUrl('75034','houses',{maxPrice:''}),
   'https://www.redfin.com/zipcode/75034/houses-for-rent');
});
test('Rental filter ranges and malicious inputs are rejected safely',()=>{
 const cases=[
   {minPrice:4000,maxPrice:3000},
   {minBeds:4,maxBeds:2},
   {minPrice:'1000,property-type=house'},
   {maxPrice:'2500/min-beds=5'},
   {minPrice:-100},
   {maxPrice:50001},
   {minBeds:6},
   {maxBeds:99},
   {maxPrice:'NaN'}
 ];
 for(const f of cases)assert.throws(()=>core.redfinUrl('75093','houses',f),RangeError);
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
