'use strict';

const CANDIDATE_PRIORITY_IDS=Object.freeze(['school','commute','church','ballet','hazards','healthcare']);
const CANDIDATE_TRAVEL_IDS=Object.freeze(['commute','church','ballet']);
function normalizedCandidateAddress(value){
  return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
}
function parseCandidateMinutes(value){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value);
  return Number.isInteger(n)&&n>=1&&n<=240?n:null;
}
function updateCandidateMinutes(items,index,key,value){
  if(!Array.isArray(items)||!Number.isInteger(index)||index<0||index>=items.length||
     !CANDIDATE_TRAVEL_IDS.includes(key))return items;
  const minutes=parseCandidateMinutes(value);
  return items.map((item,i)=>i===index?{...item,travelMinutes:{...(item.travelMinutes||{}),[key]:minutes}}:item);
}
// A condition is never marked verified using a campus marker, ZIP, GIS boundary,
// a user-entered trip estimate, or a city/county hazard/healthcare observation.
function candidateSuitability(item,assignment){
  const status=assignment?.status||'unavailable';
  const disputed=['conflict','apartment-split-review','feeder-review',
    'boundary-review','finder-boundary-review','needs-address-verification'].includes(status);
  const pending=status==='loading';
  const school={
    id:'school',label:'초·중·고 B 이상',state:disputed?'conflict':pending?'loading':'unknown',
    value:disputed?'경계·배정 확인 필요':pending?'학교 자료 조회 중':'공식 배정 미확인',
    note:'TEA 2026 학업등급은 주소 배정 인증이 아님 · 공식 Finder에서 학년·호수 확인'
  };
  const minutes=item?.travelMinutes||{};
  const work=parseCandidateMinutes(minutes.commute);
  const commute={
    id:'commute',label:'Plano 직장 · 30분 목표',
    state:work===null?'unknown':work<=30?'entered-met':'entered-over',
    value:work===null?'이동시간 확인 필요':work<=30?'입력 기준 30분 이내':'입력 기준 30분 초과',
    note:work===null?'출근 시간대의 실제 경로를 측정해 입력':'사용자 입력 '+work+'분 · 도로·교통상황 검증 전'
  };
  function visit(id,label){
    const n=parseCandidateMinutes(minutes[id]);
    return {id,label,state:n===null?'unknown':'entered',
      value:n===null?'이동시간 확인 필요':'사용자 입력 '+n+'분',
      note:n===null?'실제 주소부터 이동경로 확인 필요':'이동수단·시간대 미검증 · 합격 기준 미설정'};
  }
  return [school,commute,visit('church','Irving 교회 이동'),visit('ballet','Contemporary Ballet Dallas'),
    {id:'hazards',label:'재난·정전',state:'unknown',value:'주택별 확인 필요',
     note:'FEMA/NOAA 과거 집계는 개별 주소 위험·정전확률이 아님'},
    {id:'healthcare',label:'응급의료',state:'unknown',value:'운전시간 확인 필요',
     note:'CMS 병원 좌표의 직선거리는 실제 응급실 운영·도착시간이 아님'}];
}
function orderedCandidateSuitability(facts,priority){
  if(!CANDIDATE_PRIORITY_IDS.includes(priority))return facts;
  return facts.slice().sort((a,b)=>(a.id===priority?-1:0)-(b.id===priority?-1:0));
}

function addCandidate(items, candidate) {
  if (!Array.isArray(items)||!candidate||!normalizedCandidateAddress(candidate.address)||
      !Array.isArray(candidate.ll)||candidate.ll.length!==2||
      !candidate.ll.every(Number.isFinite)||items.length >= 3||
      items.some(x => normalizedCandidateAddress(x.address) === normalizedCandidateAddress(candidate.address))) return items;
  return [...items, { address: candidate.address, typedAddress:candidate.typedAddress||candidate.address, ll: [...candidate.ll], geocodeQuality: candidate.geocodeQuality ? {...candidate.geocodeQuality} : null, parcel: candidate.parcel?.status==='matched' ? {...candidate.parcel} : null, officialReview: candidate.officialReview ? {...candidate.officialReview} : null, officialDraft: candidate.officialDraft ? {...candidate.officialDraft} : null }];
}
function removeCandidate(items, index) { return items.filter((_, i) => i !== index); }
if (typeof module !== 'undefined') module.exports = { addCandidate, removeCandidate, normalizedCandidateAddress, parseCandidateMinutes, updateCandidateMinutes, candidateSuitability, orderedCandidateSuitability };
if (typeof document !== 'undefined') {
  let comparisons = [];
  let focusPriority='school';
  const criterionNames={school:'학교',commute:'Plano 출근',church:'교회',ballet:'발레',hazards:'재난·정전',healthcare:'응급의료'};
  function drawSuitability(item,assignment,index){
    const facts=orderedCandidateSuitability(candidateSuitability(item,assignment),focusPriority);
    const rows=facts.map(f=>'<div class="candidate-fit-row"><dt>'+escape(f.label)+'</dt>'+
      '<dd><span class="candidate-fit-state" data-state="'+f.state+'">'+escape(f.value)+'</span>'+
      '<small>'+escape(f.note)+'</small></dd></div>').join('');
    const minutes=item.travelMinutes||{};
    const fields=[['commute','Plano 출근'],['church','Irving 교회'],['ballet','발레 수업']]
      .map(([key,label])=>'<label>'+escape(label)+' (분)<input type="number" inputmode="numeric" min="1" max="240" step="1"'+
      ' data-candidate-minutes="'+key+'" data-candidate-index="'+index+'"'+
      ' aria-label="후보 '+ 'ABC'[index]+' '+escape(label)+' 이동시간(분)"'+
      ' value="'+(parseCandidateMinutes(minutes[key])??'')+'"></label>').join('');
    return '<section class="candidate-fit" aria-label="후보 '+ 'ABC'[index]+' 조건별 적합성">'+
      '<strong class="candidate-fit-title">조건별 적합성 · 미확인 항목 별도</strong>'+
      '<dl class="candidate-fit-list">'+rows+'</dl>'+
      '<details class="candidate-time-entry"><summary>이동시간 직접 입력 (선택)</summary>'+
      '<div class="candidate-time-fields">'+fields+'</div>'+
      '<p>사용자 입력값은 검증된 통근시간이 아닙니다. 입력값은 새로고침하면 삭제됩니다.</p></details></section>';
  }
  function mountPriority(){
    if(!document.querySelector('link[data-candidate-suitability-css]')){
      const css=document.createElement('link');
      css.rel='stylesheet';css.href='./features/candidate-suitability.css?v=1';
      css.dataset.candidateSuitabilityCss='1';
      document.head.appendChild(css);
    }
    const status=el('candidateStatus');
    if(!status||el('candidatePriority'))return;
    const bar=document.createElement('div');bar.className='candidate-priority';
    const label=document.createElement('label');label.htmlFor='candidatePriority';
    label.textContent='비교에서 먼저 볼 조건';
    const select=document.createElement('select');select.id='candidatePriority';
    select.setAttribute('aria-label','주소 비교 조건 우선순위');
    for(const key of CANDIDATE_PRIORITY_IDS){
      const option=document.createElement('option');option.value=key;
      option.textContent=criterionNames[key];select.appendChild(option);
    }
    select.value=focusPriority;
    select.addEventListener('change',()=>{focusPriority=select.value;drawCandidates();});
    bar.append(label,select);
    const info=document.createElement('p');info.className='candidate-priority-note';
    info.textContent='총점·자동 순위 없음. 학교 배정·통근·지역 위험은 자료와 측정 수준을 각각 확인합니다. 인구 구성은 점수에 사용하지 않습니다.';
    bar.appendChild(info);status.after(bar);
  }
  function drawCandidates() {
    const container = el('candidateCards');
    el('candidateCount').textContent = comparisons.length + ' / 3';
    if (!comparisons.length) {
      container.innerHTML = '<div class="candidate-empty">주소 검색 후 <b>비교함에 추가</b>를 누르면 여기에 표시됩니다.</div>';
      return;
    }
    const expanded=[...container.querySelectorAll('.candidate-time-entry')].map(d=>d.open);
    container.innerHTML = comparisons.map((item, i) => {
      const zipMatches = homeZipMatches(item.ll), d = zipMatches.length === 1 ? zipMatches[0] : null;
      const assignment=schoolAssignmentFor(item);
      const schoolText = assignmentHtml(assignment);
      const rows = d ? [['ZIP 통계구역',escape(d.z+' · 대표 지명 '+displayPlace(d.name))],['전체 인구',d.pop == null ? '미공개' : fmt(d.pop)+'명'],['중위 연령',d.age == null ? '미공개' : d.age+'세'],['18세 미만',pct(d.kids)],['미성년자 동거 가구',pct(d.childHH)],['중위 가구 소득',money(d.income)],['백인 (비히스패닉)',pct(d.white)],['흑인 (비히스패닉)',pct(d.black)],['아시아계 (비히스패닉)',pct(d.asian)],['히스패닉',pct(d.hispanic)],['복수 인종 (비히스패닉)',pct(d.multiracial)],['미 원주민 (비히스패닉)',pct(d.native)],['태평양 제도계 (비히스패닉)',pct(d.pacific)],['기타 인종 (비히스패닉)',pct(d.other)],['한국계',pct(d.korean)],['인도계',pct(d.indian)],['중국계',pct(d.chinese)],['베트남계',pct(d.vietnamese)],['필리핀계',pct(d.filipino)]] : [['지역','ZIP 경계 확인 필요']];
      return `<article class="candidate-card"><div class="candidate-heading"><strong>후보 ${'ABC'[i]}</strong><button type="button" class="mini-btn" data-remove="${i}" aria-label="후보 ${'ABC'[i]} 삭제">삭제</button></div><div class="candidate-address">${escape(item.address)}</div><div class="candidate-schools"><b>주소 연결 학교 · TEA 2026 예비 등급</b><br>${schoolText}</div>${drawSuitability(item,assignment,i)}<dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><button type="button" class="mini-btn candidate-open" data-open="${i}">지도에서 보기</button></article>`;
    }).join('');
    container.querySelectorAll('.candidate-time-entry').forEach((node,i)=>{node.open=!!expanded[i]});
    container.querySelectorAll('[data-candidate-minutes]').forEach(input=>input.addEventListener('change',()=>{
      const index=Number(input.dataset.candidateIndex),key=input.dataset.candidateMinutes;
      const raw=input.value,minutes=parseCandidateMinutes(raw);
      if(raw.trim()!==''&&minutes===null){
        el('candidateStatus').textContent='이동시간은 1~240분의 정수로 입력하거나 비워 주세요.';
        input.value=String(comparisons[index]?.travelMinutes?.[key]??'');
        return;
      }
      comparisons=updateCandidateMinutes(comparisons,index,key,raw);
      el('candidateStatus').textContent='사용자 입력 이동시간을 비교 카드에 반영했습니다. 공식 측정·교통량 검증 결과는 아닙니다.';
      drawCandidates();
      const updated=container.querySelector('[data-candidate-minutes="'+key+'"][data-candidate-index="'+index+'"]');
      updated?.focus({preventScroll:true});
    }));
    container.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { comparisons = removeCandidate(comparisons, +button.dataset.remove); drawCandidates(); }));
    container.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
      const item = comparisons[+button.dataset.open];
      el('homeAddress').value = item.address;
      useHomeCandidate({address:item.address,location:{y:item.ll[0],x:item.ll[1]},savedTypedAddress:item.typedAddress,savedGeocodeQuality:item.geocodeQuality,savedParcel:item.parcel,savedOfficialReview:item.officialReview,savedOfficialDraft:item.officialDraft});
      el('map').scrollIntoView({behavior:'smooth',block:'center'});
    }));
  }
  window.refreshCandidateComparisons = () => { if (comparisons.length) drawCandidates(); };
  document.addEventListener('DOMContentLoaded', () => {
    el('addComparison').addEventListener('click', () => {
      const status = el('candidateStatus');
      if (!home) { status.textContent = '먼저 주소를 검색하고 지도 위치를 확인하세요.'; return; }
      if (comparisons.some(x => normalizedCandidateAddress(x.address) === normalizedCandidateAddress(home.address))) { status.textContent = '이미 비교함에 있는 주소입니다.'; return; }
      if (comparisons.length === 3) { status.textContent = '최대 3곳까지 비교할 수 있습니다. 기존 후보를 삭제한 뒤 추가하세요.'; return; }
      comparisons = addCandidate(comparisons, home);
      status.textContent = '후보 ' + 'ABC'[comparisons.length - 1] + '에 추가했습니다.';
      drawCandidates();
    });
    mountPriority();
    drawCandidates();
  });
}
