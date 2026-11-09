'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('home-lookup-v2.js'),html=read('index.html'),policy=require('../features/conditional-school-release.js');
test('Track B never authorizes residence-specific assignment',()=>{
 assert.equal(policy.releaseSummary().currentYearResidentialDistrictApprovals,0);
 assert.match(home,/ConditionalSchoolRelease\?\.apply\(rawSchoolCandidate\)/);
 assert.match(home,/conditional-finder-only/);
 assert.doesNotMatch(read('irving-official-spatial.js'),/approvedForProduction\s*:\s*true/);
});
test('Irving reference geometry has a visible pre-query warning and an independent popup warning',()=>{
 for(const phrase of ['reference-gis-warning','참고 GIS이며 현재 배정학교가 아닙니다','2024–25','2025–26','reference-gis-popup','참고 GIS 경계 표시 (배정 미인증)','sourceVintage']){
  assert.ok(home.includes(phrase),'missing warning '+phrase);
 }
 assert.match(read('features/track-b-reference-warning.css'),/data-theme="dark"/);
 assert.match(read('features/track-b-reference-warning.css'),/border-left-width:6px/);
});
test('publisher-only opt-in lookup and exact privacy source',()=>{
 const source=read('irving-official-spatial.js');
 assert.match(source,/https:\/\/iisd1\.maps\.arcgis\.com/);
 assert.match(source,/publisher-live-reference-only/);
 assert.match(html,/집 핀 좌표만 Irving ISD 연계 ArcGIS/);
 assert.match(html,/irving-official-spatial\.js\?v=1/);
 assert.match(read('trusted-link-policy.js'),/'iisd1\.maps\.arcgis\.com'/);
});
