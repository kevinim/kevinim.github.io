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
  homeSchoolMatches:s=>s===assigned
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
 assert.match(html,/dashboard-main\.js\?v=11/);
 assert.match(html,/home-lookup-v2\.js\?v=21/);
 assert.match(html,/home-school-manual-bridge\.js\?v=2/);
 assert.match(css,/\.shell>\.controls-grid>\.office-controls\{order:90/);
 assert.match(css,/\.shell>\.footer\{order:100/);
 assert.match(source,/const items=view\?view\.schools\.slice\(\):state\.schools/);
 assert.match(source,/const eligible=addressView\?addressView\.schools/);
 assert.match(source,/role="status".*주소별 배정학교 미확인/);
 assert.match(manual,/selectedSchools\(current\)/);
 assert.doesNotMatch(source.slice(begin,source.indexOf(' function drawSchools(){',end)),/innerHTML\s*=/,
  'Priority school names must be DOM text nodes, never raw HTML injection');
});
