#!/usr/bin/env node
'use strict';

/*
 * Headless Chromium negative-input tests against REAL standalone browser modules.
 * No dashboard deployment, live vendor calls, stored user addresses, or external
 * attacker endpoints. Test payloads only set an inert same-page probe variable.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PROBE = '<img src="x" onerror="window.__visitorXssProbe=1">';
const SECOND = '<svg onload="window.__visitorXssProbe=2"></svg>';

async function fresh(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 850 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return { page, errors };
}

function mainEscapeExpression() {
  // Execute the actual HTML escape helper used by index.html, not a duplicate
  // function invented by this test. Require a distinct, line-local declaration.
  const lines = read('dashboard-main.js').split(/\r?\n/).filter(x => x.includes('escape=s=>String(s??'));
  assert.equal(lines.length, 1, 'cannot isolate the current production escape function');
  const src = lines[0];
  const expression = src.slice(src.indexOf('escape=') + 'escape='.length).trim().replace(/;\s*$/, '');
  assert.ok(expression.startsWith('s=>String(s??'), 'unexpected HTML helper structure');
  return expression;
}

async function candidateCard(browser, width) {
  const { page, errors } = await fresh(browser, width);
  try {
    await page.setContent('<!doctype html><html><body>' +
      '<div id="candidateCards"></div><span id="candidateCount"></span>' +
      '<button id="addComparison">Add</button><span id="candidateStatus"></span>' +
      '<input id="homeAddress"><div id="map"></div></body></html>');
    await page.addScriptTag({ content: 'window.escape=(' + mainEscapeExpression() + ');' });
    await page.evaluate(payload => {
      window.__visitorXssProbe = 0;
      window.el = id => document.getElementById(id);
      window.homeZipMatches = () => [];
      window.schoolAssignmentFor = () => ({ status: 'unavailable' });
      window.assignmentHtml = () => 'School assignment not verified';
      window.home = { address: payload, typedAddress: payload, ll: [33.1, -96.8] };
      window.useHomeCandidate = () => true;
    }, PROBE);
    await page.addScriptTag({ content: read('candidate-compare.js') });
    await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));
    await page.locator('#addComparison').click();
    assert.equal(await page.locator('#candidateCards .candidate-address').innerText(), PROBE);
    assert.equal(await page.locator('#candidateCards img').count(), 0, 'HTML element injected from candidate address');
    assert.equal(await page.evaluate(() => window.__visitorXssProbe), 0, 'candidate address executed injected browser code');
    assert.deepEqual(errors, []);
    console.log('PASS comparison card inert address data, width=' + width);
  } finally { await page.close(); }
}

async function addressSuggestions(browser, width) {
  const { page, errors } = await fresh(browser, width);
  try {
    await page.setContent('<!doctype html><html><body><input id="address" aria-expanded="false">' +
      '<div id="suggestions" role="listbox"></div></body></html>');
    await page.evaluate(payload => {
      window.__visitorXssProbe = 0;
      window.__suggestionText = '123 ' + payload + ', Plano, TX, 75024';
      window.fetch = async () => ({ ok: true, json: async () => ({
        suggestions: [{ text: window.__suggestionText, magicKey: 'test-only-token', isCollection: false }],
      }) });
    }, PROBE);
    await page.addScriptTag({ content: read('texas-address-suggest.js') });
    await page.evaluate(() => {
      const input = document.getElementById('address');
      attachTexasAddressSuggestions(input, document.getElementById('suggestions'), () => {});
      input.focus();
      input.value = '123 Test Street';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#suggestions .home-suggestion-item').waitFor({ timeout: 5000 });
    assert.equal(await page.locator('#suggestions button').innerText(),
      '123 ' + PROBE + ', Plano, TX, 75024');
    assert.equal(await page.locator('#suggestions img').count(), 0, 'Esri suggestion became executable markup');
    assert.equal(await page.evaluate(() => window.__visitorXssProbe), 0);
    assert.deepEqual(errors, []);
    console.log('PASS address suggestion inert third-party text, width=' + width);
  } finally { await page.close(); }
}

async function hospitalPopup(browser, width) {
  const { page, errors } = await fresh(browser, width);
  try {
    await page.setContent('<!doctype html><html><body>' +
      '<button id="healthcareMapQuickToggle"></button><span id="healthcareMapStatus"></span>' +
      '<input id="hospitalEdOnly" type="checkbox" checked><input id="hospitalMapEnabled" type="checkbox">' +
      '<div id="mockLeafletPopupContainer"></div></body></html>');
    await page.evaluate(({ a, b }) => {
      window.__visitorXssProbe = 0;
      const records = Array.from({ length: 104 }, (_, i) => ({
        cmsFacilityId: String(100000 + i),
        name: 'Test ' + i, lat: null, long: null, geocodeStatus: 'UNMATCHED',
      }));
      records[0] = {
        cmsFacilityId: '100000', name: a, address: 'Demo Address',
        city: 'PLANO', state: 'TX', zip: '75024', lat: 33.1, long: -96.8,
        geocodeStatus: 'CENSUS_ADDRESS_RANGE_MATCH', emergencyServices: true,
      };
      const facilities = { metadata: { recordCount: 104, matchedCount: 1, unmatchedCount: 103 }, records };
      const trauma = { metadata: { matchingCount: 1 },
        records: [{ cmsFacilityId: '100000', level: 1, status: b }] };
      window.fetch = async url => ({
        ok: true, json: async () => String(url).includes('cms-dfw-census-points') ? facilities : trauma,
      });
      window.L = {
        layerGroup: () => ({ clearLayers() {}, addTo() { return this; } }),
        divIcon: data => data,
        marker: () => ({
          bindPopup(html) {
            // Leaflet displays the generated popup markup as browser HTML.
            const el = document.createElement('div');
            el.className = 'mock-leaflet-popup';
            el.innerHTML = html;
            document.getElementById('mockLeafletPopupContainer').appendChild(el);
            return this;
          },
          addTo() { return this; },
        }),
      };
    }, { a: PROBE, b: SECOND });
    await page.addScriptTag({ content: read('features/healthcare/map-layer.js') });
    await page.evaluate(async () => {
      const map = { hasLayer: () => false, removeLayer() {} };
      const controller = window.initHealthcareMap(map, document);
      if (!controller) throw Error('hospital map did not initialize');
      await controller.toggle(true);
    });
    assert.ok((await page.locator('.mock-leaflet-popup').innerText()).includes(PROBE));
    assert.ok((await page.locator('.mock-leaflet-popup').innerText()).includes(SECOND));
    assert.equal(await page.locator('.mock-leaflet-popup img, .mock-leaflet-popup svg').count(), 0,
      'HTML/SVG unexpectedly created from remote facility text');
    assert.equal(await page.evaluate(() => window.__visitorXssProbe), 0);
    const link = await page.locator('.mock-leaflet-popup a').getAttribute('href');
    assert.equal(new URL(link).origin, 'https://www.google.com');
    const rel = await page.locator('.mock-leaflet-popup a').getAttribute('rel');
    assert.match(rel, /noopener/);
    assert.deepEqual(errors, []);
    console.log('PASS hospital Leaflet popup inert remote data + safe outbound host, width=' + width);
  } finally { await page.close(); }
}


async function savedWorkplaceProfiles(browser, width) {
  // Synthetic HTML hosted at a reserved .invalid origin: no real app or vendor
  // requests, user data, network credentials, or deployment changes.
  const { page, errors } = await fresh(browser, width);
  const otherRequests = [];
  const localName = 'Test ' + PROBE;
  const localAddress = '123 ' + SECOND + ' Street, Plano, TX 75024';
  await page.route('**/*', route => {
    const url = route.request().url();
    if (route.request().isNavigationRequest() && url.startsWith('https://workplace-probe.invalid/'))
      return route.fulfill({status: 200, contentType: 'text/html',
        body: '<!doctype html><html><body>' +
          '<div class="field"><input id="destination" value=""></div>' +
          '<select id="officeSelect"><option value="custom" selected>Custom</option></select>' +
          '</body></html>'});
    otherRequests.push('unexpected outbound request');
    return route.abort();
  });
  try {
    await page.goto('https://workplace-probe.invalid/', {waitUntil: 'load'});
    await page.evaluate(({name, address}) => {
      window.__visitorXssProbe = 0;
      window.attachTexasAddressSuggestions = () => {};
      localStorage.setItem('tx-dashboard-workplaces-v1', JSON.stringify([
        {id: 'test-1', name, address}
      ]));
    }, {name: localName, address: localAddress});
    await page.addScriptTag({content: read('features/commute/workplace-destinations.js')});
    assert.equal(await page.locator('#workplaceList .workplace-entry strong').innerText(), localName);
    assert.equal(await page.locator('#workplaceList .workplace-entry small').innerText(), localAddress);
    assert.equal(await page.locator('#workplaceList img, #workplaceList svg').count(), 0,
      'saved workplace data unexpectedly created HTML nodes');
    assert.equal(await page.evaluate(() => window.__visitorXssProbe), 0,
      'saved workplace profile executed inert probe');
    assert.equal(await page.locator('#officeSelect option[value^="saved:"]').count(), 1);
    assert.deepEqual(otherRequests, [], 'saved profile unexpectedly triggered an outbound request');
    await page.locator('#workplaceList .workplace-entry-actions button')
      .filter({hasText: '삭제'}).click();
    assert.deepEqual(await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tx-dashboard-workplaces-v1'))), []);
    assert.deepEqual(errors, []);
    console.log('PASS browser-local saved workplace HTML/XSS probe, width=' + width);
  } finally { await page.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const width of [390, 1280]) {
      await candidateCard(browser, width);
      await addressSuggestions(browser, width);
      await hospitalPopup(browser, width);
      await savedWorkplaceProfiles(browser, width);
    }
    console.log('PASS eight real-module Chromium negative-input checks. No external requests.');
    console.log('LIMITATION: tested paths only, not full-app penetration testing or runtime CSP.');
  } finally { await browser.close(); }
})().catch(e => { console.error('Visitor XSS QA failed:', e.stack || String(e)); process.exitCode = 1; });
