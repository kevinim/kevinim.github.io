'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const main=fs.readFileSync('index.html','utf8');
const reviewed=fs.readFileSync('reviewed.html','utf8');

test('primary page discloses autocomplete, geocoding and third-party logging',()=>{
 const start=main.indexOf('id="homePrivacy"'),end=main.indexOf('</div>',start);
 assert.ok(start>0&&end>start);
 const text=main.slice(start,end);
 for(const provider of ['Esri','OSRM','Collin CAD','Google'])assert.ok(text.includes(provider),provider);
 assert.ok(text.includes('외부 서비스의 접속 기록 및 보존 기간'));
 assert.ok(text.includes('사적인 정보'));
});
test('a destination warning is visible next to direct-input commute field',()=>{
 const input=main.indexOf('id="destination"'),notice=main.indexOf('id="destinationPrivacy"');
 const run=main.indexOf('id="calcCommute"');
 assert.ok(input>0&&notice>input&&run>notice);
 const body=main.slice(notice,run);
 for(const name of ['Nominatim','OSRM','공개된 사업장','로그 보존'])assert.ok(body.includes(name),name);
 assert.match(body,/role="note"/);
});
test('separate publicly reachable reviewed page discloses own provider policy',()=>{
 const marker=reviewed.indexOf('id="legacyPrivacyNotice"');
 assert.ok(marker>0);
 const head=reviewed.slice(marker,marker+550);
 for(const word of ['이전 버전','Nominatim','OSRM','제3자 로그','학군 공식 주소 검색기'])assert.ok(head.includes(word),word);
 assert.ok(reviewed.includes('외부 제공업체의 요청 로그 보존·삭제'));
});
test('privacy notices contain no executable script, external new host or inline handlers',()=>{
 for(const str of [main,reviewed]){
  assert.doesNotMatch(str,/\s(?:onclick|onerror|onload|oninput|onchange|onsubmit)\s*=/i);
  const policies=[...str.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/g)];
  assert.equal(policies.length,1);
  assert.match(policies[0][1],/script-src-attr 'none'/);
  assert.doesNotMatch(policies[0][1],/script-src[^;]*unsafe-inline/);
 }
});
