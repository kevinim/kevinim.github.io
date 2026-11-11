'use strict';
/*
 * Carrollton school insights pilot.
 * Campus IDs are the only join key. Do not infer school assignment from a rating,
 * address, ethnicity, ZIP or map marker. No external calls or personal data.
 * TEA 2026 ratings come from the dashboard's existing scoreRecord(), not this file.
 * 2024-25 demographics shown only when individually checked against TEA SRC.
 */
(function (root) {
  const TAPR_URL = 'https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/texas-academic-performance-reports';
  const RATINGS_URL = 'https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-accountability-rating-system';
  // Explicit rollout order. Campus-level TEA IDs stay authoritative.
  // CFB/LISD include campuses outside Carrollton; these are district cohorts,
  // never assertions about city limits or address-to-school assignment.
  const ROLLOUT = Object.freeze({
    CFB:{phase:1,label:'Carrollton-Farmers Branch ISD'},
    LISD:{phase:1,label:'Lewisville ISD (Carrollton 포함)'},
    AISD:{phase:2,label:'Allen ISD'},
    '043907':{phase:3,label:'McKinney ISD'}
  });
  const RACES = [
    ['black', '흑인', '#5f9bd1'],
    ['hispanic', '히스패닉', '#f59e0b'],
    ['white', '백인', '#a78bfa'],
    ['native', '아메리카 원주민', '#14b8a6'],
    ['asian', '아시아계', '#22c55e'],
    ['pacific', '태평양 제도계', '#e879f9'],
    ['multi', '복수 인종', '#f472b6']
  ];
  // The 18 pilot narratives reflect an initial 2026 TEA review. Entries without
  // reviewed domain/subject evidence are explicitly labelled preliminary.
  const CAMPUS = Object.freeze({
    '057903122': {summary:'학업 성취 수준이 안정적으로 높으며 학생 집단별 성취 목표의 추가 개선 여지가 있습니다.',strength:'높은 학업 성취',challenge:'집단별 목표 달성'},
    '057903105': {summary:'전반적인 학업 성과가 양호하며 과학 성취 향상이 주요 개선 과제입니다.',strength:'전반적인 학업 성취',challenge:'과학 성취'},
    '057903126': {summary:'학업 성장과 학생 집단별 성과가 강점이지만 과학 성취는 상대적으로 낮습니다.',strength:'학업 성장',challenge:'과학 성취'},
    '057903102': {summary:'학생들의 학업 성장 성과가 강점인 반면 절대적인 과목 성취도 향상이 필요합니다.',strength:'학업 성장',challenge:'기초 과목 성취'},
    '057903118': {summary:'학업 성취는 높지만 학생 성장과 집단별 목표 달성 개선이 필요합니다.',strength:'높은 학업 성취',challenge:'학업 성장·집단별 목표'},
    '057903112': {summary:'기본적인 학업 성취 수준은 양호하며 학업 성장과 격차 지표를 더 살펴볼 필요가 있습니다.',strength:'학업 성취',challenge:'학업 성장·집단별 목표'},
    '061902118': {
      summary:'독해 성과가 상대적으로 좋지만 수학·과학과 학업 성장 지표는 개선이 필요한 학교입니다.',
      strength:'5학년 독해 상위 성취',challenge:'수학·과학 및 학업 성장',
      domains:{achievement:82,progress:73,gaps:73},
      subjects:{reading:65,math:47,science:40},
      evidenceStatus:'reviewed',
      demographics:{
        year:'2024–25',document:'2025 TEA School Report Card',enrollment:424,
        src:'https://resources.finalsite.net/images/v1767735702/lisdnet/lisdnet/v75mf40bfm22ljjszr3l/hebronvalleyrc.pdf',
        race:{black:16.7,hispanic:15.1,white:24.5,native:0.2,asian:36.8,pacific:0,multi:6.6}
      }
    },
    '061902140': {summary:'독해 대비 수학·과학 성취가 낮아 과목 간 성과 차이를 줄이는 것이 과제입니다.',strength:'독해',challenge:'수학·과학'},
    '057903113': {summary:'독해의 일부 성과는 확인되지만 학업 성장과 과학 성취 개선이 시급합니다.',strength:'독해 기초 성취',challenge:'학업 성장·과학'},
    '061902047': {summary:'높은 학업 성취와 학생 집단별 목표 달성도가 강점이며 사회 과목은 추가 개선 여지가 있습니다.',strength:'학업 성취·집단별 목표',challenge:'사회 과목'},
    '057903042': {summary:'유사 학교 대비 상대 성과는 양호하지만 학생 성장 지표를 높일 필요가 있습니다.',strength:'유사 학교 대비 상대 성과',challenge:'학업 성장'},
    '057903045': {summary:'학업 성취 기반은 있으나 성장 속도와 수학·사회 과목이 개선 과제입니다.',strength:'학업 성취 기반',challenge:'성장·수학·사회'},
    '061902054': {summary:'독해 성취와 비교해 수학·사회 및 학업 성장 지표가 상대적으로 약합니다.',strength:'독해',challenge:'수학·사회·학업 성장'},
    '057903046': {summary:'학업 성장과 집단별 성과 등 여러 영역에서 집중적인 개선 지원이 필요합니다.',strength:'공식 개선 지원 여부 확인 필요',challenge:'학업 성장·집단별 성취'},
    '057903006': {summary:'과학·사회 및 학생 집단별 성과가 강점이고 학업 성장에는 추가 개선 여지가 있습니다.',strength:'과학·사회·집단별 성과',challenge:'학업 성장'},
    '061902008': {
      summary:'과학·사회 과목과 학생 집단별 목표 달성도가 강점이며 수학과 학업 성장에는 개선 여지가 있습니다.',
      strength:'과학·사회 및 집단별 목표',challenge:'수학 및 학업 성장',
      domains:{achievement:88,progress:84,gaps:92},
      subjects:{reading:74,math:59,science:83,social:84},
      evidenceStatus:'reviewed',
      demographics:{
        year:'2024–25',document:'2025 TEA School Report Card',enrollment:3668,
        src:'https://resources.finalsite.net/images/v1767730534/lisdnet/lisdnet/ohqx6aqaejcplgfquptq/hhs9rc.pdf',
        race:{black:14.7,hispanic:22.1,white:27.8,native:0.3,asian:30.2,pacific:0.1,multi:4.8}
      }
    },
    '057903002': {summary:'유사 학교 대비 성과는 양호하지만 독해·수학 성취와 성장 지표 개선이 중요합니다.',strength:'유사 학교 대비 상대 성과',challenge:'독해·수학·학업 성장'},
    '057903001': {summary:'유사 학교 대비 성과는 양호하나 수학과 학업 성장, 집단별 성과 격차가 개선 과제입니다.',strength:'유사 학교 대비 상대 성과',challenge:'수학·성장·집단별 성과'}
  });

  // TEA 2024-25 TAPR ethnic distribution, exact campus ID and campus
  // enrollment (not district totals). Published in official district annual
  // reports; no inference from Census ZIP or residential demographics.
  const VERIFIED_TAPR = Object.freeze({
    '043901001':{
      demographics:{
        year:'2024–25',document:'2025 TEA TAPR · Allen ISD Annual Report',
        enrollment:5206,
        src:'https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/3952/Aisd/477407cb-fac7-4496-85c5-ae62698918e0/Allen-ISD-Annual-Report-2024-2025.pdf?disposition=inline',
        race:{black:14.1,hispanic:15.0,white:39.0,native:0.5,asian:25.8,pacific:0.2,multi:5.3}
      }
    },
    '043907002':{
      demographics:{
        year:'2024–25',document:'2025 TEA TAPR · McKinney ISD',
        enrollment:2668,
        src:'https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/4789/Misd/7b91c301-1d06-4b03-bd95-c08341bc2ccc/MHS-TAPR_043907002-%281%29.pdf?disposition=inline',
        race:{black:19.2,hispanic:34.9,white:36.6,native:0.5,asian:4.9,pacific:0.1,multi:3.9}
      }
    }
  });
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function checkRace(race) {
    if (!race || typeof race !== 'object') return false;
    const values=RACES.map(function(x){return race[x[0]];});
    if (!values.every(function(x){return typeof x==='number' && Number.isFinite(x) && x>=0 && x<=100;})) return false;
    const sum=values.reduce(function(a,b){return a+b;},0);
    return sum>=99.3 && sum<=100.7; // seven figures rounded to 1 decimal
  }
  function getRecord(id) {
    if (!/^\d{9}$/.test(String(id||''))) return null;
    return CAMPUS[String(id)] || null;
  }
  const DISTRICT_IDS={CFB:'057903',LISD:'061902',AISD:'043901',FISD:'043905',PISD:'043910',PROSPER:'043912'};
  const ENRICHED=Object.create(null);
  let enrichmentStarted=false;
  function hasOfficialSource(url){
    return typeof url==='string' && /^https:\/\/(?:rptsvr1\.tea\.texas\.gov|tea\.texas\.gov|tea2\.tea\.texas\.gov|txschools\.gov)\//.test(url);
  }
  function validDomains(v){
    return !!v && ['achievement','progress','gaps'].every(function(k){
      return typeof v[k]==='number' && Number.isFinite(v[k]) && v[k]>=0 && v[k]<=100;
    });
  }
  function enrichFromOfficial(record,base){
    const raw=ENRICHED[String(record.id)];
    if(!raw)return base;
    const added={...base};
    if(validDomains(raw.domains)&&hasOfficialSource(raw.domainsSource)){
      added.domains=raw.domains;
      added.domainsSource=raw.domainsSource;
      added.evidenceStatus='reviewed';
      const labels={achievement:'학업 성취',progress:'학교 향상도',gaps:'학생 집단별 성과'};
      const list=Object.entries(raw.domains).sort(function(a,b){return b[1]-a[1];});
      added.strength=labels[list[0][0]]+' '+list[0][1]+'점';
      added.challenge=labels[list[2][0]]+' '+list[2][1]+'점 (세 영역 중 상대적으로 낮음)';
      added.summary=(base.summary||'')+' 공식 TEA 영역별 점수 중 '+labels[list[0][0]]+' '+list[0][1]+
        '점이 가장 높으며, '+labels[list[2][0]]+' '+list[2][1]+'점이 가장 낮습니다. 이는 점수 비교이며 원인 추정은 아닙니다.';
    }
    if(raw.subjects && hasOfficialSource(raw.domainsSource)){
      const valid={};
      for(const [k,v] of Object.entries(raw.subjects)){
        if(['reading','math','science','social'].includes(k) && typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100)valid[k]=v;
      }
      if(Object.keys(valid).length)added.subjects=valid;
    }
    const d=raw.demographics;
    if(d&&Number.isInteger(d.enrollment)&&d.enrollment>0&&
      typeof d.year==='string'&&/^\d{4}[–-]\d{2}$/.test(d.year)&&
      hasOfficialSource(d.src)&&checkRace(d.race)){
      // Prefer current 2025-26 aggregate over existing verified 2024-25 data.
      if(!added.demographics || d.year.replace('-','–')>added.demographics.year.replace('-','–'))
        added.demographics=d;
      if(added.evidenceStatus==='rating-only')added.evidenceStatus='rating-and-demographics';
    }
    return added;
  }
  function getSchoolInsight(record) {
    if(!record || !/^\d{9}$/.test(String(record.id||''))) return null;
    const code=String(record.district||'');
    const prefix=DISTRICT_IDS[code] || (/^\d{6}$/.test(code)?code:null);
    if(!prefix || !String(record.id).startsWith(prefix))return null;
    if(typeof record.official!=='string')return null;
    let officialUrl;
    try{officialUrl=new URL(record.official);}catch{return null;}
    if(officialUrl.protocol!=='https:' || officialUrl.hostname!=='txschools.gov' ||
      officialUrl.searchParams.get('view')!=='school' ||
      officialUrl.searchParams.get('id')!==String(record.id))return null;
    const cohort=ROLLOUT[code]||{phase:4,label:record.districtName||'DFW 학군 '+code};
    const curated=getRecord(record.id);
    const existing=VERIFIED_TAPR[String(record.id)]||null;
    const validGrade=['A','B','C','D','F'].includes(record.rating);
    const hasScore=validGrade && Number.isInteger(record.score) && record.score>=0 && record.score<=100;
    const rating=hasScore?record.rating+' · '+record.score+'점':record.rating==='Not Rated'?'미평가':'등급 정보 미확인';
    const base=curated
      ?{...curated,rolloutPhase:cohort.phase,cohort:cohort.label}
      :{
        rolloutPhase:cohort.phase,
        cohort:cohort.label,
        evidenceStatus:existing?'rating-and-demographics':'rating-only',
        ...(existing||{}),
        summary:hasScore
          ?'2026 TEA 종합 평가는 '+rating+'입니다. 과목별 성취도·학생 성장·집단별 목표는 공식 세부 자료를 대조한 후 분석합니다.'
          :'2026 TEA 종합 평가가 미부여되었거나 확인되지 않았습니다. 이것만으로 학업 성과를 좋거나 나쁘다고 평가하지 않습니다.',
        strength:hasScore?'확인된 공식 종합 등급: '+rating:'공식 종합 평가로 판단 불가',
        challenge:'개별 과목·성장·학생 집단별 성과 원문 확인 필요'
      };
    return enrichFromAllenMcKinney(record,enrichFromOfficial(record,base));
  }
  // Allen/McKinney 2026 academics + 2025–26 public PEIMS, keyed ONLY by Campus ID.
  // The whole batch is validated before use; never infer residential assignments.
  const ALLEN_MCKINNEY=Object.create(null);
  let officialBatchStarted=false;
  let officialBatchError=false;
  function reportLink(url,id,report){
    if(!hasOfficialSource(url))return false;
    try{
      const u=new URL(url);
      return u.hostname==='rptsvr1.tea.texas.gov' &&
        u.searchParams.get('id')===id && u.searchParams.get('ccyy')==='2026' &&
        u.searchParams.get('prgopt')==='reports/acct/'+report+'.sas';
    }catch{return false;}
  }
  function peimsLink(url,district,grouping){
    if(!hasOfficialSource(url))return false;
    try{
      const u=new URL(url);
      return u.hostname==='rptsvr1.tea.texas.gov' &&
        u.searchParams.get('endyear')==='26' &&
        u.searchParams.get('key')===district &&
        u.searchParams.get('grouping')===grouping;
    }catch{return false;}
  }
  function validPublicPeims(peims,district){
    if(!peims || peims.schoolYear!=='2025-26' ||
      !peimsLink(peims.source,district,'e') ||
      !peimsLink(peims.enrollmentSource,district,'g') ||
      !peims.counts || typeof peims.counts!=='object')return false;
    const enrollment=peims.enrollment;
    if(peims.enrollmentStatus==='published'){
      if(!Number.isSafeInteger(enrollment) || enrollment<=0 ||
         !peims.partialPercentages || typeof peims.partialPercentages!=='object')return false;
    }else if(peims.enrollmentStatus==='suppressed'){
      if(enrollment!==null || peims.percentages!==null || peims.partialPercentages!==null ||
        !/^<\d+$/.test(peims.enrollmentMask||''))return false;
    }else return false;
    let disclosed=0,allSeven=true;
    for(const [key] of RACES){
      const c=peims.counts[key],pct=peims.partialPercentages?.[key];
      if(!c || typeof c!=='object')return false;
      if(c.status==='published'){
        if(!Number.isSafeInteger(c.count)||c.count<0)return false;
        disclosed+=c.count;
        if(enrollment!==null && pct!==Math.round(c.count*1000/enrollment)/10)return false;
      }else if(c.status==='suppressed'){
        allSeven=false;
        if(c.count!==undefined || !/^<\d+$/.test(c.publishedMask||'') || pct!=null)return false;
      }else if(c.status==='not-listed'){
        allSeven=false;
        if(c.count!==undefined || pct!=null)return false;
      }else return false;
    }
    if(enrollment!==null && disclosed>enrollment)return false;
    if(allSeven && enrollment!==null){
      if(disclosed!==enrollment || !checkRace(peims.percentages))return false;
    }else if(peims.percentages!==null)return false;
    return true;
  }
  function applyAllenMcKinneyBatch(file){
    if(!file || file.schemaVersion!==1 || file.accountabilityYear!==2026 ||
      file.schoolYear!=='2025-26' || !file.campuses ||
      typeof file.campuses!=='object')return 0;
    const rows=Object.entries(file.campuses);
    if(rows.length!==56)return 0; // Reject truncated/partially published source snapshots.
    const parsed=Object.create(null);
    let allen=0,mckinney=0;
    for(const [id,row] of rows){
      if(!/^\d{9}$/.test(id)||!row || typeof row!=='object')return 0;
      const district=id.slice(0,6);
      if(district==='043901')allen++;
      else if(district==='043907')mckinney++;
      else return 0;
      const a=row.accountability,d=row.domains,st=row.staar;
      if(row.districtId!==district || a?.year!==2026 ||
        d?.year!==2026 || st?.year!==2026 ||
        !reportLink(a.source,id,'summary') ||
        !reportLink(d.source,id,'summary') ||
        !reportLink(st.source,id,'domain1a') ||
        !validPublicPeims(row.peims,district))return 0;
      const rated=['A','B','C','D','F'].includes(a.rating)&&
        Number.isInteger(a.score)&&a.score>=0&&a.score<=100;
      const notRated=a.rating==='Not Rated'&&a.score===null;
      if(!rated&&!notRated)return 0;
      const domainsValid=d.status==='official-verified' &&
        [d.studentAchievement,d.schoolProgress,d.closingTheGaps].every(
          x=>Number.isInteger(x)&&x>=0&&x<=100);
      const domainsUnavailable=d.status==='official-not-reported' &&
        [d.studentAchievement,d.schoolProgress,d.closingTheGaps].every(x=>x===null);
      if(!domainsValid&&!domainsUnavailable)return 0;
      const scores=['reading','math','science','socialStudies'].map(k=>st[k]);
      const staarValid=st.status==='official-verified' &&
        scores.some(x=>Number.isInteger(x)) &&
        scores.every(x=>x===null||(Number.isInteger(x)&&x>=0&&x<=100));
      const staarUnavailable=st.status==='official-not-reported' &&
        scores.every(x=>x===null);
      if(!staarValid&&!staarUnavailable)return 0;
      parsed[id]=row;
    }
    if(allen!==23 || mckinney!==33)return 0;
    Object.assign(ALLEN_MCKINNEY,parsed);
    officialBatchError=false;
    return rows.length;
  }
  function publicPeimsRows(id){
    const p=ALLEN_MCKINNEY[String(id)]?.peims;
    if(!p)return null;
    return RACES.map(function(r){
      const c=p.counts[r[0]];
      return {key:r[0],label:r[1],color:r[2],status:c.status,
        count:c.status==='published'?c.count:null,
        pct:c.status==='published'?p.partialPercentages?.[r[0]]??null:null};
    });
  }
  function enrichFromAllenMcKinney(record,base){
    const official=ALLEN_MCKINNEY[String(record.id)];
    if(!official || official.accountability.rating!==record.rating ||
      official.accountability.score!==record.score)return base;
    const out={...base,publicPeims:official.peims};
    const d=official.domains,st=official.staar;
    if(d.status==='official-verified' && st.status==='official-verified'){
      out.domains={achievement:d.studentAchievement,progress:d.schoolProgress,gaps:d.closingTheGaps};
      out.domainsSource=d.source;
      out.subjectsSource=st.source;
      out.subjects=Object.fromEntries([
        ['reading',st.reading],['math',st.math],['science',st.science],['social',st.socialStudies]
      ].filter(x=>Number.isInteger(x[1])));
      const labels={reading:'독해',math:'수학',science:'과학',social:'사회'};
      const rows=Object.entries(out.subjects).sort(function(a,b){return b[1]-a[1];});
      out.summary='2026 TEA 공식 영역별 점수: 학업 성취 '+d.studentAchievement+
        '점 · 학교 향상도 '+d.schoolProgress+'점 · 학생 집단별 성과 '+d.closingTheGaps+
        '점. STAAR 과목별 수치는 전체 학생 응시 시험의 학년 수준 충족 이상 비율입니다.';
      out.strength=labels[rows[0][0]]+' '+rows[0][1]+'% (공개된 과목 중 가장 높음)';
      out.challenge=labels[rows[rows.length-1][0]]+' '+rows[rows.length-1][1]+
        '% (공개된 과목 중 상대적으로 낮음)';
      out.evidenceStatus='reviewed';
      out.officialAcademicStatus='published';
    }else{
      const paired=official.accountability.pairedWith;
      out.domains=undefined;out.subjects=undefined;
      out.domainsSource=d.source;out.subjectsSource=st.source;
      out.evidenceStatus='rating-only';
      out.officialAcademicStatus=paired?'paired':'not-rated';
      if(paired){
        out.summary='2026 TEA 종합등급 '+record.rating+' · '+record.score+
          '점. 이 유아교육 캠퍼스는 '+paired.name+
          '과(와) 연계 평가되어 캠퍼스 자체의 영역별 점수와 STAAR 과목 성적은 제공되지 않습니다.';
        out.strength='공식 종합 평가 '+record.rating+' · '+record.score+'점 (연계 평가)';
        out.challenge='해당 캠퍼스 자체의 과목별 성적 미제공';
      }else{
        out.summary='2026 TEA 공식 Not Rated(미평가). 개별 영역 점수와 STAAR 과목별 공개 성적이 없습니다.';
        out.strength='공식 종합평가 Not Rated';
        out.challenge='성적 미제공: F 등급이나 0점으로 해석하지 않음';
      }
    }
    return out;
  }
  function refreshAllenMcKinneyPanels(){
    if(typeof document==='undefined')return;
    document.getElementById('detailContent')?.querySelectorAll('.tea-insights-panel')
      .forEach(function(el){el.remove();});
    document.getElementById('schoolList')?.querySelectorAll('.tea-school-inline-preview')
      .forEach(function(el){el.remove();});
    mount();
  }
  function loadAllenMcKinneyBatch(rating){
    const id=String(rating?.id||'');
    if(!/^04390(?:1|7)\d{3}$/.test(id) || officialBatchStarted ||
      !root || typeof root.fetch!=='function')return;
    officialBatchStarted=true;
    // Same-origin, public campus-level aggregates; never send residential searches.
    root.fetch('./data/tea-allen-mckinney-campus-qa-2026.json?v=2',
      {credentials:'same-origin'})
      .then(function(res){if(!res.ok)throw Error('TEA campus data '+res.status);return res.json();})
      .then(function(file){if(applyAllenMcKinneyBatch(file)!==56)throw Error('Invalid TEA source batch');})
      .catch(function(){officialBatchError=true;})
      .finally(refreshAllenMcKinneyPanels);
  }
  function getRaceRows(id) {
    const current=ALLEN_MCKINNEY[String(id)]?.peims;
    if(current){
      if(!checkRace(current.percentages))return null;
      return RACES.map(function(r){return {key:r[0],label:r[1],color:r[2],pct:current.percentages[r[0]]};});
    }
    const d=ENRICHED[String(id)]?.demographics||
      (getRecord(id)||VERIFIED_TAPR[String(id)])?.demographics;
    if (!d || !checkRace(d.race)) return null;
    return RACES.map(function(r){return {key:r[0],label:r[1],color:r[2],pct:d.race[r[0]]};});
  }
  function loadVerifiedAggregates() {
    if(enrichmentStarted || !root || typeof root.fetch!=='function')return;
    enrichmentStarted=true;
    // Same-origin JSON contains only public campus-level aggregate statistics.
    root.fetch('./data/tea-campus-enrichment-2026.json?v=1',{credentials:'same-origin'})
      .then(function(res){if(!res.ok)throw Error('Enrichment unavailable');return res.json();})
      .then(function(file){
        if(file.schemaVersion!==1 || file.accountabilityYear!==2026 ||
          !file.campuses || typeof file.campuses!=='object')return;
        let count=0;
        for(const [id,data] of Object.entries(file.campuses)){
          if(!/^\d{9}$/.test(id)||!data||typeof data!=='object')continue;
          ENRICHED[id]=data;count++;
        }
        if(count && typeof document!=='undefined'){
          const detail=document.getElementById('detailContent');
          detail?.querySelectorAll('.tea-insights-panel').forEach(function(el){el.remove();});
          const list=document.getElementById('schoolList');
          list?.querySelectorAll('.tea-school-inline-preview').forEach(function(el){el.remove();});
          mount();
        }
      }).catch(function(){/* Offline operation: keep existing verified campus facts. */});
  }
  function textTag(tag,className,text) {
    const el=document.createElement(tag);
    if(className) el.className=className;
    el.textContent=text;
    return el;
  }
  function appendPublicPeims(target,id,compact){
    const p=ALLEN_MCKINNEY[String(id)]?.peims,rows=publicPeimsRows(id);
    if(!p || !rows)return false;
    const heading=document.createElement('div');
    heading.className=compact?'tea-school-inline-heading':'tea-insights-heading tea-insights-demographic-heading';
    heading.appendChild(textTag(compact?'strong':'h5',compact?'':'tea-insights-subtitle','학생 인종·민족 구성'));
    heading.appendChild(textTag('small','tea-insights-vintage','PEIMS 2025–26'));
    target.appendChild(heading);
    const total=p.enrollmentStatus==='published'
      ?'총학생 수 '+p.enrollment.toLocaleString('en-US')+'명 (TEA 공식)'
      :'총학생 수 비공개 (TEA 공식)';
    target.appendChild(textTag('p',compact?'tea-school-inline-legend':'tea-insights-enrollment',total));
    if(p.percentages && checkRace(p.percentages)){
      // A complete seven-category chart is allowed only if every category and
      // its official campus denominator are public (one campus in this batch).
      const stack=document.createElement('div');
      stack.className=compact?'tea-school-inline-stack':'tea-insights-stack';
      stack.setAttribute('role','img');
      stack.setAttribute('aria-label',rows.map(r=>r.label+' '+r.pct.toFixed(1)+'%').join(', '));
      rows.forEach(function(r){
        if(r.pct===0)return;
        const bar=document.createElement('span');
        bar.className='tea-insights-segment';
        bar.style.width=r.pct+'%';
        bar.style.backgroundColor=r.color;
        bar.title=r.label+' '+r.pct.toFixed(1)+'%';
        stack.appendChild(bar);
      });
      target.appendChild(stack);
    }
    const list=document.createElement('ul');
    list.className='tea-insights-public-races'+(compact?' tea-insights-public-races--compact':'');
    rows.forEach(function(r){
      const li=document.createElement('li');
      const name=textTag('span','tea-insights-public-race-name',r.label);
      const swatch=document.createElement('span');
      swatch.className='tea-insights-swatch';
      swatch.style.backgroundColor=r.color;
      swatch.setAttribute('aria-hidden','true');
      name.prepend(swatch);
      li.appendChild(name);
      const value=r.status==='published'
        ?r.count.toLocaleString('en-US')+'명'+(r.pct===null?'':' · '+r.pct.toFixed(1)+'%')
        :r.status==='suppressed'?'비공개':'미제공';
      li.appendChild(textTag('strong','tea-insights-public-race-value',value));
      list.appendChild(li);
    });
    target.appendChild(list);
    target.appendChild(textTag('p','tea-insights-privacy-note',
      '비공개·미제공 인원은 0명이 아니며 비율을 역산하지 않습니다. 표시된 비율만 TEA 공식 총학생 수를 분모로 계산했습니다.'));
    return true;
  }
  function makeLink(label,url) {
    const a=textTag('a','tea-insights-link',label);
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';
    return a;
  }
  function render(scoreRecord) {
    if(!scoreRecord) return null;
    const id=String(scoreRecord.id||'');
    const data=getSchoolInsight(scoreRecord);
    if(!data) return null;
    const panel=document.createElement('section');
    panel.className='tea-insights-panel';
    panel.dataset.campus=id;
    panel.setAttribute('aria-label','학교 평가 및 학생 구성');

    const heading=document.createElement('div');
    heading.className='tea-insights-heading';
    heading.appendChild(textTag('h4','tea-insights-title','학교 평가 · 강점 · 학생 구성'));
    heading.appendChild(textTag('small','tea-insights-vintage','TEA 2026'));
    panel.appendChild(heading);
    panel.appendChild(textTag('p','tea-insights-summary',data.summary));

    // A rating-only summary is evidence, NOT a measured strength or weakness.
    const ratingOnly=['rating-only','rating-and-demographics'].includes(data.evidenceStatus);
    const facts=document.createElement('div');facts.className='tea-insights-facts';
    const items=[
      {kind:ratingOnly?'confirmed':'positive',label:ratingOnly?'확인된 평가':'강점',text:data.strength,symbol:ratingOnly?'●':'+'},
      {kind:ratingOnly?'pending':'improve',label:ratingOnly?'추가 검증':'개선과제',text:data.challenge,symbol:ratingOnly?'…':'△'}
    ];
    items.forEach(function(info){
      const item=document.createElement('div');
      item.className='tea-insights-fact tea-insights-fact--'+info.kind;
      const title=textTag('strong','tea-insights-fact-label',info.symbol+' '+info.label);
      item.appendChild(title);
      item.appendChild(textTag('span','tea-insights-fact-text',info.text));
      facts.appendChild(item);
    });
    panel.appendChild(facts);

    if(data.domains){
      const metrics=document.createElement('dl');metrics.className='tea-insights-domains';
      [['학업 성취',data.domains.achievement],['학교 향상도',data.domains.progress],['집단별 목표',data.domains.gaps]].forEach(function(pair){
        const item=document.createElement('div');
        item.appendChild(textTag('dt','',pair[0]));
        item.appendChild(textTag('dd','',String(pair[1])+'점'));
        metrics.appendChild(item);
      });
      panel.appendChild(metrics);
    } else {
      panel.appendChild(textTag('p','tea-insights-empty','영역별 세부 성적 · 자료 확인 중'));
    }
    if(data.subjects){
      const subjects=document.createElement('p');subjects.className='tea-insights-subjects';
      const labels={reading:'독해',math:'수학',science:'과학',social:'사회'};
      subjects.appendChild(textTag('strong','','STAAR 학년 수준 충족 이상: '));
      subjects.appendChild(document.createTextNode(
        Object.keys(data.subjects).map(function(key){return labels[key]+' '+data.subjects[key]+'%';}).join(' · ')
      ));
      panel.appendChild(subjects);
    }

    const demo=(!data.publicPeims && data.demographics && checkRace(data.demographics.race))?data.demographics:null;
    if(data.publicPeims){
      appendPublicPeims(panel,id,false);
    } else if(demo){
      const demographicHeading=document.createElement('div');
      demographicHeading.className='tea-insights-heading tea-insights-demographic-heading';
      demographicHeading.appendChild(textTag('h5','tea-insights-subtitle','학생 인종·민족 구성'));
      demographicHeading.appendChild(textTag('small','tea-insights-vintage',demo.year));
      panel.appendChild(demographicHeading);
      panel.appendChild(textTag('p','tea-insights-enrollment','등록 학생 '+demo.enrollment.toLocaleString('en-US')+'명'));
      const figure=document.createElement('figure');figure.className='tea-insights-figure';
      const chart=document.createElement('div');chart.className='tea-insights-stack';
      const rows=getRaceRows(id);
      chart.setAttribute('role','img');
      chart.setAttribute('aria-label',rows.map(function(r){return r.label+' '+r.pct.toFixed(1)+'%';}).join(', '));
      rows.forEach(function(r){
        if(r.pct===0) return;
        const segment=document.createElement('span');segment.className='tea-insights-segment';
        segment.style.width=r.pct+'%';segment.style.backgroundColor=r.color;
        segment.title=r.label+' '+r.pct.toFixed(1)+'%';
        chart.appendChild(segment);
      });
      figure.appendChild(chart);
      const list=document.createElement('ul');list.className='tea-insights-legend';
      rows.forEach(function(r){
        const li=document.createElement('li');
        const swatch=document.createElement('span');swatch.className='tea-insights-swatch';
        swatch.style.backgroundColor=r.color;swatch.setAttribute('aria-hidden','true');
        li.appendChild(swatch);
        li.appendChild(document.createTextNode(r.label+' '+r.pct.toFixed(1)+'%'));
        list.appendChild(li);
      });
      figure.appendChild(list);panel.appendChild(figure);
    } else {
      panel.appendChild(textTag('p','tea-insights-empty','학생 인종 구성 · 공식 수치 확인 중'));
    }

    // Keep detailed methodology, sources and missing-data explanations together.
    // The existing immediate warning about address-to-school assignment is
    // rendered outside this widget in dashboard-main.js and remains visible.
    const details=document.createElement('details');
    details.className='tea-insights-provenance';
    details.appendChild(textTag('summary','tea-insights-provenance-summary','자료 출처 · 기준 · 유의사항'));
    const notes=document.createElement('div');
    notes.className='tea-insights-provenance-body';
    notes.appendChild(textTag('p','tea-insights-meta','2026 TEA 종합 평가 · 적용 단계 '+data.rolloutPhase+' · '+data.cohort));
    if(!data.domains) notes.appendChild(textTag('p','tea-insights-missing',
      data.officialAcademicStatus==='paired'
        ?'연계 평가 캠퍼스: 해당 학교 자체의 영역 점수·STAAR 성적은 TEA에서 제공하지 않습니다.'
        :data.officialAcademicStatus==='not-rated'
          ?'TEA 2026 Not Rated: 공개된 영역 점수·STAAR 성적이 없습니다. F나 0점이 아닙니다.'
          :'영역별 점수 및 과목별 성취도: 개별 TEA 원문 미연결. 종합점수만으로 과목별 강점이나 약점을 추정하지 않습니다.'));
    if(data.domainsSource&&hasOfficialSource(data.domainsSource))notes.appendChild(makeLink('2026 TEA 영역별·종합평가 원문',data.domainsSource));
    if(data.subjectsSource&&hasOfficialSource(data.subjectsSource))notes.appendChild(makeLink('2026 STAAR 과목별 성적 원문',data.subjectsSource));
    if(data.publicPeims){
      notes.appendChild(textTag('p','tea-insights-meta',
        '2025–26 PEIMS 학생 수 및 인종·민족별 공개 집계입니다. 학교 재학생 기준이며 ZIP 인종 구성이나 주소별 배정 결과가 아닙니다.'));
      if(hasOfficialSource(data.publicPeims.source))notes.appendChild(makeLink('2025–26 PEIMS 인종별 공식 원문',data.publicPeims.source));
      if(hasOfficialSource(data.publicPeims.enrollmentSource))notes.appendChild(makeLink('2025–26 PEIMS 총학생 수 공식 원문',data.publicPeims.enrollmentSource));
      notes.appendChild(textTag('p','tea-insights-meta',
        '개별 공개 수치만 비율화하며 비공개·미제공 범주는 추정하지 않습니다. 과목 성적과 인종 구성 사이의 인과관계는 주장하지 않습니다.'));
    } else if(demo){
      notes.appendChild(textTag('p','tea-insights-meta','학생 인종 구성: '+demo.year+' · '+demo.document+' · 등록 학생 '+demo.enrollment.toLocaleString('en-US')+'명'));
      notes.appendChild(makeLink(demo.document+' 원문',demo.src));
      notes.appendChild(textTag('p','tea-insights-meta',
        '학생 인종 비율은 학교 재학생 기준이며 ZIP 거주자 구성이나 주소별 학교 배정을 나타내지 않습니다. 반올림으로 합계가 100%와 다를 수 있습니다.'));
    } else {
      notes.appendChild(textTag('p','tea-insights-missing',
        '학생 인종·민족 구성: 개별 TEA 자료 대조 중 · 미확인 수치는 표시하지 않습니다.'));
      notes.appendChild(makeLink('학교별 TAPR 확인',TAPR_URL));
    }
    notes.appendChild(textTag('p','tea-insights-meta',data.evidenceStatus==='reviewed'
      ?'한 줄 평과 강점·개선과제는 TEA 공식 의견이 아닌 데이터 기반 해석입니다.'
      :ratingOnly
        ?'2026 종합등급 기반 자동 요약입니다. 과목별 강점·개선과제는 아직 분석하지 않았습니다.'
        :'시범 해석: 세부 과목별 수치의 개별 TEA 원문 대조 전입니다. 공식 종합 등급과 구분하여 참고하세요.'));
    const links=document.createElement('div');links.className='tea-insights-links';
    links.appendChild(makeLink('2026 TEA 평가 자료',RATINGS_URL));
    links.appendChild(makeLink('TEA 캠퍼스 원문',scoreRecord.official && /^https:\/\/txschools\.gov\//.test(scoreRecord.official)
      ? scoreRecord.official : 'https://txschools.gov/'));
    notes.appendChild(links);
    details.appendChild(notes);
    panel.appendChild(details);
    return panel;
  }
  function ensureStyles() {
    // Load only on first eligible school selection, not at initial paint.
    // Preserve the dashboard's exactly ten first-render stylesheets.
    if(document.querySelector('link[data-tea-carrollton-css]')) return;
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='./features/carrollton-school-insights.css?v=4';
    css.dataset.teaCarrolltonCss='1';
    document.head.appendChild(css);
  }
  // A school list is below the main map and detail column, so selecting a school
  // must show its useful insight in place instead of requiring users to scroll
  // upward and discover the detail panel on their own.
  function mountInline(school, rating) {
    const list=document.getElementById('schoolList');
    if(!list)return;
    const old=list.querySelector('.tea-school-inline-preview');
    if(!school){if(old)old.remove();return;}
    const selected=[...list.querySelectorAll('button.school[data-sid]')].find(function(button){
      return Number.isInteger(Number(button.dataset.sid)) &&
        state.schools[Number(button.dataset.sid)]===school;
    });
    if(!selected){if(old)old.remove();return;}
    const id=String(rating?.id||'unlinked');
    if(old && old.dataset.campus===id && old.previousElementSibling===selected)return;
    if(old)old.remove();

    const data=getSchoolInsight(rating);
    const preview=document.createElement('section');
    preview.className='tea-school-inline-preview';
    preview.dataset.campus=id;
    preview.setAttribute('aria-label','선택한 학교 평가 미리보기');
    const heading=document.createElement('div');heading.className='tea-school-inline-heading';
    heading.appendChild(textTag('strong','','선택한 학교 분석'));
    heading.appendChild(textTag('small','tea-insights-vintage','TEA 2026'));
    preview.appendChild(heading);
    if(data){
      preview.appendChild(textTag('p','tea-school-inline-summary',data.summary));
      const isRatingOnly=['rating-only','rating-and-demographics'].includes(data.evidenceStatus);
      const facts=document.createElement('div');facts.className='tea-insights-facts tea-school-inline-facts';
      [
        {kind:isRatingOnly?'confirmed':'positive',title:isRatingOnly?'확인된 평가':'강점',value:data.strength},
        {kind:isRatingOnly?'pending':'improve',title:isRatingOnly?'추가 검증':'개선과제',value:data.challenge}
      ].forEach(function(fact){
        const item=document.createElement('div');
        item.className='tea-insights-fact tea-insights-fact--'+fact.kind;
        item.appendChild(textTag('strong','tea-insights-fact-label',fact.title));
        item.appendChild(textTag('span','tea-insights-fact-text',fact.value));
        facts.appendChild(item);
      });
      preview.appendChild(facts);
      const rows=data.publicPeims?null:getRaceRows(id);
      if(data.publicPeims){
        appendPublicPeims(preview,id,true);
      }else if(rows){
        const demographicHeading=document.createElement('div');
        demographicHeading.className='tea-school-inline-heading';
        demographicHeading.appendChild(textTag('strong','','학생 인종·민족 구성'));
        demographicHeading.appendChild(textTag('small','tea-insights-vintage',data.demographics.year));
        preview.appendChild(demographicHeading);
        const stack=document.createElement('div');stack.className='tea-school-inline-stack';
        stack.setAttribute('role','img');
        stack.setAttribute('aria-label',rows.map(r=>r.label+' '+r.pct.toFixed(1)+'%').join(', '));
        rows.forEach(function(row){
          if(row.pct<=0)return;
          const segment=document.createElement('span');
          segment.style.width=row.pct+'%';segment.style.backgroundColor=row.color;
          segment.title=row.label+' '+row.pct.toFixed(1)+'%';
          stack.appendChild(segment);
        });
        preview.appendChild(stack);
        const legend=document.createElement('p');legend.className='tea-school-inline-legend';
        legend.textContent=rows.map(r=>r.label+' '+r.pct.toFixed(1)+'%').join(' · ');
        preview.appendChild(legend);
      }else{
        preview.appendChild(textTag('p','tea-insights-empty','학생 인종 구성 · 공식 원문 확인 중'));
      }
    }else{
      preview.appendChild(textTag('p','tea-insights-empty',
        '이 학교의 상세 분석은 아직 연결되지 않았습니다. 현재 CFB·Lewisville·Allen·McKinney 학군부터 확대 중입니다.'));
    }
    const more=document.createElement('button');
    more.type='button';more.className='tea-school-inline-detail';
    more.textContent='상단 상세정보 · 학교 배정 안내 보기';
    more.addEventListener('click',function(){
      const detail=document.getElementById('detailContent');
      if(detail)detail.scrollIntoView({block:'start',behavior:'auto'});
      detail?.focus({preventScroll:true});
    });
    preview.appendChild(more);
    selected.insertAdjacentElement('afterend',preview);
    // Scroll only the list container to reveal the selected card and preview.
    // Do not unexpectedly move the map or the rest of the dashboard.
    const listRect=list.getBoundingClientRect();
    const selectedRect=selected.getBoundingClientRect();
    if(listRect.height>0 && selectedRect.height>0)
      list.scrollTop+=selectedRect.top-listRect.top-8;
  }
  function mount() {
    const host=document.getElementById('detailContent');
    if(!host || typeof state==='undefined') return;
    const school=state.selectedSchool;
    if(school)loadVerifiedAggregates();
    if(!school){
      mountInline(null,null);
      return;
    }
    if(typeof scoreRecord!=='function')return;
    const rating=scoreRecord(school.name,school.district);
    loadAllenMcKinneyBatch(rating);
    const id=String(rating?.id||'');
    if(getSchoolInsight(rating) && !host.querySelector('.tea-insights-panel[data-campus="'+id+'"]')){
      const panel=render(rating);
      if(panel){
        ensureStyles();
        const separator=host.querySelector('hr.rule');
        if(separator)separator.insertAdjacentElement('afterend',panel);
        else host.appendChild(panel);
      }
    }
    if(!document.querySelector('link[data-tea-carrollton-css]'))ensureStyles();
    mountInline(school,rating);
  }
  function installCoveragePanel(){
    const list=document.getElementById('schoolList');
    if(!list || document.getElementById('tea-data-progress'))return;
    const details=document.createElement('details');
    details.id='tea-data-progress';
    details.className='source school-info tea-data-progress';
    details.appendChild(textTag('summary','','학교정보 구축 현황 · 기본 2,282개 / 세부 분석 확대 중'));
    const content=document.createElement('div');
    content.className='tea-data-progress-content';
    content.setAttribute('aria-live','polite');
    content.appendChild(textTag('p','','펼치면 최신 학교별 데이터 연결률을 표시합니다.'));
    details.appendChild(content);
    let started=false;
    details.addEventListener('toggle',function(){
      if(!details.open||started)return;
      started=true;
      if(!root||typeof root.fetch!=='function')return;
      root.fetch('./data/tea-profile-progress-2026.json?v=1',{credentials:'same-origin'})
        .then(function(response){if(!response.ok)throw Error('Progress not available');return response.json();})
        .then(function(info){
          if(!Number.isInteger(info.totalCampuses)||info.totalCampuses<1)return;
          const count=info.totalCampuses;
          const ratio=function(n){return ((Number(n)||0)*100/count).toFixed(1)+'%';};
          content.replaceChildren();
          content.appendChild(textTag('p','','집계 기준 '+info.asOf+' · 현재 등록 TEA 캠퍼스 기록 '+count.toLocaleString('en-US')+'개'));
          [
            ['2026 A–F 종합등급',info.accountabilityRatingPresent],
            ['학교별 기본 설명',info.profilePanelsConnected],
            ['개별 강점·개선과제 분석',info.individualNarratives],
            ['2026 영역별 평가점수',info.domainComponentsReviewed],
            ['학생 인종 구성',info.ethnicityReviewed]
          ].forEach(function(pair){
            const p=document.createElement('p');
            p.appendChild(textTag('strong','',pair[0]+' '+Number(pair[1]||0).toLocaleString('en-US')+' / '+count.toLocaleString('en-US')));
            p.appendChild(document.createTextNode(' · '+ratio(pair[1])));
            content.appendChild(p);
          });
          content.appendChild(textTag('p','','미평가(Not Rated) '+info.notRated+'개 · 2025–26 공식 자료는 학교별 검증 후 갱신됩니다.'));
          content.appendChild(textTag('p','','종합등급 연결과 과목별 분석 완료는 다른 기준입니다. 개인정보 보호로 마스킹된 수치는 추정하지 않습니다.'));
        }).catch(function(){content.textContent='현재 진행률 파일을 불러올 수 없습니다. 학교별 공식 출처를 확인해 주세요.';});
    });
    list.insertAdjacentElement('afterend',details);
  }
  function boot() {
    const host=document.getElementById('detailContent');
    if(!host || typeof MutationObserver==='undefined')return;
    installCoveragePanel();
    const search=document.getElementById('schoolSearch');
    if(search)search.placeholder='학교 이름 검색 (주변 학교·배정학교 검색 아님)';
    const observer=new MutationObserver(mount);
    observer.observe(host,{childList:true});
    // Filters can rebuild the list without changing the selected-school detail.
    const list=document.getElementById('schoolList');
    if(list){
      const listObserver=new MutationObserver(mount);
      listObserver.observe(list,{childList:true,subtree:true});
    }
    mount();
  }
  const api={
    getRecord:getRecord,getSchoolInsight:getSchoolInsight,getRaceRows:getRaceRows,
    checkRace:checkRace,render:render,count:Object.keys(CAMPUS).length,
    verifiedEthnicityCount:Object.keys(VERIFIED_TAPR).length+
      Object.values(CAMPUS).filter(function(c){return !!c.demographics;}).length,
    rolloutDistricts:Object.keys(ROLLOUT),
    rolloutPhase:function(district){return ROLLOUT[district]?.phase||4;},
    enrichedCampusCount:function(){return Object.keys(ENRICHED).length;},
    validDomains:validDomains,
    applyAllenMcKinneyBatch:applyAllenMcKinneyBatch,
    publicPeimsRows:publicPeimsRows,
    officialBatchCount:function(){return Object.keys(ALLEN_MCKINNEY).length;},
    officialBatchError:function(){return officialBatchError;}
  };
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  if(root && typeof document!=='undefined'){
    root.CarrolltonSchoolInsights=api;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window!=='undefined'?window:null);
