'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const preview=require('../features/school-reference-preview.js');
const policy=require('../features/conditional-school-release.js');
const safe=require('../trusted-link-policy.js');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const school=(level='elementary',name='SYNTHETIC CAMPUS')=>({
 type:'Feature',properties:{school:name,gradeLevel:level,grades:'K–5'},
 geometry:{type:'Polygon',coordinates:[[[-96.9,33],[-96.8,33],[-96.8,33.1],[-96.9,33]]]}
});
const candidate=(district='FISD',status='current')=>({district,status,features:[
 school('elementary','SYNTHETIC ELEMENTARY'),school('middle','SYNTHETIC MIDDLE'),school('high','SYNTHETIC HIGH')]});
const plan=x=>preview.plan(x,DISTRICT_REGISTRY,safe.official);
test('explicit reference preview keeps residential grant immutable and strips geometry',()=>{
 const raw=candidate();const p=plan(raw);
 assert.equal(p.kind,'reference-only');
 assert.equal(p.year,'2026–27');
 assert.equal(p.candidates.length,3);
 assert.equal(p.officialUrl,DISTRICT_REGISTRY.FISD.official);
 assert.equal(Object.hasOwn(p.candidates[0],'geometry'),false);
 assert.equal(Object.hasOwn(p,'address'),false);
 assert.equal(policy.apply(raw).status,'conditional-finder-only');
 assert.equal(policy.releaseSummary().currentYearResidentialDistrictApprovals,0);
});
test('only known, current published source statuses are previewable',()=>{
 for(const [district,status] of [['PROSPER','current'],['043907','finder-current']])
  assert.equal(plan(candidate(district,status)).kind,'reference-only',district);
 for(const [district,status] of [
  ['FISD','finder-current'],['PISD','finder-current'],['LISD','finder-current'],
  ['AISD','unverified-year'],['CFB','unavailable'],['043907','current'],['UNKNOWN','current']
 ])assert.equal(plan(candidate(district,status)).kind,'unavailable',district+status);
});
test('fail closed for boundary, feeder, split-home, conflict, uncertain coordinates, loading or errors',()=>{
 for(const status of ['boundary-review','finder-boundary-review','feeder-review',
  'apartment-split-review','conflict','needs-address-verification','loading','error','reference'])
  assert.equal(plan(candidate('FISD',status)).kind,'unavailable',status);
});
test('incomplete grade coverage noted; malformed, duplicate and excess features rejected',()=>{
 let p=plan({...candidate(),features:[school()]});
 assert.equal(p.kind,'reference-only');
 assert.deepEqual(p.missing,['중등','고등']);
 assert.equal(plan({...candidate(),features:[school(),school()]}).kind,'unavailable');
 assert.equal(plan({...candidate(),features:Array.from({length:17},(_,i)=>school('elementary','TEST '+i))}).kind,'unavailable');
 assert.equal(plan({...candidate(),features:[{...school(),geometry:{type:'Point',coordinates:[0,0]}}]}).kind,'unavailable');
 assert.equal(plan({...candidate(),features:[school('INVALID')]}).kind,'unavailable');
});
test('explicit stale or unconfirmed school feature year cannot be elevated by district registry',()=>{
 for(const props of [
  {schoolYear:'2025–26'}, {sourceVintage:'2024-25'}, {current:false}, {sourceYearConfirmed:false}
 ]){
  const fake=school(),old={...fake,properties:{...fake.properties,...props}};
  assert.equal(plan({...candidate(),features:[old]}).kind,'unavailable',
   'Stale feature must fail: '+JSON.stringify(props));
 }
 const valid=school();
 valid.properties.schoolYear='2026–27';
 assert.equal(plan({...candidate(),features:[valid]}).kind,'reference-only');
});
test('reject missing, spoofed, or non-allowlisted source link',()=>{
 assert.equal(preview.plan(candidate(),DISTRICT_REGISTRY,()=>null).kind,'unavailable');
 assert.equal(preview.plan(candidate(),{FISD:{...DISTRICT_REGISTRY.FISD,official:'https://evil.example/'}},safe.official).kind,'unavailable');
 assert.equal(preview.plan(candidate(),{FISD:{...DISTRICT_REGISTRY.FISD,currency:'finder'}},safe.official).kind,'unavailable');
});
test('preview is not part of the locked residential assignment or map matching path',()=>{
 const fs=require('node:fs'),src=fs.readFileSync('home-lookup-v2.js','utf8');
 assert.match(src,/home\.assignment=window\.ConditionalSchoolRelease\?\.apply\(rawSchoolCandidate\)/);
 assert.match(src,/referencePlan=window\.ConditionalSchoolRelease&&window\.SchoolReferencePreview\?\.plan/);
 assert.match(src,/home\.referencePreviewRequested=true/);
 assert.match(src,/const result=home\.assignment/);
 assert.doesNotMatch(src,/home\.assignment\s*=\s*referencePlan/);
});
