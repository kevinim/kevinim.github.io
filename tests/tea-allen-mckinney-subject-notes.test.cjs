'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path');
const moduleUnderTest=require('../features/tea-allen-mckinney-subject-notes.js');
const source=require('../data/tea-allen-mckinney-campus-qa-2026.json');
const officialDomains=require('../data/tea-accountability-2026-verified-batch.json');
const officialSubjects=require('../data/tea-staar-meets-2026-verified-batch.json');
const maskedCounts=require('../data/tea-ethnicity-2025-26-priority.json');
const api=moduleUnderTest;
test('full 56-campus source guard, 50 published subject profiles, two linked campuses and four Not Rated',()=>{
 const parsed=api.validate(source);
 assert.ok(parsed);
 assert.equal(Object.keys(parsed).length,56);
 const statuses=Object.values(parsed).reduce((m,c)=>(m[c.kind]=(m[c.kind]||0)+1,m),{});
 assert.deepEqual(statuses,{subjects:50,not-rated:4,paired:2});
 assert.equal(Object.keys(parsed).filter(k=>k.startsWith('043901')).length,23);
 assert.equal(Object.keys(parsed).filter(k=>k.startsWith('043907')).length,33);
 assert.match(parsed['043901201'].summary,/연계 평가/);
 assert.match(parsed['043907125'].summary,/연계 평가/);
 assert.match(parsed['043907005'].summary,/Not Rated/);
 assert.equal(parsed['043901001'].highest.key,'socialStudies');
 assert.equal(parsed['043901001'].highest.value,86);
 assert.equal(parsed['043901001'].lowest.key,'science');
 assert.equal(parsed['043901001'].lowest.value,43);
 assert.equal(parsed['043901002'].highest.value,90);
 assert.equal(parsed['043901002'].lowest.value,60);
});
test('every published comparison is revalidated against the canonical official 2026 TEA source',()=>{
 const records=api.validate(source);assert.ok(records);
 for(const [id,info] of Object.entries(records)){
  const parent=source.campuses[id],a=officialDomains.campuses[id],s=officialSubjects.campuses[id];
  assert.ok(a&&s,'missing canonical source '+id);
  assert.equal(parent.accountability.rating,a.overall.rating,id);
  assert.equal(parent.accountability.score,a.overall.score,id);
  if(info.kind==='subjects'){
   for(const k of ['studentAchievement','schoolProgress','closingTheGaps'])
    assert.equal(parent.domains[k],a[k].score,id+' '+k);
   for(const [k] of [['reading'],['math'],['science'],['socialStudies']])
    assert.equal(parent.staar[k],s[k].value,id+' '+k);
   assert.ok(info.highest.value>=info.lowest.value,id);
   assert.match(info.summary,/종합등급의 원인이나 학생 인종/);
  }else{
   assert.equal(parent.staar.status,'official-not-reported');
   for(const k of ['reading','math','science','socialStudies'])assert.equal(s[k].value,null,id+' '+k);
  }
 }
 assert.equal(Object.keys(maskedCounts.campuses).length,2282);
 assert.ok(!('peims' in records['043901001']));
});
test('invalid source IDs, spoofed URL and garbage metrics fail closed',()=>{
 const entry=structuredClone(source.campuses['043901001']);
 assert.equal(api.describe('099999999',entry),null);
 assert.equal(api.officialUrl(entry.accountability.source.replace('rptsvr1.tea.texas.gov','rptsvr1.tea.texas.gov.evil.test'),'043901001','summary'),false);
 entry.staar.source='https://attacker.example/script?ccyy=2026&id=043901001';
 assert.equal(api.describe('043901001',entry),null);
 const invalid=structuredClone(source);
 delete invalid.campuses['043901001'];
 assert.equal(api.validate(invalid),null);
 const bad=structuredClone(source);
 bad.campuses['043901001'].staar.reading=111;
 assert.equal(api.validate(bad),null);
 const spoof=structuredClone(source);
 spoof.campuses['043901201'].accountability.pairedWith.name='<script>alert(1)</script>';
 assert.equal(api.validate(spoof),null);
 const out=structuredClone(source);
 out.campuses['043901002'].peims.counts.asian={status:'suppressed',publishedMask:'<10'};
 assert.ok(api.validate(out),'subject display must not derive, export or depend on masked PEIMS ethnicity');
});
test('script is a narrow, lazy, non-GIS add-on with no HTML injection or private address access',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../features/tea-allen-mckinney-subject-notes.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.equal(html.split('tea-allen-mckinney-subject-notes.js?v=1').length-1,1);
 assert.ok(html.indexOf('tea-peims-public-share-addon.js?v=2')<html.indexOf('tea-allen-mckinney-subject-notes.js?v=1'));
 assert.match(js,/credentials:'same-origin'/);
 assert.doesNotMatch(js,/innerHTML\s*=|outerHTML\s*=|document\.write\(|localStorage|sessionStorage|navigator\.geolocation|eval\s*\(|new Function/);
 assert.doesNotMatch(js,/homeAddress|streetAddress|assignedSchool|household|redfin|school-zone/);
 assert.equal(js.includes('tea-peims-public-share-addon'),false);
});
