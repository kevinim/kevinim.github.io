'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SINK_LIMITS, countHtmlSinks, auditBrowserSurface } = require('../scripts/audit-visitor-xss-sinks.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sources = () => Object.fromEntries(Object.keys(SINK_LIMITS).map(p => [p, read(p)]));

test('tracked high-risk browser sources remain within the reviewed HTML sink inventory', () => {
  const result = auditBrowserSurface(sources());
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.scannedFiles, Object.keys(SINK_LIMITS).length);
  assert.equal(result.summary.htmlSinkOccurrences, 30);
  assert.ok(result.warnings.some(x => /not certified safe/i.test(x)));
});

test('an additional HTML insertion sink blocks the source guard', () => {
  const files = sources();
  files['index.html'] += '\ndocument.getElementById("injected").innerHTML = unknownResponse;\n';
  assert.ok(auditBrowserSurface(files).errors.some(x => x.includes('new HTML insertion sink')));
});

test('an introduced dynamic code evaluator or document.write blocks the guard', () => {
  for (const value of ['eval(externalText)', 'new Function(externalText)', 'document.write(externalText)']) {
    const files = sources();
    files['home-lookup-v2.js'] += '\n' + value + ';\n';
    assert.ok(auditBrowserSurface(files).errors.some(x => x.includes('dynamic JavaScript')), value);
  }
});

test('external script checksum removal blocks the guard', () => {
  const files = sources();
  files['index.html'] = files['index.html'].replace(/integrity="sha256-[^"]+"/, '');
  assert.ok(auditBrowserSurface(files).errors.some(x => x.includes('missing SRI')));
});

test('external script protocol downgrade blocks the guard', () => {
  const files = sources();
  files['reviewed.html'] = files['reviewed.html'].replace('<script src="https://unpkg.com/leaflet@', '<script src="http://unpkg.com/leaflet@');
  assert.ok(auditBrowserSurface(files).errors.some(x => x.includes('insecure external script')));
});

test('literal executable link protocols in monitored markup are rejected', () => {
  const files = sources();
  files['index.html'] += '\n<a href="javascript:alert(1)">bad</a>\n';
  assert.ok(auditBrowserSurface(files).errors.some(x => x.includes('javascript:')));
});

test('removing monitored files fails closed', () => {
  const files = sources();
  delete files['texas-address-suggest.js'];
  assert.ok(auditBrowserSurface(files).errors.some(x => x.includes('missing monitored')));
});

test('no new raw popups in the currently text-safe address suggestion renderer', () => {
  const source = read('texas-address-suggest.js');
  assert.match(source, /button\.textContent\s*=\s*item\.text/);
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML\s*\(/);
  // This structural assertion alone does not prove that every future sink is safe.
});
