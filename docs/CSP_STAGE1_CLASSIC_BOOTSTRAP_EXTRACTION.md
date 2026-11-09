# P0 CSP hardening — Stage 1: byte-identical main bootstrap extraction

**Draft-only runtime refactor** created 2026-11-08 ET. Source: `main` commit `484f53853731fd2610ec90f456783c8725a39008`. No merge, Pages cutover, public/private-source change, or CSP strict mode toggled.

## Goal

The main HTML contained one inline classic script with **69,705 characters**. To ultimately remove CSP `'unsafe-inline'`, the first safe change extracts this exact code into a same-origin **classic** JS file and keeps all dependencies and execution order.

Before:

```html
<script>
'use strict';
// ... existing complete 69,705-character main application bootstrap ...
</script><script src="./features/commute/workplace-marker.js?v=1"></script>
```

After:

```html
<script src="./dashboard-main.js?v=1"></script><script src="./features/commute/workplace-marker.js?v=1"></script>
```

- File `dashboard-main.js` is byte-identical to the previous inline script body; Git blob hash is `4cd7fe2eee376ed48e2298cbec63cb84f853677a`. Do not edit code logic in this PR.
- Previous external dependency scripts (district registry, school life cycle, GIS, geocoding) remain **before** the main bootstrap. Home/candidate/hospital/commute scripts remain **after**. Neither `async`, `defer`, nor `type=module` is used, preserving classic-script global lexical bindings and parser-blocking order.
- The main HTML no longer has an executable inline `<script>` body; **existing inline event-handler attributes and the original CSP remain unchanged**.
- `index.html` now contains less inlined application code, but pages still fetch `dashboard-main.js` as a separate static asset from the same origin. Cache-busting version is `?v=1`.

## Why no strict CSP now

The existing meta CSP is:
```text
script-src 'self' https://unpkg.com 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'
```

Removing `'unsafe-inline'` **now** would break existing `onclick`, `onchange`, `oninput` and other HTML inline handlers. The legacy `reviewed.html` still has a separate ~23 KB inline script and is not modified by this PR. Strict CSP rollout is tracked by Issue #87 and depends on extracting/migrating all relevant handlers, full browser QA and a private authenticated UAT.

## Validation

- `node --check dashboard-main.js`
- Exact Git blob hash + execution order + no inline main script + unchanged CSP/inlined handler contract, tested by `node --test tests/externalized-main-bootstrap.test.cjs`.
- Chromium test loads the exact PR site from a local web server at **390px and 1280px**; intercepts pinned Leaflet from local npm, blocks external vendor network, verifies the new file is fetched exactly once, map initializes, ZIP selector updates, school list/click works and no bootstrap load-order errors.
- Existing main dashboard `verify`, school-source crosschecks, Phase 2A browser QA (including test-untrusted-data-browser.cjs), mobile UI and selected relevant CI must pass before even considering a merge.
- Test output must be reviewed; source-only passing tests cannot guarantee public CSP or privacy.

## Further stages

2. Migrate inline HTML handler attributes and dynamically generated inline handlers to `addEventListener`, with user-visible behavior/keyboard accessibility preserved. This includes old `reviewed.html` only if it remains an intended public entrypoint.
3. Apply strict `script-src` without unsafe-inline in **authenticated UAT**, not in the existing family Pages, after e2e map/school/address/healthcare/commute tests. Separately plan `connect-src` and `img-src` with measured provider traffic.
4. Verify complete curated public artifact with Claude #72, UAT/production split #78, edge API #79 and an owner-approved cutover.

## Scope isolation

This PR changes `index.html` and adds:
- `dashboard-main.js`;
- `tests/externalized-main-bootstrap.test.cjs`;
- `scripts/test-externalized-main-browser.cjs`;
- `.github/workflows/verify-main-bootstrap-extraction.yml`;
- this documentation.

Three existing **test-only** scripts were updated to follow the unchanged application code in its new location while preserving the prior functional assertions: `scripts/verify-main-data.mjs`, `scripts/test-integrated-features.cjs`, and `scripts/test-healthcare-winter-map.cjs`.

**Critical release integration dependency:** Claude's draft #72 `scripts/build-public-preview.cjs` sanitizes the **inline `index.html` source** and currently expects to find the office/commute constants there. After Stage 1 extraction, the personalized constants remain in the publicly downloadable `dashboard-main.js` instead. **The curated public preview/release must be updated to sanitize or replace this separate JS asset and then run a strict output scan; never ship the copied JS file unsanitized.** The current #72 builder should fail closed rather than silently treat missing inline tokens as clean; confirm by cross-branch integration test before any public release. Extracting JavaScript to a separate public file is **not** a confidentiality measure.

No `reviewed.html`, school registry/source JSON, map algorithms, other runtime JavaScript, Pages configuration or GitHub security settings changed. **Do not merge or deploy without full QA and owner review**.
