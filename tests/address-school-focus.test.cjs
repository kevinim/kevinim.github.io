'use strict';
const test=require('node:test');
// Reuse the existing address-school CI job; do not create a duplicate workflow.
require('./prosper-official-address-response.test.cjs');
require('./prosper-boundary-years.test.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dashboard-main.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const manual=fs.readFileSync('features/home-school-manual-bridge.js','utf8');
const css=fs.readFileSync('features/map-first-split.css','utf8');
const begin=source.indexOf('function addressSchoolView(){');
const end=source.indexOf('function renderAddressSchoolPriority(){',begin);
assert.ok(begin>0&&end>begin,'exact address school view helper is present');
const fn=source.slice(begin,end);
function setup(){
 const assigned={name:'ASSIGNED_E',district:'PISD',type:'elementary',ll:[33,-96],rating:'C'};
 const zipOnly={name:'ZIP_ONLY',district:'PISD',type:'middle',ll:[33,-96],rating:'A'};
 const outside={name:'OTHER_DISTRICT',district:'AISD',type:'high',ll:[33,-96]};
 const home={assignment:{status:'conditional-finder-only'}};
 let verified=false,picked=[];
 const ctx={
  home,state:{schools:[assigned,zipOnly,outside],ratingFilter:'A'},
  window:{
   ConditionalSchoolRelease:{decide:()=>({allowed:verified})},
   HomeSchoolManualBridge:{selectedSchools:current=>current===home?picked:[]}
  },
  homeSchoolMatches:s=>s===assigned,
  zoneNameKey:name=>String(name||'').toLowerCase().replace(/\\b(?:elementary|middle|high|school)\\b/g,'').replace(/[^a-z0-9]+/g,' ').trim()
 };
 vm.runInNewContext(fn,ctx);
 return {ctx,home,assigned,zipOnly,outside,setVerified:x=>verified=x,setPicked:x=>picked=x,
   view:()=>ctx.addressSchoolView()};
}
test('ZIP campus is never interpreted as assigned after address lookup',()=>{
 const h=setup();
 assert.equal(h.view().kind,'unverified');
 assert.equal(h.view().schools.length,0,'No automatic home assignment is approved');
 h.setPicked([h.assigned]);
 assert.equal(h.view().kind,'manual');
 assert.equal(h.view().schools.length,1);
 assert.equal(h.view().schools[0],h.assigned,'Manual Finder selection outside ZIP school filter is retained');
 assert.ok(!h.view().schools.includes(h.zipOnly),'Nearby A school must be hidden even if grade filter is A');
});
test('2026–27 official GIS candidates appear as text evidence, NEVER as assignment markers',()=>{
 const h=setup();
 h.home.schoolReferencePlan={
  kind:'reference-only',year:'2026–27',district:'PISD',
  source:'unapproved district',candidates:[{school:'ASSIGNED_E',level:'초등'}]
 };
 assert.equal(h.view().kind,'unverified','No unreviewed district/year source is allowed');
 h.home.schoolReferencePlan={
  kind:'reference-only',year:'2026–27',district:'FISD',
  source:'Frisco ISD 2026–27 GIS',officialUrl:'https://www.friscoisd.org/page/2026-2027-zones/',
  candidates:[{school:'ASSIGNED_E',level:'초등',grades:'K–5'},
    {school:'UNMATCHED MIDDLE',level:'중등',grades:'6–8'}],
  missing:['고등'],notices:[]
 };
 const v=h.view();
 assert.equal(v.kind,'gis-reference');
 assert.equal(v.candidates.length,2,'Current-year source names appear even if the campus catalog is incomplete');
 assert.equal(v.schools.length,0,'No home school markers or certified list without independent E2E Finder grant');
 assert.equal(v.candidates[0].school,null,'A school in a different district must never be linked to Frisco');
 h.home.schoolReferencePlan={...h.home.schoolReferencePlan,district:'FISD',year:'2025–26'};
 assert.equal(h.view().kind,'unverified','Stale GIS is never displayed as current');
 h.home.schoolReferencePlan={kind:'unavailable',reason:'경계 자료 없음'};
 assert.equal(h.view().kind,'unverified');
 assert.match(h.view().reason,/경계 자료/);
});

test('Plano/Lewisville live Finder GIS can populate only source-year-warning reference cards',()=>{
 const h=setup();
 const original={
  kind:'reference-only',district:'PISD',year:'GIS 원본 2025–26',
  referenceOnlyFinderVintage:true,
  officialUrl:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder',
  candidates:[{school:'ASSIGNED_E',level:'초등',yearNote:'GIS 2025–26'},
   {school:'ZIP_ONLY',level:'중등',yearNote:'GIS 2025–26'}]
 };
 h.home.schoolReferencePlan=original;
 let view=h.view();
 assert.equal(view.kind,'gis-reference');
 assert.equal(view.schools.length,0,'Reference cards must not become assigned schools');
 assert.equal(view.candidates[0].school,h.assigned);
 assert.equal(view.candidates[0].yearNote,'GIS 2025–26');
 assert.equal(h.ctx.referenceCandidateSchoolLocations(view).length,2);
 h.home.schoolReferencePlan={...original,referenceOnlyFinderVintage:false};
 assert.equal(h.view().kind,'unverified','Require explicit mixed-vintage safety bit');
 h.home.schoolReferencePlan={...original,district:'AISD'};
 assert.equal(h.view().kind,'unverified','Other districts cannot spoof vintage approval');
 const lisd={name:'LISD SCHOOL',district:'LISD',type:'elementary',ll:[33.1,-96.8]};
 h.ctx.state.schools.push(lisd);
 h.home.schoolReferencePlan={...original,district:'LISD',
  candidates:[{school:'LISD SCHOOL',level:'초등',yearNote:'적용 학년도 미확인'}]};
 view=h.view();
 assert.equal(view.kind,'gis-reference');
 assert.equal(view.candidates[0].school,lisd);
 assert.equal(view.candidates[0].yearNote,'적용 학년도 미확인');
 assert.equal(view.schools.length,0);
});
test('selected campus must be a current exact directory object and attached to this home',()=>{
 const h=setup();
 h.setPicked([h.assigned,h.assigned,{name:'GHOST',district:'PISD'}]);
 assert.equal(h.view().schools.length,1,'Duplicate and non-catalog campuses are rejected');
 h.ctx.home={assignment:{status:'conditional-finder-only'}};
 assert.equal(h.view().schools.length,0,'Manual schools must not leak into a new address');
});
test('certified district source, when independently authorized, takes precedence over manual choices',()=>{
 const h=setup();
 h.setPicked([h.zipOnly]);
 h.setVerified(true);
 assert.equal(h.view().kind,'certified');
 assert.deepEqual(Array.from(h.view().schools,s=>s.name),['ASSIGNED_E']);
});
test('Prosper current-year GIS-listed new middle campus stays in school rail without a fabricated building pin',()=>{
 const h=setup();
 const noPoint={name:'Jim Bridges Middle School',district:'PROSPER',type:'middle',
   address:'3225 East Frontier Parkway, Prosper, TX 75078',ll:null};
 const withPoint={name:'Prosper High School',district:'PROSPER',type:'high',ll:[33.24,-96.79]};
 const wrongDistrict={name:'Jim Bridges Middle School',district:'FISD',type:'middle',ll:[33.1,-96.7]};
 h.ctx.state.schools.push(noPoint,withPoint,wrongDistrict);
 h.home.schoolReferencePlan={kind:'reference-only',year:'2026–27',district:'PROSPER',
   source:'Prosper official 2026–27 GIS',candidates:[
    {school:'Jim Bridges Middle School',level:'중등'},
    {school:'Prosper High School',level:'고등'},
    {school:'NOT IN CATALOG',level:'초등'}]};
 const view=h.view();
 assert.equal(view.kind,'gis-reference');
 assert.deepEqual(Array.from(h.ctx.referenceCandidateSchoolRecords(view),s=>s.name),
   ['Jim Bridges Middle School','Prosper High School']);
 assert.deepEqual(Array.from(h.ctx.referenceCandidateSchoolLocations(view),s=>s.name),
   ['Prosper High School'],'Map markers require real building coordinates');
 assert.equal(view.schools.length,0,'Reference is never certified residence assignment');
 assert.equal(view.candidates[0].school,noPoint);
 h.ctx.state.schools.splice(h.ctx.state.schools.indexOf(noPoint),1);
 assert.deepEqual(Array.from(h.ctx.referenceCandidateSchoolRecords(view),s=>s.name),
   ['Prosper High School'],'Orphaned school object must never remain in rail');
 const rail=source.slice(source.indexOf('function drawList(){'),source.indexOf('function zoneNameKey('));
 assert.match(rail,/if\(railReference\)items=referenceCandidateSchoolRecords\(view\)/);
 assert.match(source,/mapButton\.textContent=hasCampusPoint\?'지도 위치 보기':'배정구역 참고 보기'/);
});

test('Prosper official GIS school cards use 9-digit campus identity for TEA grades',()=>{
 const h=setup();
 const school={id:'043912102',name:'JUDY RUCKER EL',district:'PROSPER',type:'elementary',ll:null};
 h.ctx.state.schools.push(school);
 h.ctx.state.ratings=[{id:'043912102',district:'PROSPER',rating:'A'}];
 h.home.schoolReferencePlan={kind:'reference-only',year:'2026–27',district:'PROSPER',
  candidates:[{school:'JUDY RUCKER EL',level:'초등',campusId:'043912102',schoolCode:'102'}]};
 const view=h.view();
 assert.equal(view.kind,'gis-reference');
 assert.equal(view.schools.length,0,'An official GIS zone must never grant enrollment');
 assert.equal(view.candidates[0].campusId,'043912102');
 assert.equal(view.candidates[0].verifiedRating,'A');
 assert.equal(view.candidates[0].school,school);
 school.id='043912999';
 assert.equal(h.view().candidates[0].school,null,'Contradictory school directory ID must not be linked');
 assert.equal(h.view().candidates[0].verifiedRating,'A','Rating is tied to source-audited campus ID, not an arbitrary pin');
 assert.match(source,/Prosper 2026–27 공식 GIS 기반 참고 학교/);
});

test('clearing address restores general ZIP exploration',()=>{
 const h=setup();
 h.ctx.home=null;
 assert.equal(h.view(),null);
});
test('production UI shows address-first panel and moves commute below map/results',()=>{
 assert.match(html,/id="homeAssignmentPriority"/);
 assert.match(html,/id="schoolAddressNotice"/);
 assert.match(html,/map-first-split\.css\?v=2/);
 assert.match(html,/dashboard-main\.js\?v=22/);
 assert.match(html,/home-lookup-v2\.js\?v=28/);
 assert.match(html,/home-school-manual-bridge\.js\?v=3/);
 assert.match(css,/\.shell>\.controls-grid>\.office-controls\{order:90/);
 assert.match(css,/\.shell>\.footer\{order:100/);
 assert.match(source,/GIS 기준 예상 배정학교/);
 assert.match(source,/GIS 예상 학교 · 공식 확인 별도/);
 assert.match(source,/let items=view\?view\.schools\.slice\(\):state\.schools/);
 assert.match(source,/const eligible=addressView\?addressView\.schools/);
 assert.match(source,/role="status".*주소별 배정학교 미확인/);
 assert.match(manual,/selectedSchools\(current\)/);
 assert.doesNotMatch(source.slice(begin,source.indexOf(' function drawSchools(){',end)),/innerHTML\s*=/,
  'Priority school names must be DOM text nodes, never raw HTML injection');
});

test('public GIS rail uses only linked current directory schools, never ZIP or the assignment list',()=>{
 const h=setup(),direct={id:'043907101',name:'GIS ELEM',district:'043907',type:'elementary',ll:[33.1,-96.6]};
 h.ctx.state.schools.push(direct);
 h.home.mckinneyCrosscheck={kind:'reference-only',district:'043907',
   independentOfficialAddressVerified:false,sourceYear:'2026-27',
   candidates:[{school:'GIS ELEM',level:'elementary',levelText:'초등',
     matchedSchool:direct},{school:'UNLINKED HIGH',level:'high',matchedSchool:null}]};
 const view=h.view();
 assert.equal(view.kind,'mckinney-reference');
 assert.equal(view.schools.length,0);
 assert.deepEqual(Array.from(h.ctx.referenceCandidateSchoolLocations(view),s=>s.name),['GIS ELEM']);
 assert.deepEqual(Array.from(h.ctx.referenceCandidateSchoolRecords(view),s=>s.name),['GIS ELEM']);
 view.candidates[0].campusId='043907999';
 assert.equal(h.ctx.referenceCandidateSchoolLocations(view).length,0,'Provider Campus ID conflict is excluded from GIS rail');
 delete view.candidates[0].campusId;
 h.ctx.state.schools=[h.assigned,h.zipOnly,h.outside];
 assert.equal(h.ctx.referenceCandidateSchoolLocations(view).length,0,
   'removed campus cannot remain in reference school rail');
 assert.equal(h.ctx.home.assignment.status,'conditional-finder-only');
 const rail=source.slice(source.indexOf('function drawList(){'),source.indexOf('function zoneNameKey('));
 assert.match(rail,/items=referenceCandidateSchoolRecords\(view\)/);
 assert.match(rail,/railReference\?'<span class="other-label">'\+\(view\.kind==='allen-reference'/);
 assert.match(rail,/GIS 참고 후보 · 배정 미인증/);
 assert.match(rail,/view\?\.kind==='certified'&&homeSchoolMatches\(s\)/);
});


test('owner-authorized Prosper reference GIS outlines require exact source/year and all E/M/H campus identities',()=>{
 const begin=source.indexOf('function prosperReferenceZonePlan(');
 const end=source.indexOf('let prosperReferenceZoneGroup=',begin);
 assert.ok(begin>0&&end>begin,'independent Prosper reference planner must exist');
 const harness={};
 vm.runInNewContext(source.slice(begin,end),harness,{timeout:1000});
 const official=JSON.parse(fs.readFileSync('prosper-attendance-2026.geojson','utf8'));
 const features=['elementary','middle','high'].map(level=>
  official.features.find(f=>f.properties.gradeLevel===level));
 assert.ok(features.every(Boolean));
 const raw={district:'PROSPER',status:'current',features};
 const plan={
  kind:'reference-only',district:'PROSPER',year:'2026–27',missing:[],
  candidates:features.map(f=>({
   level:{elementary:'초등',middle:'중등',high:'고등'}[f.properties.gradeLevel],
   school:f.properties.school,campusId:f.properties.campusId,
   schoolCode:f.properties.schoolCode
  }))
 };
 const selected={geocodeQuality:{usableForSchoolCandidate:true},schoolReferencePlan:plan};
 assert.equal(harness.prosperReferenceZonePlan(selected,raw).length,3);
 assert.equal(harness.prosperReferenceZonePlan({...selected,geocodeQuality:{usableForSchoolCandidate:false}},raw),null);
 assert.equal(harness.prosperReferenceZonePlan(selected,{...raw,status:'boundary-review'}),null);
 assert.equal(harness.prosperReferenceZonePlan(selected,{...raw,district:'FISD'}),null);
 assert.equal(harness.prosperReferenceZonePlan({...selected,schoolReferencePlan:{...plan,year:'2025–26'}},raw),null);
 assert.equal(harness.prosperReferenceZonePlan({...selected,schoolReferencePlan:{...plan,missing:['고등']}},raw),null);
 assert.equal(harness.prosperReferenceZonePlan(selected,{...raw,features:features.slice(0,2)}),null);
 assert.equal(harness.prosperReferenceZonePlan(selected,{...raw,features:[features[0],features[0],features[2]]}),null);
 assert.equal(harness.prosperReferenceZonePlan(selected,{...raw,features:[
  {...features[0],properties:{...features[0].properties,campusId:'043912999'}},
  features[1],features[2]
 ]}),null);
 assert.equal(harness.prosperReferenceZonePlan(selected,{...raw,features:[
  {...features[0],properties:{...features[0].properties,sourceVintage:'2025–26'}},
  features[1],features[2]
 ]}),null);
 assert.match(source,/const referenceVisible=drawProsperAddressReferenceZones\(selected\)/);
 assert.match(source,/prosperReferenceZoneGroup\?\.clearLayers\(\)/);
 assert.match(source,/status\.dataset\.evidence='prosper-2026-gis-reference'/);
 // The certificate gate remains untouched, and the reference shapes are never
 // copied into home.assignment or the certified school list.
 assert.match(source,/if\(window\.ConditionalSchoolRelease\?\.decide\?\.\(assignment\)\?\.allowed!==true\)/);
});


test('clearing selected address purges stale school cards and status from DOM',()=>{
 const start=source.indexOf('function renderAddressSchoolPriority(){');
 const stop=source.indexOf('function drawSchools(){',start);
 assert.ok(start>0&&stop>start,'address priority renderer boundaries available');
 const calls={};
 const nodes=Object.fromEntries(['homeAssignmentPriority','homeAssignmentPriorityStatus',
  'homeAssignmentPriorityDescription','homeAssignmentPrioritySchools'].map(k=>
  [k,{hidden:false,replaceChildren(){calls[k]=(calls[k]||0)+1;}}]));
 const ctx={addressSchoolView:()=>null,el:key=>nodes[key]||null};
 vm.runInNewContext(source.slice(start,stop),ctx,{timeout:1000});
 ctx.renderAddressSchoolPriority();
 assert.equal(nodes.homeAssignmentPriority.hidden,true);
 for(const key of ['homeAssignmentPriorityStatus','homeAssignmentPriorityDescription',
  'homeAssignmentPrioritySchools'])assert.equal(calls[key],1,key+' should be cleared');
});
