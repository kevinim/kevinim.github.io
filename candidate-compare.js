'use strict';
function addCandidate(items, candidate) {
  if (items.length >= 3 || items.some(x => x.address.toLowerCase() === candidate.address.toLowerCase())) return items;
  return [...items, { address: candidate.address, ll: [...candidate.ll], geocodeQuality: candidate.geocodeQuality ? {...candidate.geocodeQuality} : null }];
}
function removeCandidate(items, index) { return items.filter((_, i) => i !== index); }
if (typeof module !== 'undefined') module.exports = { addCandidate, removeCandidate };
if (typeof document !== 'undefined') {
  let comparisons = [];
  function drawCandidates() {
    const container = el('candidateCards');
    el('candidateCount').textContent = comparisons.length + ' / 3';
    if (!comparisons.length) {
      container.innerHTML = '<div class="candidate-empty">주소 검색 후 <b>비교함에 추가</b>를 누르면 여기에 표시됩니다.</div>';
      return;
    }
    container.innerHTML = comparisons.map((item, i) => {
      const zipMatches = homeZipMatches(item.ll), d = zipMatches.length === 1 ? zipMatches[0] : null;
      const schoolText = assignmentHtml(schoolAssignmentFor(item));
      const rows = d ? [['ZIP 통계구역',escape(d.z+' · 대표 지명 '+displayPlace(d.name))],['전체 인구',d.pop == null ? '미공개' : fmt(d.pop)+'명'],['중위 연령',d.age == null ? '미공개' : d.age+'세'],['18세 미만',pct(d.kids)],['미성년자 동거 가구',pct(d.childHH)],['중위 가구 소득',money(d.income)],['백인 (비히스패닉)',pct(d.white)],['흑인 (비히스패닉)',pct(d.black)],['아시아계 (비히스패닉)',pct(d.asian)],['히스패닉',pct(d.hispanic)],['복수 인종 (비히스패닉)',pct(d.multiracial)],['미 원주민 (비히스패닉)',pct(d.native)],['태평양 제도계 (비히스패닉)',pct(d.pacific)],['기타 인종 (비히스패닉)',pct(d.other)],['한국계',pct(d.korean)],['인도계',pct(d.indian)],['중국계',pct(d.chinese)],['베트남계',pct(d.vietnamese)],['필리핀계',pct(d.filipino)],['JPM 도로망',Number.isFinite(d.jpmMinutes) ? Math.round(d.jpmMinutes)+'분' : '미확인']] : [['지역','ZIP 경계 확인 필요']];
      return `<article class="candidate-card"><div class="candidate-heading"><strong>후보 ${'ABC'[i]}</strong><button type="button" class="mini-btn" data-remove="${i}" aria-label="후보 ${'ABC'[i]} 삭제">삭제</button></div><div class="candidate-address">${escape(item.address)}</div><div class="candidate-schools"><b>주소 연결 학교 · TEA 2026 예비 등급</b><br>${schoolText}</div><dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><button type="button" class="mini-btn candidate-open" data-open="${i}">지도에서 보기</button></article>`;
    }).join('');
    container.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { comparisons = removeCandidate(comparisons, +button.dataset.remove); drawCandidates(); }));
    container.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
      const item = comparisons[+button.dataset.open];
      el('homeAddress').value = item.address;
      useHomeCandidate({address:item.address,location:{y:item.ll[0],x:item.ll[1]}});
      el('map').scrollIntoView({behavior:'smooth',block:'center'});
    }));
  }
  window.refreshCandidateComparisons = () => { if (comparisons.length) drawCandidates(); };
  document.addEventListener('DOMContentLoaded', () => {
    el('addComparison').addEventListener('click', () => {
      const status = el('candidateStatus');
      if (!home) { status.textContent = '먼저 주소를 검색하고 지도 위치를 확인하세요.'; return; }
      if (comparisons.some(x => x.address.toLowerCase() === home.address.toLowerCase())) { status.textContent = '이미 비교함에 있는 주소입니다.'; return; }
      if (comparisons.length === 3) { status.textContent = '최대 3곳까지 비교할 수 있습니다. 기존 후보를 삭제한 뒤 추가하세요.'; return; }
      comparisons = addCandidate(comparisons, home);
      status.textContent = '후보 ' + 'ABC'[comparisons.length - 1] + '에 추가했습니다.';
      drawCandidates();
    });
    drawCandidates();
  });
}
