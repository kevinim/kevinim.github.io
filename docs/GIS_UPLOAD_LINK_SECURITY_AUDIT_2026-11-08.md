# GIS / school-source hostile-input security review — 2026-11-08

**Scope: audit and isolated browser tests only. NOT a penetration test or public-launch approval.**

Tracks https://github.com/kevinim/kevinim.github.io/issues/77. This work adds no changes to existing HTML, CSS, school-zone/source data, map render code, Pages, security PR #72, backend PR #79, environment PR #78, or existing XSS QA PR #81.

## Sources, trust boundaries and actual observed behavior

1. **Main map missing-boundary messages:** school names and source vintages from district data can reach a user-facing reason/footnote. The main renderer uses `heading.textContent` and `footnote.textContent`, not raw HTML. Source links are assigned through `sourceLink.href`; source URLs currently come from developer-authored district exceptions, not user-provided GeoJSON.
2. **Official school locator links:** the central district registry has 7 source links. The known special-campus explanations carry 7 additional source references. This audit enforces HTTPS, exact known host allowlists, no URL username/password, no nonstandard port, no control characters and no deceptive/lookalike host. It does **not** add runtime URL validation: a malicious future dynamic href path would need separate code hardening.
3. **Legacy reviewed.html manual GeoJSON upload:** the actual loader parses JSON and checks only `FeatureCollection` plus an array of features, then passes school-matched geometry to Leaflet. It does **not** currently enforce file bytes, number of features/rings, coordinate ranges, geometry types, or max nesting depth. A malformed or extremely large local file may degrade the page; an attacker cannot upload a file to another visitor solely through this static UI.
4. **Legacy Allen official GIS responses:** returned `YearUpdated` fields are escaped before writing to the notice HTML; polygons are passed to Leaflet's geometry renderer.
5. **Other external GIS:** Frisco, Plano, McKinney, Lewisville, FEMA, crime and geocoding use separate loaders. Those are not all browser-penetration-tested by this PR.

## Tests

- A new read-only structural security audit verifies 7 district URLs, 7 known exception URLs, main text-only missing-boundary messages and legacy escaped Allen date labels. Negative tests change a district URL to a malicious or deceptive form, or replace safe text handling with raw HTML, and assert detection.
- A new isolated Playwright test imports the **actual inline script from reviewed.html** and **actual Leaflet 1.9.4**, but only in a minimal in-memory browser page with all network calls aborted. It exercises:
  - Valid uploaded GeoJSON with markup-looking feature properties; polygon still displays and no executable markup is created.
  - Invalid upload JSON/array shape rejected through the actual upload function.
  - Mocked Allen GIS `YearUpdated` containing markup-looking text; shows literal text, no browser execution.
- Two viewport widths: 390px and 1280px. Tests use a local inert flag; no exfiltration destination and no real residential address.

## Explicit limitations

- A successful test covers only tested inputs and paths. It does **not** establish that every Leaflet tooltip/DOM insertion or every GIS service response is safe.
- No file size/feature count/geometry complexity constraints are in the current legacy uploader. This needs a **separate, deliberately tested runtime hardening PR**, or removal of reviewed.html from a curated public release. Do not block safe school-map functionality by guessing an arbitrary file size threshold.
- The existing alternate reviewed.html is publicly fetchable under the present static Pages scheme. PR #72's curated preview excludes nonapproved entry files; that is still a draft, not deployed.
- CSP, rate limiting, private-source separation, browser provider terms, redaction and incident response remain open blockers of any broad public launch.
- Current default branch `main` is protected with required `verify`. Do not require this audit job until it is merged and available on the target branch; retain draft and do not auto-deploy.

## File boundaries

This PR adds only:
- scripts/audit-gis-upload-links.cjs
- tests/audit-gis-upload-links.test.cjs
- scripts/test-gis-upload-browser.cjs
- .github/workflows/audit-gis-upload-links.yml
- docs/GIS_UPLOAD_LINK_SECURITY_AUDIT_2026-11-08.md

No existing app or deployment file changed. Release remains NO-GO pending separate owner review and remediation.
