'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const report=require('../data/tea-ethnicity-2025-26-priority.json');
const inventory=require('../tea-ratings-2026.json').data;
const insights=require('../features/carrollton-school-insights.js');
const KEYS=['black','hispanic','white','native','asian','pacific','multi'];
test('official TEA statewide 2025-26 campus ethnicity rows match all 2,282 DFW inventory IDs',()=>{
  const cohorts={CFB:35,LISD:57,AISD:23,'043907':33,FISD:76,PISD:69,PROSPER:32,
    '061901':46,'057912':35,'057916':51,'057905':237,
    '220905':134,'220901':74,'057909':66,'057914':51,'220908':48,'057803':45,
    '057848':44,'061806':41,'220907':40,'057910':37,'061911':37,'220916':32,
    '220918':32,'220902':31,'129902':24,'199901':23,'220912':23,
    '043914':22,'126902':20,'220906':20,'070912':18,'043911':16,
    '057922':16,'091906':16,'057907':14,'070908':13,'199902':13};
  const expected=inventory;
  assert.equal(expected.length,2282);
  assert.equal(Object.keys(report.campuses).length,2282);
  assert.equal(Object.keys(report.sources).length,38);
  assert.equal(insights.validPeimsStatewideSource(report.statewideSource),true);
  assert.equal(report.schoolYear,'2025-26');
  for(const record of expected){
    const data=report.campuses[record.id];
    assert.ok(data,'missing official ethnicity campus '+record.id);
    assert.equal(data.district,record.district);
    assert.equal(insights.validPublishedCampus(record.id,data),true);
    assert.deepEqual(Object.keys(data.counts).sort(),KEYS.slice().sort());
  }
  for(const [district,n] of Object.entries(cohorts)){
    assert.equal(Object.values(report.campuses).filter(c=>c.district===district).length,n);
    assert.equal(insights.validPeimsSource(report.sources[district],district),true);
  }
});
test('all 2,282 dashboard school records have an official 2025-26 source and no guessed shares',()=>{
  let districtLinked=0,statewideLinked=0;
  const known=new Set(inventory.map(r=>r.id));
  for(const [id,record] of Object.entries(report.campuses)){
    assert.equal(known.has(id),true,'unmatched campus ID must be rejected '+id);
    const source=report.sources[record.district];
    if(source){assert.equal(insights.validPeimsSource(source,record.district),true);districtLinked++}
    else{assert.equal(insights.validPeimsStatewideSource(report.statewideSource),true);statewideLinked++}
  }
  assert.deepEqual({districtLinked,statewideLinked},{districtLinked:1644,statewideLinked:638});
});
test('statewide source is restricted to 2025-26 official TEA CSV and no district-key imputation',()=>{
  const u=report.statewideSource;
  assert.equal(insights.validPeimsStatewideSource(u),true);
  assert.equal(insights.validPeimsStatewideSource(u.replace('selsumm=sc','selsumm=ic')),false);
  assert.equal(insights.validPeimsStatewideSource(u.replace('loop=1','loop=2')),false);
  assert.equal(insights.validPeimsStatewideSource(u.replace('endyear=26','endyear=25')),false);
  assert.equal(insights.validPeimsStatewideSource(u.replace('grouping=e','grouping=g')),false);
  assert.equal(insights.validPeimsStatewideSource(u.replace('rptsvr1.tea.texas.gov','rptsvr1.tea.texas.gov.evil.com')),false);
  assert.equal(insights.validPeimsStatewideSource(u.replace('key=&','key=057903&')),false);
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
  assert.deepEqual({published,suppressed,unlisted,complete},{published:8277,suppressed:5141,unlisted:2556,complete:6});
  assert.equal(published+suppressed+unlisted,2282*7);
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
  assert.equal(report.campuses['043901001'].counts.asian.count,1426);
  assert.equal(report.campuses['043907002'].counts.asian.count,135);
  assert.equal(report.campuses['043905129'].counts.asian.count,262);
  assert.equal(report.campuses['043910008'].counts.asian.count,30);
  const allen=report.campuses['043901001'].counts;
  assert.equal(KEYS.every(k=>allen[k].status==='published'),true);
  const total=KEYS.reduce((n,k)=>n+allen[k].count,0);
  assert.equal(total,5127);
  assert.equal(Math.round(1000*allen.asian.count/total)/10,27.8);
  for(const [id,n,asian] of [['057912046',753,49],['057912123',756,69]]){
    const groups=report.campuses[id].counts;
    assert.ok(KEYS.every(k=>groups[k].status==='published'),id+' should have all seven public TEA cells');
    assert.equal(KEYS.reduce((sum,k)=>sum+groups[k].count,0),n);
    assert.equal(groups.asian.count,asian);
  }
  assert.equal(report.campuses['043912118'].counts.asian.count,276);
  assert.equal(report.campuses['057916002'].district,'057916');
  assert.equal(report.campuses['057905001'].district,'057905');
  assert.equal(report.campuses['220905001'].counts.asian.count,13);
  assert.equal(report.campuses['220901002'].counts.asian.count,79);
  assert.equal(report.campuses['220907001'].counts.asian.count,281);
  assert.equal(report.campuses['220916001'].counts.asian.count,153);
  assert.equal(report.campuses['220918001'].counts.asian.count,131);
  assert.equal(report.campuses['220902001'].counts.asian.count,155);
  assert.equal(report.campuses['129902001'].counts.asian.count,62);
  assert.equal(report.campuses['199901001'].counts.asian.count,148);
  assert.equal(report.campuses['043914001'].counts.asian.count,702);
  const crowley=report.campuses['220912002'].counts;
  assert.equal(KEYS.every(k=>crowley[k].status==='published'),true);
  assert.equal(KEYS.reduce((n,k)=>n+crowley[k].count,0),3033);
  assert.equal(crowley.asian.count,105);
  for(const [id,total,asian] of [
    ['061911001',2806,102],
    ['061911007',2997,261]
  ]){
    const groups=report.campuses[id].counts;
    assert.ok(KEYS.every(k=>groups[k].status==='published'));
    assert.equal(KEYS.reduce((n,k)=>n+groups[k].count,0),total);
    assert.equal(groups.asian.count,asian);
  }
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

test('official count source rejects mismatched district, grouping, year and unsafe URL',()=>{
  const s=report.sources.AISD;
  assert.equal(insights.validPeimsSource(s,'AISD'),true);
  assert.equal(insights.validPeimsSource(s,'LISD'),false);
  assert.equal(insights.validPeimsSource(s.replace('endyear=26','endyear=25'),'AISD'),false);
  assert.equal(insights.validPeimsSource(s.replace('grouping=e','grouping=g'),'AISD'),false);
  assert.equal(insights.validPeimsSource(s.replace('rptsvr1.tea.texas.gov','fake.texas.gov'),'AISD'),false);
});
