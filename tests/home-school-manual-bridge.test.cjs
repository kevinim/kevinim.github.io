'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const bridge=require('../features/home-school-manual-bridge.js');

test('manual bridge only lists schools for the explicitly chosen district and grade',()=>{
 const schools=[
  {name:'HOMESTEAD EL',district:'LISD',type:'elementary'},
  {name:'ARBOR CREEK MIDDLE',district:'LISD',type:'middle'},
  {name:'HEBRON H S',district:'LISD',type:'high'},
  {name:'OTHER MIDDLE',district:'CFB',type:'middle'},
  {name:'SECOND EL',district:'LISD',type:'elementary'}
 ];
 assert.deepEqual(bridge.catalog(schools,'LISD','elementary').map(x=>x.name),['HOMESTEAD EL','SECOND EL']);
 assert.deepEqual(bridge.catalog(schools,'LISD','middle').map(x=>x.name),['ARBOR CREEK MIDDLE']);
 assert.deepEqual(bridge.catalog(schools,'LISD','high').map(x=>x.name),['HEBRON H S']);
 assert.deepEqual(bridge.catalog(schools,'CFB','middle').map(x=>x.name),['OTHER MIDDLE']);
 assert.deepEqual(bridge.catalog(schools,'LISD','unknown'),[]);
 assert.deepEqual(bridge.catalog(schools,'bad<script>','high'),[]);
});
test('official school lookup link is a trusted static URL with no residential address or query appended',()=>{
 const registry={LISD:{official:'https://www.lisd.net/resources/families/school-locator'},
  CFB:{official:'https://www.cfbisd.edu/students/school-maps-locator-system'},
  WRONG:{official:'javascript:alert(1)'}};
 const policy=url=>url.startsWith('https://')?url:null;
 assert.equal(bridge.officialUrl('LISD',registry,policy),registry.LISD.official);
 assert.equal(bridge.officialUrl('WRONG',registry,policy),null);
 assert.equal(bridge.officialUrl('UNKNOWN',registry,policy),null);
 assert.equal(bridge.officialUrl('LISD',registry,()=>null),null);
});
test('manual references cannot bypass existing school assignment certification',()=>{
 const source=fs.readFileSync('features/home-school-manual-bridge.js','utf8');
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|document\.cookie/);
 assert.doesNotMatch(source,/\bfetch\(|\bpostMessage\(|\bhome\.assignment\s*=/);
 assert.doesNotMatch(source,/2123\s+Alto|75007,?\s+2123/i);
 assert.match(source,/자동 배정학교 정보가 아니라/);
 assert.match(source,/공식 Finder에서 확인한/);
 assert.match(source,/schoolClicked\(school,true\)/);
 assert.match(source,/if\(!current\)/);
});
