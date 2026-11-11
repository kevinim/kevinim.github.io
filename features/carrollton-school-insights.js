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
  function getRaceRows(id) {
    const d=getRecord(id)?.demographics;
    if (!d || !checkRace(d.race)) return null;
    return RACES.map(function(r){return {key:r[0],label:r[1],color:r[2],pct:d.race[r[0]]};});
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
    const data=getRecord(id);
    if(!data || !['CFB','LISD'].includes(scoreRecord.district)) return null;
    const panel=document.createElement('section');
    panel.className='tea-insights-panel';
    panel.dataset.campus=id;
    panel.setAttribute('aria-label','학교 평가 및 학생 구성');
    const title=textTag('h4','tea-insights-title','학교 평가 · 강점 · 학생 구성');
    panel.appendChild(title);
    panel.appendChild(textTag('p','tea-insights-meta','2026 TEA 평가 · 학생 인종 구성은 별도 학년도'));
    const summary=textTag('p','tea-insights-summary',data.summary);
    panel.appendChild(summary);
    const facts=document.createElement('div');facts.className='tea-insights-facts';
    [['강점',data.strength],['개선과제',data.challenge]].forEach(function(pair){
      const p=document.createElement('p');
      p.appendChild(textTag('strong','',pair[0]+': '));
      p.appendChild(document.createTextNode(pair[1]));
      facts.appendChild(p);
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
    if(data.demographics && checkRace(data.demographics.race)){
      const demo=data.demographics;
      panel.appendChild(textTag('h5','tea-insights-subtitle','학생 인종·민족 구성'));
      panel.appendChild(textTag('p','tea-insights-meta',demo.year+' · TEA 학교 리포트카드 · 학생 '+demo.enrollment.toLocaleString('en-US')+'명'));
      const figure=document.createElement('figure');figure.className='tea-insights-figure';
      const chart=document.createElement('div');chart.className='tea-insights-stack';
      const rows=getRaceRows(id);
      chart.setAttribute('role','img');
      chart.setAttribute('aria-label',rows.map(function(r){return r.label+' '+r.pct.toFixed(1)+'%';}).join(', '));
      rows.forEach(function(r){
        if(r.pct===0) return;
        const s=document.createElement('span');s.className='tea-insights-segment';
        s.style.width=r.pct+'%';s.style.backgroundColor=r.color;
        s.title=r.label+' '+r.pct.toFixed(1)+'%';
        chart.appendChild(s);
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
      panel.appendChild(makeLink('TEA 2025 School Report Card 원문',demo.src));
      panel.appendChild(textTag('p','tea-insights-meta','위 비율은 학교 등록 학생 기준입니다. ZIP 주민 인구구성이나 학군 배정 보장 자료가 아닙니다. 반올림으로 합계가 100%와 다를 수 있습니다.'));
    } else {
      panel.appendChild(textTag('p','tea-insights-missing','학생 인종·민족 구성: 개별 TEA 자료 대조 중 · 미확인 수치는 표시하지 않습니다.'));
      panel.appendChild(makeLink('학교별 TAPR 확인',TAPR_URL));
    }
    panel.appendChild(textTag('p','tea-insights-meta',data.evidenceStatus==='reviewed'
      ?'평가 수치와 학생 구성 자료를 분리해 표시합니다. 한 줄 평은 TEA 공식 의견이 아닌 데이터 기반 해석입니다.'
      :'시범 해석: 세부 과목별 수치의 개별 TEA 원문 대조 전입니다. 공식 종합 등급과 구분하여 참고하세요.'));
    const links=document.createElement('div');links.className='tea-insights-links';
    links.appendChild(makeLink('2026 TEA 평가 자료',RATINGS_URL));
    links.appendChild(makeLink('TEA 캠퍼스 원문',scoreRecord.official && /^https:\/\/txschools\.gov\//.test(scoreRecord.official)
      ? scoreRecord.official : 'https://txschools.gov/'));
    panel.appendChild(links);
    return panel;
  }
  function ensureStyles() {
    // Load only on first eligible school selection, not at initial paint.
    // Preserve the dashboard's exactly ten first-render stylesheets.
    if(document.querySelector('link[data-tea-carrollton-css]')) return;
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='./features/carrollton-school-insights.css?v=1';
    css.dataset.teaCarrolltonCss='1';
    document.head.appendChild(css);
  }
  function mount() {
    const host=document.getElementById('detailContent');
    if(!host || typeof state==='undefined') return;
    const school=state.selectedSchool;
    if(!school || typeof scoreRecord!=='function')return;
    const rating=scoreRecord(school.name,school.district);
    const id=String(rating?.id||'');
    if(!getRecord(id))return;
    if(host.querySelector('.tea-insights-panel[data-campus="'+id+'"]'))return;
    host.querySelectorAll('.tea-insights-panel').forEach(function(el){el.remove();});
    const panel=render(rating);
    if(!panel)return;
    ensureStyles();
    const separator=host.querySelector('hr.rule');
    if(separator)separator.insertAdjacentElement('afterend',panel);
    else host.appendChild(panel);
  }
  function boot() {
    const host=document.getElementById('detailContent');
    if(!host || typeof MutationObserver==='undefined')return;
    const observer=new MutationObserver(mount);
    observer.observe(host,{childList:true});
    mount();
  }
  const api={getRecord:getRecord,getRaceRows:getRaceRows,checkRace:checkRace,render:render,count:Object.keys(CAMPUS).length};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  if(root && typeof document!=='undefined'){
    root.CarrolltonSchoolInsights=api;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
})(typeof window!=='undefined'?window:null);
