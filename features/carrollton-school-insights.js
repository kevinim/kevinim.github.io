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
    '061902140': {
      summary:'독해 대비 수학·과학 성취가 낮아 과목 간 성과 차이를 줄이는 것이 과제입니다.',
      strength:'독해',challenge:'수학·과학',
      demographics:{
        year:'2024–25',document:'2025 TEA School Report Card · Coyote Ridge Elementary',enrollment:478,
        src:'https://resources.finalsite.net/images/v1767733001/lisdnet/lisdnet/xilennjkuzhmri1hlapt/coyoteridgerc.pdf',
        race:{black:29.3,hispanic:17.8,white:15.9,native:1.3,asian:29.1,pacific:0.4,multi:6.3}
      }
    },
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
    // 2025 TEA School Report Card hosted by Castle Hills Elementary (Lewisville ISD),
    // page 2 student information. Campus percentages; NOT 2025-26 PEIMS.
    '061902136':{
      demographics:{
        year:'2024–25',document:'2025 TEA School Report Card · Castle Hills Elementary',
        enrollment:599,
        src:'https://resources.finalsite.net/images/v1767735451/lisdnet/lisdnet/pbywuuw1lzfsjjftgn4m/castlehillsrc.pdf',
        race:{black:2.0,hispanic:8.3,white:45.9,native:0.2,asian:35.9,pacific:0.2,multi:7.5}
      }
    },
    // TEA 2025 School Report Card, 2024-25 campus enrollment; source checked 2026-11-11.
    '061902142':{
      demographics:{
        year:'2024–25',document:'2025 TEA School Report Card · Independence Elementary',enrollment:828,
        src:'https://rptsvr1.tea.texas.gov/cgi/sas/broker?_program=perfrept.perfmast.sas&_service=marykay&ccyy=2025&id=061902142&lev=C&prgopt=reports/src/src.sas',
        race:{black:7.6,hispanic:55.7,white:7.7,native:0.1,asian:25.8,pacific:0.2,multi:2.8}
      }
    },
    '061902143':{
      demographics:{
        year:'2024–25',document:'2025 TEA School Report Card · Lewisville Elementary',enrollment:509,
        src:'https://resources.finalsite.net/images/v1767730334/lisdnet/lisdnet/v0na6prf22b4hdu3dmcl/lewisvillerc.pdf',
        race:{black:19.4,hispanic:70.5,white:4.5,native:0,asian:1.6,pacific:0,multi:3.9}
      }
    },
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
  // Official 2026 TEA campus accountability and 2025–26 STAAR, staged independently
  // from school zones and demographics. Loaded only after school selection.
  const ACADEMIC=Object.create(null);
  let academicStarted=false;
  let academicSources=null;
  const DOMAIN_KEYS=[
    ['studentAchievement','학업 성취','achievement'],
    ['schoolProgress','학교 향상도','progress'],
    ['closingTheGaps','학생 집단별 성과','gaps']
  ];
  const SUBJECT_KEYS=[
    ['reading','독해'],['math','수학'],['science','과학'],['socialStudies','사회']
  ];
  function validAcademicUrl(raw,dataset){
    try{
      const u=new URL(raw);
      return u.protocol==='https:'&&u.hostname==='rptsvr1.tea.texas.gov'&&
        u.searchParams.get('ccyy')==='2026'&&u.searchParams.get('sumlev')==='C'&&
        u.searchParams.get('dsname')===dataset&&
        u.searchParams.get('prgopt')==='reports/acct/dd/dd_get_data.sas';
    }catch{return false;}
  }
  function validOfficialMetric(row,domain){
    if(!row||typeof row!=='object')return false;
    if(row.status==='reported')return Number.isInteger(domain?row.score:row.value)&&
      (domain?row.score:row.value)>=0&&(domain?row.score:row.value)<=100;
    if(domain){
      return ['not-rated','suppressed','unavailable'].includes(row.status)&&
        row.score===null&&(row.status!=='not-rated'||row.rating==='Not Rated');
    }
    return ['suppressed','unavailable','not-in-source'].includes(row.status)&&row.value===null;
  }
  function installAcademicBatches(domain,staar){
    if(!domain||!staar||domain.schemaVersion!==1||staar.schemaVersion!==1||
       domain.accountabilityYear!==2026||staar.accountabilityYear!==2026||
       domain.schoolYear!=='2025-26'||staar.schoolYear!=='2025-26'||
       !validAcademicUrl(domain.source?.url,'RATE'))return 0;
    for(const [key,dataset] of [
      ['D1_STAAR1','D1_STAAR1'],['D1_STAAR2','D1_STAAR2'],['D1_STAAR3','D1_STAAR3']
    ]){
      if(!validAcademicUrl(staar.source?.groups?.[key]?.url,dataset))return 0;
    }
    const ids=Object.keys(domain.campuses||{});
    if(ids.length!==2282 || Object.keys(staar.campuses||{}).length!==2282)return 0;
    const next=Object.create(null);
    for(const id of ids){
      const a=domain.campuses[id],s=staar.campuses[id];
      if(!/^\d{9}$/.test(id)||!a||!s||a.districtId!==id.slice(0,6)||
         typeof a.officialCampusName!=='string'||!a.overall ||
         !['A','B','C','D','F','Not Rated'].includes(a.overall.rating) ||
         !(a.overall.score===null||(Number.isInteger(a.overall.score)&&a.overall.score>=0&&a.overall.score<=100)) ||
         !DOMAIN_KEYS.every(function(p){return validOfficialMetric(a[p[0]],true);})||
         !SUBJECT_KEYS.every(function(p){return validOfficialMetric(s[p[0]],false);}))return 0;
      next[id]={accountability:a,staar:s};
    }
    // Transactional intake: malformed batch never partially replaces a known-good one.
    for(const id of ids)ACADEMIC[id]=next[id];
    academicSources={domain:domain.source.url,subjects:staar.source.groups.D1_STAAR1.url};
    return ids.length;
  }
  function applyAcademicDetails(record,base){
    const official=ACADEMIC[String(record.id)];
    if(!official||!academicSources)return base;
    const a=official.accountability,s=official.staar;
    if(a.officialCampusName!==record.officialName||a.districtId!==String(record.id).slice(0,6)||
       a.overall.rating!==record.rating||a.overall.score!==record.score)return base;
    const added={...base};
    added.academicDomainRows=DOMAIN_KEYS.map(function(tuple){
      const cell=a[tuple[0]];
      return {key:tuple[2],label:tuple[1],status:cell.status,score:cell.score,rating:cell.rating};
    });
    added.academicSubjectRows=SUBJECT_KEYS.map(function(tuple){
      const cell=s[tuple[0]];
      return {key:tuple[0],label:tuple[1],status:cell.status,value:cell.value};
    });
    added.domainsSource=academicSources.domain;
    added.subjectsSource=academicSources.subjects;
    const available=added.academicDomainRows.filter(function(v){return v.status==='reported';});
    const subjects=added.academicSubjectRows.filter(function(v){return v.status==='reported';});
    added.subjects=Object.fromEntries(subjects.map(function(v){
      return [v.key==='socialStudies'?'social':v.key,v.value];
    }));
    if(available.length===3 && subjects.length>0 && record.rating!=='Not Rated'){
      added.domains={achievement:a.studentAchievement.score,
        progress:a.schoolProgress.score,gaps:a.closingTheGaps.score};
      const rank=available.slice().sort(function(x,y){return y.score-x.score;});
      added.evidenceStatus='reviewed';
      added.strength=rank[0].label+' '+rank[0].score+'점 (3개 영역 중 가장 높음)';
      added.challenge=rank[2].label+' '+rank[2].score+'점 (3개 영역 중 상대적으로 낮음)';
      added.summary='2026 TEA 공식 영역별 환산점수 비교에서 '+rank[0].label+'가 가장 높고 '+
        rank[2].label+'가 가장 낮습니다. 이 비교는 종합등급의 원인 분석이 아닙니다.';
    }else{
      delete added.domains;
      added.evidenceStatus=added.demographics?'rating-and-demographics':'rating-only';
      added.strength=['A','B','C','D','F'].includes(record.rating)?
        '확인된 공식 종합 등급: '+record.rating+' · '+record.score+'점':'공식 종합 평가로 판단 불가';
      added.challenge='영역별 미평가·미공개 자료가 있어 강점·개선과제 판단 보류';
      added.summary=record.rating==='Not Rated'?
        '2026 TEA 종합평가는 미평가(Not Rated)입니다. 영역/과목별 미공개·미해당 항목은 0점이 아닙니다.':
        '2026 TEA 영역별 일부 항목이 미평가 또는 미공개입니다. 공개 점수는 아래에 표시하되 강점·개선과제는 추정하지 않습니다.';
    }
    return added;
  }
  function loadAcademicBatches(){
    if(academicStarted||!root||typeof root.fetch!=='function')return;
    academicStarted=true;
    Promise.all([
      root.fetch('./data/tea-accountability-2026-verified-batch.json?v=1',{credentials:'same-origin'}),
      root.fetch('./data/tea-staar-meets-2026-verified-batch.json?v=1',{credentials:'same-origin'})
    ]).then(function(responses){
      if(responses.some(function(r){return !r.ok;}))throw Error('Academic TEA data absent');
      return Promise.all(responses.map(function(r){return r.json();}));
    }).then(function(batch){
      if(installAcademicBatches(batch[0],batch[1])!==2282)return;
      if(typeof document!=='undefined'){
        document.querySelectorAll('.tea-insights-panel').forEach(function(panel){panel.remove();});
        document.querySelectorAll('.tea-school-inline-preview').forEach(function(panel){panel.remove();});
        mount();
      }
    }).catch(function(){/* No inferred TEA scores when official batch unavailable. */});
  }
  function getSchoolInsight(record) {
    if(!record || !/^\d{9}$/.test(String(record.id||''))) return null;
    const code=String(record.district||'');
    const prefix=DISTRICT_IDS[code] || (/^\d{6}$/.test(code)?code:null);
    if(!prefix || !String(record.id).startsWith(prefix))return null;
    // A valid-looking official link is insufficient: it MUST identify this exact TEA campus.
    // URL parsing also rejects spoofed hosts, changed path and mismatched campus IDs.
    let official;
    try { official=new URL(record.official); } catch { return null; }
    if(official.protocol!=='https:' || official.hostname!=='txschools.gov' ||
       official.pathname!=='/' || official.searchParams.get('view')!=='school' ||
       official.searchParams.get('id')!==String(record.id))return null;
    const cohort=ROLLOUT[code]||{phase:4,label:record.districtName||'DFW 학군 '+code};
    const curated=getRecord(record.id);
    const existing=VERIFIED_TAPR[String(record.id)]||null;
    const validGrade=['A','B','C','D','F'].includes(record.rating);
    const hasScore=validGrade && Number.isInteger(record.score) && record.score>=0 && record.score<=100;
    const rating=hasScore?record.rating+' · '+record.score+'점':record.rating==='Not Rated'?'미평가':'등급 정보 미확인';
    const reviewedCurated=!!curated && curated.evidenceStatus==='reviewed' &&
      validDomains(curated.domains) && curated.subjects &&
      Object.keys(curated.subjects).some(function(k){
        return typeof curated.subjects[k]==='number' && Number.isFinite(curated.subjects[k]);
      });
    const base=reviewedCurated
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
    return applyAcademicDetails(record,enrichFromOfficial(record,base));
  }
  function getRaceRows(id) {
    const d=ENRICHED[String(id)]?.demographics||
      (getRecord(id)||VERIFIED_TAPR[String(id)])?.demographics;
    if (!d || !checkRace(d.race)) return null;
    return RACES.map(function(r){return {key:r[0],label:r[1],color:r[2],pct:d.race[r[0]]};});
  }
  // Public, campus-level 2025-26 PEIMS grouped ethnicity counts. Some cells are
  // suppressed or not listed, so these are COUNTS only, never fabricated percentages.
  const PUBLIC_PEIMS_COUNTS=Object.create(null);
  const PUBLIC_PEIMS_SOURCES=Object.create(null);
  let publicPeimsStarted=false;
  const PEIMS_SOURCE_PREFIX='https://rptsvr1.tea.texas.gov/cgi/sas/broker';
  const PEIMS_DISTRICTS=Object.freeze({
    CFB:'057903',LISD:'061902',AISD:'043901','043907':'043907',
    FISD:'043905',PISD:'043910',PROSPER:'043912',
    '061901':'061901','057912':'057912','057916':'057916','057905':'057905'
  });
  function peimsDistrictCode(district){
    if(Object.hasOwn(PEIMS_DISTRICTS,district))return PEIMS_DISTRICTS[district];
    return /^\d{6}$/.test(String(district||''))?String(district):null;
  }
  function validPeimsSource(url,district){
    const code=peimsDistrictCode(district);
    if(typeof url!=='string'||!code)return false;
    let source;
    try{source=new URL(url);}catch{return false;}
    return source.origin==='https://rptsvr1.tea.texas.gov'&&
      source.pathname==='/cgi/sas/broker'&&
      source.searchParams.get('_program')==='adhoc.addispatch.sas'&&
      source.searchParams.get('endyear')==='26'&&
      source.searchParams.get('major')==='st'&&
      source.searchParams.get('minor')==='e'&&
      source.searchParams.get('grouping')==='e'&&
      source.searchParams.get('format')==='c'&&
      source.searchParams.get('selsumm')==='ic'&&
      source.searchParams.get('key')===code;
  }
  // One official 2025–26 Statewide Campus Totals CSV also contains all cataloged
  // DFW campuses; it is used where no district-specific source has been imported.
  function validPeimsStatewideSource(url){
    if(typeof url!=='string')return false;
    let source;
    try{source=new URL(url);}catch{return false;}
    return source.origin==='https://rptsvr1.tea.texas.gov'&&
      source.pathname==='/cgi/sas/broker'&&
      source.searchParams.get('_program')==='adhoc.addispatch.sas'&&
      source.searchParams.get('endyear')==='26'&&
      source.searchParams.get('major')==='st'&&source.searchParams.get('minor')==='e'&&
      source.searchParams.get('format')==='c'&&source.searchParams.get('grouping')==='e'&&
      source.searchParams.get('selsumm')==='sc'&&
      source.searchParams.get('loop')==='1'&&
      (source.searchParams.get('key')||'')==='';
  }
  function validPublishedCampus(id,entry) {
    if(!/^\d{9}$/.test(String(id||'')) || !entry || typeof entry!=='object')return false;
    const code=peimsDistrictCode(entry.district);
    if(!code||!String(id).startsWith(code))return false;
    if(typeof entry.name!=='string'||entry.name.length<1||entry.name.length>200||!entry.counts)return false;
    const expected=RACES.map(function(row){return row[0];});
    const actual=Object.keys(entry.counts);
    if(actual.length!==expected.length||actual.some(function(key){return !expected.includes(key);}))return false;
    return expected.every(function(key){
      const cell=entry.counts[key];
      if(!cell || typeof cell!=='object')return false;
      if(cell.status==='published')return Number.isSafeInteger(cell.count)&&cell.count>=0;
      if(cell.status==='suppressed')return typeof cell.publishedMask==='string'&&/^(?:<\d+|-999|N\/A)$/.test(cell.publishedMask)&&cell.count===undefined;
      return cell.status==='not-listed' && cell.count===undefined;
    });
  }
  // PR #239 independently reconciles five fully public 2025–26 TEA PEIMS
  // ethnicity distributions against the same TEA PEIMS gender grouping total.
  // No full percentages from unreviewed seven-cell sums.
  const AUDITED_PEIMS_TOTALS=Object.freeze({
    '043901001':5127,'057912046':753,'057912123':756,
    '061911001':2806,'061911007':2997
  });
  function auditedPeimsTotal(id,rows){
    if(!Object.hasOwn(AUDITED_PEIMS_TOTALS,String(id)) ||
       !Array.isArray(rows) || rows.length!==RACES.length ||
       rows.some(function(x){return x.status!=='published'||!Number.isSafeInteger(x.count)||x.count<0;}))return null;
    const sum=rows.reduce(function(a,x){return a+x.count;},0);
    return sum>0&&sum===AUDITED_PEIMS_TOTALS[String(id)]?sum:null;
  }
  function getPublishedCountRows(id) {
    const item=PUBLIC_PEIMS_COUNTS[String(id)];
    if(!item)return null;
    return RACES.map(function(row){
      const cell=item.counts[row[0]];
      return {key:row[0],label:row[1],status:cell.status,
        count:cell.status==='published'?cell.count:null,
        display:cell.status==='published'?cell.count.toLocaleString('en-US')+'명':
          cell.status==='suppressed'?'비공개 (TEA 마스킹)':'원본 미표시'};
    });
  }
  function loadPublishedPeimsCounts() {
    if(publicPeimsStarted||!root||typeof root.fetch!=='function')return;
    publicPeimsStarted=true;
    root.fetch('./data/tea-ethnicity-2025-26-priority.json?v=1',{credentials:'same-origin'})
      .then(function(res){if(!res.ok)throw Error('PEIMS counts unavailable');return res.json();})
      .then(function(file){
        if(file.schemaVersion!==1||file.schoolYear!=='2025-26'||
           !file.campuses||typeof file.campuses!=='object'||!file.sources)return;
        const sourceEntries=Object.entries(file.sources);
        if(sourceEntries.length<11)return;
        for(const [district,url] of sourceEntries){
          if(!validPeimsSource(url,district))return;
        }
        const statewide=file.statewideSource;
        if(statewide && !validPeimsStatewideSource(statewide))return;
        for(const [district,url] of sourceEntries)
          PUBLIC_PEIMS_SOURCES[district]=url;
        if(statewide)PUBLIC_PEIMS_SOURCES.__statewide=statewide;
        let accepted=0;
        for(const [id,item] of Object.entries(file.campuses)){
          if(!validPublishedCampus(id,item) ||
             !(PUBLIC_PEIMS_SOURCES[item.district]||PUBLIC_PEIMS_SOURCES.__statewide))continue;
          PUBLIC_PEIMS_COUNTS[id]=item;accepted++;
        }
        if(accepted && typeof document!=='undefined'){
          document.querySelectorAll('.tea-insights-panel').forEach(function(panel){panel.remove();});
          document.querySelectorAll('.tea-school-inline-preview').forEach(function(panel){panel.remove();});
          mount();
        }
      }).catch(function(){/* Offline or invalid data: no demographic inference. */});
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

    if(data.academicDomainRows){
      const metrics=document.createElement('dl');metrics.className='tea-insights-domains';
      metrics.setAttribute('aria-label','2026 TEA 공식 영역별 환산점수 및 미평가 상태');
      data.academicDomainRows.forEach(function(v){
        const item=document.createElement('div');
        const label=v.status==='reported'?v.score+'점 ('+v.rating+')':
          v.status==='not-rated'?'미평가 (Not Rated)':
          v.status==='suppressed'?'비공개':'원본 미제공';
        item.appendChild(textTag('dt','',v.label));
        item.appendChild(textTag('dd','',label));
        metrics.appendChild(item);
      });
      panel.appendChild(metrics);
      panel.appendChild(textTag('p','tea-insights-meta',
        '2026 TEA 영역별 환산점수입니다. 종합등급 원인을 직접 설명하는 원시 구성점수가 아닙니다.'));
    }else if(data.domains){
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
    if(data.academicSubjectRows){
      const subjects=document.createElement('p');subjects.className='tea-insights-subjects';
      subjects.appendChild(textTag('strong','','2025–26 STAAR 전체 학생 · Meets 이상: '));
      subjects.appendChild(document.createTextNode(data.academicSubjectRows.map(function(v){
        const status=v.status==='reported'?v.value+'%':
          v.status==='suppressed'?'비공개':
          v.status==='not-in-source'?'학교 원본 행 없음':'수치 미제공/미해당 여부 확인';
        return v.label+' '+status;
      }).join(' · ')));
      panel.appendChild(subjects);
    }else if(data.subjects){
      const subjects=document.createElement('p');subjects.className='tea-insights-subjects';
      const labels={reading:'독해',math:'수학',science:'과학',social:'사회'};
      subjects.appendChild(textTag('strong','','STAAR 학년 수준 충족 이상: '));
      subjects.appendChild(document.createTextNode(
        Object.keys(data.subjects).map(function(key){return labels[key]+' '+data.subjects[key]+'%';}).join(' · ')
      ));
      panel.appendChild(subjects);
    }

    const published=getPublishedCountRows(id);
    if(published){
      const sevenPublic=published.every(function(cell){return cell.status==='published';});
      const auditedTotal=auditedPeimsTotal(id,published);
      const complete=auditedTotal!==null;
      const total=auditedTotal||0;
      const current=document.createElement('details');
      current.className='tea-insights-provenance tea-peims-counts';
      current.open=true;
      current.appendChild(textTag('summary','tea-insights-provenance-summary',
        complete?'2025–26 PEIMS 인종별 인원 · 같은 원본 등록 인원 검증':
          sevenPublic?'2025–26 PEIMS 인종별 인원 · 등록 인원 대조 대기':
          '2025–26 PEIMS 인종별 인원 · 일부 비공개'));
      const recentList=document.createElement('ul');
      recentList.className='tea-insights-legend';
      published.forEach(function(cell){
        const percent=complete&&total>0?
          ' ('+(100*cell.count/total).toFixed(1)+'%)':'';
        recentList.appendChild(textTag('li','',cell.label+' · '+cell.display+percent));
      });
      current.appendChild(recentList);
      current.appendChild(textTag('p','tea-insights-empty',complete&&total>0?
        '2025–26 TEA PEIMS 인종별 7개 공개 수치를 동일 TEA PEIMS 성별 등록 인원 집계와 대조한 비율입니다. 다른 TEA 보고서의 등록 인원과 일치한다는 의미는 아닙니다.':
        sevenPublic?'7개 인종 범주는 공개됐으나 독립 등록 인원 대조가 완료되지 않아 비율을 표시하지 않습니다.':
        'TEA가 일부 학생 수를 비공개 또는 미표시하여 정확한 전체 인종 비율을 계산하지 않습니다.'));
      if(complete&&id==='043901001'){
        current.appendChild(textTag('p','tea-insights-missing',
          '주의: Allen High는 같은 연도의 TEA PEIMS 5,127명과 별도 TEA 학교 프로필 5,126명이 일치하지 않습니다. 이 비율은 PEIMS 기준이며 다른 원본의 차이는 미해결입니다.'));
      }
      panel.appendChild(current);
    }
    const demo=(data.demographics && checkRace(data.demographics.race))?data.demographics:null;
    if(demo){
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
      panel.appendChild(textTag('p','tea-insights-empty',published?
        '2025–26 PEIMS 공개 인원은 위에 표시됩니다. 7개 분류 전체 비율은 비공개 또는 등록 인원 대조 조건에 따라 별도로 제한됩니다.':
        '학생 인종 구성 · 공식 수치 확인 중'));
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
    if(!data.domains&&!data.academicDomainRows) notes.appendChild(textTag('p','tea-insights-missing',
      '영역별 점수 및 과목별 성취도: 개별 TEA 원문 미연결. 종합점수만으로 과목별 강점이나 약점을 추정하지 않습니다.'));
    if(data.academicDomainRows&&data.evidenceStatus!=='reviewed')
      notes.appendChild(textTag('p','tea-insights-missing',
        '이 학교는 영역별 미평가·수치 미제공 항목이 있습니다. 빈칸과 미평가는 0점 또는 F등급을 뜻하지 않습니다.'));
    if(data.domainsSource&&hasOfficialSource(data.domainsSource))notes.appendChild(makeLink('2026 TEA 영역별 점수 원문',data.domainsSource));
    if(data.subjectsSource&&hasOfficialSource(data.subjectsSource))notes.appendChild(makeLink('2026 TEA STAAR 과목별 자료 원문',data.subjectsSource));
    if(published){
      notes.appendChild(textTag('p','tea-insights-meta','2025–26 인종별 학생 수: TEA PEIMS 공개 캠퍼스 집계 · 일부 항목 비공개/미표시.'));
      notes.appendChild(makeLink('TEA 공식 2025–26 학교별 집계 CSV',
        PUBLIC_PEIMS_SOURCES[String(scoreRecord.district)]||
        PUBLIC_PEIMS_SOURCES.__statewide||
        'https://rptsvr1.tea.texas.gov/adhocrpt/adste.html'));
    }
    if(demo){
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
      const rows=getRaceRows(id);
      if(rows){
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
    if(school){loadVerifiedAggregates();loadPublishedPeimsCounts();loadAcademicBatches();}
    if(!school){
      mountInline(null,null);
      return;
    }
    if(typeof scoreRecord!=='function')return;
    const rating=scoreRecord(school.name,school.district);
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
            ['기존 수동 분석 초안 (검증 수준 별도)',info.individualNarratives],
            ['기존 데이터에 통합된 2026 영역별 점수',info.domainComponentsReviewed],
            ['2025–26 공개 인종별 학생 수 (비공개 포함)',info.public2025_26CampusCounts],
            ['2025–26 일곱 인종 전체 비율 확인',info.public2025_26CompleteShares],
            ['과거 학년도 전체 인종 비율 확인',info.ethnicityReviewed]
          ].forEach(function(pair){
            const p=document.createElement('p');
            p.appendChild(textTag('strong','',pair[0]+' '+Number(pair[1]||0).toLocaleString('en-US')+' / '+count.toLocaleString('en-US')));
            p.appendChild(document.createTextNode(' · '+ratio(pair[1])));
            content.appendChild(p);
          });
          content.appendChild(textTag('p','','미평가(Not Rated) '+info.notRated+'개 · 2025–26 공개 학생 수는 '+Number(info.public2025_26PublishedCells||0)+'개 분류에 연결되었습니다. '+Number(info.public2025_26SuppressedCells||0)+'개는 비공개, '+Number(info.public2025_26UnlistedCells||0)+'개는 원본 미표시입니다.'));
          content.appendChild(textTag('p','','종합등급 연결과 과목별 분석 완료는 다른 기준입니다. 개인정보 보호로 마스킹된 수치는 추정하지 않습니다.'));
          // Production integration coverage is authoritative once this shared release snapshot exists.
          // Before integration, retain the legacy UAT preview without describing it as deployed.
          const integrated=info.official2026;
          if(integrated && integrated.accountabilityYear===2026 &&
             integrated.schoolYear==='2025-26' && integrated.campuses===count){
            content.appendChild(textTag('p','tea-insights-meta','2026 공식 영역 및 2025–26 STAAR 공개 점수 · 데이터 원본 기준'));
            [
              ['2026 학업 영역 1개 이상 공개',integrated.domainAnyReported],
              ['2026 학업 영역 3개 모두 공개',integrated.domainAllReported],
              ['2025–26 STAAR 과목 1개 이상 공개',integrated.staarAnyReported],
              ['2025–26 STAAR 4개 과목 모두 공개',integrated.staarAllFourReported],
              ['공개 점수의 상대 비교 가능 (등급 원인 아님)',integrated.scoreBasedComparisonEligible]
            ].forEach(function(pair){
              const value=pair[1];
              if(Number.isInteger(value)&&value>=0&&value<=count)
                content.appendChild(textTag('p','',pair[0]+' '+value.toLocaleString('en-US')+
                  ' / '+count.toLocaleString('en-US')+' · '+ratio(value)));
            });
            content.appendChild(textTag('p','tea-insights-missing',
              'STAAR 원본 행 미포함 '+integrated.staarSourceAbsent+
              '개 · 미평가/비공개/원본 미제공은 0점이 아닙니다.'));
            if(Array.isArray(integrated.byDistrict)&&integrated.byDistrict.length){
              const districtDetails=document.createElement('details');
              districtDetails.className='tea-data-progress-districts';
              districtDetails.appendChild(textTag('summary','','학군별 수치 확인 ('+integrated.byDistrict.length+'개)'));
              districtDetails.appendChild(textTag('p','tea-insights-missing',
                '학군 행정코드 기준 현행 목록이며 학교의 실제 DFW 위치나 집 주소 배정을 의미하지 않습니다.'));
              const districtList=document.createElement('div');
              districtList.className='tea-data-progress-district-list';
              districtList.style.maxHeight='280px';
              districtList.style.overflowY='auto';
              const priority=['057903','061902','043901','043907','043910','043905','043912','061901','057905','057912'];
              const ordered=integrated.byDistrict.slice().sort(function(a,b){
                const ia=priority.indexOf(a.districtId),ib=priority.indexOf(b.districtId);
                return (ia<0?999:ia)-(ib<0?999:ib) || a.districtId.localeCompare(b.districtId);
              });
              ordered.forEach(function(d){
                if(!/^\\d{6}$/.test(d.districtId)||!Number.isInteger(d.campuses)||d.campuses<1)return;
                districtList.appendChild(textTag('p','',
                  d.name+' · 전체 '+d.campuses+
                  ' · 3영역 '+d.domainAllReported+
                  ' · STAAR 1개 이상 '+d.staarAnyReported+
                  ' · PEIMS 공개 집계 '+d.public2025_26CountCampuses+
                  ' · 7개 인종 비율 완비 '+d.fullRaceShareCampuses));
              });
              districtDetails.appendChild(districtList);
              content.appendChild(districtDetails);
            }
          }else{
          // Data-stage coverage is separate from already deployed/historical progress.
          root.fetch('./data/tea-2026-uat-progress.json?v=1',{credentials:'same-origin'})
            .then(function(response){if(!response.ok)throw Error('Academic UAT unavailable');return response.json();})
            .then(function(uat){
              if(uat.schemaVersion!==1||uat.accountabilityYear!==2026||
                 uat.schoolYear!=='2025-26'||uat.counts?.campuses!==count)return;
              const c=uat.counts;
              content.appendChild(textTag('p','tea-insights-meta',
                'UAT 신규 2026 TEA 상세 원본 (아직 Production 미반영)'));
              [
                ['3개 영역 점수 모두 공개',c.domainAllReported],
                ['3개 영역 및 공개 STAAR 과목으로 상대 비교 가능',c.detailedRelativeComparisonEligible],
                ['STAAR 공개 과목 수치 하나 이상 존재',c.subjectAnyReported]
              ].forEach(function(pair){
                const n=pair[1];
                if(Number.isInteger(n)&&n>=0&&n<=count)
                  content.appendChild(textTag('p','',pair[0]+' '+
                    n.toLocaleString('en-US')+' / '+count.toLocaleString('en-US')+' · '+ratio(n)));
              });
              content.appendChild(textTag('p','tea-insights-missing',
                'STAAR 원본 행 미포함 '+c.staarSourceRowAbsent+'개 · Not Rated/비공개/미제공은 0점이 아닙니다. 학교 배정 경계와 별도 자료입니다.'));
            }).catch(function(){
              content.appendChild(textTag('p','tea-insights-missing','UAT 학업 성적 구축 현황을 불러올 수 없습니다.'));
            });
          }

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
    validDomains:validDomains,validPublishedCampus:validPublishedCampus,
    validPeimsSource:validPeimsSource,validPeimsStatewideSource:validPeimsStatewideSource,
    getPublishedCountRows:getPublishedCountRows,auditedPeimsTotal:auditedPeimsTotal,
    installAcademicBatches:installAcademicBatches,validAcademicUrl:validAcademicUrl
  };
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  if(root && typeof document!=='undefined'){
    root.CarrolltonSchoolInsights=api;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window!=='undefined'?window:null);
