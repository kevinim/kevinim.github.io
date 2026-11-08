#!/usr/bin/env node
// P43 research-only aggregate staging gate. No network requests or map imports.
// Run: node scripts/check-crime-staging.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = join(repoRoot, 'data', 'crime');
const fileNames = [
  'dallas-offenses-2021-2026.json',
  'dallas-zip-offenses-2025.json',
  'fort-worth-offenses-2021-2026.json',
  'fort-worth-beat-totals-2025.json',
  'frisco-offenses-partial-2025-2026.json',
  'plano-police-official-2021-2025.json',
  'mckinney-police-official-2021-2025.json',
];
const load = filename => JSON.parse(readFileSync(join(prefix, filename), 'utf8'));
const snapshots = new Map(fileNames.map(filename => [filename, load(filename)]));
const manifest = load('source-manifest.json');
const has = (obj, name) => Object.prototype.hasOwnProperty.call(obj, name);
const recordPII = new Set(['incidentnum', 'servnumid', 'case_no', 'case_no_offense', 'name',
  'victim_name', 'ro1name', 'incident_address', 'address', 'location', 'latitude',
  'longitude', 'geocoded_column', 'street', 'unit', 'case_id', 'incident_id', 'person_id']);
const error = (file, message) => { throw new Error(file + ': ' + message); };
let total = 0;
for (const [filename, dataset] of snapshots) {
  assert.equal(dataset.metadata.publicDisplay, false, filename + ': public UI flag must remain false');
  assert.ok(typeof dataset.metadata.publisher === 'string' && dataset.metadata.publisher.length > 0);
  assert.match(dataset.metadata.acquiredOn, /^20\d{2}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(dataset.records) && dataset.records.length > 0, filename);
  const seen = new Set();
  dataset.records.forEach((rec, i) => {
    const keys = Object.keys(rec);
    for (const k of keys) if (recordPII.has(k.toLowerCase())) error(filename, 'sensitive field ' + k);
    for (const k of keys) if (typeof rec[k] === 'number') assert.ok(Number.isFinite(rec[k]), filename + ' non-finite ' + k);
    if (has(rec, 'offenseRows')) assert.ok(Number.isInteger(rec.offenseRows) && rec.offenseRows >= 0,
      filename + ': negative/bad offenseRows row ' + i);
    if (has(rec, 'year')) assert.ok(Number.isInteger(rec.year) && rec.year >= 2010 && rec.year <= 2030);
    let dimensionKeys = ['year', 'offenseCode', 'offenseLabel', 'sourceCategory', 'zip', 'beat'].filter(k => has(rec, k));
    const identity = JSON.stringify(dimensionKeys.map(k => [k, rec[k]]));
    assert.ok(!seen.has(identity), filename + ' duplicate aggregate key ' + identity);
    seen.add(identity);
  });
  total += dataset.records.length;
}
assert.equal(total, 5465, 'unexpected snapshot group row count');
assert.equal(manifest.totalStoredAggregateRows, total);
assert.equal(manifest.publicUiAuthorized, false);
assert.equal(manifest.rawIncidentRecordsStored, false);
const byYear = (records, year) => records.filter(r => r.year === year).reduce((s, r) => s + r.offenseRows, 0);

const dallas = snapshots.get('dallas-offenses-2021-2026.json');
assert.equal(dallas.records.length, 317);
assert.equal(byYear(dallas.records, 2025), 128547);
const dz = snapshots.get('dallas-zip-offenses-2025.json');
assert.equal(dz.records.length, 1216);
assert.ok(dz.records.every(r => /^75\d{3}$/.test(r.zip) && r.offenseRows >= 5));
assert.equal(dz.metadata.recordsBelowThresholdSuppressed, 563);
assert.ok(dz.records.reduce((s, r) => s + r.offenseRows, 0) <= byYear(dallas.records, 2025));

const fort = snapshots.get('fort-worth-offenses-2021-2026.json');
assert.equal(fort.records.length, 3764);
assert.equal(byYear(fort.records, 2025), 56936);
const beats = snapshots.get('fort-worth-beat-totals-2025.json');
assert.equal(beats.records.length, 104);
assert.ok(beats.records.every(r => typeof r.beat === 'string' && r.beat.length > 0 && r.offenseRows >= 5));
assert.equal(beats.metadata.sourceAnnual2025Rows, 56936);
assert.ok(beats.records.reduce((s, r) => s + r.offenseRows, 0) <= 56936);

const frisco = snapshots.get('frisco-offenses-partial-2025-2026.json');
assert.equal(frisco.records.length, 54);
assert.equal(byYear(frisco.records, 2025), 921);
assert.equal(byYear(frisco.records, 2026), 4885);
assert.equal(frisco.metadata.sourceTotalRecordCount, 5806);
assert.deepEqual(frisco.metadata.partialYears, [2025, 2026]);

for (const filename of ['plano-police-official-2021-2025.json',
  'mckinney-police-official-2021-2025.json']) {
  const ds = snapshots.get(filename);
  assert.deepEqual(ds.records.map(r => r.year), [2021, 2022, 2023, 2024, 2025]);
  for (const r of ds.records) {
    if (filename.startsWith('plano')) {
      assert.equal(r.homicide + r.rape + r.robbery + r.aggravatedAssault, r.violentTotal);
      assert.equal(r.burglary + r.larceny + r.motorVehicleTheft, r.propertyTotal);
      assert.equal(r.burglaryResidential + r.burglaryNonResidential, r.burglary);
    } else {
      assert.equal(r.murder + r.negligentManslaughter + r.fentanylAssistedHomicide +
        r.forcibleSexOffense + r.robbery + r.aggravatedAssault, r.violentTotal);
      assert.equal(r.burglary + r.motorVehicleTheft + r.larcenyTheft + r.arson, r.propertyTotal);
    }
  }
}
console.log('P43 crime staging validation PASS: ' + fileNames.length +
  ' aggregate datasets, ' + total + ' source-specific groups; no map or individual incidents.');
