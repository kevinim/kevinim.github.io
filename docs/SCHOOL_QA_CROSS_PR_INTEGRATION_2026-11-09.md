# School QA cross-PR integration — 2026-11-09 (no deploy)

## Purpose
Independent integration of open PRs [#148](https://github.com/kevinim/kevinim.github.io/pull/148), [#149](https://github.com/kevinim/kevinim.github.io/pull/149) and [#154](https://github.com/kevinim/kevinim.github.io/pull/154), **without merging any of them to main**. Built from #154's head with the school-only changes from #148/#149 layered on this separate branch. Original PR branches are untouched. PR #141 is being handled in parallel; a comparison of current changed-file lists found zero overlapping files between #141 and #148/#149/#154, but future updates may change that. Merged production behavior is not certified by this result.

## Findings and fixes
- **No direct changed-file overlap across the three source PRs** at the 2026-11-09 integration snapshot. Nevertheless, the three workflows alone do not verify one another.
- The #149 CFB estimated polygon candidate validator previously trusted self-reported booleans \`finderTermsReviewed\` and \`reviewerApproved\` without consulting independent district data-use rights. That would permit a crafted candidate to appear \`REVIEW_READY\` in a synthetic test even though current CFB reuse permission is **not-cleared**.
- Integrated validator now requires separately approved rights in \`data/finder-derived-source-rights-2026.json\` (derivative geometry + republication), an exact official source and consent-evidence match, current-year consistent geometry metadata and real independent holdouts. Approval still only yields \`CANDIDATE_REVIEW_ONLY\`, **never map-publish authorization**. The pre-existing #149 synthetic-positive test was updated to test this distinction.
- Cross-PR integration tests include actual source audit, district registry CFB Finder-only status, derived synthetic output, UI nonofficial labeling, residential release gate negative test and sample authorization falsification.
- The original #148 residential evidence gate intentionally returns **NO-GO** without independent address-to-elementary/middle/high-click-to-current-year-polygon evidence. The integrated audit job expects and reports that NO-GO; it is not a "green light" for release.
- The original dedicated workflow \`residential-school-release-gate\` still exits nonzero on a PR without reviewed evidence. This is an intentional safety block and does not mean this repository has passed the production school gate.

## Current limits
- 0 CFB 2026–27 polygons are verified, 0 real independently approved residential cases obtained, 0 approvals to derive or redistribute GuideK12 data.
- Existing six-district minimum polygon counts are **directory matching**, not address assignment verification.
- The code tests are offline, not a live full address-to-map cross-district Playwright verification. Do not call the result "school geography verified".
- PR #141 has no modified-file collision in the current comparison, but its changes must be included in a final merged-head QA run before release.
- These are separate no-deploy workflow checks, not an activated GitHub ruleset. **Repository administrator intervention is required to make a named check branch-protection-required**. Do not claim branch protection has been enabled.
- Do not merge/publish this integration PR without reviewing the separate source PRs and approving the release policy. GitHub Pages main branch publishing is separate from CI success; family and public production signoff must remain explicit.

## Audit
\`node --test tests/school-qa-integration.test.cjs tests/finder-derived-boundary-provenance.test.cjs tests/residential-school-release-gate.test.cjs\`

\`node scripts/report-school-release-readiness.cjs\` writes an address-free readiness report under \`artifacts/school-integration/\`. Expected: \`NO_GO\`, \`NO_VERIFIED_CAMPUS_GIS\`, \`missing_reviewed_residential_e2e_evidence\`.

## Next steps not requiring user intervention
1. Validate cross-PR CI and fix only technical regressions on this branch.
2. Perform read-only audit of #141 with the combined school UX and source protections; do not edit #141.
3. Add a source-acquisition response processing checklist, with statuses \`not-received\`, \`received\`, \`current-year-verified\`, \`redistribution-approved\` and \`school-assignment-holdouts-verified\`; never equate file availability with current-year truth.
4. Wait for CFB official records reply before importing current GIS; costs require explicit prior approval.
