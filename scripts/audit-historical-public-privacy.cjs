#!/usr/bin/env node
'use strict';

/**
 * SEC-02: non-destructive, filename-only audit of reachable local Git history.
 * Never reads blob bodies, prints refs/paths/SHAs, rewrites history, or contacts
 * forks. "No hit" DOES NOT mean private info is absent from past commits.
 */
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const OUT = 'artifacts/security/sec02-history-summary.json';
const RETIRED_PATH = /(?:^|\/)jpm[-_][^/]*\.(?:json|geojson)$/i;
const KNOWN_COMMUTE_PATH = /(?:^|\/)jpm-(?:60min-isochrone|road-times|outside-dfw)[^/]*\.(?:json|geojson)$/i;
const SHA = /^[0-9a-f]{40,64}$/;

function git(root, args) {
  const r = cp.spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120000,
    windowsHide: true,
  });
  if (r.error || r.status !== 0 || typeof r.stdout !== 'string') {
    throw Error('git_history_audit_unavailable');
  }
  return r.stdout;
}

function refKind(name) {
  // PR head refs are fetched as separate read-only remote tracking refs in CI.
  if (name.startsWith('refs/remotes/sec02-pull/')) return 'pullRefs';
  if (name.startsWith('refs/remotes/')) return 'remoteBranches';
  if (name.startsWith('refs/heads/')) return 'localBranches';
  if (name.startsWith('refs/tags/')) return 'tags';
  if (name.startsWith('refs/pull/')) return 'pullRefs';
  return 'otherRefs';
}

function auditRepo(root, {execGit = git} = {}) {
  if (execGit(root, ['rev-parse', '--is-shallow-repository']).trim() !== 'false') {
    throw Error('complete_local_history_required');
  }
  const refLines = execGit(root, ['for-each-ref', '--format=%(objectname) %(refname)'])
    .split('\n').filter(Boolean);
  if (!refLines.length) throw Error('no_git_refs_available');

  const counts = {
    localBranches: 0, remoteBranches: 0, tags: 0,
    pullRefs: 0, otherRefs: 0,
  };
  const tipCounts = {scanned: 0, unscannable: 0, withRetiredAssets: 0,
    withKnownCommuteAssets: 0};
  for (const line of refLines) {
    const p = line.indexOf(' ');
    const oid = line.slice(0, p), name = line.slice(p + 1);
    if (p < 0 || !SHA.test(oid) || !name.startsWith('refs/')) {
      throw Error('invalid_git_ref_metadata');
    }
    counts[refKind(name)] += 1;
    // SHA input is obtained from Git, never from an external visitor.
    let tree;
    try {
      tree = execGit(root, ['ls-tree', '-r', '-z', '--name-only', oid + '^{tree}']);
    } catch {
      tipCounts.unscannable += 1;
      continue;
    }
    tipCounts.scanned += 1;
    const entries = tree.split('\0');
    if (entries.some(x => RETIRED_PATH.test(x))) tipCounts.withRetiredAssets += 1;
    if (entries.some(x => KNOWN_COMMUTE_PATH.test(x)))
      tipCounts.withKnownCommuteAssets += 1;
  }

  const objects = execGit(root, ['rev-list', '--objects', '--all']);
  const retiredBlobOids = new Set();
  const knownBlobOids = new Set();
  for (const line of objects.split('\n')) {
    const sep = line.indexOf(' ');
    if (sep < 0) continue;
    const oid = line.slice(0, sep), file = line.slice(sep + 1);
    if (!SHA.test(oid)) throw Error('invalid_git_object_metadata');
    if (RETIRED_PATH.test(file)) retiredBlobOids.add(oid);
    if (KNOWN_COMMUTE_PATH.test(file)) knownBlobOids.add(oid);
  }

  const riskKnown = retiredBlobOids.size > 0 || tipCounts.withRetiredAssets > 0;
  const incomplete = tipCounts.unscannable > 0;
  return {
    schemaVersion: 1,
    scope: 'CURRENT_LOCAL_GIT_REFS_AND_REACHABLE_OBJECT_PATHS_ONLY',
    verdict: incomplete ? 'INCOMPLETE_MANUAL_REVIEW_REQUIRED'
      : riskKnown ? 'HISTORICAL_PATH_EXPOSURE_PRESENT'
        : 'NO_KNOWN_FILENAME_MATCHES_NOT_A_PRIVACY_CLEARANCE',
    refCounts: counts,
    refTips: tipCounts,
    history: {
      retiredFileBlobObjects: retiredBlobOids.size,
      knownCommuteBlobObjects: knownBlobOids.size,
    },
    auditLimits: [
      'does_not_inspect_file_contents_or_unrecognized_personal_data',
      'pr_merge_refs_or_unfetched_history_may_be_outside_local_scope',
      'does_not_enumerate_forks_clones_caches_or_unreachable_git_objects',
      'does_not_determine_whether_any_credential_was_compromised',
      'does_not_prove_deleted_public_assets_are_inaccessible_from_all_urls'
    ],
    ownerDecisionRequired: true,
    historyRewritten: false,
    publicationApproved: false,
    noGitMutation: true
  };
}

function main(args = process.argv.slice(2)) {
  if (args.length) throw Error('read_only_audit_accepts_no_cli_arguments');
  const summary = auditRepo(process.cwd());
  const target = path.resolve(OUT);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, JSON.stringify(summary, null, 2) + '\n', {mode: 0o600});
  console.log('SEC02_FILENAME_ONLY_AUDIT ' +
    JSON.stringify({verdict: summary.verdict,
      scannedRefTips: summary.refTips.scanned,
      historicalRetiredObjects: summary.history.retiredFileBlobObjects,
      noGitMutation: true, publicationApproved: false}));
  return summary;
}

if (require.main === module) {
  try { main(); }
  catch { console.error('SEC02_FILENAME_ONLY_AUDIT BLOCKED: review local Git coverage'); process.exitCode = 1; }
}

module.exports = {RETIRED_PATH, KNOWN_COMMUTE_PATH, refKind, auditRepo, main};
