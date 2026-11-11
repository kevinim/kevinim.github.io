'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const report=require('../data/tea-ethnicity-2025-26-priority.json');
const inventory=require('../tea-ratings-2026.json').data;
const insights=require('../features/carrollton-school-insights.js');
const KEYS=['black','hispanic','white','native','asian','pacific','multi'];
test('official 2025-26 campus-only ethnicity roster matches all CFB and LISD TEA IDs',()=>{
  const expected=inventory.filter(r=>['CFB','LISD'].includes(r.district));
  assert.equal(expected.length,92);
  assert.equal(Object.keys(report.campuses).length,92);
  assert.equal(report.schoolYear,'2025-26');
  for(const record of expected){
    const data=report.campuses[record.id];
    assert.ok(data,'missing official ethnicity campus '+record.id);
    assert.equal(data.district,record.district);
    assert.equal(insights.validPublishedCampus(record.id,data),true);
    assert.deepEqual(Object.keys(data.counts).sort(),KEYS.slice().sort());
  }
  assert.equal(Object.values(report.campuses).filter(c=>c.district==='LISD').length,57);
  assert.equal(Object.values(report.campuses).filter(c=>c.district==='CFB').length,35);
});
test('FERPA masking and source gaps never become guessed enrollment or percentages',()=>{
  let published=0,suppressed=0,unlisted=0,complete=0;
  for(const [id,record] of Object.entries(report.campuses)){
    assert.match(id,/^\d{9}$/);
    assert.equal(insights.validPublishedCampus(id,record),true);
    const statuses=KEYS.map(k=>record.counts[k].status);
    complete+=statuses.every(s=>s==='published')?1:0;
    for(const key of KEYS){
      const cell=record.counts[key];
      if(cell.status==='published'){
        assert.ok(Number.isSafeInteger(cell.count)&&cell.count>=0);published++;
        assert.equal(Object.hasOwn(cell,'publishedMask'),false);
      }else if(cell.status==='suppressed'){
        assert.equal(Object.hasOwn(cell,'count'),false);
        assert.match(cell.publishedMask,/^(?:<\d+|-999|N\/A)$/);
        suppressed++;
      }else{
        assert.equal(cell.status,'not-listed');
        assert.equal(Object.hasOwn(cell,'count'),false);unlisted++;
      }
    }
  }
  assert.deepEqual({published,suppressed,unlisted,complete},{published:393,suppressed:180,unlisted:71,complete:0});
  assert.equal(published+suppressed+unlisted,92*7);
});
test('source evidence and selected-campus known values remain exact',()=>{
  assert.equal(report.sources.LISD.includes('key=061902'),true);
  assert.equal(report.sources.CFB.includes('key=057903'),true);
  assert.match(report.sources.LISD,/^https:\/\/rptsvr1\.tea\.texas\.gov\/cgi\/sas\/broker\?/);
  assert.equal(report.campuses['061902118'].counts.asian.count,246);
  assert.equal(report.campuses['061902118'].counts.black.count,109);
  assert.equal(report.campuses['061902118'].counts.multi.publishedMask,'<50');
  assert.equal(report.campuses['061902118'].counts.pacific.status,'not-listed');
  assert.equal(report.campuses['061902136'].counts.asian.count,251);
  assert.equal(report.campuses['061902136'].counts.hispanic.status,'suppressed');
  assert.equal(report.campuses['061902140'].counts.asian.count,151);
});
test('public aggregate is free from per-student identifiers and numeric percentage guesses',()=>{
  const text=JSON.stringify(report);
  for(const pattern of [/"student_id"\s*:/i,/"date_of_birth"\s*:/i,/"first_name"\s*:/i,/"last_name"\s*:/i,/"ethnicityPercentage"\s*:/i]){
    assert.equal(pattern.test(text),false,'forbidden personal identifier or inferred percent');
  }
  assert.equal(report.policy.includes('Do not impute'),true);
});
test('invalid campus counts and suppressed count substitutions are rejected',()=>{
  const c=report.campuses['061902118'];
  assert.equal(insights.validPublishedCampus('061902118',{...c,counts:{...c.counts,multi:{status:'suppressed',publishedMask:'<50',count:25}}}),false);
  assert.equal(insights.validPublishedCampus('061902118',{...c,counts:{...c.counts,asian:{status:'published',count:-1}}}),false);
  assert.equal(insights.validPublishedCampus('057903118',c),false);
  assert.equal(insights.validPublishedCampus('061902118',{...c,district:'CFB'}),false);
});
