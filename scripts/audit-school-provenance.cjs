#!/usr/bin/env node
'use strict';

/**
 * Read-only, no-network school-provenance QA. It audits *claims*, not live
 * district correctness or individual address assignments.
 *
 * Deliberately does not modify school data, GeoJSON, runtime or official sites.
 */
const fs = require('node:fs');
const path = require('node:path');

const KNOWN_UNTRACKED = Object.freeze([]); // All registered districts now need provenance entries.
const ALLOWED_STATUSES = new Set([
  'current-source',
  'official-finder-connected',
  'live-finder-year-gated',
  'historical-reference',
  'publisher-provisional',
  'lookup-only',
]);
const STATUS_TO_CURRENCY = {
  'current-source': 'always',
  'official-finder-connected': 'finder',
  'live-finder-year-gated': 'live',
  'historical-reference': 'historical',
  'publisher-provisional': 'published',
  'lookup-only': null,
};

function validHttps(input) {
  if (typeof input !== 'string') return false;
  try { return new URL(input).protocol === 'https:'; } catch { return false; }
}

function safeLocalFile(input) {
  return typeof input === 'string'
    && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.(?:geojson|json)$/.test(input)
    && !input.split('/').includes('..')
    && !path.isAbsolute(input);
}

function auditSchoolProvenance(provenance, registry, { readLocal = null, supplementary = [] } = {}) {
  const errors = [], warnings = [];
  const baseRecords = provenance?.districts;
  const activeYear = provenance?.activeSchoolYear;
  if (!Array.isArray(baseRecords) || !Array.isArray(supplementary)) return { errors: ['districts/supplementary must be arrays'], warnings, summary: null };
  const records = [...baseRecords, ...supplementary];
  if (typeof activeYear !== 'string' || !activeYear.trim()) errors.push('activeSchoolYear is missing');
  if (!/^\d{4}-\d\d-\d\d$/.test(provenance?.lastVerified || '')) errors.push('lastVerified date missing or malformed');

  const seen = new Set();
  let current = 0;
  for (const d of records) {
    if (!d || typeof d !== 'object' || typeof d.code !== 'string') {
      errors.push('district record has no code');
      continue;
    }
    if (seen.has(d.code)) errors.push(d.code + ': duplicate district');
    seen.add(d.code);

    const registration = registry[d.code];
    if (!registration) errors.push(d.code + ': provenance code missing from district registry');
    if (!ALLOWED_STATUSES.has(d.status)) errors.push(d.code + ': unknown provenance status');
    if (!validHttps(d.officialLookup)) errors.push(d.code + ': no HTTPS official lookup URL');

    const expectedCurrency = STATUS_TO_CURRENCY[d.status];
    if (registration && ALLOWED_STATUSES.has(d.status) && registration.currency !== expectedCurrency) {
      errors.push(d.code + ': registry currency does not match provenance status');
    }

    if (d.status === 'current-source') {
      current++;
      if (d.geometryYear !== activeYear) errors.push(d.code + ': current-source year does not match active school year');
      if (!validHttps(d.mapSource) && !(Array.isArray(d.mapSources) && d.mapSources.some(validHttps)) && !safeLocalFile(d.localFile)) {
        errors.push(d.code + ': current-source lacks auditable map or local file source');
      }
    } else if (d.status === 'official-finder-connected') {
      warnings.push(d.code + ': official Finder linkage is not independent proof of current-year geometry');
    } else if (d.status === 'live-finder-year-gated') {
      const g = d.runtimeGate || {};
      if (!d.geometryYear?.includes(activeYear)
          || !validHttps(d.mapSource)
          || !validHttps(d.officialDistrictEvidence?.announcement)
          || g.statusOnlyWhenLive !== true
          || g.noValidatedFallback !== true
          || g.elementaryYearField !== 'SCHL_YEAR'
          || g.requiredElementaryValue !== '2026-27'
          || !Number.isSafeInteger(g.distinctMinimumElementary)
          || g.distinctMinimumElementary < 15
          || g.distinctMiddle !== 5
          || g.distinctHigh !== 3) {
        errors.push(d.code + ': live-finder-year-gated evidence or fail-closed guard missing');
      }
      warnings.push(d.code + ': live year gate is not independent middle/high geometry or residential assignment verification');
    } else if (d.status === 'historical-reference') {
      warnings.push(d.code + ': historical attendance geometry must remain reference-only');
    } else if (d.status === 'publisher-provisional') {
      // Public publisher polygons are not evidence of current-year enrollment.
      // A new district needs an independently reviewed evidence contract before admission.
      if (d.code !== '057905' || d.geometryYear !== 'unverified' ||
          registration?.zoneKey !== d.code || registration?.address !== 'polygon' ||
          registration?.campusIdMatch !== true || registration?.lookupKind !== 'finder-guidance') {
        errors.push(d.code + ': publisher-provisional source requires explicit unverified-year evidence and campus-ID gate');
      }
      warnings.push(d.code + ': published GIS is provisional; official 2026–27 Finder/address/grade assignment not verified');
    } else if (d.status === 'lookup-only') {
      warnings.push(d.code + ': no certified per-campus geometry; use official address Finder');
      if (registration?.address !== null || registration?.zoneKey !== null) {
        errors.push(d.code + ': lookup-only registry incorrectly permits auto-polygon assignment');
      }
    }

    if (d.publicAddressCrosscheck) {
      const { count, passed } = d.publicAddressCrosscheck;
      if (!Number.isSafeInteger(count) || !Number.isSafeInteger(passed) || count < 1 || passed < 0 || passed > count) {
        errors.push(d.code + ': invalid public address crosscheck counts');
      }
    }

    if (d.localFile !== undefined) {
      if (!safeLocalFile(d.localFile)) {
        errors.push(d.code + ': invalid local evidence path');
      } else if (readLocal) {
        try {
          const geo = readLocal(d.localFile);
          if (geo?.type !== 'FeatureCollection' || !Array.isArray(geo.features)) {
            errors.push(d.code + ': local school polygon file is not a GeoJSON FeatureCollection');
          } else if (Number.isSafeInteger(d.featureCount) && geo.features.length !== d.featureCount) {
            errors.push(d.code + ': local feature count disagrees with provenance (' + geo.features.length + ' vs ' + d.featureCount + ')');
          }
        } catch {
          errors.push(d.code + ': local evidence file missing or unreadable');
        }
      }
    }
  }

  const untracked = Object.keys(registry).filter(code => !seen.has(code));
  for (const code of untracked) {
    if (KNOWN_UNTRACKED.includes(code)) warnings.push(code + ': registry entry absent from school-data-provenance.json; source-confidence audit incomplete');
    else errors.push(code + ': NEW registry entry missing provenance');
  }
  const obsoleteExceptions = KNOWN_UNTRACKED.filter(code => !untracked.includes(code));
  for (const code of obsoleteExceptions) warnings.push(code + ': known-untracked exemption can now be removed');

  return {
    errors,
    warnings,
    summary: {
      registryDistricts: Object.keys(registry).length,
      provenanceDistricts: seen.size,
      independentlyCurrentClaimed: current,
      knownSourceGaps: untracked.length,
      activeYear: activeYear || 'unknown',
      lastVerified: provenance?.lastVerified || 'unknown',
    },
  };
}

// A separate source inventory covers West DFW lookup-only districts. Keeping
// this supplementary avoids rewriting the hash-pinned original provenance file.
function readWestDfwSupplement(root) {
  const audit = JSON.parse(fs.readFileSync(path.join(root,'data/west-dfw-zone-source-audit-2026.json'),'utf8'));
  const ui = JSON.parse(fs.readFileSync(path.join(root,'data/west-dfw-districts-2026.json'),'utf8'));
  const { validateManifest } = require('./audit-west-dfw-zone-sources.cjs');
  validateManifest(audit, ui);
  return audit.districts.map(d=>({
    code:d.code,
    status:'lookup-only',
    geometryYear:d.verifiedPolygonAcademicYear||'unverified',
    officialLookup:d.officialSource,
  }));
}

// Adjacent DFW school-district navigation is a separate evidence manifest.
// These entries provide official parent instructions, NOT student-address
// assignment polygon GIS; choice systems must remain choice systems.
function readNeighborDfwSupplement(root) {
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/dfw-neighbor-official-school-links-2026.json'),'utf8'));
 const {DISTRICT_REGISTRY}=require('../district-registry.js');
 const {official}=require('../trusted-link-policy.js');
 const allowed=new Set(['finder-guidance','official-map','official-inquiry','choice-process']);
 if(manifest.schemaVersion!==1||!Array.isArray(manifest.districts)||manifest.districts.length!==18)
  throw Error('invalid_neighbor_school_provenance_manifest');
 const seen=new Set();
 const coverage=JSON.parse(fs.readFileSync(path.join(root,'data/dfw-school-coverage-matrix-2026.json'),'utf8'));
 const dallas=coverage.districts.find(x=>x.code==='057905');
 const publishedDallasReviewedAsProvisional=!!(
   dallas?.geometry?.confirmedCurrentYear===false &&
   dallas?.geometry?.status==='configured-but-no-reviewed-reference' &&
   dallas?.missingReason==='campus-polygon-evidence-unreviewed'
 );
 return manifest.districts.map(d=>{
  const record=DISTRICT_REGISTRY[d.code];
  const provisional=d.code==='057905'&&publishedDallasReviewedAsProvisional&&
    record?.zoneKey===d.code&&record.currency==='published'&&
    record.address==='polygon'&&record.campusIdMatch===true&&
    record.lookupKind==='finder-guidance';
  if(!/^\d{6}$/.test(d.code)||seen.has(d.code)||!allowed.has(d.kind)||
    !record||record.lookupKind!==d.kind||
    (!provisional&&(record.zoneKey!==null||record.address!==null||record.currency!==null))||
    record.official!==d.url||official(d.url)!==d.url||
    typeof d.sourceYear!=='string'||d.sourceYear.length<12)
   throw Error('unsafe_neighbor_school_district_source '+d.code);
  seen.add(d.code);
  return {code:d.code,status:provisional?'publisher-provisional':'lookup-only',geometryYear:provisional?'unverified':'no-certified-GIS',officialLookup:d.url};
 });
}

function run() {
  const root = path.resolve(__dirname, '..');
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'school-data-provenance.json'), 'utf8'));
  const { DISTRICT_REGISTRY } = require(path.join(root, 'district-registry.js'));
  const mckinney = JSON.parse(fs.readFileSync(path.join(root, 'data/mckinney-2026-27-provenance.json'), 'utf8'));
  const report = auditSchoolProvenance(provenance, DISTRICT_REGISTRY, {
    readLocal: local => JSON.parse(fs.readFileSync(path.join(root, local), 'utf8')),
    supplementary: [mckinney,...readWestDfwSupplement(root),...readNeighborDfwSupplement(root)],
  });

  if (report.summary) {
    const s = report.summary;
    console.log('School-source provenance: ' + s.provenanceDistricts + '/' + s.registryDistricts + ' registered districts documented');
    console.log('Independently current-year source claims: ' + s.independentlyCurrentClaimed + '; source gaps: ' + s.knownSourceGaps);
    console.log('Reference school year: ' + s.activeYear + '; provenance checked: ' + s.lastVerified);
  }
  for (const x of report.warnings) console.log('FOLLOW-UP ' + x);
  for (const x of report.errors) console.error('ERROR ' + x);
  if (report.errors.length) {
    process.exitCode = 1;
    console.error('FAIL: source-provenance guardrail. Do not assume current attendance boundaries.');
  } else {
    console.log('PASS: structural provenance guards. Warnings still require investigation.');
  }
}

if (require.main === module) run();
module.exports = { auditSchoolProvenance, validHttps, safeLocalFile, KNOWN_UNTRACKED, readWestDfwSupplement, readNeighborDfwSupplement };
