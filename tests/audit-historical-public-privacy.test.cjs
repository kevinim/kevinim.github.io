'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const {auditRepo, main, refKind, RETIRED_PATH, KNOWN_COMMUTE_PATH} =
  require('../scripts/audit-historical-public-privacy.cjs');

function git(dir, ...args) {
  const r = cp.spawnSync('git', ['-C', dir, ...args], {encoding:'utf8'});
  assert.equal(r.status, 0, 'synthetic fixture git command failed');
  return r.stdout.trim();
}
function withRepo(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tx-sec02-git-'));
  try {
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.name', 'Synthetic Test');
    git(dir, 'config', 'user.email', 'synthetic@example.invalid');
    fs.writeFileSync(path.join(dir, 'README.md'), 'Generic test');
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'initial synthetic');
    return fn(dir);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
}
function addFile(dir, file, content) {
  fs.writeFileSync(path.join(dir, file), content);
  git(dir, 'add', '--', file);
  git(dir, 'commit', '-qm', 'synthetic fixture change');
}
test('filename patterns detect known retired family dataset only', () => {
  assert.equal(RETIRED_PATH.test('jpm-road-times-synthetic.json'), true);
  assert.equal(KNOWN_COMMUTE_PATH.test('nested/jpm-60min-isochrone-demo.geojson'), true);
  assert.equal(RETIRED_PATH.test('generic-road-times.json'), false);
  assert.equal(RETIRED_PATH.test('some/jpm-test.js'), false);
});
test('classifies local refs without disclosing their names', () => {
  assert.equal(refKind('refs/remotes/origin/main'), 'remoteBranches');
  assert.equal(refKind('refs/heads/main'), 'localBranches');
  assert.equal(refKind('refs/pull/42/head'), 'pullRefs');
  assert.equal(refKind('refs/tags/v1'), 'tags');
});
test('clean repo reports limited scope, never clearance', () => withRepo(dir => {
  const a = auditRepo(dir);
  assert.equal(a.verdict, 'NO_KNOWN_FILENAME_MATCHES_NOT_A_PRIVACY_CLEARANCE');
  assert.equal(a.history.retiredFileBlobObjects, 0);
  assert.equal(a.ownerDecisionRequired, true);
  assert.equal(a.noGitMutation, true);
  assert.equal(a.auditLimits.length, 5);
}));
test('historical personal filename survives current-tree deletion and cannot be marked remediated', () => withRepo(dir => {
  const name = 'jpm-road-times-synthetic.json';
  addFile(dir, name, '{"synthetic":"example"}');
  const sensitiveCommit = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'branch', 'archived-synthetic', sensitiveCommit);
  git(dir, 'rm', '--', name);
  git(dir, 'commit', '-qm', 'remove synthetic example from current tree');
  const before = git(dir, 'status', '--porcelain');
  const a = auditRepo(dir);
  const after = git(dir, 'status', '--porcelain');
  assert.equal(before, after);
  assert.equal(a.verdict, 'HISTORICAL_PATH_EXPOSURE_PRESENT');
  assert.ok(a.history.retiredFileBlobObjects >= 1);
  assert.ok(a.refTips.withRetiredAssets >= 1);
  const out = JSON.stringify(a);
  assert.doesNotMatch(out, /archived-synthetic|synthetic\.json|example|refs\/heads\//);
  assert.equal(a.publicationApproved, false);
  git(dir, 'branch', '-D', 'archived-synthetic');
  const current = auditRepo(dir);
  assert.equal(current.refTips.withRetiredAssets, 0);
  assert.ok(current.history.retiredFileBlobObjects >= 1);
}));
test('does not inspect unrecognized historical embedded personal values and calls this out', () => withRepo(dir => {
  addFile(dir, 'index.html', '<script>const PLACEHOLDER_PERSONAL_FIELD="SYNTHETIC_ONLY";</script>');
  const a = auditRepo(dir);
  assert.equal(a.history.retiredFileBlobObjects, 0);
  assert.equal(a.verdict, 'NO_KNOWN_FILENAME_MATCHES_NOT_A_PRIVACY_CLEARANCE');
  assert.ok(a.auditLimits.includes('does_not_inspect_file_contents_or_unrecognized_personal_data'));
}));
test('shallow history is a blocker, not false clean', () => {
  assert.throws(() => auditRepo('/anywhere', {execGit:()=> 'true'}), /complete_local_history_required/);
});
test('no deploy/history rewrite arguments accepted', () => {
  assert.throws(() => main(['--delete-history']), /read_only_audit_accepts_no_cli_arguments/);
  assert.throws(() => main(['--deploy']), /read_only_audit_accepts_no_cli_arguments/);
});
