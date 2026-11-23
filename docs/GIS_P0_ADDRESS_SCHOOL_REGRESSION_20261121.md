# GIS P0-04 — address-first E/M/H + special grade regression (2026-11-21)

Purpose: expand the already deployed map and school preview QA without creating a fictitious residence certification, without uploading addresses and without new workflows.

## Existing verified coverage
- 390px and 1366px synthetic school-map browser scenario: unapproved polygon and marker not shown, ambiguous address blocks assignment; Allen official road reference E/M/freshman/high campus marker and reset; Plano four-level E/M/High/Senior result comparison, warning and no release grant.
- `scripts/test-track-b-live-pages.cjs` covers deployment Allen school marker preservation and McKinney E/M/H school campus pins in the running Pages code. `scripts/test-responsive-school-ui.cjs` checks responsive layout 320–1280px. Existing dashboard security gates guard CSP, external hosts and secret leakage.

## New P0-04 regressions in this PR
- Plano: all four manual reported grades consistent still **user-transcribed, not independent verification**. Any single Senior High edit immediately invalidates the previous result and recompare reports one discrepancy. Changing the original GIS school name then remounting invalidates previously compared results (`sourceSignature` drift).
- Lewisville: four grade levels include **9th/intermediate**; official School Locator link is safe and visible; full synthetic house name matches are marked not independently verified. When user selects an **apartment**, all four stage matches are blocked and direct user to **Find an Apartment**, regardless of the names typed. Changing source to a near-boundary/imprecise address clears old comparison.
- Nothing is persisted to local/session storage; the residential assignment remains `conditional-finder-only`, `currentYearResidentialDistrictApprovals` stays **0**; 390px/1366px view must have no overflow.
- All school campus names, geometry and addresses used by the new scenarios are **synthetic**. No real family address is submitted to ArcGIS, a finder, or a telemetry server.

## Release boundary
- This fixes a confirmed browser UX regression: compact footnotes were hiding the Lewisville apartment/source-year warnings and individual grade evidence. All safety-critical notes now use `data-footnotes-keep` and remain visible. The expanded synthetic browser QA verifies real display, not only DOM text. This is not new school GIS. A successful PR CI does **not** prove 2026–27 boundary validity or that independently reported exact home address, unit and grade assignments have been obtained.
- `GIS-P0-04` can be checked off as the tested synthetic/production UI regression **only after** the targeted Chromium Actions job and all applicable privacy/CSP CI pass, merge to main and a production smoke check. Retain `GIS-P0-SEPARATE` as open.
