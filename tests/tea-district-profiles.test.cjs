'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const insights=require('../features/carrollton-school-insights.js');
const acc=require('../data/tea-accountability-2026-verified-batch.json');
const staar=require('../data/tea-staar-meets-2026-verified-batch.json');
const peims=require('../data/tea-ethnicity-2025-26-priority.json');
const ratings=require('../tea-ratings-2026.json').data;
const dir=path.join(__dirname,'..','data','tea-district-profiles-2026');
const names=fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort();
const get=code=>JSON.parse(fs.readFileSync(path.join(dir,code+'.json'),'utf8'));
const rated=id=>ratings.find(r=>r.id===id);

test('181 deterministic district shards conserve every official source field, Campus ID and privacy mask',()=>{
 assert.equal(names.length,181);
 const observed=new Set();let total=0;
 for(const name of names){
  assert.match(name,/^\d{6}\.json$/);
  const code=name.slice(0,6),file=get(code),ids=Object.keys(file.campuses);
  assert.equal(file.schemaVersion,1);
  assert.equal(file.districtId,code);
  assert.equal(file.schoolYear,'2025-26');
  assert.equal(file.accountabilityYear,2026);
  assert.equal(ids.length,file.campusCount);
  assert.equal(file.source.domainUrl,acc.source.url);
  for(const key of ['D1_STAAR1','D1_STAAR2','D1_STAAR3'])
   assert.equal(file.source.staarUrls[key],staar.source.groups[key].url);
  assert.equal(file.source.peimsStatewideUrl,peims.statewideSource);
  assert.equal(file.source.peimsDistrictUrl,peims.sources[code]||null);
  for(const id of ids){
   assert.equal(id.slice(0,6),code);
   assert.ok(!observed.has(id),'Duplicate Campus ID across shards '+id);
   observed.add(id);total++;
   const item=file.campuses[id];
   assert.deepEqual(item.accountability,acc.campuses[id],'official TEA domain mismatch '+id);
   assert.deepEqual(item.staar,staar.campuses[id],'official STAAR statuses mismatch '+id);
   assert.deepEqual(item.peims,peims.campuses[id],'published / suppressed / not-listed cell mismatch '+id);
  }
 }
 assert.equal(total,2282);
 assert.deepEqual([...observed].sort(),Object.keys(acc.campuses).sort());
});

test('school click can install one district without downloading or leaking other districts',()=>{
 const allen=get('043901');
 assert.equal(insights.installDistrictProfileBatch(allen,'043901'),allen.campusCount);
 const info=insights.getSchoolInsight(rated('043901001'));
 assert.equal(info.evidenceStatus,'reviewed');
 assert.equal(info.domains.achievement,88);
 assert.equal(info.subjects.social,86);
 const publicCounts=insights.getPublishedCountRows('043901001');
 assert.equal(publicCounts.length,7);
 assert.equal(publicCounts.find(x=>x.key==='asian').count,1426);
 assert.equal(insights.getPublishedCountRows('061902118'),null,'other district must remain unloaded');
 const other=get('061902');
 assert.equal(insights.installDistrictProfileBatch(other,'061902'),other.campusCount);
 assert.equal(insights.getPublishedCountRows('061902118').find(x=>x.key==='asian').count,246);
 assert.equal(insights.getSchoolInsight(rated('061902118')).evidenceStatus,'reviewed');
});

test('damaged sources, cross-district Campus ID and unmasked suppression fail entire shard',()=>{
 const source=get('043907'),goodId='043907002';
 const wrong=structuredClone(source);
 wrong.campuses[goodId].peims.counts.asian={status:'published',count:-1};
 assert.equal(insights.installDistrictProfileBatch(wrong,'043907'),0);
 assert.equal(insights.getPublishedCountRows(goodId),null,'no partial commit on invalid campus');
 const spoof=structuredClone(source);
 spoof.source.domainUrl='https://rptsvr1.tea.texas.gov.attacker.com/';
 assert.equal(insights.installDistrictProfileBatch(spoof,'043907'),0);
 assert.equal(insights.installDistrictProfileBatch({...source,districtId:'043901'},'043907'),0);
 const invalid=structuredClone(source);
 invalid.campuses[goodId].accountability.districtId='000000';
 assert.equal(insights.installDistrictProfileBatch(invalid,'043907'),0);
 const suppressedId=Object.keys(source.campuses).find(id=>Object.values(source.campuses[id].peims.counts).some(c=>c.status==='suppressed'));
 const masked=structuredClone(source),maskedKey=Object.keys(masked.campuses[suppressedId].peims.counts).find(k=>masked.campuses[suppressedId].peims.counts[k].status==='suppressed');
 masked.campuses[suppressedId].peims.counts[maskedKey].count=0;
 assert.equal(insights.installDistrictProfileBatch(masked,'043907'),0);
 assert.equal(insights.getPublishedCountRows(goodId),null);
 assert.equal(insights.installDistrictProfileBatch(source,'043907'),source.campusCount,'valid official data still loads');
 assert.equal(insights.getPublishedCountRows(goodId).length,7);
});
