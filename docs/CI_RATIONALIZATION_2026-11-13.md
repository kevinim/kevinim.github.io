# Texas Dashboard CI rationalization — 2026-11-13 (round 2)

## Evidence and decision

The 100-workflow inventory was inspected for PR/push/schedule/manual triggers, command duplication and Chromium test scripts. The main program is a single-page dashboard, so `index.html` changes can still legitimately exercise many school/GIS/privacy regression suites; those are **not** removed by this change.

- The prior DFW parent-source next12, batch3, batch4, batch5 and batch6 checks repeatedly tested the same registry/matrix/GIS/inference contracts. Batch 5, 6 and 7 independently installed Chromium to execute **the same** `scripts/test-dfw-school-coverage-browser.cjs` (three identical browser runs per common registry/matrix edit). All old tests, evidence cardinality, fail-closed GIS, source and privacy cases are now unified in the original batch-7 owner, with exactly one browser job.
- TEA display-quality and regional-school-profile workflows each ran the same `scripts/test-carrollton-tea-insights-browser.cjs`, and display-quality separately re-executed its identical Node source tests in a diagnose-source and diagnosis-verdict pair. The regional school-profile owner now includes the TEA display-quality test and official progress check, with one browser job; original debug workflow remains manually runnable.
- Five DFW batch workflows and one TEA workflow are available via `workflow_dispatch` only. Their original job implementations and security checks remain available for reproducible evidence. No dashboard files, dataset, GitHub Pages deployment mechanism, token scopes, or required job names were altered.
- Existing mandatory `verify`, privacy/security Gitleaks, school-data preflight, automatic source-specific QA and production Pages smoke remain unchanged. No claim of a quantified global 100-workflow minute saving until comparable future PR runs are measured.

## Regression coverage

`tests/ci-rationalization.test.cjs` runs inside the always-required `verify` job. It rejects accidental reactivation of legacy batch PR triggers, checks all source tests and browser ownership, and protects main privacy, school data and mandatory CI triggers. A legacy test or batch-evidence edit triggers its unified owner.

## Full workflow inventory and disposition

**KEEP**: its existing automated trigger/purpose remains. **MERGE → ON-DEMAND**: all original commands preserved for manual replay, superseded automated validation consolidated in another checked workflow. **ON-DEMAND/HISTORIC**: existing manual or historical-branch operations with no general main-PR trigger. No workflow is permanently deleted in this round; branch-protection required-check settings cannot be read via this integration.

| Workflow | Decision |
|---|---|
| `ag05-cfb-zone-reference-qa.yml` | KEEP (scoped / core / schedule) |
| `agent06-runtime-privacy-release-qa.yml` | KEEP (scoped / core / schedule) |
| `audit-actions-write-scopes.yml` | KEEP (scoped / core / schedule) |
| `audit-external-api-contract.yml` | KEEP (scoped / core / schedule) |
| `audit-gis-upload-links.yml` | KEEP (scoped / core / schedule) |
| `audit-live-public-headers.yml` | KEEP (scoped / core / schedule) |
| `audit-school-provenance.yml` | KEEP (scoped / core / schedule) |
| `audit-visitor-xss.yml` | KEEP (scoped / core / schedule) |
| `build-phase2a-fema-hazards.yml` | KEEP (scoped / core / schedule) |
| `cfb-ag02-georeference-qa.yml` | KEEP (scoped / core / schedule) |
| `cfb-ag03-boundary-reconstruction-qa.yml` | KEEP (scoped / core / schedule) |
| `cfb-ag06-integration-review.yml` | KEEP (scoped / core / schedule) |
| `cfb-finder-local-cell-qa.yml` | KEEP (scoped / core / schedule) |
| `cfb-independent-finder-qa.yml` | KEEP (scoped / core / schedule) |
| `cfb-inline-official-finder-pilot-qa.yml` | KEEP (scoped / core / schedule) |
| `cfb-live-pages-smoke.yml` | KEEP (scoped / core / schedule) |
| `cfb-official-gis-acquisition-ag01.yml` | KEEP (scoped / core / schedule) |
| `cfb-official-reference-track-b.yml` | KEEP (scoped / core / schedule) |
| `cfb-raster-reconstruction-phase1-qa.yml` | KEEP (scoped / core / schedule) |
| `compact-home-finder-qa.yml` | KEEP (scoped / core / schedule) |
| `conditional-school-release-qa.yml` | KEEP (scoped / core / schedule) |
| `denton-eight-point-gis-audit-qa.yml` | KEEP (scoped / core / schedule) |
| `denton-marker-reference-track-b.yml` | KEEP (scoped / core / schedule) |
| `denton-official-finder-public-model-probe-qa.yml` | ON-DEMAND/HISTORIC |
| `denton-pdf-vector-poc.yml` | KEEP (scoped / core / schedule) |
| `denton-residential-finder-qa.yml` | ON-DEMAND/HISTORIC |
| `dfw-comprehensive-source-audit.yml` | KEEP (scoped / core / schedule) |
| `dfw-incremental-school-approval-qa.yml` | KEEP (scoped / core / schedule) |
| `dfw-neighbor-school-finders-qa.yml` | KEEP (scoped / core / schedule) |
| `dfw-noncfb-grade-year-source-qa.yml` | KEEP (scoped / core / schedule) |
| `dfw-official-source-link-repair-qa.yml` | KEEP (scoped / core / schedule) |
| `dfw-parent-source-batch5-qa.yml` | MERGE → ON-DEMAND |
| `dfw-parent-source-batch6-qa.yml` | MERGE → ON-DEMAND |
| `dfw-parent-source-batch7-qa.yml` | KEEP (scoped / core / schedule) |
| `dfw-wide-school-coverage-qa.yml` | KEEP (scoped / core / schedule) |
| `final-independent-regression.yml` | KEEP (scoped / core / schedule) |
| `finder-derived-engine-qa.yml` | KEEP (scoped / core / schedule) |
| `home-address-assigned-school-map-qa.yml` | KEEP (scoped / core / schedule) |
| `integration-west-dfw-qa.yml` | KEEP (scoped / core / schedule) |
| `live-official-school-sources.yml` | KEEP (scoped / core / schedule) |
| `live-pages-postdeploy-qa.yml` | KEEP (scoped / core / schedule) |
| `live-public-privacy.yml` | KEEP (scoped / core / schedule) |
| `noaa-storm-snapshot.yml` | KEEP (scoped / core / schedule) |
| `phase2a-browser-qa.yml` | KEEP (scoped / core / schedule) |
| `private-source-migration-preflight.yml` | KEEP (scoped / core / schedule) |
| `probe-cfb-public-finder.yml` | ON-DEMAND/HISTORIC |
| `production-browser-smoke.yml` | KEEP (scoped / core / schedule) |
| `provider-resilience-contract.yml` | KEEP (scoped / core / schedule) |
| `public-release-security.yml` | KEEP (scoped / core / schedule) |
| `qa-cfb-lisd-tea-2026.yml` | KEEP (scoped / core / schedule) |
| `qa-tea-allen-mckinney-subject-notes.yml` | KEEP (scoped / core / schedule) |
| `qa-tea-campus-locality.yml` | KEEP (scoped / core / schedule) |
| `qa-tea-independent-source-parity.yml` | KEEP (scoped / core / schedule) |
| `qa-tea-legacy-district-pr-dedupe.yml` | KEEP (scoped / core / schedule) |
| `qa-tea-peims-public-share-integrated-uat.yml` | KEEP (scoped / core / schedule) |
| `residential-school-release-gate.yml` | KEEP (scoped / core / schedule) |
| `school-data-preflight.yml` | KEEP (scoped / core / schedule) |
| `school-polygon-linkage-census.yml` | KEEP (scoped / core / schedule) |
| `security-integration-no-auth-qa.yml` | KEEP (scoped / core / schedule) |
| `tea-allen-mckinney-campus-qa.yml` | KEEP (scoped / core / schedule) |
| `tea-dfw-final-data-quality-qa.yml` | KEEP (scoped / core / schedule) |
| `track-b-dallas-reference.yml` | KEEP (scoped / core / schedule) |
| `track-b-denton-official-pdf.yml` | KEEP (scoped / core / schedule) |
| `track-b-live-production-smoke.yml` | KEEP (scoped / core / schedule) |
| `track-b-reference-irving.yml` | KEEP (scoped / core / schedule) |
| `tx-browser-performance.yml` | KEEP (scoped / core / schedule) |
| `tx-open-pr-compatibility-preflight.yml` | KEEP (scoped / core / schedule) |
| `uat-access-preflight.yml` | KEEP (scoped / core / schedule) |
| `uat-cutover-rollback-dry-run.yml` | KEEP (scoped / core / schedule) |
| `verify-area-assessment.yml` | KEEP (scoped / core / schedule) |
| `verify-area-label-hierarchy.yml` | KEEP (scoped / core / schedule) |
| `verify-compact-footnotes.yml` | KEEP (scoped / core / schedule) |
| `verify-crime-staging.yml` | KEEP (scoped / core / schedule) |
| `verify-csp-network-allowlist.yml` | KEEP (scoped / core / schedule) |
| `verify-dfw-next12-parent-guidance.yml` | MERGE → ON-DEMAND |
| `verify-dfw-next8-parent-guidance.yml` | MERGE → ON-DEMAND |
| `verify-dfw-parent-guidance-batch4.yml` | MERGE → ON-DEMAND |
| `verify-main-bootstrap-extraction.yml` | KEEP (scoped / core / schedule) |
| `verify-main-dashboard.yml` | KEEP (scoped / core / schedule) |
| `verify-mobile-school-ui.yml` | KEEP (scoped / core / schedule) |
| `verify-p1-data-integrity.yml` | KEEP (scoped / core / schedule) |
| `verify-p40-commute-cost.yml` | KEEP (scoped / core / schedule) |
| `verify-p41-healthcare.yml` | KEEP (scoped / core / schedule) |
| `verify-p42-resilience.yml` | KEEP (scoped / core / schedule) |
| `verify-redfin-uat.yml` | KEEP (scoped / core / schedule) |
| `verify-relocation-extras.yml` | KEEP (scoped / core / schedule) |
| `verify-rent-map-uat.yml` | KEEP (scoped / core / schedule) |
| `verify-reviewed-geojson-upload.yml` | KEEP (scoped / core / schedule) |
| `verify-school-zone-ui.yml` | KEEP (scoped / core / schedule) |
| `verify-sourced-commute.yml` | KEEP (scoped / core / schedule) |
| `verify-strict-script-csp.yml` | KEEP (scoped / core / schedule) |
| `verify-tea-2026-extracts.yml` | KEEP (scoped / core / schedule) |
| `verify-tea-2026-missingness-qa.yml` | KEEP (scoped / core / schedule) |
| `verify-tea-academic-uat-layer.yml` | KEEP (scoped / core / schedule) |
| `verify-tea-display-quality-guard.yml` | MERGE → ON-DEMAND |
| `verify-tea-integration-progress-release.yml` | KEEP (scoped / core / schedule) |
| `verify-tea-peims-2025-26-enrollment-total-audit.yml` | KEEP (scoped / core / schedule) |
| `verify-tea-school-profiles.yml` | KEEP (scoped / core / schedule) |
| `verify-trusted-outbound-links.yml` | KEEP (scoped / core / schedule) |
| `verify-ui-action-buttons.yml` | KEEP (scoped / core / schedule) |

## Post-release measurement

Track the next DFW registry/matrix PR and TEA school-insights PR. Compare branch/PR Actions count, runner minutes, browser installs, concurrent queued runs and required-check status. These two path-specific changes should each run one owner browser instead of the previous three (DFW) and two (TEA); actual total reductions depend on other independent relevant checks.
