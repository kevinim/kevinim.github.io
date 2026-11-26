'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const picker=require('../features/school-boundary-pick.js');
const poly=(school,district,grade='elementary',campusId)=>({
 type:'Feature',properties:{school,sourceDistrict:district,gradeLevel:grade,
  ...(campusId?{campusId}:{})},
 geometry:{type:'Polygon',coordinates:[[[-97,33],[-96,33],[-96,34],[-97,33]]}
});
test('identity is district-and-grade scoped; never uses same name from a foreign ISD',()=>{
 const local={name:'Lincoln Elementary',district:'AISD',type:'elementary'};
 const foreign={name:'Lincoln Elementary',district:'FISD',type:'elementary'};
 const f=poly('Lincoln Elementary','AISD');
 assert.equal(picker.resolve(f,'AISD',[local,foreign]).school,local);
 assert.equal(picker.resolve(f,'FISD',[local,foreign]).status,'invalid');
 assert.equal(picker.resolve(poly('Lincoln Elementary','AISD','high'),'AISD',[local]).status,'unlinked');
});
test('two same-district catalog identities fail closed (no arbitrary first match)',()=>{
 const a={name:'Roosevelt Elementary',district:'FISD',type:'elementary'};
 const b={...a};
 const result=picker.resolve(poly('Roosevelt Elementary','FISD'),'FISD',[a,b]);
 assert.equal(result.status,'ambiguous');assert.equal(result.school,null);
});
test('source-provided campus ID is authoritative and mismatched ID never falls back to name',()=>{
 const exact={name:'Judy Rucker Elementary',district:'PROSPER',type:'elementary',id:'043912102'};
 const f=poly('JUDY RUCKER EL','PROSPER','elementary','043912102');
 assert.equal(picker.resolve(f,'PROSPER',[exact]).school,exact);
 f.properties.campusId='043912999';
 assert.equal(picker.resolve(f,'PROSPER',[exact]).status,'unlinked');
 f.properties.campusId='bad-id';
 assert.equal(picker.resolve(f,'PROSPER',[exact]).status,'invalid');
});
test('honoree surname-only GIS matches one Allen campus, never multiple candidates',()=>{
 const a={name:'Dr. Marvin Green Elementary',district:'AISD',type:'elementary'};
 const b={name:'Howard Green Elementary',district:'AISD',type:'elementary'};
 const f=poly('Green','AISD');
 assert.equal(picker.resolve(f,'AISD',[a]).school,a);
 assert.equal(picker.resolve(f,'AISD',[a,b]).status,'ambiguous');
 assert.equal(picker.resolve(poly('Green','FISD'),'FISD',[a]).status,'unlinked');
});
test('overlapping different school polygons block selection; same-school fragments are safe',()=>{
 const schoolA={name:'A'},schoolB={name:'B'};
 const inside=(_p,g)=>g?.within===true;
 const rows=[{school:schoolA,feature:{geometry:{within:true}}},
  {school:schoolA,feature:{geometry:{within:true}}}];
 assert.equal(picker.uniqueAtPoint(rows,[-96.5,33.5],inside).school,schoolA);
 rows.push({school:schoolB,feature:{geometry:{within:true}}});
 assert.equal(picker.uniqueAtPoint(rows,[-96.5,33.5],inside).status,'overlap');
 assert.equal(picker.uniqueAtPoint(rows,null,inside).status,'unavailable');
 assert.equal(picker.uniqueAtPoint(rows,[0,0],()=>false).status,'outside');
});
test('viewport bounding boxes exclude distant polygons and malformed coordinates',()=>{
 const f=poly('Test','AISD');
 assert.equal(picker.insideBounds(f.geometry,{west:-98,east:-95,south:32,north:35}),true);
 assert.equal(picker.insideBounds(f.geometry,{west:-94,east:-93,south:32,north:35}),false);
 f.geometry.coordinates[0][0][0]='malformed';
 assert.equal(picker.insideBounds(f.geometry,{west:-98,east:-95,south:32,north:35}),false);
});
test('all local official Prosper 31 source geometries retain strict distinct campus IDs',()=>{
 const data=JSON.parse(fs.readFileSync('prosper-attendance-2026.geojson','utf8'));
 assert.equal(data.features.length,31);
 const all=data.features.map(f=>({name:f.properties.school,district:'PROSPER',
  type:f.properties.gradeLevel,id:f.properties.campusId}));
 assert.equal(new Set(all.map(x=>x.id)).size,31);
 for(const feature of data.features){
  const match=picker.resolve(feature,'PROSPER',all);
  assert.equal(match.status,'matched',feature.properties.school);
  const wrong=picker.resolve(feature,'AISD',all);
  assert.equal(wrong.status,'invalid');
 }
});
test('all Allen historical source geometries must never select an unrelated district',()=>{
 const data=JSON.parse(fs.readFileSync('allen-attendance-historical.geojson','utf8'));
 assert.equal(data.features.length,20);
 const catalog=data.features.map(f=>({name:f.properties.school,district:'AISD',type:f.properties.gradeLevel}));
 for(const f of data.features){
  assert.equal(picker.resolve(f,'AISD',catalog).status,'matched',f.properties.school);
  assert.equal(picker.resolve(f,'FISD',catalog).status,'invalid');
  assert.equal(f.properties.current,false,'Historical is not current assignment');
 }
});
test('explicit enable is required; static site must retain original script and reference warnings',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const code=fs.readFileSync('features/school-boundary-pick.js','utf8');
 assert.match(html,/school-boundary-pick\.js\?v=1/);
 assert.match(code,/let enabled=false/);
 assert.match(code,/if\(!enabled\|\|!row\)return/);
 assert.match(code,/address·학교 목록 필터 밖/);
 assert.match(code,/학교 위치·경계는 거주지 공식 배정 인증이 아닙니다/);
 assert.ok(!/localStorage|sessionStorage/.test(code));
});
