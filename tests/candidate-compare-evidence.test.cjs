'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {addCandidate, removeCandidate, evaluateCandidate, validMinute, validRent} =
  require('../candidate-compare.js');
const root = path.join(__dirname, '..');
const sample = (address = 'Sample Public Address, Plano, TX') => ({
  address, typedAddress: address, ll: [33.01, -96.70],
  geocodeQuality: {usableForSchoolCandidate: true}, parcel: {status: 'matched'}
});
test('only three coordinate-backed unique candidates; snapshot is isolated', () => {
  const a = sample(), first = addCandidate([], a);
  assert.equal(first.length, 1);
  a.ll[0] = 34;
  assert.equal(first[0].ll[0], 33.01);
  assert.equal(addCandidate(first, sample(' sample public address, PLANO, tx ')).length, 1);
  assert.equal(addCandidate(first, {address: 'Invalid', ll: [NaN, -96]}).length, 1);
  assert.equal(addCandidate(first, {address: 'No coordinates'}).length, 1);
  const three = addCandidate(addCandidate(first, sample('Second')), sample('Third'));
  assert.equal(three.length, 3);
  assert.equal(addCandidate(three, sample('Fourth')).length, 3);
  assert.equal(removeCandidate(three, 1).length, 2);
  assert.notStrictEqual(first[0].manual, three[1].manual);
});
test('30-minute threshold uses manual Plano minutes only; no synthetic score', () => {
  const item = addCandidate([], sample())[0];
  assert.equal(evaluateCandidate(item).work.state, 'unknown');
  item.manual.workMinutes = 30;
  assert.equal(evaluateCandidate(item).work.state, 'within');
  item.manual.workMinutes = 31;
  assert.equal(evaluateCandidate(item).work.state, 'over');
  item.manual.workMinutes = 0;
  assert.equal(evaluateCandidate(item).work.state, 'unknown');
  assert.ok(!Object.hasOwn(evaluateCandidate(item), 'score'));
  assert.ok(!Object.hasOwn(evaluateCandidate(item), 'rank'));
  assert.equal(validMinute('30.5'), null);
  assert.equal(validMinute(-1), null);
  assert.equal(validMinute('360'), 360);
  assert.equal(validMinute('361'), null);
  assert.equal(validRent('2500'), 2500);
  assert.equal(validRent('30001'), null);
});
test('district evidence is never represented as enrollment certification', () => {
  const item = addCandidate([], sample())[0];
  for (const status of ['current', 'finder-current', 'boundary-review', 'unverified-year',
    'conflict', 'feeder-review', 'apartment-split-review', 'needs-address-verification',
    'loading', 'error', 'unavailable']) {
    const result = evaluateCandidate(item, {status, district: 'PISD'});
    assert.equal(result.school.state, 'unknown', status);
    assert.match(result.school.value, /확인|검토|판정|보류|GIS|경계|충돌/);
    assert.match(result.school.note, /배정 인증이 아닙니다/);
  }
});
test('church, ballet, rent and photo check are explicit personal notes, not routes', () => {
  const item = addCandidate([], sample())[0];
  item.manual.churchMinutes = 21;
  item.manual.balletMinutes = 17;
  item.manual.monthlyRent = 2450;
  item.manual.photosReviewed = true;
  const result = evaluateCandidate(item);
  assert.equal(result.church.state, 'manual');
  assert.match(result.church.value, /21분/);
  assert.match(result.ballet.value, /17분/);
  assert.match(result.home.value, /\$2,450\/월/);
  assert.match(result.home.value, /사진 검토 표시됨/);
});
test('addresses are tab-only; demographics never enter suitability criteria', () => {
  const code = fs.readFileSync(path.join(root, 'candidate-compare.js'), 'utf8');
  assert.doesNotMatch(code, /localStorage|sessionStorage|sendBeacon|navigator\.geolocation|XMLHttpRequest/);
  assert.doesNotMatch(code, /fetch\s*\(/);
  const fn = code.slice(code.indexOf('function evaluateCandidate('),
    code.indexOf('if (typeof module'));
  assert.doesNotMatch(fn, /\.indian|\.korean|\.asian|\.white|\.black|\.hispanic/);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /candidate-compare\.js\?v=5/);
  assert.match(html, /features\/dashboard-extras\.css\?v=6/);
  const css = fs.readFileSync(path.join(root, 'features/dashboard-extras.css'), 'utf8');
  assert.match(css, /candidate-signals/);
  assert.match(css, /data-state="within"/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /max-width:390px/);
});


test('stale or malformed input cannot imply a verified driving time', () => {
  const item = addCandidate([], sample())[0];
  for (const value of ['', null, undefined, NaN, Infinity, -1, 0, '30.5', 361]) {
    item.manual.workMinutes = value;
    assert.equal(evaluateCandidate(item).work.state, 'unknown', String(value));
  }
  const r = evaluateCandidate(item, {status: 'unavailable'});
  assert.match(r.school.value, /확인 필요/);
  assert.match(r.work.note, /직접 입력/);
});


test('comparison preserves official review and parcel metadata when returning to the map', () => {
  const source = fs.readFileSync(path.join(root, 'candidate-compare.js'), 'utf8');
  for (const key of ['savedTypedAddress:item.typedAddress', 'savedGeocodeQuality:item.geocodeQuality', 'savedOfficialReview:item.officialReview']) {
    assert.ok(source.includes(key), key);
  }
});
