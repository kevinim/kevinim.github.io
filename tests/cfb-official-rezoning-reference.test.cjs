'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const s=fs.readFileSync('index.html','utf8');
test('CFB source panel has two exact official district links and no fabricated machine GIS',()=>{
 assert.equal(s.split('id="cfbOfficialRezoningReference"').length-1,1);
 assert.match(s,/https:\/\/www\.cfbisd\.edu\/students\/school-maps-locator-system/);
 assert.match(s,/https:\/\/www\.cfbisd\.edu\/departments\/facility-support-services\/facility-planning-advisory-group\/2025-2026-rezoning/);
 assert.match(s,/2025년 3월 6일/);
 assert.match(s,/현재 CFB 학교별 검증 GIS 폴리곤이 연결되지 않았으며/);
 assert.match(s,/2026–27 주택별 학교 배정이나 호수별 예외를 확정할 수 없습니다/);
 assert.equal(require('../features/conditional-school-release.js').releaseSummary().currentYearResidentialDistrictApprovals,0);
});
test('no copy/rehosting of CFB Finder-derived zones, no third-party CSP expansion',()=>{
 const js=fs.readFileSync('dashboard-main.js','utf8');
 assert.doesNotMatch(js,/CFB_DERIVED_ZONE_PRODUCTION_APPROVED/);
 const html=s.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
 assert.ok(html);assert.ok(!html.includes('www.cfbisd.edu'));
 assert.match(s,/id="cfbOfficialRezoningReference"/);
});
