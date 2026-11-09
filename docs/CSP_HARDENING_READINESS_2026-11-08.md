> **Current-state update (after merged PR #89, 2026-11-08 ET):** Both live entry pages now use exact SHA-256 inline-script CSP hashes and `script-src-attr 'none'`; `'unsafe-inline'` was removed. Earlier CSP descriptions below are HISTORICAL snapshots and must not be treated as current. The CSP readiness tool and Chromium probe in this PR were updated to verify the strict hash-based behavior. `connect-src`, `img-src`, `default-src`, header-level `frame-ancestors` and full source-to-sink review remain open. PR #88's externalization is now incompatible with the current source-hash test and the pre-release preview builder; do not merge it unchanged.

# CSP hardening and HTML sink review — 2026-11-08

Status: **Source/isolated browser review only; no live CSP change, public deployment, or security certification.**  
Related: [visitor-security threat model #77](https://github.com/kevinim/kevinim.github.io/issues/77), [visitor-XSS QA #81](https://github.com/kevinim/kevinim.github.io/pull/81), [Claude's curated public-preview #72](https://github.com/kevinim/kevinim.github.io/pull/72).

## Current CSP verified in main

Both `index.html` and `reviewed.html` already declare the **same CSP meta tag**:

```
script-src 'self' https://unpkg.com 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'
```

**Effective positives:** restricts downloaded JavaScript to same origin and unpkg.com; excludes plugin/object execution; restricts `<base>` and form submissions. Leaflet is loaded from pinned `unpkg.com` URL with SRI, independent of CSP.

**Important remaining gaps:**

- `'unsafe-inline'` permits page-authored inline script, inline event handlers and an attacker's injected inline event handlers **if an HTML injection path exists**. This is a defense-in-depth gap, not proof a working injection exists.
- `connect-src` is absent: CSP does not limit the destinations to which permitted JavaScript can send `fetch`/XHR/WebSocket requests. The static app uses third-party ArcGIS, school Finder, geocoding, OSRM and hazard endpoints; specifying an accurate allowlist requires a provider inventory and browser coverage first.
- `default-src` and `img-src` are absent. An absent directive is **not** an implicit denial.
- `frame-ancestors` and true `Content-Security-Policy-Report-Only` **cannot be enforced using a meta tag**. They require HTTP response headers from a supported host (e.g. the planned Cloudflare Pages deployment).
- The main HTML contains one large inline bootstrap (~70 KB) plus ~23 event-handler attribute occurrences; the legacy `reviewed.html` contains one inline bootstrap (~23 KB) and ~13 event-handler attribute occurrences. Attribute counts are approximate because source HTML contains inline templates.
- Simply removing `'unsafe-inline'` from the **current** CSP would block its existing inline bootstrap/event handlers, potentially disabling maps, school controls, search and commute. Do not deploy this "one-line" change.

## Source-to-sink review (reviewed, not all proven safe)

| File and notable sites | Data origin / destination | Current interpretation and follow-up |
| --- | --- | --- |
| `index.html` (13 HTML insertion occurrences) | School names, ZIP data, official GIS vintage, route values, crime insights, Leaflet tooltips | Many names use `escape(...)` and GIS missing-boundary explanations use `textContent`; complex HTML assembly and composed `crimeZipHtml`/MENA components still merit contextual input-to-sink review |
| `reviewed.html` (10 HTML insertion occurrences) | Local GeoJSON file; legacy Allen GIS metadata; school lists; map overlays | Escaped `YearUpdated` label and school names tested in #82. Local file parser lacks size, geometry complexity and coordinate bounds (tracked in #83) |
| `home-lookup-v2.js` (2) | User-entered/resolved residential address; official school assignment and parcel service | Main residential address escaped; composed assignment/review panels and URL attributes should be tested with poisoned all-field payloads |
| `candidate-compare.js` (2) | Address comparison and composed assignment result | Address escaped in tested Chromium scenario (#81); downstream assignment HTML must be kept safe |
| `features/dashboard-extras.js` (3) | Toll, hospital and grid UI templates | Initial `innerHTML` templates are static markup; externally sourced CMS/EIA values use `textContent` via DOM element creation |

These counts are a **scope inventory, not 30 confirmed vulnerabilities**. The main also runs `scripts/test-untrusted-data-browser.cjs` under the Phase 2A browser workflow for broader mocked live GIS/parcel/geocoding input; browser test coverage remains scenario-based.

## Immediate QA added in this PR

- Offline baseline checks for both HTML CSP policies, including no permissive `script-src *`, `https:`, `data:`, `'unsafe-eval'`, missing `object-src 'none'` or `base-uri 'self'`, and CSP must precede scripts.
- Unit tests prove `'unsafe-inline'` and absent `connect-src` are explicitly reported (not mistaken for strong CSP).
- Chromium loads a small **in-memory document** with each page's actual CSP. A harmless page-local flag demonstrates that the currently allowed inline script/inline `onerror` attribute run; a script from an unapproved host is rejected. A second isolated policy without `unsafe-inline` blocks both inline probes. No real dashboard, external site, residential data, or remote exploit request is accessed by these CSP tests.
- Tests do **not** modify `index.html`, `reviewed.html`, JavaScript runtime files, Cloudflare settings or GitHub Pages.

## Safe implementation plan (separate runtime PRs)

1. **Externalize inline bootstraps and event handlers** into maintained JS modules with `addEventListener`. Preserve all school-marker, home-address, commute, hazard, UI and mobile behavior. Consider a build step that emits a strict-content static distribution, not patching the current family page directly.
2. **Move to a restrictive `script-src`** without `unsafe-inline` or `unsafe-eval`; prefer self-hosted audited Leaflet and verified asset hashes. Run full end-to-end Chromium checks, including malicious GIS/Esri data and existing map markers.
3. **Collect legitimate destinations** from browser network activity, then define `connect-src` and `img-src` tailored to the private UAT host; use explicit HTTPS hosts rather than unrestricted wildcards. Use failure-handling tests for vendor changes.
4. **Deploy response-header CSP in authenticated UAT** (after #78 environment provisioning) so `frame-ancestors`, security reporting and authenticated browser checks are practical. Use Report-Only where supported before enforcing incremental directives.
5. **Do not publish** while owner/deployment policy, data privacy, API entitlements and source separation gates remain unresolved.

Priority: browser XSS source-to-sink fixes and script hardening before broad public sharing, while preserving the existing family map until QA and explicit release approval.
