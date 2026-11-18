'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const html=read('index.html'),main=read('dashboard-main.js');
const allen=JSON.parse(read('allen-attendance-historical.geojson'));
const coverage=JSON.parse(read('data/dfw-school-coverage-matrix-2026.json'));

test('historical official reference boundaries are on by default, but user can opt out',()=>{
 assert.match(html,/<input type="checkbox" id="referenceBoundaryOverlay" checked>/);
 assert.match(main,/showHistoric:true,showOldZones:true,/);
 assert.match(main,/state\.showOldZones=e\.target\.checked;drawBoundary\(\)/);
 assert.match(main,/historical&&!state\.showOldZones/);
 assert.match(main,/finderLinked\?'#285ac0':'#d37125'/);
 assert.match(html,/<script src="\.\/dashboard-main\.js\?v=19"><\/script>/);
});

test('Allen official city GIS shows 2023 elementary and middle, 2019 high, never current approval',()=>{
 const levels={elementary:[],middle:[],high:[]};
 for(const f of allen.features){
  assert.equal(f.properties.current,false,'Historical polygons cannot claim current school assignment');
  assert.equal(f.properties.sourceDistrict,'AISD');
  levels[f.properties.gradeLevel].push(f.properties.sourceVintage);
 }
 assert.equal(levels.elementary.length,16);
 assert.equal(levels.middle.length,3);
 assert.equal(levels.high.length,1);
 assert.ok([...levels.elementary,...levels.middle].every(y=>y==='2023'));
 assert.ok(levels.high.every(y=>y==='2019'));
 assert.match(main,/GIS 원본 연도:/);
 assert.match(main,/갱신연도\(최초 공개일 미확인\)/);
 assert.match(main,/과거 참고 경계 · 현재 배정 미인증/);
 assert.match(main,/공식 GIS 참고 경계 · 원본 표기/);
});

test('source-year display never bypasses the residential assignment release block',()=>{
 assert.match(main,/ConditionalSchoolRelease\?\.decide\?\.\(assignment\)\?\.allowed!==true/);
 assert.match(main,/if\(!sourceFailed&&\(\(historical&&!state\.showOldZones\)/);
 assert.match(read('home-lookup-v2.js'),/ConditionalSchoolRelease\?\.apply\(rawSchoolCandidate\)/);
});

test('DFW-wide denominator separates unconfigured GIS from demonstrably out-of-date GIS',()=>{
 const isds=coverage.districts.filter(d=>d.category==='public-isd');
 assert.equal(isds.length,coverage.summary.publicISDs);
 const assessed=isds.filter(d=>d.geometry?.status==='reference-browser-minimum-only');
 const unconfigured=isds.filter(d=>d.geometry?.status==='no-dashboard-school-polygons-configured');
 assert.equal(assessed.length,7);
 assert.equal(unconfigured.length,101);
 assert.equal(assessed.length+unconfigured.length,isds.length);
 assert.equal(assessed.filter(d=>d.geometry.confirmedCurrentYear).length,2);
 assert.equal(coverage.definitions.campusPolygonCoverage.includes('Unknown'),true);
});
