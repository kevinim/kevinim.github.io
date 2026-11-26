#!/usr/bin/env node
'use strict';

// SEC-04: Audit public *build outputs*, not developer source. No upload/deploy.
// This audit refuses to infer legal permission from public accessibility.
// Redacted summary to CI; itemized filenames remain ignored local-only.
const fs = require('node:fs');
const path = require('node:path');

const OUTPUT = 'artifacts/security';
const DATA_EXT = /\.(?:json|geojson|csv|tsv|topojson|kml|gpx|xml|pbf|png|jpe?g|webp|gif|svg|tiff?|woff2?)$/i;
const DECISIONS = new Set(['approved', 'pending', 'restricted', 'excluded']);
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[A-Za-z0-9_./-]+$/;
const HTTPS_URL = /^https:\/\/[^\s<>"']+$/i;
const REVIEW_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Evidence input must parse as a genuine HTTPS origin, not just start with
// "https://". Never accept credentials or URL fragments as a publisher pin.
function validEvidenceUrl(value) {
  if (typeof value !== 'string' || !HTTPS_URL.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname &&
      !url.username && !url.password && !url.hash;
  } catch { return false; }
}
function validEvidenceDate(value) {
  if (typeof value !== 'string' || !REVIEW_DATE.test(value)) return false;
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
}

// Filename-derived REVIEW QUEUE only: never infer a publisher, license, or
// permission from a filename or a public URL. Unknown assets stay pending.
const REVIEW_LANES = Object.freeze([
  'tea_education_candidate',
  'school_gis_candidate',
  'climate_disaster_candidate',
  'healthcare_candidate',
  'housing_parcel_candidate',
  'area_demographics_candidate',
  'unclassified_needs_source_evidence',
]);
function classifyReviewLane(file) {
  const name = String(file || '').toLowerCase();
  if (/(?:^|\/)(?:tea[-_]|peims[-_]|staar[-_])|(?:accountability|enrollment|ethnicity)/.test(name))
    return 'tea_education_candidate';
  if (/(?:^|\/)(?:healthcare|hospital|dshs|cms[-_]|trauma)|(?:emergency[-_]|clinic[-_])/.test(name))
    return 'healthcare_candidate';
  if (/(?:^|\/)(?:resilience|crime)|(?:fema|noaa|storm|flood|ercot|winter|wildfire|eia[-_])/.test(name))
    return 'climate_disaster_candidate';
  if (/(?:school|campus|boundary|boundaries|zone|zoning|finder|district|isd|gis|arcgis|cfb[-_]|mckinney[-_]|prosper[-_]|denton[-_]|carrollton[-_])/.test(name))
    return 'school_gis_candidate';
  if (/(?:rent|redfin|parcel|listing|real[-_]estate|housing|property|house[-_])/.test(name))
    return 'housing_parcel_candidate';
  if (/(?:census|demograph|population|income|age[-_]|zip|fuel[-_]|median)/.test(name))
    return 'area_demographics_candidate';
  return 'unclassified_needs_source_evidence';
}

function walkFiles(root, rel = '') {
  const output = [];
  for (const ent of fs.readdirSync(path.join(root, rel), {withFileTypes: true})) {
    const item = rel ? rel + '/' + ent.name : ent.name;
    if (!SAFE_PATH.test(item) || ent.isSymbolicLink())
      throw Error('unsafe_bundle_entry');
    if (ent.isDirectory()) output.push(...walkFiles(root, item));
    else if (ent.isFile()) output.push(item);
    else throw Error('unsupported_bundle_entry');
  }
  return output.sort();
}

function validateRegistry(registry) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)
      || registry.schemaVersion !== 1
      || registry.defaultDecision !== 'pending'
      || !registry.assets || typeof registry.assets !== 'object'
      || Array.isArray(registry.assets))
    throw Error('invalid_rights_registry_schema');
  for (const [asset, record] of Object.entries(registry.assets)) {
    if (!SAFE_PATH.test(asset) || !DATA_EXT.test(asset) ||
        typeof record !== 'object' || record === null || Array.isArray(record) ||
        !DECISIONS.has(record.decision))
      throw Error('invalid_rights_registry_entry');
    if (record.decision === 'approved') {
      // A publisher name and generic terms link alone cannot justify public
      // redistribution. Record the exact source/vintage and each intended use.
      // This validates evidence completeness, not the authenticity of a license.
      for (const key of ['publisher', 'licenseScope', 'attribution', 'reviewer',
                         'dataVintage', 'geographicScope', 'permissionBasis']) {
        if (typeof record[key] !== 'string' || !record[key].trim())
          throw Error('approved_asset_missing_review_evidence');
      }
      if (!['publisher-license', 'written-authorization', 'public-domain-verified']
          .includes(record.permissionBasis))
        throw Error('approved_asset_missing_review_evidence');
      if (!validEvidenceUrl(record.sourceUrl) ||
          !validEvidenceUrl(record.termsUrl) ||
          !validEvidenceDate(record.reviewedAt) ||
          !validEvidenceDate(record.retrievedAt) ||
          record.retrievedAt > record.reviewedAt ||
          record.reviewedAt > new Date().toISOString().slice(0, 10))
        throw Error('approved_asset_missing_review_evidence');
      const permissions = record.permissions;
      if (!permissions || typeof permissions !== 'object' ||
          Array.isArray(permissions) ||
          !['publicDisplay', 'redistribution', 'browserCaching', 'modification']
            .every(key => typeof permissions[key] === 'boolean') ||
          permissions.publicDisplay !== true ||
          permissions.redistribution !== true ||
          permissions.browserCaching !== true)
        throw Error('approved_asset_missing_review_evidence');
    }
    // Pending/restricted/excluded never become approved on their own.
  }
  return registry;
}

function audit(bundleDir, registry) {
  validateRegistry(registry);
  if (!fs.existsSync(bundleDir) || !fs.statSync(bundleDir).isDirectory())
    throw Error('distribution_directory_unavailable');
  const files = walkFiles(bundleDir);
  if (!files.includes('index.html')) throw Error('distribution_index_missing');
  const dataFiles = files.filter(f => DATA_EXT.test(f));
  const counts = {approved: 0, pending: 0, restricted: 0, excluded: 0};
  const reviewLaneCounts = Object.fromEntries(REVIEW_LANES.map(name => [name,0]));
  const extensionCounts = {};
  const local = [];
  for (const file of dataFiles) {
    // Only an explicit own registry entry may grant rights. Prototype-inherited
    // records are never part of the reviewed manifest.
    const detail = Object.hasOwn(registry.assets, file) ? registry.assets[file] : null;
    const decision = detail ? detail.decision : registry.defaultDecision;
    counts[decision] += 1;
    const reviewLane = classifyReviewLane(file);
    reviewLaneCounts[reviewLane] += 1;
    const extension = path.extname(file).slice(1).toLowerCase();
    extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
    local.push({
      path: file, decision, reviewLane, extension,
      reviewEvidencePresent: decision === 'approved',
      publisherAndReuseRightsIndependentlyVerified: false,
    });
  }
  const missingDeclared = Object.keys(registry.assets).filter(f => !dataFiles.includes(f));
  const blocked = counts.pending + counts.restricted + counts.excluded > 0 || !!missingDeclared.length;
  return {
    summary: {
      schemaVersion: 1,
      scope: 'BUILT_PUBLIC_DISTRIBUTION_DATA_AND_MEDIA_FILES_ONLY',
      status: blocked ? 'BLOCKED_RIGHTS_REVIEW_REQUIRED' : 'READY_FOR_ADDITIONAL_RELEASE_GATES',
      distributionFileCount: files.length,
      dataAndMediaAssetCount: dataFiles.length,
      rightsDecisions: counts,
      reviewLaneCounts,
      extensionCounts: Object.fromEntries(Object.entries(extensionCounts).sort(([a],[b]) => a.localeCompare(b))),
      reviewLaneClassification: 'FILENAME_HEURISTIC_ONLY_NOT_PUBLISHER_OR_LICENSE_EVIDENCE',
      staleRegistryEntries: missingDeclared.length,
      doesNotAuthorizeDeployment: true,
      ownersLegalReviewRequired: true,
      publicProductionApproved: false,
      limitations: [
        'does_not_verify_real_world_license_authenticity',
        'review_lanes_are_filename_hints_only_and_may_be_incorrect',
        'does_not_detect_embedded_data_inside_js_html_css',
        'does_not_approve_external_runtime_requests_or_provider_quotas',
        'does_not_replace_secrets_privacy_browser_and_owner_release_gates',
      ],
    },
    local: {schemaVersion:1, itemizedPaths:local, staleRegistryPaths:missingDeclared},
  };
}

function main(args = process.argv.slice(2), root = process.cwd()) {
  if (!(args.length === 0 || args.length === 2 || args.length === 3))
    throw Error('usage_distribution_registry_optional_assert_ready');
  const [dir = 'dist/public-preview', registryFile = 'deploy/public-data-rights.json', flag] = args;
  if (flag !== undefined && flag !== '--assert-ready')
    throw Error('unsupported_audit_option');
  const location = path.resolve(root, dir);
  const registryPath = path.resolve(root, registryFile);
  if (!location.startsWith(root + path.sep) || !registryPath.startsWith(root + path.sep))
    throw Error('audit_paths_must_be_in_repo');
  const rights = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const result = audit(location, rights);
  const dest = path.join(root, OUTPUT);
  fs.mkdirSync(dest, {recursive: true});
  fs.writeFileSync(path.join(dest, 'public-data-rights-summary.json'),
    JSON.stringify(result.summary, null, 2) + '\n');
  fs.writeFileSync(path.join(dest, 'public-data-rights-local.json'),
    JSON.stringify(result.local, null, 2) + '\n', {mode: 0o600});
  console.log('PUBLIC_DATA_RIGHTS_AUDIT ' + JSON.stringify({
    status: result.summary.status,
    scannedAssets: result.summary.dataAndMediaAssetCount,
    decisions: result.summary.rightsDecisions,
    reviewLaneCounts: result.summary.reviewLaneCounts,
    staleRegistryEntries: result.summary.staleRegistryEntries,
    publicProductionApproved: false,
  }));
  if (flag === '--assert-ready' && result.summary.status !== 'READY_FOR_ADDITIONAL_RELEASE_GATES')
    process.exitCode = 1;
  return result;
}

if (require.main === module) {
  try { main(); }
  catch { console.error('PUBLIC_DATA_RIGHTS_AUDIT BLOCKED: review local files and registry'); process.exitCode = 2; }
}
module.exports = {DATA_EXT, REVIEW_LANES, classifyReviewLane, validateRegistry, walkFiles, audit, main};
