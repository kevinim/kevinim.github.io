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
