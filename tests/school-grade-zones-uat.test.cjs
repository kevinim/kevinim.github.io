'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../features/school-grade-zones-uat-core.js');
const clipper=require('../features/vendor/polygon-clipping-0.15.7.min.js');
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
function rectangle(x1,y1,x2,y2){
 return {type:'Polygon',coordinates:[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]};
}
function zoneItem(id,geom,extra={}){
 return {campusId:id,school:'Campus '+id,level:'elementary',district:'043907',
   kind:'finder-2026-elementary',rating:'A',score:93,
   feature:{type:'Feature',geometry:geom,properties:{gradeLevel:'elementary',school:'Campus '+id}},...extra};
}
test('Dissolve same-school adjoining cells into ONE outer polygon without inside seam',()=>{
 const cells=[zoneItem('043907101',rectangle(0,0,1,1)),
              zoneItem('043907101',rectangle(1,0,2,1)),
              zoneItem('043907101',rectangle(2,0,3,1))];
 const out=core.dissolveByCampus(cells,clipper);
 assert.equal(out.inputPieces,3);
 assert.equal(out.groups.length,1);
 assert.equal(out.errors.length,0);
 assert.equal(out.independentPieces,1);
 const union=out.groups[0].feature.geometry;
 assert.equal(union.type,'MultiPolygon');
 assert.equal(union.coordinates.length,1);
 const path=union.coordinates[0][0];
 for(let i=0;i<path.length-1;i++){
   const [x1,y1]=path[i],[x2,y2]=path[i+1];
   assert.ok(!(x1===x2&&(x1===1||x1===2)&&Math.min(y1,y2)<0.5&&Math.max(y1,y2)>0.5),
     'No internal vertical seam at x=1 or x=2');
 }
});
test('Dissolve preserves disconnected school islands and interior holes',()=>{
 const a=zoneItem('043907101',rectangle(0,0,2,2));
 const b=zoneItem('043907101',rectangle(5,0,6,1));
 const c=core.dissolveByCampus([a,b],clipper);
 assert.equal(c.independentPieces,2);
 assert.equal(c.groups[0].feature.geometry.coordinates.length,2);
 const withHole={type:'Polygon',coordinates:[
   [[0,0],[6,0],[6,6],[0,6],[0,0]],
   [[2,2],[2,4],[4,4],[4,2],[2,2]]
 ]};
 const d=core.dissolveByCampus([zoneItem('043907101',withHole),zoneItem('043907101',rectangle(6,0,7,6))],clipper);
 assert.equal(d.groups[0].feature.geometry.coordinates.length,1);
 assert.equal(d.groups[0].feature.geometry.coordinates[0].length,2,
   'Interior school boundary hole remains a hole, not a filled attendance region');
});
test('Adjacent different-school or reference-year geometries stay separate',()=>{
 const a=zoneItem('043907101',rectangle(0,0,1,1));
 const b=zoneItem('043907102',rectangle(1,0,2,1));
 const c=zoneItem('043907101',rectangle(0,1,1,2),{kind:'reference-finder'});
 const d=zoneItem('043907101',rectangle(0,2,1,3),{district:'LISD'});
 const out=core.dissolveByCampus([a,b,c,d],clipper);
 assert.equal(out.groups.length,4);
 assert.equal(out.groups.every(z=>z.sourceCount===1),true);
});
test('Dissolve caches unchanged campus groups and fails to fill-only, never guessed outlines',()=>{
 const cells=[zoneItem('043907101',rectangle(0,0,1,1)),zoneItem('043907101',rectangle(1,0,2,1))];
 let n=0;const counting={union(...xs){n++;return clipper.union(...xs)}};
 const cache=new Map();
 const first=core.dissolveByCampus(cells,counting,cache);
 const again=core.dissolveByCampus(cells,counting,cache);
 assert.equal(n,1);
 assert.equal(again.groups[0],first.groups[0]);
 const failure=core.dissolveByCampus(cells,{union(){throw Error('bad topology')}});
 assert.equal(failure.errors.length,1);
 assert.equal(failure.groups[0].feature,null);
 assert.equal(failure.groups[0].fallback.length,2);
 assert.equal(failure.groups[0].dissolved,false);
});
test('Local licensed clipping engine and UAT script refs are present, production untouched',()=>{
 const html=fs.readFileSync('school-grade-uat.html','utf8');
 const root=fs.readFileSync('index.html','utf8');
 const ui=fs.readFileSync('features/school-grade-zones-uat.js','utf8');
 const license=fs.readFileSync('features/vendor/polygon-clipping-LICENSE.md','utf8');
 assert.match(html,/features\/vendor\/polygon-clipping-0\.15\.7\.min\.js/);
 assert.match(license,/The MIT License/);
 assert.ok(html.indexOf('vendor/polygon-clipping')<html.indexOf('school-grade-zones-uat-core.js'));
 assert.ok(!root.includes('vendor/polygon-clipping'));
 assert.match(ui,/stroke:!item\.error/);
 assert.match(ui,/core\.dissolveByCampus/);
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
