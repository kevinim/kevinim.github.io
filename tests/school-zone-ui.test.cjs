'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {classify}=require('../school-zone-ui.js');
const base={matchStatus:'matched',sourceReady:true,sourceFailed:false,displayMode:'official',officialUrl:'https://www.friscoisd.org/page/2026-2027-zones/',schoolType:'elementary'};
const c=override=>classify({...base,...override});
test('only a real matched polygon is labelled as a drawn zone',()=>{
 assert.equal(c({}).kind,'current');
 assert.equal(c({displayMode:'finder'}).kind,'finder');
 assert.equal(c({displayMode:'historical'}).kind,'historical');
 assert.ok(c({displayMode:'historical'}).label.includes('과거'));
});
test('GIS-absent schools are never labelled as current or matched',()=>{
 assert.equal(c({matchStatus:'no-district-polygon-source'}).kind,'finder-only');
 assert.equal(c({matchStatus:'no-district-polygon-source',officialUrl:null}).kind,'unverified');
 assert.equal(c({matchStatus:'school-not-in-polygon-source'}).kind,'finder-only');
 assert.equal(c({matchStatus:'special-campus-no-standard-zone'}).kind,'special');
});
test('outage and pending state are distinct from missing school geometry',()=>{
 assert.equal(c({sourceReady:false,matchStatus:'no-district-polygon-source'}).kind,'loading');
 assert.equal(c({sourceFailed:true,matchStatus:'no-district-polygon-source'}).kind,'error');
 assert.equal(c({schoolType:'other'}).kind,'nonstandard');
});
test('main UI has direct school badge and map explanation without TEA as fake attendance search',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../dashboard-main.js'),'utf8');
 assert.match(html, /<script src="\.\/school-zone-ui\.js\?v=\d+"><\/script>/);
 assert.ok(html.includes('id="schoolZoneMapHint"'));
 assert.ok(html.includes('function schoolZoneInfo(s)'));
 assert.ok(html.includes('renderSchoolZoneMapHint(s,schoolZoneInfo(s))'));
 assert.ok(html.includes('school-zone-label'));
 assert.ok(html.includes('schoolZoneLinkLabel(zone.officialKind)'));
 assert.ok(html.includes('학군 학교 선택·신청 안내'));
 assert.ok(html.includes('학군 공식 배정 지도'));
 assert.ok(html.includes('이 학교의 공식 주소별 학군 Finder 링크는 아직 검증되지 않았습니다.'));
 assert.ok(!html.includes("OFFICIAL[s.district]?'학군 공식 배정 확인':'학군 배정 링크 미확인 · TEA 검색'"));
 const code=fs.readFileSync(path.join(__dirname,'../school-zone-ui.js'),'utf8');
 assert.ok(!code.includes('txschools.gov'),'TEA ratings are not school attendance assignment links');
});

test('neighbor district school choice, official maps and inquiries are never mislabeled as a live address Finder',()=>{
 assert.equal(c({matchStatus:'no-district-polygon-source',officialKind:'choice-process'}).kind,'choice-only');
 assert.equal(c({matchStatus:'no-district-polygon-source',officialKind:'official-map'}).kind,'map-only');
 assert.equal(c({matchStatus:'no-district-polygon-source',officialKind:'official-inquiry'}).kind,'inquiry-only');
 assert.equal(c({matchStatus:'no-district-polygon-source',officialKind:'finder-guidance'}).kind,'finder-only');
});
