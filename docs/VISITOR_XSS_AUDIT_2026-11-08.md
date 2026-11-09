> **Post-PR #89 update:** The original audit was prepared before the stricter hash-based CSP landed. Both current pages now remove `'unsafe-inline'` and set `script-src-attr 'none'`. Browser CSP tests in this branch have been revised to prevent regression; the older 'no CSP/unsafe-inline' observations below no longer describe live code.

# Visitor-side XSS negative-input audit — 2026-11-08

**Status: DRAFT, non-deploying test work. NOT a penetration test or broad-public-release approval.**

This review tracks issue https://github.com/kevinim/kevinim.github.io/issues/77 and stays independent of Claude security/public-preview PR #72, environment separation PR #78, school provenance PR #73, and provider QA PR #76.

## Exposure and priority

The family site is a GitHub Pages static web app with no first-party login service, credential collection or user account database. However, modifying the publicly delivered JavaScript or exploiting an untrusted text-to-HTML path could harm viewers. The GitHub owner's account and required main-branch verification are separate defenses; neither replaces DOM input handling.

**Read-only source inventory (not confirmed exploit count):**

- 11 monitored app files, including the main page, old reviewed.html page, address lookup/suggestions, candidate comparison, healthcare and winter hazard modules.
- 30 existing HTML insertion occurrences in 5 monitored files (index.html 13; reviewed.html 10; home-lookup-v2.js 2; candidate-compare.js 2; features/dashboard-extras.js 3). Raw count includes fixed template construction and is NOT 30 vulnerabilities.
- Leaflet external script uses HTTPS, pinned version and Subresource Integrity on the two published HTML entry points.
- Existing escaping uses HTML entity replacement or safe textContent in selected paths. Not all untrusted sources to sinks have been traced.
- Explicit HTML CSP was not observed in source; actual deployed response headers were not inspected in this audit. Strict CSP may break inline scripts/handlers and must be staged separately.

## Test coverage added (no live vendor traffic)

1. Offline source inventory and unit tests reject unreviewed growth in HTML sinks, introduced eval/new Function/document.write, literal javascript: links, missing external-script SRI, and HTTP script downgrade.
2. A real Chromium test with the existing main-page escape helper exercises the browser's actual candidate-compare.js output when an address contains an inert HTML-like string.
3. Chromium exercises the actual texas-address-suggest.js renderer with a fake Esri result containing an inert HTML-like address. The test waits through the real debounce and verifies no created HTML element.
4. Chromium exercises the actual features/healthcare/map-layer.js popup using mock records shaped like CMS data and an injected fake DSHS status. It simulates Leaflet parsing and verifies no executable image/SVG element and a Google Maps outbound link.
5. Tests run at 390px and 1280px. Test values set an inert same-page flag, never contain an exfiltration endpoint, and never send residential data to public services.

## Important limitations / remaining P0

- These are 3 exercised paths, not exhaustive end-to-end DOM XSS coverage. Need trace every user input, GIS field, URL, uploaded GeoJSON, ratings field and all DOM/Leaflet insertion sites.
- The legacy reviewed.html still offers GeoJSON file upload. Add a separate isolated-browser negative test with invalid/malicious properties. Do not trust file names or features.
- The existing 30 HTML sinks still require line-by-line context-specific review, even if this inventory stays constant. Prefer textContent or DOM node creation for untrusted text and strict HTTPS host/protocol allowlists for URLs.
- Evaluate a CSP strategy on a private UAT first; GitHub Pages and current inline scripts/events limit an immediate strict policy. CSP is defense-in-depth, not a replacement for escaping.
- Real deployed page, third-party GIS response integrity, dependency tampering, service outage handling, Github Actions token privilege, browser extension malware and phishing are outside this limited suite.
- Authenticated family UAT, private source separation, admin-controlled deployment approvals and incident response remain separate gates. PR #72 and #78 are draft, unmerged.
- Do not promote the current public repository site or treat a green audit as a security guarantee.

## Files changed

New only:
- scripts/audit-visitor-xss-sinks.cjs
- tests/audit-visitor-xss.test.cjs
- scripts/test-visitor-xss-browser.cjs
- .github/workflows/audit-visitor-xss.yml
- this report

**No edits to index.html, reviewed.html, school assignment, map layers, any existing runtime JS, GitHub settings, Pages configuration or deployments.**

## Next release decision

After all new QA checks pass, review the reports and file-list for overlap with Claude's PR #72. If a source-to-sink exploit is actually demonstrated, isolate a minimal runtime fix in a separate PR and run existing school marker, map and address regression suites before any merge. Owner approval remains required.
