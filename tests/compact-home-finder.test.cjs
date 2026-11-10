'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('home-lookup-v2.js','utf8');
const start=source.indexOf('// Show ONE relevant Finder destination');
const end=source.indexOf('function renderHome(){',start);
assert.ok(start>=0&&end>start,'compact component must exist ahead of renderHome');
const original=source.slice(start,end);
const official={
 LISD:'https://www.lisd.net/resources/families/school-locator',
 CFB:'https://www.cfbisd.edu/students/school-maps-locator-system',
 '057905':'https://www.dallasisd.org/departments/demographic-studies/find-your-school/schoolsite-locator-interactive-map',
 FISD:'https://www.friscoisd.org/page/2026-2027-zones/',
 AISD:'https://www.allenisd.org/page/findaschool',
 PROSPER:'https://www.prosper-isd.net/page/attendance-boundaries/',
 PISD:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder',
 '057912':'https://www.irvingisd.net/students-families/school-locator'
};
const nodes={},byId=id=>nodes[id];
const ctx={
 OFFICIAL:official,
 DISTRICT_REGISTRY:Object.fromEntries(Object.keys(official).map(k=>[k,{lookupKind:'address-search'}])),
 districtName:code=>({LISD:'Lewisville',CFB:'Carrollton–Farmers Branch','057905':'Dallas'})[code]||code,
 escape:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 window:{TrustedLinkPolicy:{official:url=>/^https:\/\/(www\.)?/.test(url)?url:null}},
 el:byId
};
vm.createContext(ctx);
vm.runInContext(original,ctx,{timeout:2000});
const model=(address,result)=>ctx.compactHomeFinderModel(address,result);

test('Carrollton 75010 prioritizes LISD link as a navigation hint, not certified zoning',()=>{
 const r=model('123 Example Road, Carrollton, Texas, 75010',{status:'unavailable'});
 assert.equal(r.likely,'LISD');
 assert.deepEqual(Array.from(r.near),['LISD','CFB','057905']);
 assert.equal(r.why,'도시·ZIP 기준 첫 확인 후보');
 assert.equal(model('123 Example Road, Carrollton, TX 75006',{status:'unavailable'}).likely,'CFB');
});
test('single validated GIS district overrides city hint; conflicts never choose an ISD',()=>{
 assert.equal(model('123 Example Road, Carrollton, TX 75010',{status:'finder-current',district:'CFB'}).likely,'CFB');
 const r=model('123 Example Road, Carrollton, TX 75010',{status:'conflict',matches:[{district:'LISD'},{district:'CFB'}]});
 assert.equal(r.likely,'');
 assert.equal(model('123 Example Road, Carrollton, TX 75010',{status:'needs-address-verification'}).likely,'');
 assert.equal(model('123 Example Road, Carrollton, TX 75010',{status:'apartment-split-review'}).likely,'');
 assert.equal(model('123 Example Road, Unlisted Town, TX 75000',{status:'unavailable'}).likely,'');
});
test('compact HTML renders ONE launch anchor and a SELECT rather than 100 visible buttons',()=>{
 const html=ctx.compactHomeFinderHtml('123 Example Road, Carrollton, TX 75010',{status:'unavailable'});
 assert.equal((html.match(/<a\b/g)||[]).length,1);
 assert.equal((html.match(/<select\b/g)||[]).length,1);
 assert.equal((html.match(/<option\b/g)||[]).length,1+Object.keys(official).length);
 assert.match(html,/id="homeFinderDistrict"/);
 assert.match(html,/id="homeFinderLaunch"/);
 assert.match(html,/LISD|Lewisville/);
 assert.match(html,/도시·ZIP 기준 첫 확인 후보/);
 assert.doesNotMatch(html,/href=".*\b123 Example Road\b/);
});
test('picker changes only validated official URL; unknown code disables launch',()=>{
 const listeners={};
 const input={value:'LISD',addEventListener:(name,fn)=>{listeners[name]=fn}};
 const link={hidden:false,href:official.LISD,style:{display:'inline-flex'},removeAttribute(k){delete this[k]}};
 const hint={textContent:''};
 Object.assign(nodes,{homeFinderDistrict:input,homeFinderLaunch:link,homeFinderHint:hint});
 ctx.wireCompactHomeFinder();
 input.value='CFB';listeners.change();
 assert.equal(link.href,official.CFB);
 assert.equal(link.hidden,false);
 input.value='invalid';listeners.change();
 assert.equal(link.hidden,true);
 assert.equal(link.style.display,'none');
 assert.equal(link.href,undefined);
});
test('home UI gates auto assignment and hides noisy parcel/manual tools behind details',()=>{
 assert.match(source,/window\.ConditionalSchoolRelease\?\.apply\(rawSchoolCandidate\)/);
 assert.match(source,/id="homeAdvancedSchoolTools"/);
 assert.match(source,/id="homeMapAssignmentStatus"/);
 assert.match(source,/parcelPanel\+officialReviewPanelHtml\(home\)/);
 assert.doesNotMatch(source,/Object\.entries\(OFFICIAL\)\.map\(\(\[id,url\]\)/);
 assert.match(source,/학군별 공식 배정 확인/);
 assert.match(source,/학교 자동 배정 미인증/);
});

test('official Texas school DISTRICT polygon safely overrides Carrollton ZIP routing, but not school assignment',()=>{
 const a='123 Example Road, Carrollton, Texas, 75006';
 ctx.home={address:a,ll:[33.06,-96.91],geocodeQuality:{usableForSchoolCandidate:true}};
 ctx.window.CfbJurisdiction={lookup:()=>({status:'district-reference',district:'LISD',sourceYear:'2025-26',isSchoolAttendanceZone:false})};
 try{
  let model=ctx.compactHomeFinderModel(a,{status:'unavailable'});
  assert.equal(model.likely,'LISD','True district boundary should outrank ZIP 75006 CFB guess');
  assert.match(model.why,/학군 외곽 GIS 참고/);
  assert.doesNotMatch(model.why,/배정학교 확정/);
  ctx.window.CfbJurisdiction.lookup=()=>({status:'boundary-review',district:'LISD'});
  model=ctx.compactHomeFinderModel(a,{status:'unavailable'});
  assert.equal(model.likely,'','Near a publisher-simplified boundary, disable the default finder link');
  ctx.home.geocodeQuality.usableForSchoolCandidate=false;
  model=ctx.compactHomeFinderModel(a,{status:'unavailable'});
  assert.equal(model.likely,'CFB','No high-quality coordinate: degrade to explicitly labeled city/ZIP only hint');
 }finally{delete ctx.home;delete ctx.window.CfbJurisdiction}
});
