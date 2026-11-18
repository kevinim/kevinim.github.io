'use strict';
const test=require('node:test');
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
test('clearing address restores general ZIP exploration',()=>{
 const h=setup();
 h.ctx.home=null;
 assert.equal(h.view(),null);
});
test('production UI shows address-first panel and moves commute below map/results',()=>{
 assert.match(html,/id="homeAssignmentPriority"/);
 assert.match(html,/id="schoolAddressNotice"/);
 assert.match(html,/map-first-split\.css\?v=2/);
 assert.match(html,/dashboard-main\.js\?v=15/);
 assert.match(html,/home-lookup-v2\.js\?v=24/);
 assert.match(html,/home-school-manual-bridge\.js\?v=3/);
 assert.match(css,/\.shell>\.controls-grid>\.office-controls\{order:90/);
 assert.match(css,/\.shell>\.footer\{order:100/);
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
 view.candidates[0].campusId='043907999';
 assert.equal(h.ctx.referenceCandidateSchoolLocations(view).length,0,'Provider Campus ID conflict is excluded from GIS rail');
 delete view.candidates[0].campusId;
 h.ctx.state.schools=[h.assigned,h.zipOnly,h.outside];
 assert.equal(h.ctx.referenceCandidateSchoolLocations(view).length,0,
   'removed campus cannot remain in reference school rail');
 assert.equal(h.ctx.home.assignment.status,'conditional-finder-only');
 const rail=source.slice(source.indexOf('function drawList(){'),source.indexOf('function zoneNameKey('));
 assert.match(rail,/items=referenceCandidateSchoolLocations\(view\)/);
 assert.match(rail,/railReference\?'<span class="other-label">GIS 참고 후보 · 배정 미인증/);
 assert.match(rail,/view\?\.kind==='certified'&&homeSchoolMatches\(s\)/);
});
