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
      for (const key of ['publisher', 'licenseScope', 'attribution', 'reviewer']) {
        if (typeof record[key] !== 'string' || !record[key].trim())
          throw Error('approved_asset_missing_review_evidence');
      }
      if (!HTTPS_URL.test(record.termsUrl || '') || !REVIEW_DATE.test(record.reviewedAt || ''))
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
  const local = [];
  for (const file of dataFiles) {
    const detail = registry.assets[file];
    const decision = detail ? detail.decision : registry.defaultDecision;
    counts[decision] += 1;
    local.push({path: file, decision, reviewEvidencePresent: decision === 'approved'});
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
      staleRegistryEntries: missingDeclared.length,
      doesNotAuthorizeDeployment: true,
      ownersLegalReviewRequired: true,
      publicProductionApproved: false,
      limitations: [
        'does_not_verify_real_world_license_authenticity',
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
module.exports = {DATA_EXT, validateRegistry, walkFiles, audit, main};
