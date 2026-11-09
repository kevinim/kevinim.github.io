'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const validate=require('../denton-campus-point-quality.js');
const pdf=require('../denton-official-zone-references.js');
const json=JSON.parse(fs.readFileSync('data/denton-campus-public-points-2026.json','utf8'));
const nces=new Map(JSON.parse(fs.readFileSync('nces-locations-2024.json','utf8')).data.map(x=>[x.id,x]));
test('31 public Denton campus coordinates independently match 2024-25 NCES <=250m',()=>{
 const evidence=validate.validate(json,nces,pdf.ROWS);
 assert.equal(evidence.size,31);
 assert.equal(json.excludedIds.length,8);
 for(const x of evidence.values()){
  assert.equal(x.notCurrentZone,true);
  assert.equal(x.notSchoolAssignment,true);
  assert.equal(x.notCurrentSiteCertified,true);
 }
});
test('entire 2026-27 official PDF roster has NCES public school point, no inferred campus zoning',()=>{
 const missing=pdf.ROWS.filter(x=>!nces.has(x.id)||!validate.schoolPoint(nces.get(x.id)?.ll));
 assert.deepEqual(missing,[]);
 assert.equal(pdf.ROWS.length,39);
 assert.ok(!pdf.ROWS.some(x=>x.id==='061901120'));
});
test('fail closed on school ID, grade, accuracy, source year, duplicated or new campus',()=>{
 const mutate=(fn)=>{const copy=JSON.parse(JSON.stringify(json));fn(copy);return()=>validate.validate(copy,nces,pdf.ROWS)};
 assert.throws(mutate(j=>j.currentYearLocationVerified=true),/Invalid Denton/);
 assert.throws(mutate(j=>j.points[0].type=j.points[0].type==='high'?'middle':'high'),/not corroborated/);
 assert.throws(mutate(j=>j.points[0].ll=[0,0]),/not corroborated/);
 assert.throws(mutate(j=>j.points[0].ll[0]+=.03),/not corroborated/);
 assert.throws(mutate(j=>j.points[0].ncesDistanceMeters=500),/not corroborated/);
 assert.throws(mutate(j=>j.points.push({...j.points[0]})),/revalidation|duplicate/);
 assert.throws(mutate(j=>j.excludedIds.pop()),/revalidation/);
 assert.throws(mutate(j=>j.points[0].isZoneBoundary=true),/not corroborated/);
});
test('module checks no user home addresses and no novel 2026 school geographic claims',()=>{
 const js=fs.readFileSync('denton-campus-point-quality.js','utf8');
 assert.ok(!/homeAddress|customerAddress|residentAddress|sessionStorage|localStorage/.test(js));
 assert.equal(json.readyForProduction,false);
 assert.equal(json.attendanceZoneCertified,false);
 assert.equal(json.currentYearLocationVerified,false);
});
