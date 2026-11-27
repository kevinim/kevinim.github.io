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
 const home={assignment:{district:'AISD',status:status==='unverified-year'?'conditional-finder-only':status},
  schoolSourceDistrict:'AISD',schoolSourceStatus:status,
  allenAddressReference:status==='unverified-year'?row:null,
  geocodeQuality:{usableForSchoolCandidate:true}};
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
 const homeSource=fs.readFileSync('home-lookup-v2.js','utf8');
 assert.match(homeSource,/home\.allenAddressReference=rawSchoolCandidate/);
 assert.match(source,/searchedHome\.assignment\?\.status==='conditional-finder-only'/);
});

test('Allen 2026 public street source snapshot retains four grade bands and quarantines malformed publisher row',()=>{
 const table=JSON.parse(fs.readFileSync('allen-address-schools.json','utf8'));
 const {matchAllenAddress}=require('../allen-lookup.js');
 assert.equal(table.schoolYear,null,'official street table does not certify a current academic year');
 assert.equal(table.rows.length,1688);
 const malformed=table.rows.filter(r=>!/^\s*\d+\s*(?:[-–—]\s*\d+)?\s*(?:\(even numbers only\))?\s*$/i.test(String(r[1]||'')));
 assert.equal(malformed.length,1);
 assert.equal(malformed[0][1],'2050 Peak St');
 assert.ok(table.rows.every(row=>Array.isArray(row)&&row.length>=6&&
  row.slice(2,6).every(c=>typeof c==='string'&&c.trim().length>0)));
 const r=matchAllenAddress('2050 Peak St, Allen, TX 75013',table.rows);
 assert.deepEqual(r.slice(2,6),['Evans','Ereckson','Lowery','Allen High School']);
 assert.equal(matchAllenAddress('2050 Crestview Heights, Allen, TX 75013',table.rows),null);
});
test('Allen row cannot show partial K-6, 7-8, freshman or 10-12 chain as complete',()=>{
 const {matchAllenAddress}=require('../allen-lookup.js');
 const row=['Synthetic Rd','2000-2100','Evans','Ereckson','Lowery','Allen High School'];
 const req='2050 Synthetic Rd, Allen, TX';
 assert.deepEqual(matchAllenAddress(req,[row]),row);
 for(const pos of [2,3,4,5]){
  const bad=[...row];bad[pos]='';
  assert.equal(matchAllenAddress(req,[bad]),null,'missing grade band at '+pos);
 }
 assert.equal(matchAllenAddress('2050 Synthetic Rd, Frisco, TX',[row]),null);
 assert.equal(matchAllenAddress(req,[row],false),null);
});
test('Allen overlapping published street ranges require a single unambiguous four-campus chain',()=>{
 const {matchAllenAddress}=require('../allen-lookup.js');
 const row=['Synthetic Lane','2000-2100','Evans','Ereckson','Lowery','Allen High School'];
 const same=['Synthetic Ln','2050-2150','Evans','Ereckson','Lowery','Allen High School'];
 const conflict=['Synthetic Ln','2050-2150','Other Elem','Ereckson','Lowery','Allen High School'];
 const q='2060 Synthetic Lane, Allen, TX';
 assert.deepEqual(matchAllenAddress(q,[row,same]),row);
 assert.equal(matchAllenAddress(q,[row,conflict]),null);
});
test('Allen split-apartment boundary exceptions remain separately blocked for all four published sites',()=>{
 const {allenSplitApartmentException}=require('../allen-apartment-exceptions.js');
 for(const addr of ['4450 South Ridge Road Apt 8302, Allen TX',
  '4700 S Ridge Rd Building 6, Allen TX',
  '6551 McKinney Ranch Parkway Unit 621, McKinney TX',
  '7830 Van Tuyl Pkwy Apt 116, Allen TX']){
  const e=allenSplitApartmentException(addr);
  assert.equal(e?.status,'unit-specific-district-boundary',addr);
  assert.equal(e?.source,'https://www.allenisd.org/page/findaschool');
 }
 assert.equal(allenSplitApartmentException('2050 Peak St, Allen, TX'),null);
});
