'use strict';
// Private address candidates and manual comparison notes stay in this tab's memory.
// No persisted address, tracking event, third-party request or inferred enrollment.
function cleanAddress(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function validMinute(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 360 ? n : null;
}
function validRent(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 30000 ? n : null;
}
function addCandidate(items, candidate) {
  if (!candidate || !cleanAddress(candidate.address) || !Array.isArray(candidate.ll) ||
      candidate.ll.length !== 2 || !candidate.ll.every(Number.isFinite) ||
      items.length >= 3 || items.some(x => cleanAddress(x.address) === cleanAddress(candidate.address))) return items;
  return [...items, {
    address: candidate.address, typedAddress:candidate.typedAddress||candidate.address,
    ll: [...candidate.ll],
    geocodeQuality: candidate.geocodeQuality ? {...candidate.geocodeQuality} : null,
    parcel: candidate.parcel?.status === 'matched' ? {...candidate.parcel} : null,
    officialReview: candidate.officialReview ? {...candidate.officialReview} : null,
    officialDraft: candidate.officialDraft ? {...candidate.officialDraft} : null,
    manual: { workMinutes: null, churchMinutes: null, balletMinutes: null,
      monthlyRent: null, photosReviewed: false }
  }];
}
function removeCandidate(items, index) { return items.filter((_, i) => i !== index); }
function evaluateCandidate(item, assignment) {
  const status = assignment?.status || 'unavailable';
  let school = '공식 주소별 배정·E/M/H B 이상 확인 필요';
  if (['current', 'finder-current'].includes(status))
    school = 'GIS 학교 후보 있음 · 배정 및 TEA B 이상 별도 확인';
  else if (['boundary-review', 'finder-boundary-review', 'unverified-year'].includes(status))
    school = '경계·학년도 참고 자료 · 최종 배정 확인 필요';
  else if (['conflict', 'feeder-review', 'apartment-split-review'].includes(status))
    school = '학군 경계·호수·진학 경로 충돌 · 직접 확인';
  else if (status === 'needs-address-verification')
    school = '주소 좌표 확인 전 · 학교 판정 보류';
  else if (status === 'loading')
    school = '학교 GIS 불러오는 중 · 판정 보류';
  else if (status === 'error')
    school = '학교 자료 오류 · 공식 검색기 확인 필요';
  const manual = item?.manual || {};
  const work = validMinute(manual.workMinutes), church = validMinute(manual.churchMinutes),
    ballet = validMinute(manual.balletMinutes), rent = validRent(manual.monthlyRent);
  return {
    school: {state: 'unknown', value: school, note: 'TEA 등급은 주소 배정 인증이 아닙니다'},
    work: {state: work === null ? 'unknown' : work <= 30 ? 'within' : 'over',
      value: work === null ? '시간 미입력 · 목표 30분' :
        work + '분 · ' + (work <= 30 ? '입력 기준 30분 이내' : '입력 기준 30분 초과'),
      note: 'Plano 직장 기준 · 직접 입력한 시간, 교통량·실시간 보증 아님'},
    church: {state: church === null ? 'unknown' : 'manual',
      value: church === null ? '시간 미입력' : church + '분 · 직접 입력',
      note: 'Irving 교회 · 실제 출발 시간 경로 별도 확인'},
    ballet: {state: ballet === null ? 'unknown' : 'manual',
      value: ballet === null ? '시간 미입력' : ballet + '분 · 직접 입력',
      note: 'Contemporary Ballet Dallas · 경로 별도 확인'},
    home: {state: rent === null && !manual.photosReviewed ? 'unknown' : 'manual',
      value: (rent === null ? '임대료 미입력' : '$' + rent.toLocaleString('en-US') + '/월') +
        ' · 사진 ' + (manual.photosReviewed ? '검토 표시됨' : '미검토'),
      note: '매물 정보 및 사진은 사용자가 직접 점검 · 서버에 저장하지 않음'}
  };
}
if (typeof module !== 'undefined') module.exports = {
  addCandidate, removeCandidate, evaluateCandidate, validMinute, validRent
};
if (typeof document !== 'undefined') {
  let comparisons = [];
  const $ = id => document.getElementById(id);
  function node(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function factRow(label, fact) {
    const row = node('div', 'candidate-fact');
    row.dataset.state = fact.state;
    row.append(node('dt', '', label));
    const detail = node('dd');
    detail.append(node('strong', '', fact.value), node('small', '', fact.note));
    row.append(detail);
    return row;
  }
  function manualField(item, index, key, label, max, value) {
    const holder = node('label', 'candidate-manual-field');
    holder.append(node('span', '', label));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1'; input.max = String(max); input.step = '1';
    input.inputMode = 'numeric';
    input.dataset.candidateIndex = String(index);
    input.dataset.candidateField = key;
    input.value = value === null || value === undefined ? '' : String(value);
    input.setAttribute('aria-label', '후보 ' + 'ABC'[index] + ' · ' + label);
    holder.append(input);
    return holder;
  }
  function candidateZip(item) {
    try {
      const matches = homeZipMatches(item.ll);
      return matches.length === 1 ? matches[0] : null;
    } catch (_) { return null; }
  }
  function createCard(item, index) {
    const card = node('article', 'candidate-card');
    card.setAttribute('aria-label', '집 비교 후보 ' + 'ABC'[index]);
    const head = node('div', 'candidate-heading');
    head.append(node('strong', '', '후보 ' + 'ABC'[index]));
    const remove = node('button', 'mini-btn', '삭제');
    remove.type = 'button'; remove.dataset.remove = String(index);
    remove.setAttribute('aria-label', '후보 ' + 'ABC'[index] + ' 삭제');
    head.append(remove); card.append(head);
    card.append(node('div', 'candidate-address', item.address));
    let assignment;
    try { assignment = schoolAssignmentFor(item); }
    catch (_) { assignment = {status: 'error'}; }
    const signals = evaluateCandidate(item, assignment);
    const signalList = node('dl', 'candidate-signals');
    for (const [label, key] of [
      ['학교 배정·등급', 'school'], ['Plano 통근', 'work'],
      ['Irving 교회', 'church'], ['Dallas 발레', 'ballet'], ['임대·매물 사진', 'home']
    ]) signalList.append(factRow(label, signals[key]));
    card.append(signalList);

    const grades = node('details', 'candidate-school-details');
    grades.append(node('summary', '', '학교 GIS 후보와 TEA 등급 자세히'));
    const schoolBox = node('div', 'candidate-schools');
    // assignmentHtml escapes source-provided school names and renders its existing
    // official Finder reference; no new "certified" status is introduced here.
    try { schoolBox.innerHTML = assignmentHtml(assignment); }
    catch (_) { schoolBox.textContent = '학교 원본 자료를 표시하지 못했습니다.'; }
    grades.append(schoolBox); card.append(grades);

    const manual = node('fieldset', 'candidate-manual');
    manual.append(node('legend', '', '직접 확인한 값 · 탭을 닫으면 삭제'));
    manual.append(manualField(item, index, 'workMinutes', 'Plano 출근 시간 (분)', 360, item.manual?.workMinutes));
    manual.append(manualField(item, index, 'churchMinutes', 'Irving 교회 이동 (분)', 360, item.manual?.churchMinutes));
    manual.append(manualField(item, index, 'balletMinutes', '발레 이동 (분)', 360, item.manual?.balletMinutes));
    manual.append(manualField(item, index, 'monthlyRent', '월 임대료 ($)', 30000, item.manual?.monthlyRent));
    const photo = node('label', 'candidate-photo-check');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.candidateIndex = String(index);
    checkbox.dataset.candidateField = 'photosReviewed';
    checkbox.checked = Boolean(item.manual?.photosReviewed);
    photo.append(checkbox, node('span', '', '매물 사진 확인 완료로 표시'));
    manual.append(photo);
    card.append(manual);

    const detail = node('details', 'candidate-demo-details');
    detail.append(node('summary', '', 'ZIP 인구통계 · 출처 펼치기'));
    const d = candidateZip(item), list = node('dl', 'candidate-demo-list');
    const rows = d ? [
      ['ZIP 통계구역', d.z + ' · ' + displayPlace(d.name)],
      ['전체 인구', d.pop == null ? '자료 없음' : fmt(d.pop) + '명'],
      ['18세 미만', pct(d.kids)],
      ['자녀 동거 가구', pct(d.childHH)],
      ['중위 가구 소득', money(d.income)],
      ['한국계', pct(d.korean)], ['인도계', pct(d.indian)],
      ['중국계', pct(d.chinese)], ['아시아계', pct(d.asian)]
    ] : [['ZIP 통계구역', '경계 자료 확인 필요']];
    for (const [label, value] of rows) {
      const entry = node('div');
      entry.append(node('dt', '', label), node('dd', '', value));
      list.append(entry);
    }
    detail.append(list, node('p', 'candidate-census-note',
      'ACS 2024 ZIP/ZCTA 추정치 · 인구통계는 주거 적합성 점수나 학교 배정 조건에 사용하지 않습니다.'));
    card.append(detail);
    const view = node('button', 'mini-btn candidate-open', '지도에서 보기');
    view.type = 'button'; view.dataset.open = String(index);
    card.append(view);
    return card;
  }
  function drawCandidates() {
    const container = $('candidateCards');
    if (!container) return;
    $('candidateCount').textContent = comparisons.length + ' / 3';
    container.replaceChildren();
    if (!comparisons.length) {
      container.append(node('div', 'candidate-empty',
        '주소 검색 후 ‘집 비교함에 추가’를 누르면 최대 3개의 후보를 나란히 비교합니다.'));
      return;
    }
    const note = node('p', 'candidate-compare-guide',
      '지역 적합성 비교 · 확인된 값과 미확인을 분리합니다. 전체 점수는 계산하지 않습니다. Plano 30분 조건은 입력한 이동시간 기준이며 학교는 최종 공식 주소·학년별 확인이 필요합니다.');
    container.append(note);
    comparisons.forEach((item, i) => container.append(createCard(item, i)));
  }
  window.refreshCandidateComparisons = () => { if (comparisons.length) drawCandidates(); };
  document.addEventListener('DOMContentLoaded', () => {
    const add = $('addComparison'), container = $('candidateCards');
    if (!add || !container) return;
    add.addEventListener('click', () => {
      const status = $('candidateStatus');
      if (typeof home === 'undefined' || !home) {
        status.textContent = '먼저 주소를 검색하고 지도 위치를 확인하세요.'; return;
      }
      const previousCount = comparisons.length;
      comparisons = addCandidate(comparisons, home);
      if (comparisons.length === previousCount) {
        status.textContent = previousCount === 3
          ? '최대 3곳까지 비교할 수 있습니다. 후보를 삭제한 뒤 추가하세요.'
          : '이미 저장했거나 주소 좌표를 확인할 수 없습니다.';
        return;
      }
      status.textContent = '후보 ' + 'ABC'[comparisons.length - 1] + '에 추가했습니다.';
      drawCandidates();
    });
    container.addEventListener('click', event => {
      const remove = event.target.closest('button[data-remove]');
      if (remove && container.contains(remove)) {
        comparisons = removeCandidate(comparisons, Number(remove.dataset.remove));
        $('candidateStatus').textContent = '후보를 삭제했습니다.';
        drawCandidates(); return;
      }
      const open = event.target.closest('button[data-open]');
      if (!open || !container.contains(open)) return;
      const item = comparisons[Number(open.dataset.open)];
      if (!item) return;
      $('homeAddress').value = item.address;
      const selected = useHomeCandidate({
        address: item.address, location: {y: item.ll[0], x: item.ll[1]},
        savedTypedAddress:item.typedAddress,
        savedGeocodeQuality: item.geocodeQuality, savedParcel: item.parcel,
        savedOfficialReview: item.officialReview, savedOfficialDraft: item.officialDraft
      });
      if (selected !== false) {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        $('map')?.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'});
      }
    });
    container.addEventListener('change', event => {
      const input = event.target.closest('input[data-candidate-field]');
      if (!input || !container.contains(input)) return;
      const index = Number(input.dataset.candidateIndex), item = comparisons[index];
      const field = input.dataset.candidateField;
      if (!item || !['workMinutes', 'churchMinutes', 'balletMinutes', 'monthlyRent', 'photosReviewed'].includes(field)) return;
      if (!item.manual) item.manual = {};
      const value = field === 'photosReviewed' ? input.checked :
        field === 'monthlyRent' ? validRent(input.value) : validMinute(input.value);
      if (field !== 'photosReviewed' && input.value.trim() && value === null) {
        $('candidateStatus').textContent = field === 'monthlyRent'
          ? '임대료는 1~30,000달러 사이의 정수를 입력하세요.'
          : '시간은 1~360분 사이의 정수를 입력하세요.';
        input.value = item.manual[field] == null ? '' : String(item.manual[field]);
        return;
      }
      item.manual[field] = value;
      $('candidateStatus').textContent = '후보 ' + 'ABC'[index] +
        '의 직접 입력값을 반영했습니다. 이 탭에서만 유지됩니다.';
      // Update the summary in place so focus and expanded details do not jump.
      const card = input.closest('.candidate-card');
      const assignment = (() => {
        try { return schoolAssignmentFor(item); }
        catch (_) { return {status: 'error'}; }
      })();
      const updated = evaluateCandidate(item, assignment);
      const rows = card.querySelectorAll('.candidate-signals .candidate-fact');
      for (const [i, key] of ['school', 'work', 'church', 'ballet', 'home'].entries()) {
        rows[i].dataset.state = updated[key].state;
        rows[i].querySelector('strong').textContent = updated[key].value;
      }
    });
    drawCandidates();
  });
}
