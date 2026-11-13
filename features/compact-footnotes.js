/* Central, progressive-enhancement footnotes. Do not move live DOM nodes or source IDs. */
(() => {
  'use strict';
  const SOURCE_SELECTOR = 'p.source:not([id]), div.source:not([id]), small.source:not([id]), small.boundary-footnote:not([id])';
  const CRITICAL = /검증되지 않았|확인되지 않았|불러오지 못|실패했|사용할 수 없|안전한.*뜻이 아닙니다|위험이 없.*뜻이 아닙니다|자료가 없습니다|해당 자료.*없습니다/;
  const DYNAMIC = '#detailContent, #zipInsights, #homeSchoolInfo, #schoolList, #zoneNotice, #dfwSchoolCoverageContent, #cfbManualSchoolCards, #candidateCards, #areaAssessment, #regionalCompare';
  const state = { sources: [], html: [], triggers: new Map(), scheduled: false };
  let panel, list, count, root;

  function eligible(node) {
    if (node.classList.contains('boundary-footnote')) return false; // School-specific grade exceptions are release-critical warnings.
    if (!node.isConnected || node.closest('details, .footnotes-panel, .leaflet-container, [role="status"], [role="alert"], [aria-live], .fema-nfhl-legend, .lisd-source-conflict')) return false;
    if (node.querySelector('button, input, select, textarea, iframe, [role="status"], [aria-live]')) return false;
    const text = node.textContent.trim();
    if (text.length < 35 || CRITICAL.test(text)) return false;
    return true;
  }

  function copyContent(node, destination) {
    const clone = node.cloneNode(true);
    clone.classList.remove('footnote-original-hidden');
    clone.removeAttribute('hidden');
    clone.removeAttribute('aria-hidden');
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    destination.replaceChildren(clone);
  }

  function refresh() {
    state.scheduled = false;
    const sources = Array.from(root.querySelectorAll(SOURCE_SELECTOR)).filter(eligible);
    const html = sources.map(n => n.innerHTML);
    if (sources.length === state.sources.length && sources.every((n, i) => n === state.sources[i] && html[i] === state.html[i])) return;
    state.sources = sources;
    state.html = html;
    const current = new Set(sources);
    for (const [source, trigger] of state.triggers) {
      if (!current.has(source)) {
        trigger.remove();
        source.classList.remove('footnote-original-hidden');
        state.triggers.delete(source);
      }
    }
    const items = new Map();
    const fragment = document.createDocumentFragment();
    for (const source of sources) {
      const key = source.innerHTML.trim();
      let item = items.get(key);
      if (!item) {
        const number = items.size + 1;
        const entry = document.createElement('li');
        entry.id = 'source-footnote-' + number;
        entry.className = 'source-footnote-item';
        entry.tabIndex = -1;
        copyContent(source, entry);
        item = { entry, number };
        items.set(key, item);
        fragment.appendChild(entry);
      }
      let trigger = state.triggers.get(source);
      if (!trigger) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'footnote-ref';
        trigger.setAttribute('aria-controls', 'centralFootnotes');
        source.before(trigger);
        source.classList.add('footnote-original-hidden');
        state.triggers.set(source, trigger);
      }
      trigger.textContent = '각주 [' + item.number + ']';
      trigger.setAttribute('aria-label', '각주 ' + item.number + ' · 출처와 설명 보기');
      trigger.onclick = () => {
        panel.open = true;
        const target = document.getElementById(item.entry.id);
        if (target) {
          target.scrollIntoView({ block: 'center', behavior: 'auto' });
          target.focus({ preventScroll: true });
        }
      };
    }
    list.replaceChildren(fragment);
    count.textContent = items.size + '개';
    list.hidden = items.size === 0;
  }

  function queue() {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(refresh);
  }

  function shouldRefresh(mutation) {
    const target = mutation.target.nodeType === Node.ELEMENT_NODE ? mutation.target : mutation.target.parentElement;
    if (!target || target.closest('.footnotes-panel, .footnote-ref, .leaflet-container')) return false;
    if (target.closest(DYNAMIC) || target.matches(SOURCE_SELECTOR) || target.closest(SOURCE_SELECTOR)) return true;
    for (const added of mutation.addedNodes) {
      if (added.nodeType !== Node.ELEMENT_NODE || added.matches('.footnote-ref')) continue;
      if (added.matches(SOURCE_SELECTOR) || added.querySelector(SOURCE_SELECTOR)) return true;
    }
    for (const removed of mutation.removedNodes) {
      if (removed.nodeType !== Node.ELEMENT_NODE) continue;
      if (removed.matches(SOURCE_SELECTOR) || removed.querySelector(SOURCE_SELECTOR)) return true;
    }
    return false;
  }

  function init() {
    root = document.querySelector('.shell');
    panel = document.querySelector('.footer > details');
    if (!root || !panel || panel.id) return;
    panel.id = 'centralFootnotes';
    panel.classList.add('footnotes-panel');
    const summary = panel.querySelector('summary');
    if (!summary) return;
    summary.textContent = '각주 · 자료 출처 ';
    count = document.createElement('small');
    count.className = 'footnote-count';
    summary.appendChild(count);
    const baseline = document.createElement('div');
    baseline.className = 'footnotes-baseline';
    while (summary.nextSibling) baseline.appendChild(summary.nextSibling);
    panel.appendChild(baseline);
    list = document.createElement('ol');
    list.id = 'sourceFootnotes';
    list.className = 'source-footnote-list';
    list.setAttribute('aria-label', '각주별 공식 출처 및 설명');
    panel.appendChild(list);
    refresh();
    const observer = new MutationObserver(records => {
      if (records.some(shouldRefresh)) queue();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener('footnotes:refresh', queue);
    window.DashboardFootnotes = Object.freeze({ refresh: queue });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();