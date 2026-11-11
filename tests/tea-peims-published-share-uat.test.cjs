'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const calc=require('../uat/peims-published-share-preview.js');
const dataset=require('../data/tea-ethnicity-2025-26-priority.json');
const KEYS=['black','hispanic','white','native','asian','pacific','multi'];
test('2025–26 PEIMS source file allows safe published-only breakdown with no new data acquisition',()=>{
 assert.equal(dataset.schoolYear,'2025-26');
 assert.equal(Object.keys(dataset.campuses).length,694);
 let eligible=0,cfbEligible=0,cfbAll=0,complete=0,noChart=0;
 for(const [id,campus] of Object.entries(dataset.campuses)){
  assert.match(id,/^\d{9}$/);
  const result=calc.calculate(campus);
  assert.ok(result,'Invalid public campus data '+id);
  assert.deepEqual(result.rows.map(r=>r.key),KEYS);
  assert.equal(result.schoolTotalKnown,false);
  assert.equal(result.basis,'published-count-subtotal');
  assert.equal(result.published+result.suppressed+result.unlisted,7);
  for(const row of result.rows){
   if(row.status==='suppressed'||row.status==='not-listed'){
    assert.equal(row.percent,null);assert.equal(row.count,null);
   }
   if(row.percent!==null)assert.ok(row.percent>=0&&row.percent<=100);
  }
  if(result.canShow)eligible++;else noChart++;
  if(result.allSevenPublic)complete++;
  if(['CFB','LISD'].includes(campus.district)){
    cfbAll++;if(result.canShow)cfbEligible++;
  }
 }
 assert.deepEqual({eligible,noChart,complete,cfbAll,cfbEligible},{eligible:667,noChart:27,complete:3,cfbAll:92,cfbEligible:90});
});
test('a published-share percentage is not whole-school percentage when masks exist',()=>{
 const entry=dataset.campuses['061902118'];
 const result=calc.calculate(entry);
 assert.equal(result.published,4);
 assert.equal(result.suppressed+result.unlisted,3);
 assert.equal(result.subtotal,675);
 assert.equal(result.allSevenPublic,false);
 const shares=Object.fromEntries(result.rows.map(r=>[r.key,r.percent]));
 assert.equal(shares.asian,36.4);
 assert.equal(shares.white,27.3);
 assert.equal(shares.hispanic,20.1);
 assert.equal(shares.black,16.1);
 assert.equal(shares.native,null);
 assert.equal(shares.pacific,null);
 assert.equal(shares.multi,null);
});
test('masked cells cannot carry guessed numeric counts or inferred percentages',()=>{
 const source=dataset.campuses['061902118'];
 const corrupted={...source,counts:{...source.counts,multi:{status:'suppressed',publishedMask:'<50',count:25}}};
 assert.equal(calc.calculate(corrupted),null);
 assert.equal(calc.calculate({...source,counts:{...source.counts,asian:{status:'published',count:-1}}}),null);
 assert.equal(calc.calculate({...source,counts:{...source.counts,white:{status:'published',count:1.7}}}),null);
 assert.equal(calc.calculate({...source,counts:{...source.counts,native:{status:'not-listed',count:0}}}),null);
 assert.equal(calc.calculate({...source,counts:{...source.counts,asian:{status:'published',count:1e20}}}),null);
});
test('one or no public categories must not produce a misleading 100 percent chart',()=>{
 const one={counts:Object.fromEntries(KEYS.map((k,i)=>[k,i===0?{status:'published',count:12}:{status:'suppressed',publishedMask:'<10'}]))};
 const none={counts:Object.fromEntries(KEYS.map(k=>[k,{status:'not-listed'}]))};
 const oneResult=calc.calculate(one),zeroResult=calc.calculate(none);
 assert.equal(oneResult.canShow,false);
 assert.equal(oneResult.rows[0].percent,null);
 assert.equal(zeroResult.canShow,false);
 assert.equal(zeroResult.subtotal,0);
 assert.equal(calc.calculate({counts:{black:{status:'published',count:10}}}),null);
});
test('UAT presentation has strict same-origin static resources, mobile styles, and source note',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../uat/peims-published-share-preview.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../uat/peims-published-share-preview.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../uat/peims-published-share-preview.css'),'utf8');
 assert.match(html,/Content-Security-Policy/);
 assert.match(html,/script-src 'self'/);
 assert.match(html,/connect-src 'self'/);
 assert.match(html,/peims-published-share-preview.js/);
 assert.match(html,/peims-published-share-preview.css/);
 assert.match(html,/공개된 학생 인원 기준 비율/);
 assert.match(html,/학교 전체 학생 분포로 사용하면 안 됩니다/);
 assert.match(js,/document.createElement/);
 assert.doesNotMatch(js,/innerHTML\s*=/);
 assert.match(js,/same-origin/);
 assert.match(css,/@media\(max-width:570px\)/);
});
