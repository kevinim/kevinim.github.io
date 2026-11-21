'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {invalidGeometry,contains,audit}=require('../scripts/school-polygon-linkage-topology.cjs');

function square(x,y,w){
 return [[x,y],[x+w,y],[x+w,y+w],[x,y+w],[x,y]];
}
function zone(name,grade,x,y,w){
 return {type:'Feature',properties:{school:name,gradeLevel:grade},
  geometry:{type:'Polygon',coordinates:[square(x,y,w)]}};
}
test('reject invalid/unclosed WGS84 rings and unknown geometry safely',()=>{
 const good=zone('Elementary A','elementary',-97,33,0.01);
 assert.deepEqual(invalidGeometry(good.geometry),[]);
 good.geometry.coordinates[0].pop();
 assert.ok(invalidGeometry(good.geometry).includes('open-ring'));
 assert.deepEqual(invalidGeometry({type:'Point',coordinates:[-97,33]}),['missing-or-unsupported-geometry']);
 const bad=zone('E','elementary',-97,33,0.01);
 bad.geometry.coordinates[0][1]=[200,33];
 assert.ok(invalidGeometry(bad.geometry).includes('non-wgs84-coordinate'));
});
test('holes are excluded, not mistaken for an occupied school zone',()=>{
 const ring=square(-97,33,0.01);
 const hole=square(-96.997,33.003,0.003);
 const geometry={type:'Polygon',coordinates:[ring,hole]};
 assert.equal(contains(geometry,[-96.999,33.001]),true);
 assert.equal(contains(geometry,[-96.996,33.004]),false);
});
test('same-grade distinct school overlaps are detected without promoting residence grants',()=>{
 const x=[zone('A','elementary',-97,33,0.01),zone('B','elementary',-96.995,33,0.01)];
 const r=audit(x,{district:'synthetic',sourceVintage:'historical',sampleAxis:24,crossGrade:false});
 assert.ok(r.sameGradeOverlapSampleCounts.elementary>0);
 assert.ok(r.sameGradeOverlapExamples.length>0);
 assert.equal(r.crossGradeChecked,false);
 assert.equal(r.crossGradeMismatchSamples,null);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.qualification,/never|neither|not independent|neither exact/i);
});
test('missing middle-grade strip becomes a cross-grade finding, never a fabricated middle school',()=>{
 const data=[zone('Elm','elementary',-97,33,0.02),zone('Middle','middle',-97,33,0.007),
  zone('High','high',-97,33,0.02)];
 const r=audit(data,{district:'synthetic',sourceVintage:'2026-27',sampleAxis:40,crossGrade:true});
 assert.ok(r.crossGradeMismatchSamples>0);
 assert.ok(r.deepMismatchOver200m>0);
 assert.equal(r.sameGradeOverlapSampleCounts.elementary,0);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.crossGradeExamples.length>0);
});
test('three matching zone rectangles have no sampled overlap or gap',()=>{
 const data=['elementary','middle','high'].map((g,i)=>zone(String(i),g,-97,33,0.01));
 const r=audit(data,{district:'synthetic',sourceVintage:'2026-27',sampleAxis:16,crossGrade:true});
 assert.equal(r.crossGradeMismatchSamples,0);
 assert.ok(r.coveredByAllThreeGrades>0);
 assert.equal(r.status,'NO_SAMPLED_ANOMALIES');
});
test('real pinned sources have distinct, accurately labelled vintage and counts',()=>{
 const root=path.resolve(__dirname,'..');
 const allen=JSON.parse(fs.readFileSync(path.join(root,'allen-attendance-historical.geojson'),'utf8'));
 const prosper=JSON.parse(fs.readFileSync(path.join(root,'prosper-attendance-2026.geojson'),'utf8'));
 assert.equal(allen.features.length,20);
 assert.equal(prosper.features.length,31);
 assert.ok(allen.features.every(f=>f.properties.current===false));
 assert.ok(prosper.features.every(f=>f.properties.current===true&&f.properties.schoolYear==='2026–27'));
 assert.ok(prosper.features.every(f=>Number.isInteger(Number(f.properties.schoolCode))));
 const historical=audit(allen.features,{district:'AISD',sourceVintage:'2019/2023',sampleAxis:16,crossGrade:false});
 assert.equal(historical.invalidFeatures.length,0);
 assert.equal(historical.crossGradeMismatchSamples,null);
 const current=audit(prosper.features,{district:'PROSPER',sourceVintage:'2026-27',sampleAxis:16,crossGrade:true});
 assert.equal(current.invalidFeatures.length,0);
 assert.equal(current.gradeCounts.elementary,20);
 assert.equal(current.gradeCounts.middle,7);
 assert.equal(current.gradeCounts.high,4);
});
