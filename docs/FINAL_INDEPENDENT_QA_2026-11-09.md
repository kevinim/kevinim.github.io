# TX DFW Dashboard — Independent final regression (2026-11-09)

**Status: read-only CI, not deployment or acceptance of public launch.** Intended for verifying the current integrated code with no changes to runtime files, GIS datasets, the dashboard UI, Claude's open PRs, or hosting settings.

## What this adds

`.github/workflows/final-independent-regression.yml` is a manually rerunnable **single final-regression entry point**. A PR limited to this QA implementation also triggers it. It runs separate parallel checks, then combines **all required evidence** into one fail-closed verdict:

| Category | Source | Pass criteria |
| --- | --- | --- |
| School directory and polygon connectivity | Existing `scripts/school-polygon-linkage-browser.cjs` and `verify-school-linkage-baseline.cjs` | Six-district directory ≥273, linked polygons ≥240, drawn samples ≥12, zero sample failures; Allen visible markers ≥20 and no missing names; any source outage is **inconclusive**, not a pass |
| Source vintage and special cases | Live browser linkage source descriptors | Allen 2019–2023 polygon is **historical**, not a current official assignment; CFB 0 configured campus polygons must remain labeled official resident-finder-only |
| Mobile controls / address search | Existing `scripts/test-responsive-school-ui.cjs` | 320, 375, 390, 430, 480, 720, 1280px; no overlap/overflow; school filters grouped; address clear X clears text, candidates and selected home/map pin |
| Area assessment UI | Existing `scripts/test-area-assessment-browser.cjs` | 390px / 1280px; ZIP 75013 selection updates summary; school and FEMA hazard toggles work; no overflow/JS errors |
| Adversarial school names and links | Existing `scripts/test-trusted-outbound-browser.cjs` | Bad URL schemes and injected school markup do not execute or create active links |
| Public build and private source | Existing school-data snapshot + strict CSP + `scripts/verify-public-preview.cjs` | Clean sanitized candidate, no personal commute marker, public release **BLOCKED** on all five independent owner/provider/source approvals |
| UAT access planning | Existing `scripts/check-uat-anonymous-access.cjs --plan` | `NOT_PROVISIONED`; no Cloudflare action, no live host/authentication claims |

## Final verdict semantics

The output `artifacts/final-qa/final-verdict.json` has these **separate** states:

- `codeQa: PASS` — all required source and offline/controlled browser tests passed on the PR's tested tree.
- `codeQa: REVIEW_REQUIRED` — missing or failed evidence, historical-vintage disclaimer drift, missing Allen marker, unavailable school GIS, mobile overlap or privacy gate regression.
- `publicProduction: NO_GO_EXTERNAL_APPROVALS_AND_PRIVATE_SOURCE_NOT_VERIFIED` — remains **NO-GO even if code QA passes**.
- `familyUat: NOT_PROVISIONED_OR_NOT_LIVE_AUTHENTICATION_VERIFIED` — source-level unit tests cannot create or validate a genuine authenticated UAT.

A healthy school directory does **not** prove that a given house address is assigned to a school. An outdated GIS reference does **not** become current just because its polygons render. CFB school-specific polygons are still absent; residents must use the official school address finder. Read-only CI cannot approve third-party redistribution.

## How to run

Use GitHub **Actions → TX final independent regression (no deployment) → Run workflow** against the branch / commit you intend to review. This is useful after the ongoing West DFW and UI feature branches have been integrated. The PR version triggers automatically because its own QA files are changed.

Each test job uploads a minimal JSON report rather than full-page screenshots that could include private work-address UI defaults. The final job requires the redacted reports from **all three** predecessor jobs. Gitleaks full-history security scanning, public provider licensing, authenticated Cloudflare UAT and real production browser checks remain separate mandatory workflows.

Run on the **latest release candidate** and confirm `main` has not moved before any eventual merge. A green test on an old branch cannot approve a newer branch.

## Current operations boundary

- Existing GitHub Pages `kevinim.github.io`: public and unchanged by these QA files.
- Family Cloudflare UAT: not provisioned; future email OTP/30-day session, each browser/device separately, exact email allowlist and Access across primary/preview/custom hosts.
- Separate public Production: not provisioned; release blocked by owner/source/provider/license/live-host QA gates.
- This PR does not touch the parallel changes on #90 (West DFW), #99 (Keller GIS), #105 (official Finder), #104/#88 (main script/UI integration).

If this QA PR passes, it can be merged as a reusable regression framework **without enabling or deploying UAT/Production**.
