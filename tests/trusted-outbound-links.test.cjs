'use strict';
const {assertVersionedMainBootstrap}=require('../scripts/dashboard-bootstrap-contract.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {official,withFallback,setOfficialAnchor,APPROVED_HOSTS}=require('../trusted-link-policy.js');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {knownBoundaryException}=require('../school-boundary-match.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('known district, GIS evidence and school ratings hosts are admitted',()=>{
 assert.ok(APPROVED_HOSTS.every(h=>official('https://'+h+'/')));
 for(const [id,record] of Object.entries(DISTRICT_REGISTRY))
  assert.equal(official(record.official),record.official,id);
 for(const sample of [
  ['PISD','Academy High School'],['AISD','Lowery Freshman Center'],
  ['LISD','Mill Street Elementary'],['043907','McNeil Elementary School'],
  ['043907','Serenity High School'],['043907','Caldwell Elementary School'],
  ['CFB','Early College High School']]){
  const src=knownBoundaryException({district:sample[0],name:sample[1]})?.sourceUrl;
  assert.ok(src,'Missing known evidence URL: '+sample.join('/'));
  assert.equal(official(src),src);
 }
 assert.ok(official('https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4b48af4'));
 assert.ok(official('https://sf1.friscoisd.org/docs/default-source/attendance-zones/2026-27/map.pdf'));
});

test('script URLs, domain spoofing, credentials, controls and unapproved domains are rejected',()=>{
 const bad=[
  null,undefined,{},42,'',' /school','https://www.pisd.edu /','//www.pisd.edu/path',
  'javascript:alert(1)','data:text/html,<script>alert(1)</script>','ftp://www.pisd.edu/path',
  'http://www.pisd.edu/school','HTTPS://www.pisd.edu/school',
  'https://www.pisd.edu.evil.test/path','https://evil.test/',
  'https://www.pisd.edu@evil.test/a','https://admin:pw@www.pisd.edu/school',
  'https://www.pisd.edu:444/path','https://www.pisd.edu:443/path',
  'https://www.pisd.edu\\@evil.test/path',
  'https://www.pisd.edu/%0d%0aLocation:evil',
  'https://www.pisd.edu/\n<script>alert(1)</script>',
  'https://www.pisd.edu./path','https://aptg.co/vgDpkm',
  'https://www.google.com/maps/dir/?api=1','https://www.friscoisd.org.evil.test/'
 ];
 for(const value of bad)assert.equal(official(value),null,String(value));
 assert.equal(official('https://www.pisd.edu/'+'x'.repeat(2200)),null);
});
test('untrusted links do not gain trusted status through fallback',()=>{
 assert.equal(withFallback('https://malicious.test','https://www.allenisd.org/page/findaschool'),'https://www.allenisd.org/page/findaschool');
 assert.equal(withFallback('https://malicious.test','javascript:alert(1)'),null);
 assert.equal(withFallback(null,'https://txschools.gov/'),'https://txschools.gov/');
});
test('DOM anchor setter removes unapproved href and target',()=>{
 const state=new Map([['href','https://www.pisd.edu/']]);
 const element={
  setAttribute(name,value){state.set(name,value)},
  removeAttribute(name){state.delete(name)}
 };
 assert.equal(setOfficialAnchor(element,'javascript:alert(1)'),false);
 assert.equal(state.has('href'),false);
 assert.equal(state.has('target'),false);
 assert.equal(state.get('aria-disabled'),'true');
 assert.equal(setOfficialAnchor(element,'https://www.pisd.edu/district-resources/'),true);
 assert.equal(state.get('href'),'https://www.pisd.edu/district-resources/');
 assert.equal(state.get('target'),'_blank');
 assert.equal(state.get('rel'),'noopener noreferrer');
 assert.equal(state.has('aria-disabled'),false);
});
test('all sensitive outbound browser sink paths consult validator before writing',()=>{
 const page=read('index.html'),html=page+'\n'+read('dashboard-main.js'),home=read('home-lookup-v2.js');
 const tag='<script src="./trusted-link-policy.js?v=1"></script>';
 assert.ok(html.includes(tag));
 assert.ok(page.indexOf(tag)>=0);
 assert.ok(page.indexOf(tag)<page.indexOf(assertVersionedMainBootstrap(page).tag),'link validator must load before the main bootstrap');
 assert.ok(html.includes('failure.sourceUrl&&window.TrustedLinkPolicy?.official(failure.sourceUrl)'));
 assert.ok(html.includes('sourceLink.href=window.TrustedLinkPolicy.official(failure.sourceUrl)'));
 assert.ok(html.includes('window.TrustedLinkPolicy?.withFallback(scoreSource('));
 assert.ok(html.includes('window.TrustedLinkPolicy?.official(OFFICIAL[s.district])'));
 assert.ok(html.includes('이 학교의 공식 주소별 학군 Finder 링크는 아직 검증되지 않았습니다.'));
 assert.ok(!html.includes("OFFICIAL[s.district]?'학군 공식 배정 확인':'학군 배정 링크 미확인 · TEA 검색'"));
 assert.ok(home.includes('window.TrustedLinkPolicy?.official(url)'));
 assert.ok(home.includes('window.TrustedLinkPolicy?.official(officialUrl)'));
});
