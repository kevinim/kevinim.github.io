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
test('Plano current Finder publishes vintage-labeled four-level GIS references without official enrollment',()=>{
 const features=['elementary','middle','high','senior'].map(level=>{
  const f=school(level,'PLANO '+level.toUpperCase());
  Object.assign(f.properties,{sourceDistrict:'PISD',currentFinderSource:true,
   yearVerified2627:false,sourceVintage:'Current district Finder (source layer 2025–26)'});
  return f;
 });
 const raw={district:'PISD',status:'finder-current',features};
 const p=plan(raw);
 assert.equal(p.kind,'reference-only');
 assert.equal(p.referenceOnlyFinderVintage,true);
 assert.match(p.year,/2025–26/);
 assert.deepEqual(p.candidates.map(c=>c.level),['초등','중등','고등','Senior High']);
 assert.ok(p.candidates.every(c=>/2025–26/.test(c.yearNote)));
 assert.equal(p.missing.length,0);
 assert.equal(policy.apply(raw).status,'conditional-finder-only');
 for(const patch of [{sourceDistrict:'BAD'},{sourceVintage:'2026–27'},
  {currentFinderSource:false},{yearVerified2627:true}]){
  const changed={...features[0],properties:{...features[0].properties,...patch}};
  assert.equal(plan({...raw,features:[changed,...features.slice(1)]}).kind,'unavailable');
 }
 assert.equal(plan({...raw,status:'reference'}).kind,'unavailable','cached GIS not live');
 assert.equal(plan({...raw,status:'finder-boundary-review'}).kind,'unavailable','near-edge not safe');
});
test('Lewisville mixed-year Finder GIS may show only explicit levels and never certify apartments',()=>{
 const features=['elementary','middle','high'].map(level=>{
  const f=school(level,'LISD '+level.toUpperCase());
  Object.assign(f.properties,{
   yearVerified2627:false,verifiedYear:null,
   sourceYear:level==='high'?'2025-26':null,
   sourceVintage:level==='high'?'공식 검색기 연결 · 고등 레이어 2025–26 표기':'공식 검색기 연결 · 학년도 미확인'});
  return f;
 });
 const raw={district:'LISD',status:'finder-current',features};
 const p=plan(raw);
 assert.equal(p.kind,'reference-only');
 assert.equal(p.referenceOnlyFinderVintage,true);
 assert.ok(p.notices.some(x=>/아파트/.test(x)));
 assert.ok(p.candidates[2].yearNote.includes('2025–26'));
 assert.equal(policy.apply(raw).status,'conditional-finder-only');
 assert.equal(plan({...raw,status:'reference'}).kind,'unavailable');
 const tampered={...features[2],properties:{...features[2].properties,sourceYear:'2027-28'}};
 assert.equal(plan({...raw,features:[...features.slice(0,2),tampered]}).kind,'unavailable');
});
test('Prosper official GIS campus IDs are forwarded without upgrading residential certification',()=>{
 const f=school('elementary','JUDY RUCKER EL');
 Object.assign(f.properties,{sourceDistrict:'PROSPER',current:true,sourceYearConfirmed:true,
  sourceVintage:'2026–27',schoolYear:'2026–27',campusId:'043912102',schoolCode:'102'});
 const raw={district:'PROSPER',status:'current',features:[f]};
 const result=plan(raw);
 assert.equal(result.kind,'reference-only');
 assert.equal(result.candidates[0].campusId,'043912102');
 assert.equal(result.candidates[0].schoolCode,'102');
 assert.equal(result.warning.includes('실제 배정 미인증')||result.warning.includes('실제 주소별 배정학교가 아닙니다'),true);
 assert.equal(policy.apply(raw).status,'conditional-finder-only');
 for(const patch of [{campusId:'043907102'},{schoolCode:'bad'},{sourceVintage:'2025–26'}]){
  const changed={...f,properties:{...f.properties,...patch}};
  assert.equal(plan({...raw,features:[changed]}).kind,'unavailable',
   'Invalid Prosper source identity must not enter an address card');
 }
});


test('2026-27 Prosper new-student closures warn separately from current attendance geometry',()=>{
 const examples=[
  {id:'043912117',code:'117',name:'DAN CHRISTIE EL',from:'Christie',to:'Thomson'},
  {id:'043912042',code:'042',name:'Reynolds Middle School',from:'Reynolds',to:'Rushing'},
  {id:'043912046',code:'046',name:'Moseley Middle School',from:'Moseley',to:'Rushing'}
 ];
 for(const e of examples){
  const grade=e.code==='117'?'elementary':'middle';
  const f=school(grade,e.name);
  Object.assign(f.properties,{sourceDistrict:'PROSPER',current:true,sourceYearConfirmed:true,
   sourceVintage:'2026–27',schoolYear:'2026–27',campusId:e.id,schoolCode:e.code});
  const raw={district:'PROSPER',status:'current',features:[f]};
  const p=plan(raw);
  assert.equal(p.kind,'reference-only');
  assert.equal(p.candidates[0].school,e.name,'Do not substitute GIS school with enrollment placement');
  assert.ok(p.notices.some(t=>t.includes(e.from)&&t.includes(e.to)),e.name);
  assert.equal(p.capacityNoticeUrl,'https://www.prosper-isd.net/page/closed-to-enrollment');
  assert.ok(p.notices.some(t=>t.includes('퇴교 후 재등록')));
  assert.equal(policy.apply(raw).status,'conditional-finder-only');
  assert.equal(policy.releaseSummary().currentYearResidentialDistrictApprovals,0);
  if(e.code==='117')assert.ok(p.notices.some(t=>t.includes('유치원(K)')));
  const modified={...f,properties:{...f.properties,sourceVintage:'2025–26'}};
  assert.equal(plan({...raw,features:[modified]}).kind,'unavailable');
  const badId={...f,properties:{...f.properties,campusId:'043912999'}};
  assert.equal(plan({...raw,features:[badId]}).kind,'unavailable','campusId must agree with schoolCode');
 }
});
test('Prosper unrelated schools never receive a false capacity closure notice',()=>{
 const f=school('elementary','JUDY RUCKER EL');
 Object.assign(f.properties,{sourceDistrict:'PROSPER',current:true,sourceYearConfirmed:true,
  sourceVintage:'2026–27',schoolYear:'2026–27',campusId:'043912102',schoolCode:'102'});
 const p=plan({district:'PROSPER',status:'current',features:[f]});
 assert.equal(p.kind,'reference-only');
 assert.equal(p.notices.length,0);
 assert.ok(!('capacityNoticeUrl' in p));
 const x=preview.plan({district:'PROSPER',status:'current',features:[
  {...f,properties:{...f.properties,school:'DAN CHRISTIE EL',campusId:'043912117',schoolCode:'117'}}
 ]},DISTRICT_REGISTRY,()=>null);
 assert.equal(x.kind,'unavailable','untrusted official URL must not be accepted');
});

test('Frisco Nelson and McKinney transfer exceptions must not be silently hidden',()=>{
 const nelson=candidate();
 nelson.features[1].properties.school='Nelson Middle School';
 const p=plan(nelson);
 assert.equal(p.kind,'reference-only');
 assert.ok(p.notices.some(v=>v.includes('Wester Middle School')));
 assert.equal(plan(candidate()).notices.length,0);
 const mc=plan(candidate('043907','finder-current'));
 assert.equal(mc.kind,'reference-only');
 assert.ok(mc.notices.some(v=>v.includes('grandfathering')));
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

test('Plano 9–10 High and 11–12 Senior High must each be present independently',()=>{
 const make=level=>{
  const f=school(level,'SYNTHETIC PLANO '+level);
  Object.assign(f.properties,{sourceDistrict:'PISD',currentFinderSource:true,
   yearVerified2627:false,sourceVintage:'Current district Finder (source layer 2025–26)'});
  return f;
 };
 const raw={district:'PISD',status:'finder-current'};
 const seniorOnly=plan({...raw,features:['elementary','middle','senior'].map(make)});
 assert.equal(seniorOnly.kind,'reference-only');
 assert.deepEqual(seniorOnly.missing,['고등'],'Senior cannot fill missing 9–10 High');
 assert.ok(seniorOnly.notices.some(n=>n.includes('9–10')&&n.includes('11–12')));
 const highOnly=plan({...raw,features:['elementary','middle','high'].map(make)});
 assert.deepEqual(highOnly.missing,['Senior High'],'9–10 High cannot fill 11–12 Senior');
 const both=plan({...raw,features:['elementary','middle','high','senior'].map(make)});
 assert.deepEqual(both.missing,[]);
 assert.equal(both.referenceOnlyFinderVintage,true);
 assert.equal(policy.apply({...raw,features:['elementary','middle','senior'].map(make)}).status,'conditional-finder-only');
 assert.equal(policy.releaseSummary().currentYearResidentialDistrictApprovals,0);
});

test('reference renderer shows each campus vintage without claiming enrollment',()=>{
 const make=(district,level)=>{
  const f=school(level,'SYNTHETIC '+district+' '+level);
  Object.assign(f.properties,district==='PISD'?{
   sourceDistrict:'PISD',currentFinderSource:true,yearVerified2627:false,
   sourceVintage:'Current district Finder (source layer 2025–26)'}:{
   yearVerified2627:false,verifiedYear:null,sourceYear:level==='high'?'2025-26':null,
   sourceVintage:level==='high'?'공식 검색기 연결 · 고등 레이어 2025–26 표기':'공식 검색기 연결 · 학년도 미확인'});
  return f;
 };
 const doc={createElement(tag){return {
  tagName:tag,className:'',textContent:'',children:[],attributes:{},
  setAttribute(name,value){this.attributes[name]=value;},
  appendChild(el){this.children.push(el);return el;}
 };}};
 const target={ownerDocument:doc,children:[],
  replaceChildren(){this.children=[];},
  appendChild(el){this.children.push(el);return el;}};
 const walk=node=>[node,...(node.children||[]).flatMap(walk)];
 for(const [district,levels] of [
  ['PISD',['elementary','middle','high','senior']],
  ['LISD',['elementary','middle','high']]
 ]){
  const model=plan({district,status:'finder-current',features:levels.map(level=>make(district,level))});
  assert.equal(model.kind,'reference-only');
  assert.equal(preview.render(target,model),true);
  const nodes=walk(target);
  const labels=nodes.filter(n=>n.tagName==='small'&&n.className==='school-reference-vintage');
  assert.equal(labels.length,levels.length,'each displayed campus needs a visible source year');
  for(let i=0;i<levels.length;i++)
   assert.equal(labels[i].textContent,' · '+model.candidates[i].yearNote);
  assert.ok(nodes.some(n=>n.textContent.includes('참고 후보 · 실제 배정 미인증')));
  assert.equal(policy.releaseSummary().currentYearResidentialDistrictApprovals,0);
 }
});
