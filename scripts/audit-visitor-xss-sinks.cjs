#!/usr/bin/env node
'use strict';

/*
 * Read-only regression gates for visitor-facing script/data sinks.
 * This checks a LIMITED list of high-risk files and invariants. Passing is
 * NOT proof of exploit absence or a complete XSS security review.
 * No production writes, external network, attacker URLs, or user addresses.
 */
const fs = require('node:fs');
const path = require('node:path');

const SINK_LIMITS = Object.freeze({
  'index.html': 13,
  'reviewed.html': 0,
  'features/reviewed-bootstrap.js': 10,
  'features/geojson-upload-guard.js': 0,
  'home-lookup-v2.js': 2,
  'candidate-compare.js': 2,
  'features/dashboard-extras.js': 3,
  'features/healthcare/map-layer.js': 0,
  'features/resilience/winter-map.js': 0,
  'texas-address-suggest.js': 0,
  'crime-city-map.js': 0,
  'phase2a-fema-hazards.js': 0,
  'phase2a-nfhl-flood.js': 0,
});

function countHtmlSinks(text) {
  return (text.match(/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(/g) || []).length;
}

function auditBrowserSurface(files) {
  const errors = [], warnings = [], sinks = {};
  for (const [file, limit] of Object.entries(SINK_LIMITS)) {
    const body = files?.[file];
    if (typeof body !== 'string' || !body.length) {
      errors.push('missing monitored browser source: ' + file);
      continue;
    }
    const count = countHtmlSinks(body);
    sinks[file] = count;
    if (count > limit) errors.push(file + ': new HTML insertion sink (' + count + ' > approved inventory ' + limit + '), review before merge');
    // A lower count is fine: removing HTML sinks is desirable.
    if (/\beval\s*\(|\bnew\s+Function\s*\(|\bdocument\.write\s*\(/.test(body))
      errors.push(file + ': dynamic JavaScript execution or document.write introduced');
    if (/<(?:a|iframe|script)\b[^>]*(?:href|src)\s*=\s*["']\s*javascript\s*:/i.test(body))
      errors.push(file + ': javascript: literal URL found in rendered markup');
  }

  for (const file of ['index.html', 'reviewed.html']) {
    const html = files?.[file] || '';
    const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi)];
    if (!externalScripts.length) errors.push(file + ': known external Leaflet script not detected');
    for (const match of externalScripts) {
      const tag = match[0], url = match[1];
      if (!url.startsWith('https://')) errors.push(file + ': insecure external script URL');
      if (!/\bintegrity\s*=\s*["']sha(?:256|384|512)-[^"']+["']/.test(tag))
        errors.push(file + ': external script missing SRI checksum');
      if (!/\bcrossorigin\s*=/.test(tag))
        errors.push(file + ': cross-origin SRI script missing crossorigin attribute');
    }
    if (/<script\b[^>]*\bsrc\s*=\s*["']\s*http:/i.test(html))
      errors.push(file + ': insecure HTTP script URL');
    if (!/Content-Security-Policy/i.test(html))
      warnings.push(file + ': no source-declared CSP; deployed response headers NOT independently checked');
  }
  warnings.push('Existing HTML insertion sinks are INVENTORIED, not certified safe. Trace untrusted data to each sink.');
  warnings.push('Review third-party school GIS, geocoder text, uploaded GeoJSON on reviewed.html, generated hrefs and Leaflet popups.');
  warnings.push('A passing source scan cannot replace isolated Chromium negative-input tests or authenticated GitHub deployment protections.');
  return {
    errors, warnings,
    summary: { scannedFiles: Object.keys(sinks).length,
      htmlSinkOccurrences: Object.values(sinks).reduce((a, b) => a + b, 0),
      sinkCounts: sinks },
  };
}

function main() {
  const root = path.resolve(__dirname, '..');
  const files = Object.fromEntries(Object.keys(SINK_LIMITS).map(p => [
    p, fs.readFileSync(path.join(root, p), 'utf8'),
  ]));
  const r = auditBrowserSurface(files);
  console.log('High-risk browser files checked: ' + r.summary.scannedFiles);
  console.log('Existing HTML insertion sites inventoried: ' + r.summary.htmlSinkOccurrences);
  for (const msg of r.warnings) console.log('FOLLOW-UP: ' + msg);
  for (const msg of r.errors) console.error('REGRESSION: ' + msg);
  if (r.errors.length) {
    console.error('FAIL: security-sensitive source contract changed');
    process.exitCode = 1;
  } else {
    console.log('PASS: static browser-sink regression guard; security certification NOT implied');
  }
}
if (require.main === module) main();
module.exports = { SINK_LIMITS, countHtmlSinks, auditBrowserSurface };
