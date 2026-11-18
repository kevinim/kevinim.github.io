'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {allenRowMatchesSchool}=require('../school-assignment.js');
const source=fs.readFileSync('dashboard-main.js','utf8');
const start=source.indexOf('function addressSchoolView(){');
const end=source.indexOf('function renderAddressSchoolPriority(){',start);
assert.ok(start>0&&end>start,'Address-first view and reference-marker functions must exist');

function harness(status='unverified-year'){
 const row=['Peak St','2050','Evans','Ereckson','Lowery','Allen High School'];
 const schools=[
  {name:'Mary Evans Elementary School',type:'elementary',district:'AISD',ll:[33.10,-96.65]},
  {name:'Ereckson Middle School',type:'middle',district:'AISD',ll:[33.12,-96.69]},
  {name:'Lowery Freshman Center',type:'high',district:'AISD',ll:[33.1,-96.66]},
  {name:'Allen High School',type:'high',district:'AISD',ll:[33.11,-96.66]},
  {name:'ZIP School Not Assigned',type:'elementary',district:'AISD',ll:[33.12,-96.64]},
  {name:'Frisco Campus',type:'high',district:'FISD',ll:[33.13,-96.7]}
 ];
 const home={assignment:{district:'AISD',status,allen:row},geocodeQuality:{usableForSchoolCandidate:true}};
 let manual=[];
 const context={home,state:{schools},canonical:name=>String(name).toLowerCase().replace(/[^a-z0-9 ]/g,''),
  allenRowMatchesSchool,
  window:{ConditionalSchoolRelease:{decide:()=>({allowed:false})},
   HomeSchoolManualBridge:{selectedSchools:current=>current===home?manual:[]}}};
 vm.runInNewContext(source.slice(start,end),context);
 return {context,home,schools,setManual:x=>manual=x,view:()=>context.addressSchoolView()};
}
test('Allen official street table shows four grade-band reference cards, never certified enrollment',()=>{
 const h=harness(),view=h.view();
 assert.equal(view.kind,'allen-reference');
 assert.equal(view.schools.length,0);
 assert.deepEqual(Array.from(view.candidates,c=>c.name),
  ['Evans','Ereckson','Lowery','Allen High School']);
 assert.deepEqual(Array.from(view.candidates,c=>c.grades),['K–6','7–8','9','10–12']);
 assert.ok(view.candidates.every(c=>/학년도 미표기/.test(c.yearNote)));
 assert.equal(view.reference.officialUrl,'https://www.allenisd.org/page/findaschool');
 assert.deepEqual(Array.from(h.context.referenceCandidateSchoolLocations(view),s=>s.name),
  h.schools.slice(0,4).map(s=>s.name));
 assert.equal(h.context.referenceCandidateSchoolLocations(view).some(s=>s.name==='ZIP School Not Assigned'),false);
 assert.equal(h.context.referenceCandidateSchoolLocations(view).some(s=>s.district==='FISD'),false);
});
test('missing campus metadata still shows official street-table text but never guesses its map pin',()=>{
 const h=harness();
 h.context.state.schools=h.schools.filter(s=>s.name!=='Ereckson Middle School');
 const v=h.view();
 assert.equal(v.candidates.length,4,'The table has four levels even when the school directory is incomplete');
 assert.equal(v.candidates[1].school,null);
 assert.equal(h.context.referenceCandidateSchoolLocations(v).length,3);
});
test('conflict/exception/unverified address never receives Allen reference cards',()=>{
 for(const status of ['conflict','apartment-split-review','needs-address-verification','unavailable']){
  const h=harness(status);
  assert.equal(h.view().kind,'unverified');
  assert.equal(h.view().schools.length,0);
 }
});
test('manual Finder choices take precedence and cannot leak into a different home',()=>{
 const h=harness();
 h.setManual([h.schools[0]]);
 assert.equal(h.view().kind,'manual');
 assert.equal(h.view().schools.length,1);
 h.context.home={assignment:{status:'unavailable'}};
 assert.equal(h.view().kind,'unverified');
});
test('the address-first panel and list explicitly say unverified and preserve table-only map semantics',()=>{
 assert.match(source,/kind:'allen-reference',schools:\[\],candidates/);
 assert.match(source,/Allen 공식 주소표 후보 · 학년도 미표기/);
 assert.match(source,/Allen 공식 주소표·학교 배정 확인/);
 assert.match(source,/const railReference=!!view&&\['gis-reference','mckinney-reference','allen-reference'\]/);
 assert.match(source,/2019\/2023 과거 경계는 자동 적용하지 않습니다/);
});
