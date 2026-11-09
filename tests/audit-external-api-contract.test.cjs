'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REQUIRED_FILES, auditProviderContract } = require('../scripts/audit-external-api-contract.cjs');

const root = path.resolve(__dirname, '..');
function actual() {
  return Object.fromEntries(REQUIRED_FILES.map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));
}

test('current known provider links, user disclosure and safe Esri/parcel parameters remain intact', () => {
  const a = auditProviderContract(actual());
  assert.deepEqual(a.errors, []);
  assert.equal(a.coverage.reviewedFiles, 7);
  assert.equal(a.coverage.monitoredProviderMarkers, 8);
  assert.ok(a.warnings.some(w => w.includes('cross-user quotas')));
});

test('Nominatim public autocomplete introduced in a later change must fail', () => {
  const files = actual();
  files['texas-address-suggest.js'] += "\nfetch('https://nominatim.openstreetmap.org/search?q=foo')\n";
  assert.ok(auditProviderContract(files).errors.some(e => e.includes('autocomplete')));
});

test('Esri storage semantics cannot silently change', () => {
  const files = actual();
  files['home-lookup-v2.js'] = files['home-lookup-v2.js'].replace("forStorage:'false'", "forStorage:'true'");
  assert.ok(auditProviderContract(files).errors.some(e => e.includes('forStorage=false')));
});

test('removing the residential address provider disclosure must fail', () => {
  const files = actual();
  files['index.html'] = files['index.html'].replace('id="homePrivacy"', 'id="undisclosed"');
  assert.ok(auditProviderContract(files).errors.some(e => e.includes('home address')));
});

test('unexpected parcel owner-field expansion fails prior to release', () => {
  const files = actual();
  files['collin-parcel-check.js'] = files['collin-parcel-check.js'].replace(
    'OBJECTID,situsConcat,propYear', 'OBJECTID,situsConcat,propYear,OWNER_NAME',
  );
  assert.ok(auditProviderContract(files).errors.some(e => e.includes('parcel fetch')));
});

test('an insecure OSM tile URL is rejected', () => {
  const files = actual();
  files['features/reviewed-bootstrap.js'] = files['features/reviewed-bootstrap.js'].replace('https://{s}.tile.openstreetmap.org/', 'http://{s}.tile.openstreetmap.org/');
  const report = auditProviderContract(files);
  assert.ok(report.errors.some(e => e.includes('insecure OSM tile protocol')));
});
