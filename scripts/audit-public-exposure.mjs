#!/usr/bin/env node
/**
 * Read-only, dependency-free scan for high-confidence credential signatures in
 * tracked text files of this public GitHub Pages repository.
 *
 * IMPORTANT: Detects only known patterns in the checked-out tree. It is not a
 * substitute for a Git history scan, manual PII review, or provider-side key
 * restrictions. Never print matched credentials or matched source lines.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SIGNATURES = Object.freeze([
  { id: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { id: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { id: 'github-fine-grained-token', pattern: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/ },
  { id: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { id: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { id: 'stripe-secret-key', pattern: /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/ },
  { id: 'telegram-bot-token', pattern: /\b[0-9]{8,12}:[A-Za-z0-9_-]{35}\b/ },
]);

export function scanText(source, filePath = '(input)') {
  const results = [];
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    for (const signature of SIGNATURES) {
      if (signature.pattern.test(line)) {
        results.push({ file: filePath, line: index + 1, rule: signature.id });
      }
    }
  }
  return results;
}

export function scanTrackedFiles(cwd = process.cwd()) {
  const entries = execFileSync('git', ['ls-files', '-z'], {
    cwd,
    encoding: 'buffer',
    maxBuffer: 20 * 1024 * 1024,
  }).toString('utf8').split('\0').filter(Boolean);
  const findings = [];
  const skipped = [];
  let scanned = 0;

  for (const name of entries) {
    const file = path.resolve(cwd, name);
    if (!file.startsWith(path.resolve(cwd) + path.sep)) {
      skipped.push({ file: name, reason: 'outside-worktree' });
      continue;
    }
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.size > 10 * 1024 * 1024) {
      skipped.push({ file: name, reason: 'nonregular-or-over-10MiB' });
      continue;
    }
    const data = fs.readFileSync(file);
    if (data.includes(0)) {
      skipped.push({ file: name, reason: 'binary' });
      continue;
    }
    scanned++;
    findings.push(...scanText(data.toString('utf8'), name));
  }

  return { scanned, tracked: entries.length, skipped, findings };
}

function main() {
  let report;
  try {
    report = scanTrackedFiles();
  } catch (error) {
    console.error('Public exposure audit failed to run: ' + error.message);
    process.exitCode = 2;
    return;
  }
  console.log('Tracked text files scanned: ' + report.scanned + '/' + report.tracked);
  if (report.skipped.length) {
    console.log('Unscanned files (manual follow-up required):');
    for (const item of report.skipped) console.log('  ' + item.file + ' [' + item.reason + ']');
  }
  if (report.findings.length) {
    console.error('Potential credentials found (values REDACTED):');
    for (const item of report.findings) {
      console.error('  ' + item.file + ':' + item.line + ' [' + item.rule + ']');
    }
    console.error('Remove/rotate verified credentials and investigate Git history before public release.');
    process.exitCode = 1;
    return;
  }
  console.log('PASS: No high-confidence credential signatures detected in scanned files.');
  console.log('LIMITATION: Does not scan Git history, unknown token formats, personal locations or third-party data use.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
