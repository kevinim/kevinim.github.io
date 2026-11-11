'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const gate=require('../features/conditional-school-release.js');
const root=path.resolve(__dirname,'..');
const fixture=()=>({
 district:'FISD',verdict:'PASS',schoolYear:'2026-27',independentReview:true,
 sourceRightsApproved:true,evidenceSha256:'a'.repeat(64),
 checks:{residentialHoldouts:true,officialFinder:true,campusIdentity:true,
 currentYearPolygon:true,chromiumSchoolClick:true,gradeCoverage:true},
 gradeLevels:['elementary','middle','high']
});
const candidate=(status='current',district='FISD')=>({
 status,district,features:[{type:'Feature',properties:{school:'SYNTHETIC TEST CAMPUS',
 gradeLevel:'elementary'},geometry:{type:'Polygon',coordinates:[]}}]
});

test('all existing address-derived school candidates fail closed without real approved evidence',()=>{
 for(const district of ['FISD','PISD','AISD','LISD','PROSPER','CFB','043907','UNKNOWN']){
  for(const status of ['current','finder-current','boundary-review','finder-boundary-review','unverified-year']){
   const a=gate.apply(candidate(status,district));
   assert.equal(a.status,'conditional-finder-only',district+' '+status);
   assert.equal(a.features,undefined,'no unreviewed polygons may survive');
   assert.equal(gate.decide(candidate(status,district)).allowed,false);
  }
 }
 assert.equal(gate.releaseSummary().currentYearResidentialDistrictApprovals,0);
 assert.equal(gate.releaseSummary().externalPublicDeployment,'NOT_AUTHORIZED');
});

test('hard warnings and apartment exceptions remain available and do not become assigned schools',()=>{
 for(const status of ['apartment-split-review','feeder-review','conflict',
  'needs-address-verification','loading','error','unavailable']){
  assert.equal(gate.apply(candidate(status)).status,status);
  assert.equal(gate.decide(candidate(status)).allowed,false);
 }
});

test('synthetic positive grant proves the approval gate is reachable, but production list remains empty',()=>{
 const f=fixture();
 assert.equal(gate.certified('FISD',f),true);
 assert.equal(gate.decide(candidate(),{FISD:f}).allowed,true);
 assert.equal(gate.apply(candidate()).status,'conditional-finder-only');
 assert.equal(gate.decide(candidate('boundary-review'),{FISD:f}).allowed,false,
  'boundary adjacency must always require independent confirmation');
});

test('wrong district, vintage, licensing, holdouts or fabricated digest cannot approve',()=>{
 const edits=[
  f=>{f.district='CFB'},
  f=>{f.schoolYear='2025-26'},
  f=>{f.independentReview=false},
  f=>{f.sourceRightsApproved=false},
  f=>{f.evidenceSha256='synthetic'},
  f=>{f.checks.officialFinder=false},
  f=>{f.checks.chromiumSchoolClick=false},
  f=>{f.checks.residentialHoldouts=false},
  f=>{f.gradeLevels=['elementary','high']}
 ];
 for(const mutate of edits){let f=fixture();mutate(f);assert.equal(gate.certified('FISD',f),false);}
});

test('page loads fail-closed policy before home lookup, and renderHome actually downgrades assignments',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const policy='./features/conditional-school-release.js?v=1';
 const home='./home-lookup-v2.js?v=18';
 assert.ok(html.includes(policy),'policy missing from public app');
 assert.ok(html.indexOf(policy)<html.indexOf(home),'release policy must load before address handler');
 const src=fs.readFileSync(path.join(root,'home-lookup-v2.js'),'utf8');
 assert.match(src,/home\.assignment=window\.ConditionalSchoolRelease\?\.apply\(rawSchoolCandidate\)/);
 assert.match(src,/\{status:'conditional-finder-only',releaseScope:'informational-only'\}/);
 assert.match(src,/if\(result\.status==='conditional-finder-only'\)/);
 assert.match(src,/공식 Finder 확인 필요/);
});
