# Agent 07 — TX Dashboard integration preflight (2026-11-09)

**State: NO-GO / NOT A RELEASE CANDIDATE.** This document is maintained only on the dedicated `integration/agent07-release-preflight-20261109` branch. No direct main push, PR merge, Pages deployment, source-rights waiver, or release policy change is authorized.

## Verified snapshot

- Repository: `kevinim/kevinim.github.io`; main exact SHA: `0a0e81b4495e7e1e306bcc8dd714eb15008f167e`.
- Open PR count observed: **32**, largest PR number **#176**. Final newly created Agent 01–06 integration deliverables were not identifiable as separate PRs at the time of this check; check again before candidate assembly.
- #173 test-only composite exact SHA `e5bcae64b154abf4d2ff36bb2599780f5a82b38b`: **35 completed successful workflow runs**, 0 failure. **NEVER MERGE #173**. See [PR](https://github.com/kevinim/kevinim.github.io/pull/173).
- The exact #148 residential-school gate run **failed closed**, as required given absent independently reviewed seven-district residential evidence: [PR](https://github.com/kevinim/kevinim.github.io/pull/148). Its current code has single-backslash ZIP regex and immutable checkout/setup-node pins; earlier comments alleging those defects have been superseded by current source. Its workflow PR path filter and required-check/ruleset enforcement still require integration review.
- #162 standalone CI has multiple failures from bootstrap/source/version assumptions, although the downstream QA-only #168 and #173 composite CI passed. Do not certify a standalone #162 merge without re-running an exact updated candidate.
- #174 Denton real Chromium (390/1366px) marker/PDF QA succeeded after disabling Leaflet zoom animation; [run 42663892107](https://github.com/kevinim/kevinim.github.io/actions/runs/42663892107). #176 eight-campus/source-disposition gate succeeded [run 42667748224](https://github.com/kevinim/kevinim.github.io/actions/runs/42667748224).
- #175 Prosper source-to-browser bridge succeeded [run 42667461712](https://github.com/kevinim/kevinim.github.io/actions/runs/42667461712) for four publicly listed property cases; one remains inconclusive, independent enrollment certification not demonstrated.
- #142 historical workflow-hardening CI passes/some nonapplicable skips; this is not proof newly introduced workflows in all stacked branches are SHA-pinned.

## Data distinctions — do not mix denominators

From the #173 source matrix `data/dfw-school-coverage-matrix-2026.json`:
- TEA school rows **2,182**, LEAs **152**, named public ISDs **108**, other LEAs **44**.
- Official *parent entry routes registered*: **107/108** public ISDs, **1,938/1,941** associated campus records; Chico ISD 249904 remains unverified. These are official entry links, not necessarily live address finders.
- School-level GIS source configured in application: **7/108** public ISDs, including Dallas provisional publisher GIS; this is not 2026–27 enrollment certification. 101 ISDs do not have an app-configured campus GIS feed.
- Dallas: **187** officially hosted published polygons but no certified 2026–27 zoning or source reuse approval; address Finder holdout remains needed.
- Denton: **39** official school PDFs, **31** previously source-corroborated historical campus points, **8** uncured current-coordinate exceptions; **zero verified machine-readable 2026–27 campus attendance GIS polygons**. PDF, school point and ISD outer boundary are not attendance polygons.
- Exact residence-to-elementary/middle/high assigned campus certification rate: **unknown / not established**. Never claim 0% or 100% GIS assignment coverage.
- A textual inconsistency on #160 `docs/DFW_WIDE_SCHOOL_COVERAGE_MATRIX.md` lists **43** unregistered public ISDs while canonical JSON and arithmetic show **1**. Correct on source feature branch; documented in #160 issue comment.

## Shared-file collision gates

1. `district-registry.js`, `data/dfw-school-coverage-matrix-2026.json`: #160 parent routes vs #164 Dallas GIS and #171 live school-finder additions. Retain 107/108 route metadata **and** Dallas provisional metadata, and regenerate matrix deterministically.
2. `school-zone-ui.js`: #163 CFB provenance guard vs #164 Dallas source labels and #149 candidate zone labels. Preserve fail-closed source/year classifications.
3. `dashboard-main.js`, `index.html`: #162/#164 address-Dallas, #169/#174 Denton, #140 third-party address disclosure. Re-check CSP canonical bootstrap and cache/version hashes. Do not overwrite Denton marker fix or Dallas source visibility logic.
4. `.github/workflows/*.yml`: #142 36-workflow immutable action/least-privilege changes vs every new workflow from later PRs. Require immutable SHA, least-privilege token, no unwanted deployment step and full CI across exact final candidate.
5. QA-only composites #161/#166/#168/#173 and evidence branches #165/#170/#171/#172/#175 are **not** merge candidates by default. Extract justified regression tests/guards deliberately, not whole QA snapshots.

## Proposed integration order (not permission to merge)

A. Stabilize security-only deltas (#138, #140, #142) and their branch-to-feature collisions with fresh main; retain necessary production smoke checks (#134).

B. Parent-route source data in actual dependent order **#141 -> #144 -> #147 -> #150 -> #157 -> #159 -> #158 -> #160**; correct source-doc mismatch first. Inspect if each stacked PR base is its upstream branch before choosing a manual chain; do not merge QA aggregation #161/#173.

C. Strict data/derived-geometry and residential gate from **#148/#149/#154/#155/#163**. No CFB estimated zone publication without permission, independent holdouts and approved policy. Extract necessary security/validator changes without merging QA-only composites automatically.

D. Address/GIS code from **#162 -> #164**, then evaluate isolated #167 bootstrap QA improvements and Denton **#169 -> #174 -> #176** source/marker deltas. Preserve provisional Dallas status and Denton non-GIS status. Keep #165/#170/#171/#172/#175 as evidence unless independently reviewed feature fixes need extraction.

E. Await new Agent 01–06 results, integrate only conflict-reviewed nonduplicated deltas on this separate branch. Every merge or candidate assembly must be tested on the exact resulting SHA. Create a **new feature release candidate PR** only when isolated and complete; never repurpose #173 for production.

## Release gate checklist

- [ ] Agent 01 GIS acquisition final diff, provenance and 3-level polygon/year/license QA
- [ ] Agent 02 Denton eight points validated or quarantined; current GIS not fabricated
- [ ] Agent 03 official Finder independent residential multi-school case evidence for seven target ISDs, with 2026–27 year and grade exceptions
- [ ] Agent 04 108-ISD census, 2,182 TEA rows, source route and precise polygon linkage metrics rechecked after final merge
- [ ] Agent 05 Allen marker, map reset, address clear, zoom, desktop/mobile and dark mode real Chromium screenshots and DOM assertions
- [ ] Agent 06 secrets/privacy/XSS/CSP/third-party network/Actions pins/dependency supply-chain/Pages and API outage review
- [ ] All baseline and new CI workflows passed on **one exact** fully integrated release-candidate commit
- [ ] Actual desktop 1366px + mobile 390px residential search→official school source→marker click→verified current-year polygon E2E, and policy-approved independent holdouts
- [ ] Mandatory #148 release gate passes (without spoofed evidence); required GitHub check/ruleset prevents accidental deployment
- [ ] Regression coverage includes Allen, Frisco, Prosper, Dallas, Denton, CFB and Plano/Lewisville/McKinney feeder/9th-grade distinctions
- [ ] Independent security reviewer and owner final GO approval

**Current outcome: Production NO-GO.** GitHub Actions passes and registered official parent guidance links alone cannot override independently unverified residential school assignments.