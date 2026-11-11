#!/usr/bin/env node
'use strict';

/**
 * Independent CFB Finder vs. AG03 draft GIS adjudicator. No vendor requests.
 * Input: operator-verified PUBLIC-property observations (local/untracked)
 * and AG03's ephemeral GeoJSON. Output intentionally drops coordinates,
 * addresses, candidate labels, names of people, and source URLs.
 * This must NEVER promote a draft polygon or assign a home to a school.
 */
const fs = require('node:fs');
const path = require('node:path');
const GRADES = ['elementary', 'middle', 'high'];
const GUARD_METERS = 250;
const FORBIDDEN = /^(?:address|streetaddress|unit|unitnumber|apartment|student|studentid|household|resident|email|phone|fullname)$/i;

function assertNoPrivateKeys(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN.test(key)) throw new Error('PRIVATE_FIELD_NOT_ALLOWED:' + key);
    assertNoPrivateKeys(item);
  }
}
function schoolKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(elementary|middle|high|school|el|h s|m s)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function isCoord(point) {
  return Array.isArray(point) && point.length === 2 &&
    point.every(Number.isFinite) && Math.abs(point[0]) <= 180 &&
    Math.abs(point[1]) <= 90;
}
function normalizeObservation(input) {
  assertNoPrivateKeys(input);
  if (!/^((PUBLIC|SYN|QA)-[a-z0-9_-]{1,60})$/i.test(input.id || ''))
    throw new Error('INVALID_NONIDENTIFYING_FIXTURE_ID');
  if (!['public-campus', 'public-complex-base', 'synthetic'].includes(input.assetType))
    throw new Error('PUBLIC_ASSET_TYPE_REQUIRED');
  if (input.point != null && !isCoord(input.point)) throw new Error('INVALID_POINT');
  return input;
}
// Coordinates in degrees; distance only uses a local equirectangular metric.
function distanceToSegmentMeters(p, a, b) {
  const latitude = p[1] * Math.PI / 180;
  const sx = 111320 * Math.cos(latitude), sy = 111320;
  const ax = (a[0] - p[0]) * sx, ay = (a[1] - p[1]) * sy;
  const bx = (b[0] - p[0]) * sx, by = (b[1] - p[1]) * sy;
  const vx = bx - ax, vy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * vx + ay * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(ax + t * vx, ay + t * vy);
}
function inRing(point, ring) {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    if (!isCoord(a) || !isCoord(b)) return false;
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}
function inspectPolygon(point, rings) {
  if (!Array.isArray(rings) || !rings.length) return { inside: false, distance: Infinity };
  let distance = Infinity;
  for (const ring of rings) {
    if (!Array.isArray(ring)) continue;
    for (let i = 1; i < ring.length; i++) {
      if (!isCoord(ring[i]) || !isCoord(ring[i - 1])) continue;
      distance = Math.min(distance, distanceToSegmentMeters(point, ring[i - 1], ring[i]));
    }
  }
  const inside = inRing(point, rings[0]) && !rings.slice(1).some(r => inRing(point, r));
  return { inside, distance };
}
function inspectGeometry(point, geometry) {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type))
    return { inside: false, distance: Infinity };
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let inside = false, distance = Infinity;
  for (const rings of polygons || []) {
    const result = inspectPolygon(point, rings);
    inside ||= result.inside;
    distance = Math.min(distance, result.distance);
  }
  return { inside, distance };
}
function acceptedGeometry(feature, year) {
  const p = feature.properties || {};
  return p.schoolYear === year &&
    p.currentYearCertified === true &&
    p.releaseEligible === true &&
    p.isOfficialCampusBoundary === true &&
    p.residenceAssignmentApproved === true;
}
function adjudicateGrade(sample, grade, features, guardMeters = GUARD_METERS) {
  const candidate = sample.candidate || {};
  const finder = sample.finder || {};
  const evidence = sample.evidence || {};
  const result = { fixtureId: sample.id, grade, status: 'WARNING',
    cause: 'FINDER', reason: 'NO_CURRENT_ASSIGNED_SCHOOL_OBSERVATION',
    finderObserved: false, polygonCompared: false, candidateAgreement: null,
    boundaryAdjacent: false };
  if (!candidate.selected || !candidate.exactMatch) {
    result.cause = 'ADDRESS';
    result.reason = 'NO_EXACT_NATIVE_AUTOCOMPLETE_SELECTION';
    return result;
  }
  if (finder.view !== 'assigned-school' || !evidence.operatorConfirmed || !evidence.date) {
    result.reason = finder.view === 'generic-catalog' ?
      'GENERIC_MATCHING_RESULTS_NOT_ASSIGNMENT' : 'NO_CURRENT_ASSIGNED_SCHOOL_OBSERVATION';
    return result;
  }
  const officialName = finder.assigned && finder.assigned[grade];
  if (typeof officialName !== 'string' || !schoolKey(officialName)) {
    result.reason = 'NO_ASSIGNED_LABEL_FOR_GRADE';
    return result;
  }
  result.finderObserved = true;
  const gradeFeatures = features.filter(f => (f.properties || {}).gradeLevel === grade);
  if (!isCoord(sample.point)) {
    result.cause = 'ADDRESS';
    result.reason = 'NO_INDEPENDENT_PUBLIC_POINT';
    return result;
  }
  if (!gradeFeatures.length) {
    result.cause = 'GEOMETRY';
    result.reason = 'NO_GRADE_POLYGONS';
    return result;
  }
  const intersects = [], distances = [];
  for (const feature of gradeFeatures) {
    const tested = inspectGeometry(sample.point, feature.geometry);
    distances.push(tested.distance);
    if (tested.inside) intersects.push(feature);
  }
  result.boundaryAdjacent = distances.some(d => d <= guardMeters);
  if (intersects.length !== 1) {
    result.cause = 'GEOMETRY';
    result.reason = intersects.length > 1 ? 'OVERLAPPING_POLYGONS' :
      result.boundaryAdjacent ? 'NEAR_BOUNDARY_NO_COVERAGE' : 'POLYGON_COVERAGE_GAP';
    return result;
  }
  const only = intersects[0], props = only.properties || {};
  const geometryName = props.provisionalSchoolName || props.schoolName || '';
  result.polygonCompared = true;
  result.candidateAgreement = !!schoolKey(geometryName) &&
    schoolKey(geometryName) === schoolKey(officialName);
  if (finder.schoolYear !== props.schoolYear || !finder.schoolYear) {
    result.cause = 'SCHOOL_YEAR';
    result.reason = 'FINDER_AND_POLYGON_YEAR_DIFFER';
  } else if (result.boundaryAdjacent) {
    result.cause = 'GEOMETRY';
    result.reason = 'WITHIN_BOUNDARY_GUARD';
  } else if (sample.assetType === 'public-complex-base') {
    result.cause = 'ADDRESS';
    result.reason = 'COMPLEX_BASE_NOT_UNIT_CONFIRMED';
  } else if (!acceptedGeometry(only, finder.schoolYear)) {
    result.cause = 'GEOMETRY';
    result.reason = result.candidateAgreement ?
      'DRAFT_UNCERTIFIED_AGREEMENT' : 'DRAFT_UNCERTIFIED_DISAGREEMENT';
  } else if (!result.candidateAgreement) {
    result.status = 'FAIL';
    result.cause = 'GEOMETRY';
    result.reason = 'CERTIFIED_POLYGON_FINDER_MISMATCH';
  } else {
    result.status = 'PASS';
    result.cause = 'NONE';
    result.reason = 'CERTIFIED_SAME_YEAR_FINDER_MATCH';
  }
  return result;
}
function compare(observations, featureCollection, guardMeters = GUARD_METERS) {
  if (!Array.isArray(observations)) throw new Error('OBSERVATIONS_MUST_BE_ARRAY');
  if (guardMeters < 0 || guardMeters > 5000) throw new Error('INVALID_BOUNDARY_GUARD');
  if (featureCollection?.type !== 'FeatureCollection' || !Array.isArray(featureCollection.features))
    throw new Error('INVALID_GEOJSON');
  const features = featureCollection.features;
  const report = { schemaVersion: 1, district: 'CFB',
    executionMode: 'OFFLINE_OPERATOR_EVIDENCE_ONLY_NO_VENDOR_REQUESTS',
    schoolAssignmentApproved: false, guardMeters,
    distinctPublicSamples: observations.length,
    gradeSummary: {}, boundaryAdjacent: [], results: [] };
  const ids = new Set();
  for (const input of observations) {
    const sample = normalizeObservation(input);
    if (ids.has(sample.id)) throw new Error('DUPLICATE_FIXTURE_ID');
    ids.add(sample.id);
    for (const grade of GRADES) {
      const result = adjudicateGrade(sample, grade, features, guardMeters);
      report.results.push(result);
      if (result.boundaryAdjacent) report.boundaryAdjacent.push({
        fixtureId: sample.id, grade, reason: result.reason });
    }
  }
  for (const grade of GRADES) {
    const rows = report.results.filter(x => x.grade === grade);
    const count = key => rows.filter(x => x.status === key).length;
    const compared = rows.filter(x => x.polygonCompared);
    const validated = rows.filter(x => x.status === 'PASS' || x.status === 'FAIL');
    report.gradeSummary[grade] = {
      finderObserved: rows.filter(x => x.finderObserved).length,
      polygonFeatures: features.filter(f => (f.properties || {}).gradeLevel === grade).length,
      polygonCompared: compared.length,
      provisionalAgreement: compared.filter(x => x.candidateAgreement).length,
      provisionalDisagreement: compared.filter(x => !x.candidateAgreement).length,
      pass: count('PASS'), fail: count('FAIL'), warning: count('WARNING'),
      certifiedAccuracy: validated.length ?
        Number((count('PASS') / validated.length).toFixed(4)) : null
    };
  }
  const total = report.results;
  report.totals = {
    pass: total.filter(x => x.status === 'PASS').length,
    fail: total.filter(x => x.status === 'FAIL').length,
    warning: total.filter(x => x.status === 'WARNING').length,
    finderObservedGradeResults: total.filter(x => x.finderObserved).length,
    geometryComparedGradeResults: total.filter(x => x.polygonCompared).length
  };
  // A geometry hit never upgrades the production authorization gate.
  return report;
}
function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--observations', '--geometry', '--output'].includes(args[i]) || !args[i + 1])
      throw new Error('Usage: --observations LOCAL.json --geometry AG03.geojson [--output report.json]');
    options[args[i]] = args[i + 1];
  }
  const observations = options['--observations'] ?
    JSON.parse(fs.readFileSync(options['--observations'], 'utf8')) : [];
  const geometry = options['--geometry'] ?
    JSON.parse(fs.readFileSync(options['--geometry'], 'utf8')) :
    { type: 'FeatureCollection', features: [] };
  const report = compare(Array.isArray(observations) ? observations : observations.samples, geometry);
  if (options['--output']) {
    fs.mkdirSync(path.dirname(options['--output']), { recursive: true });
    fs.writeFileSync(options['--output'], JSON.stringify(report, null, 2) + '\n');
  }
  process.stdout.write(JSON.stringify({
    samples: report.distinctPublicSamples, totals: report.totals,
    gradeSummary: report.gradeSummary, schoolAssignmentApproved: false
  }) + '\n');
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error('CFB_INDEPENDENT_QA_ERROR', error.message); process.exitCode = 1; }
}
module.exports = { GRADES, GUARD_METERS, schoolKey, inRing, inspectGeometry,
  acceptedGeometry, adjudicateGrade, compare, normalizeObservation };
