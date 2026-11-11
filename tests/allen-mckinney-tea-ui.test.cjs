'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const insights=require('../features/carrollton-school-insights.js');
const official=require('../data/tea-allen-mckinney-campus-qa-2026.json');
const catalog=require('../tea-ratings-2026.json').data;
const lookup=new Map(catalog.map(x=>[x.id,x]));
const allIds=Object.keys(official.campuses);

function docStub(){
  class Node {
    constructor(tag,text=''){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attrs={};this.className='';this._text=text;}
    set textContent(v){this._text=String(v);this.children=[];}
    get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
    appendChild(x){this.children.push(x);return x;}
    prepend(x){this.children.unshift(x);return x;}
    setAttribute(k,v){this.attrs[k]=String(v);}
  }
  return {createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',String(text))};
}
function findClass(node,part){
  if(!node)return[];
  return (String(node.className||'').split(/\s+/).includes(part)?[node]:[])
    .concat((node.children||[]).flatMap(x=>findClass(x,part)));
}

test('all 56 complete source records accepted by strict Campus ID / 2026 URL / 2025-26 privacy contract',()=>{
  assert.equal(insights.officialBatchCount(),0);
  assert.equal(insights.applyAllenMcKinneyBatch(official),56);
  assert.equal(insights.officialBatchCount(),56);
});
test('50 rated schools show real 2026 domains, STAAR and score-only narratives; 6 remain explicitly unavailable',()=>{
  assert.equal(insights.applyAllenMcKinneyBatch(official),56);
  let full=0,paired=0,notRated=0,demographics=0;
  for(const id of allIds){
    const c=official.campuses[id];
    const record=lookup.get(id);
    assert.ok(record && record.id===id, 'unknown catalog campus '+id);
    const insight=insights.getSchoolInsight(record);
    assert.ok(insight && insight.publicPeims, id+' not joined to PEIMS');
    assert.equal(insight.publicPeims.schoolYear,'2025-26');
    assert.equal(insights.publicPeimsRows(id).length,7);
    if(c.domains.status==='official-verified'){
      full++;
      assert.equal(insight.evidenceStatus,'reviewed');
      assert.deepEqual(insight.domains,{
        achievement:c.domains.studentAchievement,
        progress:c.domains.schoolProgress,
        gaps:c.domains.closingTheGaps
      });
      const subjects={
        reading:c.staar.reading,math:c.staar.math,
        science:c.staar.science,social:c.staar.socialStudies
      };
      assert.deepEqual(insight.subjects,Object.fromEntries(
        Object.entries(subjects).filter(([,v])=>Number.isInteger(v))));
      assert.match(insight.strength,/%/);
      assert.match(insight.challenge,/%/);
      assert.match(insight.summary,/2026 TEA/);
    }else{
      assert.equal(insight.evidenceStatus,'rating-only');
      assert.equal(insight.domains,undefined);
      assert.equal(insight.subjects,undefined);
      if(c.accountability.pairedWith){
        paired++;
        assert.equal(insight.officialAcademicStatus,'paired');
        assert.match(insight.summary,/연계 평가/);
      }else{
        notRated++;
        assert.equal(insight.officialAcademicStatus,'not-rated');
        assert.match(insight.summary,/Not Rated/);
        assert.doesNotMatch(insight.summary,/0점/);
      }
    }
    if(insight.publicPeims.enrollmentStatus==='published')demographics++;
  }
  assert.deepEqual({full,paired,notRated,demographics},
    {full:50,paired:2,notRated:4,demographics:53});
});

test('2025–26 ethnicity percentages only appear for published headcounts and official total',()=>{
  assert.equal(insights.applyAllenMcKinneyBatch(official),56);
  let full=0,partial=0,denominatorMasked=0,privacyMasked=0,unlisted=0;
  for(const id of allIds){
    const c=official.campuses[id],rows=insights.publicPeimsRows(id);
    const denominator=c.peims.enrollment;
    if(denominator===null)denominatorMasked++;
    else if(c.peims.percentages)full++;
    else partial++;
    for(const row of rows){
      const raw=c.peims.counts[row.key];
      assert.equal(row.status,raw.status);
      if(raw.status==='published'){
        assert.equal(row.count,raw.count);
        assert.equal(row.pct,denominator===null?null:Math.round(raw.count*1000/denominator)/10);
      }else{
        assert.equal(row.count,null);
        assert.equal(row.pct,null);
        if(raw.status==='suppressed')privacyMasked++;
        if(raw.status==='not-listed')unlisted++;
      }
    }
  }
  assert.deepEqual({full,partial,denominatorMasked,privacyMasked,unlisted},
    {full:1,partial:52,denominatorMasked:3,privacyMasked:102,unlisted:50});
  assert.equal(insights.getRaceRows('043901001').length,7);
  assert.equal(insights.getRaceRows('043901104'),null,'partial demographics must not be drawn as 100% stack');
  assert.equal(insights.getRaceRows('043901003'),null,'masked denominator must not produce a percentage chart');
  assert.equal(insights.getSchoolInsight(lookup.get('043901001')).publicPeims.enrollment,5127);
});

test('school detail renders published 2026 domains, subject rates, all seven published/masked race cells and original links',()=>{
  assert.equal(insights.applyAllenMcKinneyBatch(official),56);
  const prev=global.document;
  global.document=docStub();
  try{
    const rich=insights.render(lookup.get('043901001'));
    assert.ok(rich);
    assert.match(rich.textContent,/학업 성취/);
    assert.match(rich.textContent,/STAAR 학년 수준 충족 이상/);
    assert.match(rich.textContent,/학생 인종·민족 구성/);
    assert.match(rich.textContent,/5,127명/);
    assert.match(rich.textContent,/아시아계/);
    assert.match(rich.textContent,/1,426명/);
    assert.match(rich.textContent,/27.8%/);
    assert.match(rich.textContent,/2026 STAAR 과목별 성적 원문/);
    assert.match(rich.textContent,/2025–26 PEIMS 총학생 수 공식 원문/);
    assert.equal(findClass(rich,'tea-insights-public-races').length,1);
    assert.equal(findClass(rich,'tea-insights-domains').length,1);
    const masked=insights.render(lookup.get('043901102'));
    assert.match(masked.textContent,/비공개/);
    assert.equal(findClass(masked,'tea-insights-stack').length,0,
      'partially reported school must never display misleading complete-race chart');
    const nr=insights.render(lookup.get('043907005'));
    assert.match(nr.textContent,/Not Rated/);
    assert.match(nr.textContent,/총학생 수 비공개/);
    assert.equal(findClass(nr,'tea-insights-domains').length,0);
    const paired=insights.render(lookup.get('043907125'));
    assert.match(paired.textContent,/연계 평가/);
    assert.equal(findClass(paired,'tea-insights-domains').length,0);
  }finally{
    if(prev===undefined)delete global.document;
    else global.document=prev;
  }
});

test('corrupt, cross-district, stale, privacy-reconstructed and spoofed-report source batches fail closed',()=>{
  assert.equal(insights.applyAllenMcKinneyBatch({schemaVersion:1,accountabilityYear:2026,campuses:{}}),0);
  for(const mutate of [
    f=>{f.accountabilityYear=2025;},
    f=>{f.campuses['043901001'].districtId='043907';},
    f=>{f.campuses['043901001'].accountability.source='https://example.com/fake';},
    f=>{f.campuses['043901001'].staar.reading=800;},
    f=>{f.campuses['043901102'].peims.partialPercentages.asian=25.0;},
    f=>{f.campuses['043901102'].peims.percentages={black:100};}
  ]){
    const copy=JSON.parse(JSON.stringify(official));
    mutate(copy);
    assert.equal(insights.applyAllenMcKinneyBatch(copy),0);
  }
  assert.equal(insights.getSchoolInsight({...lookup.get('043901001'),
    official:'https://evil.example/?view=school&id=043901001'}),null);
  assert.equal(insights.getSchoolInsight({...lookup.get('043901001'),score:98}).publicPeims,undefined);
});


test('every one of the 56 campuses renders accessible published/masked PEIMS rows without inventing missing academic domains',()=>{
  assert.equal(insights.applyAllenMcKinneyBatch(official),56);
  const prev=global.document;
  global.document=docStub();
  try{
    let rendered=0,withDomains=0,withoutDomains=0,withFullChart=0;
    for(const id of allIds){
      const record=lookup.get(id);
      assert.ok(record,'catalog missing campus '+id);
      const panel=insights.render(record);
      assert.ok(panel && panel.dataset.campus===id,'school click profile missing '+id);
      assert.equal(findClass(panel,'tea-insights-public-races').length,1,'published/masked ethnicity table missing '+id);
      const rows=findClass(panel,'tea-insights-public-races')[0].children;
      assert.equal(rows.length,7,'all seven TEA ethnicity labels must be shown '+id);
      assert.match(panel.textContent,/PEIMS 2025–26/);
      assert.match(panel.textContent,/자료 출처/);
      const hasDomains=official.campuses[id].domains.status==='official-verified';
      assert.equal(findClass(panel,'tea-insights-domains').length,hasDomains?1:0,id+' scaled academic fields');
      if(hasDomains)withDomains++;else withoutDomains++;
      if(findClass(panel,'tea-insights-stack').length)withFullChart++;
      if(official.campuses[id].peims.percentages===null)
        assert.equal(findClass(panel,'tea-insights-stack').length,0,id+' cannot show a complete 100% chart');
      rendered++;
    }
    assert.deepEqual({rendered,withDomains,withoutDomains,withFullChart},
      {rendered:56,withDomains:50,withoutDomains:6,withFullChart:1});
  }finally{
    if(prev===undefined)delete global.document;
    else global.document=prev;
  }
});
