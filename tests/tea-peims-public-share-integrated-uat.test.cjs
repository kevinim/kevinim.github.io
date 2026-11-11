'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const calc=require('../features/tea-peims-public-share-addon.js');
const data=require('../data/tea-ethnicity-2025-26-priority.json');
const INSIGHTS=require('../features/carrollton-school-insights.js');
const KEYS=['black','hispanic','white','native','asian','pacific','multi'];
const normalize=(entry)=>KEYS.map(key=>{
  const c=entry.counts[key];
  return {key,status:c.status,count:c.status==='published'?c.count:null};
});
test('2025–26 source coverage: all 2,282 published-only results preserve missing categories',t=>{
  assert.equal(data.schemaVersion,1);assert.equal(data.schoolYear,'2025-26');
  assert.equal(Object.keys(data.campuses).length,2282);
  let cfb=0,lis=0,eligible=0,priorityEligible=0,masked=0,unlisted=0,pub=0,full=0;
  for(const [id,entry] of Object.entries(data.campuses)){
    assert.match(id,/^\d{9}$/);
    const rows=normalize(entry);
    const result=calc.computePublishedShare(rows);
    assert.ok(result,'bad campus published-count stats '+id);
    assert.equal(result.published+result.suppressed+result.unlisted,7);
    assert.equal(result.wholeCampusPercentage,false);
    assert.equal(result.denominator,'published-only');
    assert.equal(result.canChart,result.published>=2&&result.subtotal>0);
    for(const row of result.rows){
      if(row.status!=='published'){assert.equal(row.percent,null);assert.equal(row.count,null);}
      else if(result.canChart)assert.ok(row.percent>=0&&row.percent<=100);
    }
    if(result.canChart)eligible++;
    if(result.published===7)full++;
    pub+=result.published;masked+=result.suppressed;unlisted+=result.unlisted;
    if(entry.district==='CFB'||entry.district==='LISD'){
      if(entry.district==='CFB')cfb++;else lis++;
      if(result.canChart)priorityEligible++;
    }
  }
  assert.deepEqual({cfb,lis},{cfb:35,lis:57});
  assert.equal(priorityEligible,90);
  assert.equal(full,6);
  assert.deepEqual({pub,masked,unlisted},{pub:8277,masked:5141,unlisted:2556});
  assert.ok(eligible>=1900);
  t.diagnostic('Partial known-subtotal share eligible: '+eligible+'/2282; CFB/LISD '+priorityEligible+'/92');
});
test('Hebron Valley official published subgroup numbers use 675-known-only denominator',()=>{
  const v=calc.computePublishedShare(normalize(data.campuses['061902118']));
  assert.ok(v);assert.equal(v.published,4);assert.equal(v.subtotal,675);
  assert.equal(v.suppressed+v.unlisted,3);assert.equal(v.canChart,true);
  const p=Object.fromEntries(v.rows.map(r=>[r.key,r.percent]));
  assert.equal(p.asian,36.4);assert.equal(p.white,27.3);
  assert.equal(p.hispanic,20.1);assert.equal(p.black,16.1);
  assert.equal(p.pacific,null);assert.equal(p.native,null);assert.equal(p.multi,null);
  assert.equal(v.wholeCampusPercentage,false);
});
test('malformed groups, conflicting counts and single published group fail closed',()=>{
 const base=normalize(data.campuses['061902118']);
 assert.equal(calc.computePublishedShare([...base.slice(0,6),base[5]]),null);
 assert.equal(calc.computePublishedShare([...base.slice(0,6)]),null);
 assert.equal(calc.computePublishedShare(base.map((x,i)=>i?x:{...x,count:-1})),null);
 assert.equal(calc.computePublishedShare(base.map((x,i)=>i?x:{...x,count:2.8})),null);
 assert.equal(calc.computePublishedShare(base.map(x=>x.status==='suppressed'?{...x,count:23}:x)),null);
 assert.equal(calc.computePublishedShare(base.map(x=>x.status==='not-listed'?{...x,count:0}:x)),null);
 assert.equal(calc.computePublishedShare(base.map(x=>({...x,status:'unknown'}))),null);
 const one=KEYS.map((key,i)=>({key,status:i===0?'published':'suppressed',count:i===0?12:null}));
 const res=calc.computePublishedShare(one);
 assert.equal(res.canChart,false);
 assert.ok(res.rows.every(x=>x.percent===null));
 const no=KEYS.map(key=>({key,status:'not-listed',count:null}));
 assert.equal(calc.computePublishedShare(no).canChart,false);
});
test('same-source audited full percentage gate from #247 remains independent',()=>{
 const source=data.campuses['043901001'];const rows=normalize(source);
 const a=calc.computePublishedShare(rows);
 assert.ok(a);assert.equal(a.published,7);
 const verified=INSIGHTS.auditedPeimsTotal('043901001',INSIGHTS.getPublishedCountRows('043901001')||rows);
 assert.equal(verified,5127,'existing independent enrollment denominator gate retained');
 assert.equal(INSIGHTS.auditedPeimsTotal('061902118',rows),null);
});
test('standalone script hookup, minimal CSP-friendly DOM and school context remain isolated',()=>{
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'features/tea-peims-public-share-addon.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'features/tea-peims-public-share-addon.css'),'utf8');
 assert.equal(html.split('tea-peims-public-share-addon.js?v=1').length-1,1);
 assert.equal(html.split('tea-peims-public-share-addon.css?v=1').length-1,1);
 assert.ok(html.indexOf('carrollton-school-insights.js?v=4')<html.indexOf('tea-peims-public-share-addon.js?v=1'));
 assert.match(js,/getPublishedCountRows/);
 assert.match(js,/insertAdjacentElement\('afterend'/);
 assert.doesNotMatch(js,/innerHTML\s*=/);
 assert.doesNotMatch(js,/(?:fetch|XMLHttpRequest)\s*\(/);
 assert.match(js,/학교 전체 인종 구성 비율과 다릅니다/);
 assert.match(css,/@media\(max-width:500px\)/);
 assert.match(css,/data-theme="dark"/);
});
