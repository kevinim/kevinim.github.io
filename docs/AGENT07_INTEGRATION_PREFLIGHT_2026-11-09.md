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

---
## Agent07 second live audit — 2026-11-09 20:42+ UTC — ACTIONABLE STATUS

**Current main still** `0a0e81b4495e7e1e306bcc8dd714eb15008f167e`. **44 open PRs**, including 12 new #177–#188. No independent main merges. Prior blanket "NO-GO" must be separated into **engineering technical verification**, **school-enrollment certification**, and **exact release scope** rather than applying one all-or-nothing flag to every UI/data feature.

| Owner | New PR / exact evidence | Technical disposition | Integration next action (Agent07 accountable) |
| --- | --- | --- | --- |
| Agent01 GIS | #177 SHA `0abf1aef`: official Irving Locator reference-only 18 E / 7 M / 3 H historically titled zones, 5 public-place source probes, 390/1366 browser GIS map successful; 23/24 associated workflows PASS; one historical Gitleaks FAIL on isolated branch | **GIS opt-in technical PASS, school-year certification HOLD** | Merge/retarget security #181 fingerprint treatment in isolated full candidate; preserve precise Irving source host/CSP and labels, test with #185 conditional policy; do not silently count historical polygons as 2026–27 |
| Agent02 Denton | #187 GeoPDF 39/39 candidate native vectors; published aggregate PDF embedded GEO control; 9/9 Census street vs official Finder sample containment, run 42692221512 SUCCESS. #176 eight held point locations separate | **PDF→GIS extraction technical PASS, candidate geometry STAGING** | Retain source PDFs/source extraction scripts and download short-lived GIS artifact for independent boundary-edge sampling; do not public-rehost until source reuse/rights settled. Neither 8 held campus points nor derivative rights are proof of school assignment |
| Agent03 assignment QA | #178 exact head `b601f1cc` workflow run 42683012252 reports 2/2 jobs PASS, 18/18 dashboard UI, McKinney 2/2 address-name corroborations, Lewisville 2/2 matches with vintage caveats, Plano 0/2 independently resolved. Tool's commit-SHA workflow listing returned zero despite explicit run link; verify run evidence by id | **UI/partial Finder QA PASS, no whole-ISD certification** | Count McKinney and Lewisville limited sample corroborations; implement direct Plano 2026–27 Results panel school-name extraction; preserve explicit 9th-grade feeder and dated polygons; no blanket unit requirement |
| Agent04 data | #180 exact run 42681012676: 37/37 audit PASS, 108 ISDs/1,941 public campuses; #183 exact run 42679922702 32/32 PASS for Midlothian and Cedar Hill official URL corrections | **Data audit & URL fixes PASS**, branch-specific security scan red before integration | Apply #183 source URL updates and #160 documentation typo 43→1 in source data chain; carry independent joins/negative tests into final integrated SHA |
| Agent05 UI | #179 exact run 42674859523: Allen marker and ZIP fit, dark controls, 390/1366 and seven widths, two jobs SUCCESS; campus click and clear work | **UI regression technical PASS** | Resolve duplicate `zoomAnimation:false` and `index.html` with #174/#185/#177; run same tests after final integration |
| Agent06 security | #181 10/10 workflows PASS; #182 integrated 37 SUCCESS / 1 SKIPPED, includes protected `verify` SUCCESS, full-history Gitleaks success after narrowly scoped false-positive fingerprint review | **Security engineering fixes PASS**, not on main | Bring #138/#140/#142/#181 deltas into same release candidate, preserve exact Gitleaks fingerprint and required protected verify, rerun tests. Do not interpret #177/#180 isolated historical Gitleaks failures as unsolved *new* leaks without examining evidence |
| Agent06 conditional scope | #185 info-only policy backed by #182 security; #186 QA-only equivalent tree; exact SHA `4d79d104`: 41 SUCCESS / 1 SKIPPED workflow runs; no private residence assignment claims. It deliberately blocks all residential auto-school candidates until certified | **Information-only feature build technisch PASS**, NOT production approved | Treat as possible **limited-scope candidate**, not whole automatic school-assignment GO. Assess user-visible regression from disabling current automatic candidate highlights; compare with baseline before seeking owner approval |
| Agent03 Prosper cross-check | #188 exact run 42691192600 SUCCESS, 13 policy tests, two ZIP source corroborations; official browser request returned 3 school entries but rendered UI names not captured | **Correlated sources PASS, independent visual Finder reviewer HOLD** | Fix visible UI official school result mapping in read-only QA, reuse source IDs; no false Level 2 certification |
| Agent04 phased policy | #184 21/21 positive/negative tests PASS; 8 districts currently Level4 (unverified), 0 district Level1–3 | **Policy implementation PASS** | Link phased source types into controlled release labels without making "Level4 everywhere" a blanket block of unrelated dashboard functions |

### Separate gates / recommended decision

1. **TECHNICAL GO (specific branches only):** #179 map mechanics, #180/#183 data audit and source URL correction, #181/#182 security fix, #187 Denton PDF geospatial extraction (STAGING), #177 Irving opt-in reference GIS (with historical year warning), #185 security+information-only scope CI.
2. **CONDITIONAL CANDIDATE FOR OWNER REVIEW, NOT A DEPLOYMENT:** safety-reviewed information-only school dashboard from #182→#185 after isolated integration regression and baseline UX delta review. All residence-specific school claims must remain unapproved. Do not auto-release or call it current Production GO.
3. **SCHOOL ASSIGNMENT FEATURE HOLD:** #148 7-district strict residential→Finder→current year campus polygon gate remains unsatisfied. The condition **must not be generalized to all unrelated informational dashboard functionality**; use scoped sign-offs.
4. **External unresolved (cannot fix by green CI):** Denton derivative republishing rights; official effective-year / enrollment exception certs for older-labeled GIS; independently reviewed exact case holdouts in all required districts; approval for any public release.
5. **Next Integration Lead action:** create the exact final composite tree from source deltas (never test-only #173/#186), reconcile shared `index.html`, `home-lookup-v2.js`, `dashboard-main.js`, `district-registry.js`, CSP, Gitleaks and workflows. Test actual full SHA 390/1366 browsers and full security CI; report explicit "Technical GO / Conditional Scope GO / Auto Assignment NO-GO".
