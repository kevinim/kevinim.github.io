import test from 'node:test';
import assert from 'node:assert/strict';
import { assessResponse, auditLive, PUBLIC_ORIGIN } from '../scripts/audit-live-public-headers.mjs';

const CSP = "default-src 'self'; script-src 'self'; script-src-attr 'none'; object-src 'none'";
const HTML = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="' + CSP + '"></head><body></body></html>';
function response(extra = {}) {
  return { status: 200, contentType: 'text/html; charset=utf-8', html: HTML, headers: {}, ...extra };
}
test('live GitHub Pages meta CSP found; missing response headers warn, never imply release ready', () => {
  const result = assessResponse(response());
  assert.equal(result.status, 'WARN');
  assert.equal(result.metaCspPresent, true);
  assert.equal(result.headerCspPresent, false);
  assert.ok(result.codes.some(x => x.code === 'no_frame_embedding_control_header'));
  assert.ok(result.codes.some(x => x.code === 'csp_meta_only_no_http_header'));
  assert.equal(result.publishedSiteModified, false);
});
test('strong HTTP response headers can pass', () => {
  const result = assessResponse(response({ headers: {
    'content-security-policy': CSP + "; frame-ancestors 'none'",
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=()'
  }}));
  assert.equal(result.status, 'PASS');
});
test('unexpected response and weak script policy are errors', () => {
  const redirect = assessResponse(response({ status: 302 }));
  assert.equal(redirect.status, 'FAIL');
  assert.ok(redirect.codes.some(x => x.code === 'unexpected_home_status'));
  const weak = assessResponse(response({ html: '<meta http-equiv="Content-Security-Policy" content="script-src * \'unsafe-inline\'; object-src \'none\'">' }));
  assert.equal(weak.status, 'FAIL');
  assert.ok(weak.codes.some(x => x.code === 'unsafe_script_policy'));
});
test('auditor fetches fixed public origin without credentials or private addresses', async () => {
  let called = false;
  const result = await auditLive(async (url, opts) => {
    called = true;
    assert.equal(url, PUBLIC_ORIGIN);
    assert.equal(opts.method, 'GET');
    assert.equal(opts.redirect, 'manual');
    assert.equal(opts.headers.Authorization, undefined);
    return { status: 200, headers: new Headers({ 'content-type': 'text/html' }), text: async () => HTML };
  });
  assert.equal(called, true);
  assert.equal(result.status, 'WARN');
});
test('oversized response is rejected without logging the body', async () => {
  const report = await auditLive(async () => ({
    status: 200,
    headers: new Headers({ 'content-type': 'text/html', 'content-length': '3000000' }),
    text: async () => { throw Error('Should not read large body'); }
  }));
  assert.equal(report.status, 'FAIL');
  assert.deepEqual(report.codes.map(x => x.code), ['response_too_large']);
});
