'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const insights=require('../features/carrollton-school-insights.js');
const ratings=require('../tea-ratings-2026.json').data;
const peims=require('../data/tea-ethnicity-2025-26-priority.json');
const byId=new Map(ratings.map(x=>[x.id,x]));
const curated=['057903122','057903105','057903126','057903102','057903118','057903112',
'061902118','061902140','057903113','061902047','057903042','057903045',
'061902054','057903046','057903006','061902008','057903002','057903001'];
const audited={'043901001':5127,'057912046':753,'057912123':756,'061911001':2806,'061911007':2997,'220912002':3033};
const groups=['black','hispanic','white','native','asian','pacific','multi'];
const rows=id=>groups.map(k=>{const c=peims.campuses[id]?.counts[k];return {status:c?.status,count:c?.count};});
test('only two source-reviewed pilots show reviewed strengths; other 16 stay rating-only',()=>{
  assert.equal(curated.length,18);
  for(const id of curated){
    const x=insights.getSchoolInsight(byId.get(id));
    const reviewed=id==='061902118'||id==='061902008';
    assert.equal(x.evidenceStatus,reviewed?'reviewed':'rating-only',id);
    if(!reviewed){
      assert.equal(x.domains,undefined,id);
      assert.equal(x.subjects,undefined,id);
      assert.match(x.summary,/종합 평가|미부여|확인되지/,id);
      assert.match(x.strength,/확인된 공식|공식 종합/,id);
      assert.match(x.challenge,/원문 확인 필요/,id);
    }else{
      assert.ok(insights.validDomains(x.domains),id);
      assert.ok(Object.keys(x.subjects).length>0,id);
    }
  }
});
test('only six independently gender-parity-audited PEIMS denominators allow 2025-26 full shares',()=>{
  for(const [id,total] of Object.entries(audited)){
    assert.ok(peims.campuses[id],id);
    assert.ok(groups.every(k=>peims.campuses[id].counts[k].status==='published'),id);
    assert.equal(insights.auditedPeimsTotal(id,rows(id)),total,id);
  }
  const allPublic=Object.entries(peims.campuses)
    .filter(([id,x])=>groups.every(k=>x.counts[k].status==='published')).map(([id])=>id);
  for(const id of allPublic)if(!Object.hasOwn(audited,id))
    assert.equal(insights.auditedPeimsTotal(id,rows(id)),null,'unverified enrollment cannot yield percentages '+id);
  assert.ok(allPublic.length>=6);
  assert.equal(insights.auditedPeimsTotal('220912002',rows('220912002')),3033);
});
test('invalid, masked, tampered or incomplete data cannot enable percentages',()=>{
  const good=rows('043901001');
  assert.equal(insights.auditedPeimsTotal('043901001',good),5127);
  assert.equal(insights.auditedPeimsTotal('043901001',good.slice(0,6)),null);
  assert.equal(insights.auditedPeimsTotal('043901001',good.map((x,i)=>i===1?{status:'suppressed',count:null}:x)),null);
  assert.equal(insights.auditedPeimsTotal('043901001',good.map((x,i)=>i===1?{status:'published',count:x.count+1}:x)),null);
  assert.equal(insights.auditedPeimsTotal('043901001',good.map((x,i)=>i===1?{status:'published',count:-1}:x)),null);
  assert.equal(insights.auditedPeimsTotal('043901001<script>',good),null);
});
test('browser UAT uses Set.has as Boolean',()=>{
  const browser=readFileSync(require('node:path').join(__dirname,'../scripts/test-carrollton-tea-insights-browser.cjs'),'utf8');
  assert.ok(browser.includes('PUBLISHED_IDS.has(id)'));
  assert.ok(!browser.includes('PUBLISHED_IDS.has(id).some('));
});
