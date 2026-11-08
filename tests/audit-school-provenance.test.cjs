'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { auditSchoolProvenance, validHttps, safeLocalFile } = require('../scripts/audit-school-provenance.cjs');
const root = path.join(__dirname, '..');

function actual() {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'school-data-provenance.json'), 'utf8'));
  const { DISTRICT_REGISTRY } = require('../district-registry.js');
  return { data, registry: DISTRICT_REGISTRY };
}

function sample() {
  return {
    data: {
      activeSchoolYear: '2026–27',
      lastVerified: '2026-11-07',
      districts: [
        {
          code: 'FISD', status: 'current-source', geometryYear: '2026–27',
          mapSource: 'https://www.example.com/geometry', officialLookup: 'https://www.example.com/finder',
        },
        {
          code: 'CFB', status: 'lookup-only', geometryYear: 'unknown',
          officialLookup: 'https://www.example.com/finder',
        },
      ],
    },
    registry: {
      FISD: { currency: 'always', address: 'frisco', zoneKey: 'FISD' },
      CFB: { currency: null, address: null, zoneKey: null },
    },
  };
}

test('current repository source claims have structurally consistent registry', () => {
  const { data, registry } = actual();
  const r = auditSchoolProvenance(data, registry, {
    readLocal: name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')),
  });
  assert.deepEqual(r.errors, []);
  assert.equal(r.summary.independentlyCurrentClaimed, 2);
  assert.equal(r.summary.knownSourceGaps, 1);
  assert.ok(r.warnings.some(w => w.includes('043907')));
});

test('current-year promotion without supporting vintage is blocked', () => {
  const { data, registry } = sample();
  data.districts[0].geometryYear = '2025–26';
  assert.ok(auditSchoolProvenance(data, registry).errors.some(e => e.includes('current-source year')));
});

test('lookup-only district cannot silently gain polygon auto assignment', () => {
  const { data, registry } = sample();
  registry.CFB.address = 'polygon';
  assert.ok(auditSchoolProvenance(data, registry).errors.some(e => e.includes('auto-polygon')));
});

test('new registration without a provenance record fails while legacy McKinney gap is visible', () => {
  const { data, registry } = sample();
  registry.NEW = { currency: 'live', address: 'polygon', zoneKey: 'NEW' };
  assert.ok(auditSchoolProvenance(data, registry).errors.some(e => e.includes('NEW')));
  delete registry.NEW;
  registry['043907'] = { currency: 'live', address: 'polygon', zoneKey: '043907' };
  const result = auditSchoolProvenance(data, registry);
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some(w => w.includes('043907')));
});

test('file paths and official URLs reject unsafe schemes and traversal', () => {
  assert.equal(validHttps('https://www.example.com/'), true);
  assert.equal(validHttps('javascript:alert(1)'), false);
  assert.equal(safeLocalFile('allen-attendance-historical.geojson'), true);
  assert.equal(safeLocalFile('../private.json'), false);
  assert.equal(safeLocalFile('/private.json'), false);
  assert.equal(safeLocalFile('https://example.com/a.geojson'), false);
});

test('local evidence count changes are caught', () => {
  const { data, registry } = sample();
  data.districts[0].localFile = 'test.geojson';
  data.districts[0].featureCount = 2;
  const res = auditSchoolProvenance(data, registry, {
    readLocal: () => ({ type: 'FeatureCollection', features: [{}] }),
  });
  assert.ok(res.errors.some(e => e.includes('feature count disagrees')));
});
