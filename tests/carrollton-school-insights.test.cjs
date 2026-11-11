'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const insights=require('../features/carrollton-school-insights.js');
const source=require('../tea-ratings-2026.json');
const pilotIds=[
  '057903122','057903105','057903126','057903102','057903118','057903112',
  '061902118','061902140','057903113','061902047','057903042','057903045',
  '061902054','057903046','057903006','061902008','057903002','057903001'
];
test('pilot includes 18 distinct CFB/LISD campuses with real 2026 rating IDs',()=>{
  assert.equal(insights.count,18);
  assert.equal(new Set(pilotIds).size,18);
  const lookup=new Map(source.data.map(r=>[r.id,r]));
  for(const id of pilotIds){
    const detail=insights.getRecord(id),rating=lookup.get(id);
    assert.ok(detail?.summary && detail?.strength && detail?.challenge,id+' missing analysis');
    assert.ok(rating && ['CFB','LISD'].includes(rating.district),id+' campus identity mismatch');
    assert.match(rating.official,new RegExp('id='+id));
  }
});
test('race percentages must be source-reviewed, complete, and around 100%',()=>{
  for(const id of ['061902118','061902008']){
    const demo=insights.getRecord(id).demographics;
    assert.equal(demo.year,'2024–25');
    assert.equal(insights.checkRace(demo.race),true);
    assert.equal(insights.getRaceRows(id).length,7);
    assert.match(demo.src,/^https:\/\/resources\.finalsite\.net\//);
  }
  assert.equal(insights.getRaceRows('057903102'),null,'missing CFB school demographics must not be estimated');
  assert.equal(insights.checkRace({black:50}),false);
  assert.equal(insights.checkRace({black:100,hispanic:0,white:0,native:0,asian:-1,pacific:0,multi:1}),false);
});
test('unknown and non-campus identifiers do not receive an insight',()=>{
  assert.equal(insights.getRecord('bad'),null);
  assert.equal(insights.getRecord('000000000'),null);
  assert.equal(insights.getRecord('061902118<script>'),null);
});

test('rollout covers all 148 TEA records in CFB, Lewisville, Allen, McKinney',()=>{
  const cohorts={'CFB':35,'LISD':57,'AISD':23,'043907':33};
  assert.deepEqual([...insights.rolloutDistricts].sort(),Object.keys(cohorts).sort());
  const matching=source.data.filter(r=>Object.hasOwn(cohorts,r.district));
  assert.equal(matching.length,148);
  for(const [code,count] of Object.entries(cohorts)){
    assert.equal(matching.filter(r=>r.district===code).length,count);
    const phase=insights.rolloutPhase(code);
    assert.equal(phase,code==='CFB'||code==='LISD'?1:code==='AISD'?2:3);
  }
  for(const record of matching){
    const result=insights.getSchoolInsight(record);
    assert.ok(result?.summary && result?.strength && result?.challenge,record.id);
    assert.equal(result.rolloutPhase,insights.rolloutPhase(record.district));
    if(!pilotIds.includes(record.id)&&!['043901001','043907002'].includes(record.id)){
      assert.equal(result.domains,undefined,'never invent domain metrics '+record.id);
      assert.equal(result.subjects,undefined,'never invent subject metrics '+record.id);
      assert.equal(result.demographics,undefined,'never invent race data '+record.id);
      assert.equal(result.evidenceStatus,'rating-only');
    }
  }
  const nonTarget=source.data.find(r=>r.district==='057905'&&r.rating==='A');
  assert.equal(insights.getSchoolInsight(nonTarget),null,'DFW further districts require staged rollout');
});
test('four campuses have individually source-linked ethnicity data',()=>{
  assert.equal(insights.verifiedEthnicityCount,4);
  for(const [id,cohort,headCount] of [
    ['061902118','LISD',424],
    ['061902008','LISD',3668],
    ['043901001','AISD',5206],
    ['043907002','043907',2668]
  ]){
    const record=source.data.find(x=>x.id===id);
    assert.equal(record?.district,cohort);
    const demo=insights.getSchoolInsight(record).demographics;
    assert.equal(demo.enrollment,headCount);
    assert.equal(demo.year,'2024–25');
    assert.equal(insights.checkRace(demo.race),true);
    assert.equal(insights.getRaceRows(id)?.length,7);
    assert.match(demo.src,/^https:\/\//);
  }
});
test('Not Rated remains not-a-performance-judgment and absent data never maps to zero',()=>{
  const sample=source.data.find(x=>x.district==='043907'&&x.rating==='Not Rated');
  assert.ok(sample);
  const r=insights.getSchoolInsight(sample);
  assert.equal(r.evidenceStatus,'rating-only');
  assert.match(r.summary,/미부여|확인되지/);
  assert.equal(r.domains,undefined);
  assert.equal(r.demographics,undefined);
  assert.equal(insights.getRaceRows(sample.id),null);
});
