'use strict';
/**
 * Read-only Cloudflare Access "anonymous denial" preflight.
 *
 * - NO credentials, cookies, tokens, deployment actions or automatic provisioning.
 * - --plan: validates only placeholder configuration and performs ZERO network calls.
 * - --live: explicit operator opt-in and only whitelisted HTTPS UAT Pages origins;
 *   checks unauthenticated GETs with manual redirects, no received body processing.
 *
 * Passing here is only one gate. Access policy membership, signed-in access,
 * custom domains and all future aliases still require owner-side verification.
 */
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_PATHS = Object.freeze([
  '/', '/index.html', '/schools.json', '/home-lookup-v2.js', '/district-registry.js',
]);

function httpsOrigin(value, label) {
  if (typeof value !== 'string' || !value.startsWith('https://') ||
      value.length > 253 || /[\u0000-\u0020\u007f\\]/.test(value)) {
    throw Error(label + ': HTTPS origin required');
  }
  const authority = value.slice(8).split(/[/?#]/, 1)[0];
  // URL parser canonicalizes :443 and credentials; reject before parsing.
  if (authority.includes('@') || authority.includes(':')) {
    throw Error(label + ': no credentials, literal port or IPv6 syntax');
  }
  let u;
  try { u = new URL(value); } catch { throw Error(label + ': malformed URL'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port ||
      u.pathname !== '/' || u.search || u.hash || u.hostname !== authority.toLowerCase() ||
      !/^[a-z0-9.-]+$/.test(u.hostname)) {
    throw Error(label + ': exact origin required, without path/query/fragment');
  }
  return u.origin;
}

function validateConfig(config, { live = false } = {}) {
  if (!config || config.schemaVersion !== 1 ||
      !['unprovisioned', 'configured'].includes(config.state)) {
    throw Error('Unknown UAT Access preflight schema or state');
  }
  if (config.state === 'unprovisioned') {
    if (config.projectName !== null || config.primaryOrigin !== null ||
        config.accessLoginOrigin !== null ||
        !Array.isArray(config.previewOrigins) || config.previewOrigins.length !== 0 ||
        !Array.isArray(config.customOrigins) || config.customOrigins.length !== 0) {
      throw Error('Unprovisioned template must contain no presumed UAT host or policy');
    }
    if (live) throw Error('UAT is not provisioned; live Access verification is blocked');
    return { status: 'NOT_PROVISIONED', targets: [], loginOrigin: null };
  }
  if (!live) throw Error('Configured UAT must use explicit --live mode; never probe by accident');
  const project = config.projectName;
  if (typeof project !== 'string' || !/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/.test(project))
    throw Error('Invalid Cloudflare Pages project name');
  const primary = httpsOrigin(config.primaryOrigin, 'primary');
  if (primary !== 'https://' + project + '.pages.dev')
    throw Error('Primary origin must be the exact configured project.pages.dev');
  const login = httpsOrigin(config.accessLoginOrigin, 'Access login');
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(new URL(login).hostname))
    throw Error('Access login must be exact team.cloudflareaccess.com origin');
  if (!Array.isArray(config.previewOrigins) || config.previewOrigins.length < 2 ||
      config.previewOrigins.length > 12) {
    throw Error('Require real branch AND immutable deployment preview aliases');
  }
  if (!Array.isArray(config.customOrigins) || config.customOrigins.length > 6)
    throw Error('Custom origin list is missing or too large');
  const targets = [{ kind: 'primary', origin: primary }];
  const kinds = new Set();
  for (const item of config.previewOrigins) {
    if (!item || !['branch', 'immutable'].includes(item.kind)) throw Error('Unknown preview alias kind');
    const origin = httpsOrigin(item.origin, item.kind + ' preview');
    const u = new URL(origin);
    const suffix = '.' + project + '.pages.dev';
    if (!u.hostname.endsWith(suffix) ||
        u.hostname.slice(0, -suffix.length).includes('.') ||
        u.hostname.slice(0, -suffix.length).length < 3)
      throw Error('Preview alias must belong to the exact UAT Pages project');
    if (item.kind === 'immutable' && !/^[a-f0-9]{8,40}$/.test(u.hostname.slice(0, -suffix.length)))
      throw Error('Immutable preview must be a real hash-like deployment alias');
    kinds.add(item.kind);
    targets.push({ kind: item.kind, origin });
  }
  if (!kinds.has('branch') || !kinds.has('immutable')) {
    throw Error('Both branch alias and immutable deployment alias are required');
  }
  for (const value of config.customOrigins) {
    const origin = httpsOrigin(value, 'custom UAT hostname');
    const u = new URL(origin);
    if (u.hostname.endsWith('.pages.dev') || u.hostname.endsWith('.github.io') ||
        u.hostname === 'kevinim.github.io')
      throw Error('Custom UAT hostname must not reuse Pages aliases or public GitHub origin');
    targets.push({ kind: 'custom', origin });
  }
  const origins = targets.map(x => x.origin);
  if (new Set(origins).size !== origins.length)
    throw Error('Duplicate UAT/preview/custom origin in Access check');
  if (origins.includes(login))
    throw Error('Access login and protected UAT application must be different origins');
  return { status: 'CONFIGURED_FOR_ANONYMOUS_PROBE', targets, loginOrigin: login };
}

function classifyResponse(response, requestedUrl, loginOrigin) {
  const status = response?.status;
  if (typeof status !== 'number')
    return { ok: false, reason: 'invalid_http_response' };
  if ([301, 302, 303, 307, 308].includes(status)) {
    const location = response.headers?.get?.('location');
    if (!location) return { ok: false, reason: 'redirect_missing_location' };
    let target;
    try { target = new URL(location, requestedUrl); }
    catch { return { ok: false, reason: 'invalid_redirect' }; }
    const request = new URL(requestedUrl);
    const onAccessHost = target.origin === loginOrigin && target.pathname.startsWith('/cdn-cgi/access/');
    const onAppAccessRoute = target.origin === request.origin && target.pathname.startsWith('/cdn-cgi/access/');
    return (onAccessHost || onAppAccessRoute) && target.protocol === 'https:'
      ? { ok: true, reason: 'access_login_redirect' }
      : { ok: false, reason: 'untrusted_or_public_redirect' };
  }
  if (status >= 200 && status < 300)
    return { ok: false, reason: 'anonymous_content_exposed' };
  if (status === 401 || status === 403)
    return { ok: false, reason: 'denied_but_access_identity_unverified' };
  return { ok: false, reason: 'unexpected_http_status' };
}

async function probeAnonymous(config, { fetchFn = fetch, timeoutMs = 10000 } = {}) {
  const validated = validateConfig(config, { live: true });
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 20000)
    throw Error('Invalid probe timeout');
  const checks = validated.targets.flatMap(target =>
    REQUIRED_PATHS.map(urlPath => ({ kind: target.kind, url: target.origin + urlPath })));
  // Limit concurrent requests and never redirect/follow through to any login URL.
  let next = 0;
  const results = new Array(checks.length);
  async function worker() {
    while (next < checks.length) {
      const i = next++;
      const c = checks[i];
      try {
        const response = await fetchFn(c.url, {
          method: 'GET', redirect: 'manual', credentials: 'omit',
          cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
        });
        const checked = classifyResponse(response, c.url, validated.loginOrigin);
        results[i] = { kind: c.kind, ok: checked.ok, reason: checked.reason };
        await response.body?.cancel?.().catch(() => {});
      } catch {
        results[i] = { kind: c.kind, ok: false, reason: 'network_or_timeout' };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, checks.length) }, () => worker()));
  return {
    status: results.every(x => x.ok) ? 'ANONYMOUS_REDIRECTS_VERIFIED' : 'BLOCKED',
    checkedPaths: REQUIRED_PATHS.length,
    checkedOrigins: validated.targets.length,
    checkedRequests: results.length,
    failures: results.filter(x => !x.ok),
    limitation: 'Not a substitute for real Cloudflare Access policy review, authorized/denied email login, alias discovery, or signed-out browser testing.',
  };
}

async function main(argv = process.argv.slice(2)) {
  const mode = argv[0] || '--plan';
  if (!['--plan', '--live'].includes(mode) || argv.length > 2)
    throw Error('Usage: node scripts/check-uat-anonymous-access.cjs --plan|--live [config.json]');
  const filename = argv[1] || 'deploy/uat-access-targets.example.json';
  const config = JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
  if (mode === '--plan') {
    const result = validateConfig(config, { live: false });
    console.log('PASS planning schema. UAT status: ' + result.status + '. NO NETWORK. NO AUTH CONFIGURED. NO DEPLOYMENT.');
    return;
  }
  if (process.env.UAT_ACCESS_READONLY_ACK !== 'confirmed')
    throw Error('Live read-only probe requires explicit UAT_ACCESS_READONLY_ACK=confirmed');
  const result = await probeAnonymous(config);
  console.log('UAT Access anonymous probe: ' + JSON.stringify({
    status: result.status, checkedOrigins: result.checkedOrigins,
    checkedPaths: result.checkedPaths, checkedRequests: result.checkedRequests,
    failedCategories: [...new Set(result.failures.map(x => x.reason))],
  }));
  if (result.status !== 'ANONYMOUS_REDIRECTS_VERIFIED')
    process.exitCode = 1;
}
if (require.main === module) main().catch(e => {
  console.error('UAT Access preflight blocked: ' + e.message);
  process.exitCode = 1;
});
module.exports = { REQUIRED_PATHS, httpsOrigin, validateConfig, classifyResponse, probeAnonymous };
