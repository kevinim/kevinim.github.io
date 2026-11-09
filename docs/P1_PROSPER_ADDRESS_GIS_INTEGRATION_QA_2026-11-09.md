# P1 integration: PR #172 public homes into address → school → GIS QA

**Scope:** QA-only stacked follow-up to Draft PR #172 (base itself is #162). No merge or deployment; PR #148 mandatory release gate remains a separate, stricter requirement. Does not edit #148, #162, #165, #170, or district boundary source data.

## Evidence wiring
1. Rerun live Esri precise public-listing address validation, Prosper official district-linked Infofinder point code lookup, and the published 2026–27 GIS polygon containment (PR #172).
2. Run #162 existing home assignment map unit/census tests and synthetic Chromium at 390px and 1366px.
3. Run #172 actual dashboard Chromium, with four precise public-listed single-family addresses × mobile/desktop, school button click, 3 grade-zone features, visible polygon, source labels and address clear.
4. Cross-reconcile the two machine-readable artifacts with `scripts/audit-p1-prosper-address-gis-evidence.cjs`; upload privacy-minimized `artifacts/prosper-real-home/p1-integrated-address-gis-evidence.json`.
5. A technical pass is **PASS_TECHNICAL_QA_ONLY**. `releaseGate.status` is always **NO_GO**. Unit tests cover source code drift, stale vintage, missing grades/viewport, duplicate tests, invalid provenance, false approval, failing clear interaction and unverified postal mismatch. No fabricated review evidence.

## Release blockade retained
- #172 reports 4/5 corroborated publicly listed Prosper houses; one differing geocoder ZIP remains quarantined, never assigned.
- Source and GIS both involve the same Infofinder vendor family: matching codes are corroboration only, not independent Finder visual audit, residence-specific enrollment authorization, transfer eligibility, program exceptions or housing unit verification.
- #148 requires at least three genuinely independently reviewed samples in each of seven districts, two ZIP codes per district, matching elementary/middle/high results, actual rendered current-year school polygons and reviewer sign-off on the final production commit. None of those absent district-wide requirements is waived by this QA.
- Until the dependency chain is integrated and approved, results only apply to this **stacked QA head**; no main branch or published dashboard coverage/accuracy claim is implied.

## Review
Check that both P1 workflow jobs pass, inspect the JSON and mobile/desktop artifact screenshots, confirm release status stays NO_GO, then review upstream #172 and #162 separately. Do not use synthetic fixtures as evidence for a real release; do not apply automatic merge or bypass branch protection.
