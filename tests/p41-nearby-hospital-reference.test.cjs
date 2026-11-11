'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {rankNearbyCMS,validPoint,validDataset}=require('../features/healthcare/map-layer.js');

const dataset=JSON.parse(readFileSync(join(__dirname,'../data/healthcare/cms-dfw-census-points-2026.json'),'utf8'));
const westPlano=[33.014302,-96.791507];

test('CMS/Census geocoding coverage is explicit, never interpreted as all EDs',()=>{
 assert.ok(validDataset(dataset));
 assert.equal(dataset.records.length,104);
 assert.equal(dataset.records.filter(validPoint).length,83);
 assert.equal(dataset.records.filter(p=>validPoint(p)&&p.emergencyServices===true).length,67);
 assert.equal(dataset.records.filter(p=>!validPoint(p)).length,21);
});

test('Rank ZIP reference-point approximation by geographic straight-line miles only',()=>{
 const before=JSON.stringify(dataset.records.slice(0,3));
 const result=rankNearbyCMS(dataset,westPlano,{edOnly:true,limit:8});
 assert.equal(result.totalFacilitiesCount,104);
 assert.equal(result.approximateLocationsCount,83);
 assert.equal(result.missingLocationsCount,21);
 assert.equal(result.rankedCount,67);
 assert.equal(result.records.length,8);
 assert.match(result.metric,/not drive time/);
 assert.ok(result.records.every(p=>p.emergencyServices===true&&validPoint(p)&&Number.isFinite(p.distanceMiles)));
 assert.ok(result.records.every((p,i)=>i===0||p.distanceMiles>=result.records[i-1].distanceMiles));
 assert.equal(result.records[0].cmsFacilityId,'450890');
 assert.ok(result.records[0].distanceMiles<0.001,'exact Census coordinate yields zero straight-line miles');
 assert.equal(JSON.stringify(dataset.records.slice(0,3)),before,'must not mutate source records');
 assert.ok(result.records.every(p=>!('driveMinutes' in p)&&!('edOpen24Hours' in p)));
});

test('Includes non-ED flagged CMS only when explicitly requested',()=>{
 const all=rankNearbyCMS(dataset,[33.02,-96.8],{edOnly:false,limit:20});
 assert.equal(all.rankedCount,83);
 assert.equal(all.records.length,20);
 assert.ok(all.records.every(validPoint));
});

test('Fail closed for wrong dataset, missing/invalid origin and unbounded result set',()=>{
 for(const wrong of [null,{}, {metadata:dataset.metadata,records:dataset.records.slice(1)}]){
  assert.throws(()=>rankNearbyCMS(wrong,westPlano),TypeError);
 }
 for(const center of [null,[],[33],[-96.7,33.1],[33.1,-200],[NaN,-96.7],[Infinity,-96.7],['33.1','-96.7']]){
  assert.throws(()=>rankNearbyCMS(dataset,center),RangeError);
 }
 for(const options of [{limit:0},{limit:21},{limit:1.5},{edOnly:'yes'}]){
  assert.throws(()=>rankNearbyCMS(dataset,westPlano,options),RangeError);
 }
});
