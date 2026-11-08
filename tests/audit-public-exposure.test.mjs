import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText, SIGNATURES } from '../scripts/audit-public-exposure.mjs';

test('detects representative GitHub, AWS and private-key signatures', () => {
  const githubToken = 'gh' + 'p_' + 'A'.repeat(36);
  const awsKey = 'AK' + 'IA' + 'B'.repeat(16);
  const pem = '-----BEGIN ' + 'PRIVATE KEY-----';
  const contents = ['const token = "' + githubToken + '";', awsKey, pem].join('\n');
  const found = scanText(contents, 'sample.txt');

  assert.deepEqual(found.map((x) => [x.line, x.rule]), [
    [1, 'github-token'],
    [2, 'aws-access-key'],
    [3, 'private-key'],
  ]);
  assert.ok(!JSON.stringify(found).includes(githubToken), 'must never report raw tokens');
  assert.ok(!JSON.stringify(found).includes(awsKey), 'must never report raw keys');
});

test('detects a Google API key without revealing its value', () => {
  const key = 'AI' + 'za' + '1'.repeat(35);
  const result = scanText(key);
  assert.equal(result.length, 1);
  assert.equal(result[0].rule, 'google-api-key');
  assert.ok(!JSON.stringify(result).includes(key));
});

test('does not flag placeholders or unrelated ordinary text', () => {
  const text = [
    'api_key = "ENTER_YOUR_KEY_HERE"',
    'JPM_ADDRESS = "example destination"',
    'a public URL and ordinary token label',
    '-----BEGIN PUBLIC KEY-----',
  ].join('\n');
  assert.deepEqual(scanText(text), []);
});

test('signatures are uniquely named and do not use stateful global regexes', () => {
  assert.equal(new Set(SIGNATURES.map((x) => x.id)).size, SIGNATURES.length);
  assert.ok(SIGNATURES.every((x) => !x.pattern.global));
});
