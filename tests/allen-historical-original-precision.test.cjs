'use strict';
// Public coordinate test fixtures, not homes or enrollment results.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const filename='allen-attendance-historical.geojson';
const source=fs.readFileSync(path.join(root,filename));
const data=JSON.parse(source.toString('utf8'));
const feats=data.features;

function pointInRing(q,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>q[1])!==(b[1]>q[1])&&
   q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function inside(geometry,q){
 const polygons=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];
 return polygons.some(rings=>pointInRing(q,rings[0])&&!rings.slice(1).some(hole=>pointInRing(q,hole)));
}
function matches(grade,lon,lat){
 return feats.filter(f=>f.properties.gradeLevel===grade&&inside(f.geometry,[lon,lat]))
  .map(f=>f.properties.school);
}
const holdouts=[
 {grade:'elementary',point:[-96.716904,33.103397],expected:'Green Elementary School'},
 {grade:'elementary',point:[-96.706807,33.132692],expected:'Cheatham Elementary School'},
 {grade:'elementary',point:[-96.689980,33.105773],expected:'Boon Elementary School'},
 {grade:'elementary',point:[-96.655203,33.073311],expected:'Bolin Elementary School'},
 {grade:'middle',point:[-96.621548,33.100230],expected:'Curtis Middle School'},
 {grade:'elementary',point:[-96.7144185,33.1262058],expected:'Kerr Elementary School'}
];

test('20 original-precision historical City of Allen school polygons preserve source-year labels',()=>{
 assert.equal(data.type,'FeatureCollection');
 assert.equal(feats.length,20);
 assert.match(data.metadata?.geometryPrecision||'',/original WGS84/);
 assert.match(data.metadata?.warning||'',/Historical/);
 assert.equal(feats.filter(f=>f.properties.gradeLevel==='elementary').length,16);
 assert.equal(feats.filter(f=>f.properties.gradeLevel==='middle').length,3);
 assert.equal(feats.filter(f=>f.properties.gradeLevel==='high').length,1);
 for(const f of feats){
  assert.equal(f.properties.current,false);
  assert.equal(f.properties.sourceDistrict,'AISD');
  assert.equal(f.properties.sourceVintage,f.properties.gradeLevel==='high'?'2019':'2023');
  assert.equal(f.properties.YearUpdated,f.properties.sourceVintage);
 }
});
test('published City precision is not silently reduced to a coarse approximation',()=>{
 let total=0;
 for(const f of feats){
  const parts=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
  assert.ok(parts.length>0);
  for(const polygon of parts)for(const ring of polygon){
   assert.ok(ring.length>=4);
   assert.deepEqual(ring[0],ring[ring.length-1]);
   for(const [lon,lat] of ring){
    assert.ok(Number.isFinite(lon)&&Number.isFinite(lat)&&lon>-98&&lon<-95&&lat>32&&lat<35);
    total++;
   }
  }
 }
 assert.equal(total,5668,'Reviewed original 2023/2019 GIS vertex count is pinned; a new source update needs independent review');
});
test('all six official point queries now resolve to a unique school instead of overlapping historical matches',()=>{
 for(const h of holdouts)
  assert.deepEqual(matches(h.grade,...h.point),[h.expected],h.grade+': '+h.expected);
});
test('data integrity lock binds exact reviewed GeoJSON bytes and remains historical-only',()=>{
 const lock=JSON.parse(fs.readFileSync(path.join(root,'data/school-data-release-lock.json'),'utf8'));
 const item=lock.assets.find(z=>z.path===filename);
 assert.ok(item);
 assert.equal(item.assurance,'historical-only');
 const gitSha=crypto.createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex');
 assert.equal(item.gitBlobSha,gitSha);
 const policy=require('../features/conditional-school-release.js');
 assert.equal(policy.releaseSummary().currentYearResidentialDistrictApprovals,0);
});
