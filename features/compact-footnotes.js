/* TX compact footnote index v2.
 * Pure display enhancement: keep original source DOM, source IDs and official links.
 * Only explanatory text is archived; status, privacy, map legend and assignment warnings stay visible.
 */
(() => {
  'use strict';
  const SOURCE_SELECTOR = [
    'p.source', 'div.source', 'small.source', 'span.source',
    '.settings-group-note', '.heading .muted', '.kpis .kpi small:not(#k-area)',
    '.area-qa-intro', '.area-qa-note', '.region-compare-intro', '.tea-insights-meta'
  ].join(', ');
  const DYNAMIC = [
    '#detailContent', '#zipInsights', '#homeSchoolInfo', '#schoolList',
    '#zoneNotice', '#dfwSchoolCoverageContent', '#cfbManualSchoolCards',
    '#homeCandidates', '#candidateCards', '#areaAssessment', '#regionalCompare',
    '.area-qa', '.tea-insights-panel', '.extra-feature', '.region-compare'
  ].join(', ');
  const CRITICAL = /검증되지 않았|확인되지 않았|불러오지 못|실패했|사용할 수 없|위험이 없|안전한.*뜻이 아닙니다|자료가 없습니다|자료 없음은|학교 자동 배정|배정 학교 목록이 아닙니다|배정학교.*아닙니다|배정.*보장하지 않습니다|실제.*배정.*확인|사용자가 공식 Finder에서 직접 선택한 참고 정보|현행.*미인증|실제 응급실|자동 통행료 조회는 아직/;
  const KEEP_IDS = new Set(['homePrivacy','destinationPrivacy','homeStatus','homeRouteStatus',
    'routeStatus','schoolMapStatus','mapLoadStatus','zoneDatasetStatus',
    'schoolBoundaryCoverageAudit','noaaStormSourceDetails','tileStatus']);
  const state = { entries: [], links: new Map(), scheduled: false };
  let root, panel, list, count;

  function eligible(node) {
    if (!node.isConnected || node.closest('.footnotes-panel, .leaflet-container, [role="status"], [role="alert"], [aria-live], [data-footnotes-keep]')) return false;
    if (node.closest('details:not([open]), a, label, .fema-nfhl-legend, .lisd-source-conflict, .home-privacy-disclosure')) return false;
    // The four read-only area facts use button rows; keep the action intact and place their shared link outside the button.
    if (node.closest('button') && !node.matches('.area-qa-note')) return false;
    if (node.closest('#cfbAtlasConflicts, #cfbAtlasConflictList')) return false;
    if (node.matches('#homeSchoolInfo > div.source')) return false; // Selected user address is primary context, not a footnote. // Official conflicting school-source evidence must stay visible when expanded.
    if (node.classList.contains('boundary-footnote') || node.classList.contains('school-zone-note')) return false;
    if (node.id && node.id !== 'homeSuggestHint') return false; // Existing IDs are read or updated by feature modules.
    if (KEEP_IDS.has(node.id) || node.getAttribute('role') === 'note') return false;
    if (node.querySelector('button, input, select, textarea, iframe, [role="status"], [aria-live]')) return false;
    const content = (node.textContent || '').trim();
    if (content.length < 10 || CRITICAL.test(content)) return false;
    return true;
  }

  function groupFor(source) {
    if (source.closest('.kpis')) return source.closest('.kpis');
    if (source.closest('.heading')) return source.closest('.heading');
    return source.closest('details[open], .tea-insights-panel, .insight-card, .candidate-card, .area-qa, .panel')
      || source.closest('.controls-grid') || root;
  }

  function titleFor(group) {
    if (group.classList.contains('kpis')) return '상단 주요 수치';
    if (group.classList.contains('heading')) return '대시보드 안내';
    const heading = group.querySelector('h2, h3, h4, summary, .insight-title, .feature-heading');
    const title = heading && heading.textContent.trim().replace(/\s+/g,' ');
    return title ? title.slice(0,65) : '추가 자료 · 설명';
  }

  function copyContent(source, destination) {
    const clone = source.cloneNode(true);
    clone.removeAttribute('class'); // Avoid duplicate CSS/feature selectors in the archived copy.
    clone.removeAttribute('hidden');
    clone.removeAttribute('aria-hidden');
    clone.removeAttribute('id');
    clone.querySelectorAll('[id], [class]').forEach(el => {
      el.removeAttribute('id');
      el.removeAttribute('class');
    });
    destination.replaceChildren(clone);
  }

  function sameEntries(next) {
    return next.length === state.entries.length && next.every((e,i) => {
      const prev = state.entries[i];
      return prev.source === e.source && prev.group === e.group && prev.html === e.html;
    });
  }

  function refresh() {
    state.scheduled = false;
    const next = Array.from(root.querySelectorAll(SOURCE_SELECTOR)).filter(eligible)
      .map(source => ({ source, group: groupFor(source), html: source.innerHTML }));
    if (sameEntries(next) && Array.from(state.links.values()).every(link => link.isConnected)) return;

    const allSources = new Set(next.map(x => x.source));
    for (const {source} of state.entries) if (!allSources.has(source)) source.classList.remove('footnote-original-hidden');
    state.entries = next;
    const grouped = new Map();
    for (const entry of next) {
      if (!grouped.has(entry.group)) grouped.set(entry.group, []);
      grouped.get(entry.group).push(entry.source);
      entry.source.classList.add('footnote-original-hidden');
    }
    for (const [group, link] of state.links) {
      if (!grouped.has(group) || !link.isConnected) { link.remove(); state.links.delete(group); }
    }

    const fragment = document.createDocumentFragment();
    let groupNum = 0, uniqueNotes = 0;
    for (const [group, sources] of grouped) {
      groupNum += 1;
      const id = 'source-footnote-' + groupNum;
      const title = titleFor(group);
      const item = document.createElement('li');
      item.id = id;
      item.className = 'source-footnote-item';
      item.tabIndex = -1;
      const heading = document.createElement('strong');
      heading.textContent = title;
      item.appendChild(heading);
      const seen = new Set();
      for (const source of sources) {
        const signature = source.innerHTML.trim();
        if (seen.has(signature)) continue;
        seen.add(signature);
        uniqueNotes += 1;
        const detail = document.createElement('div');
        detail.className = 'source-footnote-detail';
        copyContent(source, detail);
        item.appendChild(detail);
      }
      fragment.appendChild(item);

      let link = state.links.get(group);
      if (!link) {
        link = document.createElement('a');
        link.className = 'footnote-ref';
        link.setAttribute('aria-controls', 'centralFootnotes');
        sourceLinkPosition(group, sources[0], link);
        state.links.set(group, link);
      }
      link.href = '#' + id;
      link.textContent = '각주 [' + groupNum + ']';
      link.setAttribute('aria-label', title + ' · 각주 ' + groupNum + ' 및 자료 출처');
      link.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        panel.open = true;
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({block:'center', behavior:'auto'});
          target.focus({preventScroll:true});
        }
      };
    }
    list.replaceChildren(fragment);
    count.textContent = uniqueNotes + '개';
    list.hidden = uniqueNotes === 0;
  }

  function sourceLinkPosition(group, first, link) {
    if (group.classList.contains('kpis')) group.after(link);
    else if (group.matches('details[open]')) group.after(link); // Never alter official links inside a published school/source details element.
    else if (group.matches('.panel, .candidate-card, .insight-card, .area-qa')) group.appendChild(link);
    else first.before(link);
  }

  function queue() {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(refresh);
  }

  function shouldRefresh(mutation) {
    const target = mutation.target.nodeType === Node.ELEMENT_NODE ? mutation.target : mutation.target.parentElement;
    if (!target || target.closest('.footnotes-panel, .footnote-ref, .leaflet-container')) return false;
    if (mutation.type === 'attributes') return mutation.attributeName === 'open';
    if (target.closest(DYNAMIC) || target.matches(SOURCE_SELECTOR) || target.closest(SOURCE_SELECTOR)) return true;
    for (const n of [...mutation.addedNodes, ...mutation.removedNodes]) {
      if (n.nodeType !== Node.ELEMENT_NODE || n.matches('.footnote-ref')) continue;
      if (n.matches(SOURCE_SELECTOR) || n.querySelector(SOURCE_SELECTOR)) return true;
    }
    return false;
  }

  function init() {
    root = document.querySelector('.shell');
    panel = document.getElementById('centralFootnotes') || document.querySelector('.footer > details');
    if (!root || !panel) return;
    panel.id = 'centralFootnotes';
    panel.classList.add('footnotes-panel');
    const summary = panel.querySelector('summary');
    if (!summary) return;
    summary.textContent = '각주 · 자료 출처 ';
    count = document.createElement('small');
    count.className = 'footnote-count';
    summary.appendChild(count);
    let baseline = panel.querySelector('.footnotes-baseline');
    if (!baseline) {
      baseline = document.createElement('div');
      baseline.className = 'footnotes-baseline';
      while (summary.nextSibling) baseline.appendChild(summary.nextSibling);
      panel.appendChild(baseline);
    }
    list = document.getElementById('sourceFootnotes');
    if (!list) {
      list = document.createElement('ol');
      list.id = 'sourceFootnotes';
      list.className = 'source-footnote-list';
      list.setAttribute('aria-label', '영역별 각주, 공식 출처 및 세부 설명');
      panel.appendChild(list);
    }
    refresh();
    const observer = new MutationObserver(records => {
      if (records.some(shouldRefresh)) queue();
    });
    observer.observe(root, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['open']});
    window.addEventListener('footnotes:refresh', queue);
    window.DashboardFootnotes = Object.freeze({
      refresh: queue,
      stats: () => Object.freeze({ archived: state.entries.length, groups: state.links.size })
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();