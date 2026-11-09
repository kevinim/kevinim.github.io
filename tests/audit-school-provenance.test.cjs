'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { auditSchoolProvenance, validHttps, safeLocalFile, readWestDfwSupplement, readNeighborDfwSupplement } = require('../scripts/audit-school-provenance.cjs');
const root = path.join(__dirname, '..');

function actual() {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'school-data-provenance.json'), 'utf8'));
  const { DISTRICT_REGISTRY } = require('../district-registry.js');
  const supplementary = [JSON.parse(fs.readFileSync(path.join(root, 'data/mckinney-2026-27-provenance.json'), 'utf8')), ...readWestDfwSupplement(root), ...readNeighborDfwSupplement(root)];
  return { data, registry: DISTRICT_REGISTRY, supplementary };
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
  const { data, registry, supplementary } = actual();
  const r = auditSchoolProvenance(data, registry, {
    readLocal: name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')),
    supplementary,
  });
  assert.deepEqual(r.errors, []);
  assert.equal(r.summary.independentlyCurrentClaimed, 2);
  assert.equal(r.summary.knownSourceGaps, 0);
  assert.ok(r.warnings.some(w => w.includes('043907') && w.includes('independent')));
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

test('new registration without a provenance record fails', () => {
  const { data, registry } = sample();
  registry.NEW = { currency: 'live', address: 'polygon', zoneKey: 'NEW' };
  assert.ok(auditSchoolProvenance(data, registry).errors.some(e => e.includes('NEW')));
  delete registry.NEW;
  const result = auditSchoolProvenance(data, registry);
  assert.deepEqual(result.errors, []);
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


test('McKinney live-finder geometry must have explicit 2026-27 gated evidence', () => {
  const { data, registry } = sample();
  data.districts.push({
    code: '043907', status: 'live-finder-year-gated',
    geometryYear: '2026–27 elementary only',
    officialLookup: 'https://example.com/locator',
    mapSource: 'https://example.com/map',
    officialDistrictEvidence: { announcement: 'https://example.com/approval' },
    runtimeGate: {
      statusOnlyWhenLive: true, noValidatedFallback: true,
      elementaryYearField: 'SCHL_YEAR',
      requiredElementaryValue: '2026-27',
      distinctMinimumElementary: 15, distinctMiddle: 5, distinctHigh: 3,
    },
  });
  registry['043907'] = { currency: 'live', address: 'polygon', zoneKey: '043907' };
  const valid = auditSchoolProvenance(data, registry);
  assert.deepEqual(valid.errors, []);
  assert.ok(valid.warnings.some(w => w.includes('independent middle/high')));

  data.districts[2].runtimeGate.statusOnlyWhenLive = false;
  const invalid = auditSchoolProvenance(data, registry);
  assert.ok(invalid.errors.some(e => e.includes('fail-closed guard')));
});


test('west DFW supplemental provenance records all four lookup-only ISDs without current GIS claims', () => {
  const rows=readWestDfwSupplement(root);
  assert.deepEqual(new Set(rows.map(r=>r.code)),new Set(['220919','220907','061911','220906']));
  assert.ok(rows.every(r=>r.status==='lookup-only'));
  assert.ok(rows.every(r=>validHttps(r.officialLookup)));
});

test('DFW supplemental source has 95 lookup-only districts plus provisional Dallas GIS',()=>{
 const rows=readNeighborDfwSupplement(root);
 assert.equal(rows.length,96);
 assert.equal(new Set(rows.map(x=>x.code)).size,96);
 assert.equal(rows.filter(x=>x.status==='lookup-only'&&x.geometryYear==='no-certified-GIS').length,95);
 const dallas=rows.find(x=>x.code==='057905');
 assert.equal(dallas.status,'publisher-provisional');
 assert.equal(dallas.geometryYear,'unverified');
 const {data,registry,supplementary}=actual();
 const report=auditSchoolProvenance(data,registry,{supplementary});
 assert.equal(report.summary.registryDistricts,107);
 assert.equal(report.summary.provenanceDistricts,107);
 assert.equal(report.summary.knownSourceGaps,0);
 assert.ok(report.warnings.some(x=>x.includes('057905')&&x.includes('not verified')));
 const altered=structuredClone(registry);
 altered['057905'].currency='always';
 assert.ok(auditSchoolProvenance(data,altered,{supplementary}).errors.some(x=>x.includes('057905')));
});
