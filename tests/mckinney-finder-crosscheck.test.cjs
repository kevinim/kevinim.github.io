'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../features/mckinney-finder-crosscheck.js');
const SOURCE='https://www.mckinneyisd.net/page/attendance-zones-maps/';
const FINDER='https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125';
function feature(level,school,overrides={}){
 return {type:'Feature',properties:{gradeLevel:level,school,
   sourceYearRaw:'2026-27',sourceYear:'2026-27',
   ...(level==='elementary'?{verifiedYear:'2026-27'}:{}),...overrides},
  geometry:{type:'MultiPolygon',coordinates:[[[[-96.7,33.1],[-96.6,33.1],[-96.6,33.2],[-96.7,33.1]]]]}};
}
function fixture(){
 const schools=[
  {id:'043907101',district:'043907',name:'SYNTHETIC ELEM',type:'elementary'},
  {id:'043907102',district:'043907',name:'SYNTHETIC MIDDLE SCHOOL',type:'middle'},
  {id:'043907103',district:'043907',name:'SYNTHETIC HIGH SCHOOL',type:'high'}
 ];
 const ratings=schools.map(s=>({id:s.id,district:s.district,name:s.name,
  rating:'A',score:93}));
 return {geocodePrecise:true,sourceLive:true,
  registry:{'043907':{official:SOURCE}},official:u=>u===SOURCE?u:null,schools,ratings,
  raw:{district:'043907',status:'finder-current',features:[
   feature('elementary','SYNTHETIC ELEM',{campusId:'043907101'}),
   feature('middle','SYNTHETIC MIDDLE',{campusId:'043907102'}),
   feature('high','SYNTHETIC HIGH',{campusId:'043907103'})
  ]}};
}
test('official Finder GIS + TEA campus identities are crosschecked without granting enrollment',()=>{
 const p=api.crosscheck(fixture());
 assert.equal(p.kind,'reference-only');
 assert.equal(p.complete,true);
 assert.equal(p.identityMatched,3);
 assert.equal(p.directoryMatched,3);
 assert.equal(p.candidates[0].identityKind,'TEA-campus-id');
 assert.equal(p.candidates[0].verifiedRating,'A');
 assert.deepEqual(p.missing,[]);
 assert.deepEqual(p.candidates.map(c=>c.level),['elementary','middle','high']);
 assert.equal(p.candidates[0].yearStatus,'elementary-current-checked');
 assert.equal(p.candidates[1].yearStatus,'finder-year-labelled');
 assert.equal(p.candidates[2].yearStatus,'finder-year-labelled');
 assert.equal(p.independentOfficialAddressVerified,false);
 assert.equal(p.officialUrl,SOURCE);
 assert.equal(Object.hasOwn(p,'address'),false);
 assert.equal(Object.hasOwn(p,'coordinates'),false);
 assert.equal(Object.hasOwn(p,'geometry'),false);
 assert.equal(Object.hasOwn(p.candidates[0],'geometry'),false);
 assert.equal(Object.hasOwn(p.candidates[0],'address'),false);
});
test('the exact district-linked MetroStudy Finder is accepted; lookalike routes are not',()=>{
 const f=fixture();
 f.registry['043907'].official=FINDER;
 f.official=u=>u===FINDER?u:null;
 const accepted=api.crosscheck(f);
 assert.equal(accepted.kind,'reference-only');
 assert.equal(accepted.officialUrl,FINDER);
 f.registry['043907'].official='https://www.mckinneyisd.net/page/other-finder/';
 f.official=u=>u;
 assert.equal(api.crosscheck(f).code,'official-link-failed');
});

test('McKinney mailing city never overrides Frisco ISD GIS source',()=>{
 const f=fixture();f.raw.district='FISD';
 const p=api.crosscheck(f);
 assert.equal(p.kind,'unavailable');assert.equal(p.code,'other-district');
 assert.equal(p.candidates.length,0);
});
test('missing year on middle/high is clearly not described as 2026–27 verified',()=>{
 const f=fixture();
 f.raw.features[1].properties.sourceYearRaw=null;
 f.raw.features[1].properties.sourceYear=null;
 const p=api.crosscheck(f);
 assert.equal(p.kind,'reference-only');
 assert.equal(p.candidates[1].yearStatus,'year-not-on-feature');
 assert.match(p.candidates[1].yearNote,/학년도 미표기/);
});
test('older middle or high boundary is removed but valid school levels remain with warning',()=>{
 for(const level of ['middle','high']){
  const f=fixture();
  f.raw.features.find(x=>x.properties.gradeLevel===level).properties.sourceYearRaw='2025-26';
  const p=api.crosscheck(f);
  assert.equal(p.kind,'reference-only');
  assert.equal(p.complete,false);
  assert.equal(p.candidates.length,2);
  assert.ok(!p.candidates.some(x=>x.level===level));
  assert.ok(p.sourceWarnings.some(x=>x.includes('2025-26')));
  assert.ok(p.missing.includes(level==='middle'?'중등':'고등'));
 }
 const f=fixture();
 f.raw.features.forEach(x=>x.properties.sourceYearRaw='2025-26');
 assert.equal(api.crosscheck(f).code,'stale-source-year');
});
test('missing grade is explicitly disclosed rather than made up',()=>{
 const f=fixture();f.raw.features=f.raw.features.slice(0,2);
 const p=api.crosscheck(f);
 assert.equal(p.kind,'reference-only');assert.equal(p.complete,false);
 assert.deepEqual(p.missing,['고등']);assert.equal(p.candidates.length,2);
});
test('conflicting, boundary-edge, poor geocode and offline cases fail closed',()=>{
 for(const [overrides,code] of [
  [{geocodePrecise:false},'imprecise-address'],
  [{sourceLive:false},'live-source-unavailable'],
  [{raw:{status:'conflict',district:'043907',features:[]}},'ambiguous-boundary'],
  [{raw:{status:'finder-boundary-review',district:'043907',features:[]}},'ambiguous-boundary'],
  [{official:()=>null},'official-link-failed']
 ]){
  const p=api.crosscheck({...fixture(),...overrides});
  assert.equal(p.kind,'unavailable',code);assert.equal(p.code,code);
 }
});
test('duplicate levels, missing schema and campus identity conflicts cannot be misreported as exact schools',()=>{
 let f=fixture();
 f.raw.features.push(feature('middle','ANOTHER MIDDLE'));
 assert.equal(api.crosscheck(f).code,'multiple-schools-one-level');
 f=fixture();f.raw.features[0].geometry={type:'Point',coordinates:[0,0]};
 assert.equal(api.crosscheck(f).code,'malformed-feature');
 f=fixture();f.schools.push({...f.schools[0]});
 assert.equal(api.crosscheck(f).code,'identity-conflict');
 f=fixture();f.raw.features[0].properties.campusId='043907999';
 // A missing ID join still allows unique normalised name comparison,
 // but never marks that provider ID as an independently verified campus.
 const sourceOnly=api.crosscheck(f).candidates[0];
 assert.equal(sourceOnly.linked,true);
 assert.equal(sourceOnly.identityKind,'TEA-name-only');
 assert.equal(sourceOnly.teaCampusId,null,'A contradictory provider ID cannot become a verified TEA ID');
});
test('source never logs or persists residential address; existing hard NO-GO remains active',()=>{
 const fs=require('node:fs');
 const src=fs.readFileSync('features/mckinney-finder-crosscheck.js','utf8');
 const policy=require('../features/conditional-school-release.js');
 assert.doesNotMatch(src,/localStorage|sessionStorage|indexedDB|console\.log|navigator\.sendBeacon/);
 assert.equal(policy.releaseSummary().currentYearResidentialDistrictApprovals,0);
 assert.equal(policy.releaseSummary().automaticSchoolAssignment,'NO_GO');
});

test('one-click official locator URL pre-fills an explicitly selected public address only after consent',()=>{
 const address='1400 Wilson Creek Pkwy, McKinney, TX 75069';
 const allowed={district:'043907',officialUrl:FINDER,homeAddress:address,
  usableForSchoolCandidate:true,explicitClick:true};
 const destination=api.officialAddressHandoff(allowed);
 assert.equal(typeof destination,'string');
 const url=new URL(destination);
 assert.equal(url.origin,'https://portal.metrostudygis.com');
 assert.equal(url.pathname,'/arcgis/apps/webappviewer/index.html');
 assert.equal(url.searchParams.get('id'),'ed198c434d47474b88709e98d1f0a125');
 assert.equal(url.searchParams.get('find'),address);
 assert.equal(url.searchParams.size,2,'No coordinates or tracking identifiers');
 for(const change of [
  {explicitClick:false},{usableForSchoolCandidate:false},{district:'FISD'},
  {officialUrl:'https://evil.invalid/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125'},
  {officialUrl:SOURCE},{homeAddress:'McKinney, TX'},{homeAddress:'1421 Fake Road, NY'},
  {homeAddress:'12 Main St, McKinney, TX\nextra'},{homeAddress:'A'.repeat(200)+' McKinney TX'}
 ]){
  assert.equal(api.officialAddressHandoff({...allowed,...change}),null,JSON.stringify(change).slice(0,50));
 }
});
test('dashboard exposes click-only address handoff with explicit third-party address disclosure',()=>{
 const fs=require('node:fs');
 const s=fs.readFileSync('home-lookup-v2.js','utf8');
 assert.match(s,/mckinneyOfficialAddressSearch/);
 assert.match(s,/explicitClick:true/);
 assert.match(s,/window\.open\(url,'_blank','noopener,noreferrer'\)/);
 assert.match(s,/클릭하면 선택한 주소가 MetroStudy/);
 assert.doesNotMatch(s.slice(s.indexOf('function wireCompactHomeFinder(){'),
  s.indexOf('// Preserve advanced tools across a same-home asynchronous redraw.')),
  /localStorage|sessionStorage|console\.log|fetch\(/);
 assert.equal(require('../features/conditional-school-release.js')
  .releaseSummary().currentYearResidentialDistrictApprovals,0);
});
