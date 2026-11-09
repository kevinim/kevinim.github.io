# Resolve legacy Draft PR #88 and #104 against current strict-CSP main

Review date: 2026-11-09. This integration supersedes the stale conflicting bootstrap portions of #88 and #104. Their regional quick assessment feature was independently merged to main earlier; no duplication or rollback of that UI is performed.

## Architectural change

- Copy the latest production 73,000-byte inline classic application bootstrap **byte-for-byte** into same-origin `dashboard-main.js`. Its content is pinned to commit `7465a8ed09c58ae8899ae6333a60b11daf381ce6` by test and Git SHA-256 checks.
- Replace only the main inline script node with `<script src="./dashboard-main.js?v=3"></script>` at the same parser location. It stays a classic script: **no defer, async, module or loader behavior changes**.
- Remove only the now-unneeded main `<meta http-equiv="Content-Security-Policy">` SHA-256 hash token. Preserve `script-src 'self' https://unpkg.com`, `script-src-attr 'none'`, `object-src 'none'`, `base-uri 'self'` and `form-action 'self'`. CSP remains restrictive; no `unsafe-inline` and no new cross-origin scripts.
- Preserve all previously deployed West DFW, area quick assessment, schools, risk, transport, school boundaries, UI, school markers and data exactly.

## Private versus sanitized public preview

Never copy the raw `dashboard-main.js` to `dist/public-preview`. The public preview build uses a validated in-memory reconstruction of the old hash-locked inline bootstrap **only while running the existing fail-closed sanitizer**. It then extracts the independently sanitized JS into `dist/public-preview/dashboard-main.js` and strips the temporary SHA token, producing a separately verified external-only CSP.

Existing office preset, fixed commute cache, personal 60-minute isochrone, provider data, and office-centric external requests are removed. The sanitized output must contain no JPM/office references. Unrecognized source shape, unexpected CSP directives or extra executable inline script abort the build. New source code is not a permission to publish the preview.

**Public Production release remains blocked** by the existing five explicit attestations (family/private source isolation, vendor terms, GIS/data license, live browser signoff, owner signoff). This PR changes the existing GitHub Pages static app only after review; it does not provision Cloudflare family UAT, new accounts or a public Prod environment.

## Tests

`tests/externalized-main-bootstrap.test.cjs` proves source byte identity against the parent Git commit and that only the approved script tag/CSP token changed. `tests/strict-script-csp.test.cjs` checks zero executable inline scripts and strict headers. `tests/public-preview-build.test.cjs` and `scripts/verify-public-preview.cjs` check public sanitization, missing source data, no leakage, exact relative asset references and release remains BLOCKED. `scripts/verify-main-data.mjs` continues testing app source and exact school/GIS references from the extracted script. Browser smoke at 390px and 1280px checks one external bootstrap load, marker/ZIP interactions and public preview privacy.

All existing PR and `main` security/data CI must pass on exact HEAD before merge. Re-run with current main if other agents/PRs modify index/runtime. **Do not merge old #88 or #104 directly**.

## Decommission old drafts

After the successor PR passes checks and its GitHub Pages deployment is verified, close #88/#104 as superseded with links to successor; do not mark closed merely because the source code is copied. Validate post-deployment strict CSP and live school marker visibility.
