'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../features/school-grade-zones-uat-core.js');
const rect=(school,level,kind='043907',id='043907101')=>({type:'Feature',
 properties:{school,gradeLevel:level,campusId:id,sourceDistrict:kind,
 sourceVintage:kind==='043907'?'2026–27 공식 School Zone Finder':kind==='AISD'?'2023':'공식 검색기 연결 · 학년도 미확인',
 current:kind==='AISD'?false:undefined},
 geometry:{type:'Polygon',coordinates:[[[-96.8,33.1],[-96.7,33.1],[-96.7,33.2],[-96.8,33.1]]]}});
const record={id:'043907101',district:'043907',name:'Test Elementary School',officialName:'TEST EL',rating:'A',score:95};
test('A only, B+, C+ thresholds never promote D/F or Not Rated',()=>{
 assert.deepEqual(['A','B','C','D','F','Not Rated'].filter(x=>core.thresholdPass(x,'B')),['A','B']);
 assert.deepEqual(['A','B','C','D','F'].filter(x=>core.thresholdPass(x,'C')),['A','B','C']);
 assert.deepEqual(['A','B','C'].filter(x=>core.thresholdPass(x,'A')),['A']);
});
test('McKinney current-year elementary Finder has a narrow preview eligibility gate',()=>{
 const f=rect('Test Elementary School','elementary');
 const out=core.build([f],[record],()=>record,{district:'043907',level:'elementary',threshold:'B',liveFinder:true});
 assert.equal(out.visible.length,1);
 assert.equal(out.visible[0].kind,'finder-2026-elementary');
 assert.equal(out.visible[0].rating,'A');
 assert.equal(core.build([f],[record],()=>record,{district:'043907',level:'elementary',threshold:'B',liveFinder:false}).visible.length,0);
 const older=structuredClone(f);older.properties.sourceVintage='2025–26';
 assert.equal(core.build([older],[record],()=>record,{district:'043907',level:'elementary',threshold:'B',liveFinder:true,showReference:true}).visible.length,0);
 const mid={...f,properties:{...f.properties,gradeLevel:'middle'}};
 assert.equal(core.sourceKind('043907','middle',mid,true),'reference-finder');
 assert.equal(core.build([mid],[{...record} ],()=>record,{district:'043907',level:'middle',threshold:'B',liveFinder:true}).visible.length,0);
});
test('Allen old geometry remains reference-only even when school earns a new A',()=>{
 const f=rect('Norton Elementary School','elementary','AISD','');
 const r={id:'043901101',name:'Norton Elementary School',officialName:'NORTON EL',district:'AISD',rating:'A',score:96};
 assert.equal(core.sourceKind('AISD','elementary',f), 'historical');
 assert.equal(core.build([f],[r],()=>r,{district:'AISD',threshold:'A'}).visible.length,0);
 const allowed=core.build([f],[r],()=>r,{district:'AISD',threshold:'A',showReference:true});
 assert.equal(allowed.visible.length,1);
 assert.equal(allowed.visible[0].kind,'historical');
});
test('Carrollton CFB never invents campus polygons; LISD permits labelled reference only',()=>{
 const cfb=rect('Castle Hills Elementary','elementary','CFB','');
 const cfbr={id:'057903101',name:'Castle Hills Elementary',officialName:'CASTLE HILLS EL',district:'CFB',rating:'A',score:91};
 assert.equal(core.build([cfb],[cfbr],()=>cfbr,{district:'CFB',threshold:'B',showReference:true}).visible.length,0);
 const lisd=rect('Hebron Valley Elementary','elementary','LISD','');
 const lisdr={id:'061902101',name:'Hebron Valley Elementary',officialName:'HEBRON VALLEY EL',district:'LISD',rating:'B',score:83};
 assert.equal(core.build([lisd],[lisdr],()=>lisdr,{district:'LISD',threshold:'B'}).visible.length,0);
 assert.equal(core.build([lisd],[lisdr],()=>lisdr,{district:'LISD',threshold:'B',showReference:true}).visible.length,1);
});
test('Reject ambiguous or incorrect-campus rating matches and preserve disconnected geometry',()=>{
 const f=rect('Test Elementary School','elementary');
 assert.equal(core.matchRating(f,'043907',[{...record,id:'043907999'}],()=>record),null);
 assert.equal(core.matchRating(f,'043907',[{...record,name:'Different School',officialName:'OTHER EL'}],()=>record)?.id,record.id,'Official Finder unique campus ID may resolve an abbreviated polygon name');
 assert.equal(core.build([f],[{...record,rating:'Not Rated',score:null}],()=>null,{district:'043907',threshold:'C',liveFinder:true}).visible.length,0);
 const result=core.build([f,structuredClone(f)],[record],()=>record,{district:'043907',threshold:'B',liveFinder:true});
 assert.equal(result.visible.length,2,'Do not omit discontiguous polygons of the same campus');
 assert.throws(()=>core.build([f],[record],()=>record,{district:'043907',threshold:'X',liveFinder:true}),RangeError);
});
test('Allen official TEA honorific names resolve uniquely to historical surname polygons',()=>{
 const a=rect('Norton Elementary School','elementary','AISD','');
 const record1={id:'043901108',district:'AISD',name:'Frances E Norton Elementary School',
   officialName:'FRANCES E NORTON EL',rating:'A',score:93};
 const matched=core.build([a],[record1],()=>null,{district:'AISD',threshold:'B',showReference:true});
 assert.equal(matched.visible.length,1);
 assert.equal(matched.visible[0].campusId,'043901108');
 const ambiguous={...record1,id:'043901777',name:'Another Norton Elementary School',officialName:'ANOTHER NORTON EL'};
 assert.equal(core.matchRating(a,'AISD',[record1,ambiguous],()=>null),null,
    'Never infer an alias with multiple same-level, same-surname campuses');
 const wrongLevel={...record1,name:'Frances E Norton Middle School',officialName:'FRANCES E NORTON MIDDLE'};
 assert.equal(core.matchRating(a,'AISD',[wrongLevel],()=>null),null);
});
test('Official McKinney campus ID resolves short school source name without fuzzy global matching',()=>{
 const f=rect('BENNETT','elementary','043907','043907120');
 const full={id:'043907120',district:'043907',name:'MRS. MARY E BENNETT ELEMENTARY',
   officialName:'MRS MARY E BENNETT EL',rating:'A',score:90};
 const good=core.build([f],[full],()=>null,{district:'043907',threshold:'B',liveFinder:true});
 assert.equal(good.visible.length,1);
 assert.equal(good.visible[0].campusId,'043907120');
 assert.equal(core.build([f],[{...full,id:'043907121'}],()=>null,{district:'043907',threshold:'B',liveFinder:true}).visible.length,0);
});
test('Preview is noindex and isolated from production, with strict source/assignment messaging',()=>{
 const root=fs.readFileSync('index.html','utf8');
 const preview=fs.readFileSync('school-grade-uat.html','utf8');
 const js=fs.readFileSync('features/school-grade-zones-uat.js','utf8');
 assert.ok(!root.includes('school-grade-zones-uat.js'));
 assert.match(preview,/name="robots" content="noindex,nofollow"/);
 assert.match(preview,/features\/school-grade-zones-uat-core\.js/);
 assert.match(preview,/features\/school-grade-zones-uat\.js/);
 assert.match(js,/학교별 등급·경계 참고자료/);
 assert.match(js,/초·중·고 배정/);
 assert.match(js,/참고 경계도 표시/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|XMLHttpRequest|fetch\s*\(/);
});
