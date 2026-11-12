#!/usr/bin/env node
// Read-only audit of public HTTP security controls. Never log credentials,
// browser addresses, cookies, response bodies, or raw response header values.
import { fileURLToPath } from 'node:url';

export const PUBLIC_ORIGIN = 'https://kevinim.github.io/';
const DEADLINE_MS = 20_000;

function directive(policy, name) {
  return String(policy || '').split(';').map(part => part.trim())
    .find(part => part.toLowerCase().startsWith(name.toLowerCase() + ' ')) || '';
}
export function assessResponse({ status, contentType, headers = {}, html = '' }) {
  const findings = [];
  const error = code => findings.push({ severity: 'ERROR', code });
  const warn = code => findings.push({ severity: 'WARN', code });
  if (status !== 200) error('unexpected_home_status');
  if (!/^text\/html(?:\s*;|$)/i.test(contentType || '')) error('unexpected_home_content_type');
  const meta = html.match(/<meta\s+[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/i)?.[0] || '';
  const metaPolicy = meta.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
  const headerPolicy = headers['content-security-policy'] || '';
  const effective = headerPolicy || metaPolicy;
  if (!effective) error('no_content_security_policy');
  else {
    const script = directive(effective, 'script-src');
    const attr = directive(effective, 'script-src-attr');
    if (!script.includes("'self'")) error('weak_script_source_policy');
    if (/'unsafe-inline'|'unsafe-eval'|\*|\bdata:/i.test(script)) error('unsafe_script_policy');
    if (!attr.includes("'none'")) error('inline_event_handlers_not_blocked');
    if (!directive(effective, 'object-src').includes("'none'")) error('object_embedding_not_blocked');
  }
  if (!headerPolicy) warn('csp_meta_only_no_http_header');
  if (!/\bframe-ancestors\b/i.test(headerPolicy) &&
      !/^(?:DENY|SAMEORIGIN)$/i.test(headers['x-frame-options'] || ''))
    warn('no_frame_embedding_control_header');
  if (!/^nosniff$/i.test(headers['x-content-type-options'] || '')) warn('no_nosniff_header');
  if (!/\bmax-age=\d+/i.test(headers['strict-transport-security'] || '')) warn('no_hsts_header');
  if (!headers['referrer-policy']) warn('no_referrer_policy_header');
  if (!headers['permissions-policy']) warn('no_permissions_policy_header');
  return {
    status: findings.some(item => item.severity === 'ERROR') ? 'FAIL' :
      findings.length ? 'WARN' : 'PASS',
    codes: findings,
    httpStatus: status,
    headerCspPresent: Boolean(headerPolicy),
    metaCspPresent: Boolean(metaPolicy),
    checkOnly: true, publishedSiteModified: false,
    limitations: 'Read-only headers and CSP check; not a privacy, authentication, history or penetration test'
  };
}

export async function auditLive(fetcher = fetch) {
  const response = await fetcher(PUBLIC_ORIGIN, {
    method: 'GET', redirect: 'manual', cache: 'no-store',
    signal: AbortSignal.timeout(DEADLINE_MS),
    headers: { 'Cache-Control': 'no-cache' }
  });
  const headers = {};
  for (const name of [
    'content-security-policy', 'x-frame-options', 'x-content-type-options',
    'strict-transport-security', 'referrer-policy', 'permissions-policy', 'content-type'
  ]) headers[name] = response.headers.get(name) || '';
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > 2_000_000)
    return { status: 'FAIL', codes: [{ severity: 'ERROR', code: 'response_too_large' }], checkOnly: true };
  const text = await response.text();
  if (text.length > 2_000_000)
    return { status: 'FAIL', codes: [{ severity: 'ERROR', code: 'response_too_large' }], checkOnly: true };
  return assessResponse({ status: response.status, contentType: headers['content-type'], headers, html: text });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  auditLive().then(report => {
    console.log('LIVE_PUBLIC_HEADERS_AUDIT ' + JSON.stringify(report));
    if (report.status === 'FAIL') process.exitCode = 1;
  }).catch(() => {
    console.error('LIVE_PUBLIC_HEADERS_AUDIT unavailable: network_or_response_error');
    process.exitCode = 1;
  });
}
