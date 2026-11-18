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
 assert.match(source,/panel\.hidden=!current/);
});

test('current McKinney GIS candidates can prefill only matching in-memory district campuses',()=>{
 const schools=['elementary','middle','high'].map((level,i)=>({
  id:'043907'+String(991+i),district:'043907',type:level,name:'SYNTHETIC '+level
 }));
 const home={mckinneyCrosscheck:{kind:'reference-only',district:'043907',
  independentOfficialAddressVerified:false,candidates:schools.map(s=>({
   level:s.type,school:s.name,linked:true,matchedSchool:s,
   campusId:s.id,sourceYear:s.type==='high'?null:'2026-27'
  }))}};
 assert.deepEqual(bridge.previewSuggestions(home,schools).map(s=>s.level),
  ['elementary','middle','high']);
 assert.deepEqual(bridge.previewSuggestions(home,schools).map(s=>s.index),[0,1,2]);
 assert.deepEqual(bridge.selectedSchools(home),[]);
 assert.equal(Object.hasOwn(home,'assignment'),false);
});

test('wrong district, publisher status, stale year and mismatched Campus ID cannot prefill',()=>{
 const school={id:'043907991',district:'043907',type:'elementary',name:'SYNTHETIC ELEM'};
 const reference={kind:'reference-only',district:'043907',
  independentOfficialAddressVerified:false,candidates:[{
   level:'elementary',matchedSchool:school,linked:true,
   campusId:school.id,sourceYear:'2026-27'}]};
 const home={mckinneyCrosscheck:reference};
 assert.equal(bridge.previewSuggestions(home,[school]).length,1);
 assert.deepEqual(bridge.previewSuggestions({mckinneyCrosscheck:{...reference,district:'FISD'}},[school]),[]);
 assert.deepEqual(bridge.previewSuggestions({mckinneyCrosscheck:{...reference,kind:'source-matched'}},[school]),[]);
 assert.deepEqual(bridge.previewSuggestions({mckinneyCrosscheck:{...reference,independentOfficialAddressVerified:true}},[school]),[]);
 for(const changed of [{sourceYear:'2025-26'},{campusId:'043907999'},{linked:false}]){
  const candidate={...reference.candidates[0],...changed};
  assert.deepEqual(bridge.previewSuggestions({mckinneyCrosscheck:{...reference,candidates:[candidate]}},[school]),[]);
 }
 assert.deepEqual(bridge.previewSuggestions(home,[{...school}]),[],
  'cloned/untrusted school object cannot masquerade as loaded directory record');
});

test('duplicate grade levels and unrelated school candidates fail closed for manual prefill',()=>{
 const s={id:'043907991',district:'043907',type:'elementary',name:'SYNTHETIC'};
 const another={id:'043907992',district:'043907',type:'elementary',name:'SYNTHETIC B'};
 const c=school=>({level:'elementary',matchedSchool:school,linked:true,campusId:school.id});
 assert.deepEqual(bridge.previewSuggestions({mckinneyCrosscheck:{kind:'reference-only',
   district:'043907',independentOfficialAddressVerified:false,candidates:[c(s),c(another)]}},
   [s,another]),[]);
});
