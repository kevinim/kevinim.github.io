'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const plan=require('../data/cfb-rezoning-boundary-review-targets-2026.json');
const rights=require('../data/finder-derived-source-rights-2026.json');
const {inspect}=require('../scripts/audit-finder-derived-research-targets.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
test('official CFB narrative yields pending targets, not fake geospatial zones',()=>{
 const r=inspect(plan,rights);
 assert.equal(r.status,'SOURCE_RIGHTS_PENDING');
 assert.equal(r.permissionCleared,false);
 assert.equal(r.mapPublishable,false);
 assert.equal(r.targetCount,14);
 assert.deepEqual(r.counts,{elementary:9,middle:2,high:3});
 assert.deepEqual(r.errors,[]);
 assert.ok(r.pending.some(x=>x.kind==='road-side-split'&&x.edgeOrUnitException));
});
test('no alleged live map geometry or synthetic current-year assignment may be claimed',()=>{
 const p=clone(plan);p.displayMapGeometry=true;
 assert.ok(inspect(p,rights).errors.includes('map_display_must_be_disabled'));
 const q=clone(plan);q.targets[0].finder2026Verified=true;
 assert.ok(inspect(q,rights).errors.some(x=>/unsupported_current_year/.test(x)));
});
test('personal street addresses, unit details and raw coordinates are barred from public review-plan artifacts',()=>{
 for(const [field,value] of Object.entries({address:'Some Street',unit:'Apt 5',coordinates:[1,2],lat:33,lon:-96})){
  const x=clone(plan);x.targets[0][field]=value;
  assert.ok(inspect(x,rights).errors.some(s=>s.includes('raw_address_or_coordinate_not_allowed')),field);
 }
});
test('no invented approval from a plan flag',()=>{
 const p=clone(plan);p.targets[0].mapPublishable=true;
 assert.ok(inspect(p,rights).errors.some(x=>x.includes('map_publish_prohibited')));
});
test('source narrative year is not current-year Finder verification',()=>{
 const r=inspect(plan,rights);
 assert.equal(r.referenceYear,'2025-2026');
 assert.equal(r.targetYear,'2026-2027');
 assert.ok(r.pending.every(t=>t.next.includes('current-year')));
});
