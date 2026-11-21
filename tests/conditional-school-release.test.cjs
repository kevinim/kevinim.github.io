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
 const home='./home-lookup-v2.js?v=28';
 assert.ok(html.includes(policy),'policy missing from public app');
 assert.ok(html.indexOf(policy)<html.indexOf(home),'release policy must load before address handler');
 const src=fs.readFileSync(path.join(root,'home-lookup-v2.js'),'utf8');
 assert.match(src,/home\.assignment=window\.ConditionalSchoolRelease\?\.apply\(rawSchoolCandidate\)/);
 assert.match(src,/\{status:'conditional-finder-only',releaseScope:'informational-only'\}/);
 assert.match(src,/if\(result\.status==='conditional-finder-only'\)/);
 assert.match(src,/공식 Finder 확인 필요/);
});


const {makeResidentialSchoolModel,compareResidentialSchoolReport}=require('../official-school-review.js');
function syntheticResidential(levels,district='PISD',status='finder-current'){
 return {district,status,features:Object.entries(levels).map(([level,school])=>({
  type:'Feature',properties:{gradeLevel:level,school},
  geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}
 }))};
}
test('address-first Plano explicitly compares E/M/9-10/senior as user-reported, never independently verified',()=>{
 const raw=syntheticResidential({elementary:'Haun Elementary',middle:'Robinson Middle',high:'Jasper High',senior:'Plano West Senior High'});
 const original=structuredClone(raw);
 const model=makeResidentialSchoolModel(raw,{precise:true,officialUrl:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder'});
 assert.equal(model.status,'reference-only');
 assert.deepEqual(model.gradeOrder,['elementary','middle','high','senior']);
 assert.deepEqual(model.candidates.map(x=>x.sourceVintage),Array(4).fill('2025–26 표기 GIS'));
 assert.equal(model.officialLookupIntegrated,false);
 const reported={
  exactAddressReviewed:true,schoolYear:'2026–27',residenceType:'house',
  schools:{elementary:'Haun Elementary School',middle:'Robinson MS',high:'Jasper HS',senior:'Plano West Senior High School'}
 };
 const matched=compareResidentialSchoolReport(model,reported);
 assert.equal(matched.matches,4);
 assert.equal(matched.requiredLevels,4);
 assert.equal(matched.status,'user-reported-all-levels-consistent');
 assert.equal(matched.certified,false);
 assert.equal(matched.independentOfficialLookup,false);
 assert.equal(gate.releaseSummary().currentYearResidentialDistrictApprovals,0);
 assert.deepEqual(raw,original,'manual comparison never mutates candidate/geometry');
 const wrong=compareResidentialSchoolReport(model,{...reported,schools:{...reported.schools,senior:'Plano Senior High'}});
 assert.equal(wrong.status,'user-reported-discrepancy');
 assert.equal(wrong.mismatches,1);
 const partial=compareResidentialSchoolReport(model,{...reported,schools:{elementary:'Haun Elementary',middle:'Robinson Middle'}});
 assert.equal(partial.status,'user-reported-partial-consistency');
 assert.equal(partial.matches,2);
 assert.equal(partial.reviewedLevels,2);
});

test('manual address check is fail-closed for old years, unchecked residence, imprecise pin and ambiguous GIS',()=>{
 const raw=syntheticResidential({elementary:'School A',middle:'School B',high:'School C'});
 const model=makeResidentialSchoolModel(raw,{precise:true});
 const input={exactAddressReviewed:true,schoolYear:'2026–27',residenceType:'house',
  schools:{elementary:'School A',middle:'School B',high:'School C'}};
 for(const [change,code] of [
  [x=>x.schoolYear='older','year-unconfirmed'],
  [x=>x.exactAddressReviewed=false,'exact-address-unconfirmed']
 ]){
  const copy=structuredClone(input);change(copy);
  assert.equal(compareResidentialSchoolReport(model,copy).results[0].status,code);
 }
 const imprecise=makeResidentialSchoolModel(raw,{precise:false});
 assert.equal(imprecise.status,'imprecise-address');
 assert.equal(compareResidentialSchoolReport(imprecise,input).matches,0);
 const split=makeResidentialSchoolModel({...raw,status:'apartment-split-review'},{precise:true});
 assert.equal(split.status,'gis-reference-unavailable');
 assert.equal(compareResidentialSchoolReport(split,input).matches,0);
 const duplicate=makeResidentialSchoolModel({...raw,features:[...raw.features,
  {type:'Feature',geometry:raw.features[0].geometry,properties:{gradeLevel:'elementary',school:'School D'}}]},{precise:true});
 assert.equal(compareResidentialSchoolReport(duplicate,input).results[0].status,'nonunique-reference');
 assert.equal(makeResidentialSchoolModel({...raw,district:'UNKNOWN'},{precise:true}).status,'district-unknown');
});

test('Lewisville apartment never auto-matches even when all four user-entered names equal the GIS reference',()=>{
 const raw=syntheticResidential({elementary:'Central Elementary',middle:'Delay Middle',freshman:'Lewisville High 9th Grade',high:'Lewisville High'},'LISD');
 const model=makeResidentialSchoolModel(raw,{precise:true});
 assert.deepEqual(model.gradeOrder,['elementary','middle','freshman','high']);
 assert.match(model.candidates[3].sourceVintage,/2025–26/);
 const schools={elementary:'Central Elementary',middle:'Delay Middle',freshman:'Lewisville High 9th Grade',high:'Lewisville High'};
 const apartment=compareResidentialSchoolReport(model,{exactAddressReviewed:true,schoolYear:'2026–27',residenceType:'apartment',schools});
 assert.equal(apartment.matches,0);
 assert.equal(apartment.results.filter(x=>x.status==='apartment-requires-official-locator').length,4);
 assert.equal(apartment.certified,false);
 const house=compareResidentialSchoolReport(model,{exactAddressReviewed:true,schoolYear:'2026–27',residenceType:'house',schools});
 assert.equal(house.matches,4);
 assert.equal(house.certified,false);
});

test('home address UI exposes official comparison without persistence or new unauthorized remote API',()=>{
 const src=fs.readFileSync(path.join(root,'home-lookup-v2.js'),'utf8');
 const mod=fs.readFileSync(path.join(root,'official-school-review.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(src,/window\.HomeResidentialSchoolCheck\?\.mount\?\.\(/);
 assert.match(src,/document\.getElementById\('homeResidentialSchoolCrosscheck'\)\?\.remove\?\.\(\)/);
 assert.match(html,/official-school-review\.js\?v=3/);
 assert.match(html,/home-lookup-v2\.js\?v=28/);
 assert.ok(html.indexOf('official-school-review.js?v=3')<html.indexOf('home-lookup-v2.js?v=28'));
 assert.match(mod,/id='homeResidentialSchoolCrosscheck'/);
 assert.doesNotMatch(mod.slice(mod.indexOf('function makeResidentialSchoolModel')),/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML\s*=/);
 assert.match(mod,/user-transcribed-not-independent-official-address-result/);
 assert.equal(gate.releaseSummary().currentYearResidentialDistrictApprovals,0);
});
