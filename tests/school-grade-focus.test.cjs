'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'..','dashboard-main.js'),'utf8');
const begin=js.indexOf('function schoolPassesRatingFilter(s){');
const end=js.indexOf('function clearSelectedSchoolIfFiltered(){',begin);
if(begin<0||end<0)throw new Error('Actual grade predicate missing');
const fnSource=js.slice(begin,end);
const scoreMap=new Map();
const state={ratingFilter:'all'};
const grade=vm.runInNewContext(fnSource+'\nschoolPassesRatingFilter;',{
 state,
 scoreRecord:(name,district)=>scoreMap.get(district+'|'+name)||null
});
function school(name,record){
 const s={name,district:'Synthetic'};
 if(record)scoreMap.set('Synthetic|'+name,record);
 return s;
}
test('TEA letter filters do not require numeric score',()=>{
 const a=school('A Campus',{rating:'A',score:null});
 const b=school('B Campus',{rating:'B',score:89});
 const c=school('C Campus',{rating:'C',score:70});
 for(const [key,expected] of [['A',[true,false,false]],['B',[false,true,false]],['C',[false,false,true]],['all',[true,true,true]]]){
  state.ratingFilter=key;
  assert.deepEqual([a,b,c].map(s=>grade(s)),expected,'grade '+key);
 }
});
test('Not Rated and missing TEA link are distinct from A–F',()=>{
 const none=school('Unlinked Campus');
 const nr=school('Unrated Campus',{rating:'Not Rated',score:null});
 const a=school('A Campus',{rating:'A',score:95});
 for(const [filter,expected] of [
  ['unrated',[false,true,false]],['unlinked',[true,false,false]],
  ['rated',[false,false,true]],['D',[false,false,false]],['F',[false,false,false]]
 ]){
  state.ratingFilter=filter;
  assert.deepEqual([none,nr,a].map(s=>grade(s)),expected,'grade '+filter);
 }
});
test('only known TEA grade values can be matched, and marker/list share a predicate',()=>{
 state.ratingFilter='arbitrary';
 assert.equal(grade(school('Campus',{rating:'arbitrary',score:99})),false);
 assert.match(js,/function drawSchools\(\)[\s\S]*schoolPassesRatingFilter\(s\)/);
 assert.match(js,/function drawList\(\)[\s\S]*schoolPassesRatingFilter\(s\)/);
 assert.match(js,/schoolFocusGroup\.clearLayers\(\)/);
 assert.match(js,/focusSelectedSchoolCampus\(s,fromList\)/);
});
