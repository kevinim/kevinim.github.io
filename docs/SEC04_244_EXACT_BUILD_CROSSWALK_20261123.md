# SEC-04 — Education + school GIS exact-build source crosswalk (2026-11-23)

**Status: candidate-level inventory; all redistribution rights remain PENDING; Public Production NO-GO.**

## Why this change

The existing [PR #399](https://github.com/kevinim/kevinim.github.io/pull/399) classifies data/media files in the sanitized preview into *filename-only* review lanes. Prior CI counted **200 education-named** and **44 school-GIS-named** candidates, within 288 total data/media files. [PR #401](https://github.com/kevinim/kevinim.github.io/pull/401) independently pins 15 specific source/provenance repository files to Git blobs and metadata evidence, only 14 of which were found in the same preview. These two numbers **do not automatically overlap** and must not be subtracted without an exact artifact-level join.

This PR stages the verified, *byte-unchanged* controls from both existing unmerged PRs, then adds a read-only exact-build reconciliation step `scripts/reconcile-sec04-education-gis-queue.cjs`. It does not merge either prior PR or bypass owner signoff.

## Reproducible review workflow

1. Build `dist/public-preview` using `node scripts/verify-public-preview.cjs`. This is an intentionally non-deployed sanitized candidate.
2. Inventory exactly what that build contains with `node scripts/audit-public-data-rights.cjs`.
3. Validate source-provenance pinning with `node scripts/audit-sec04-education-gis-evidence.cjs`.
4. Run `node scripts/reconcile-sec04-education-gis-queue.cjs`: join the candidate build file paths against evidence records by exact relative path, compare bytes for pinned files, and identify which remaining candidate files lack pinned evidence. For JSON/GeoJSON, only inspect **top-level metadata key names** (never leak values), and report missing, present-but-unverified, or non-JSON status.
5. Inspect `artifacts/security/sec04-education-gis-crosswalk-local.json` **locally**, never upload it; use its 244 file-specific `NEEDS_INDEPENDENT_SOURCE_RECORD` vs `PINNED_SOURCE_RECORD_NOT_RIGHTS_APPROVED` flags to assign next source reviews. GitHub CI uploads **only** counts in `artifacts/security/sec04-education-gis-crosswalk-summary.json`.

### Independent controls

- Every review-lane asset must get exactly one local review queue entry; school-GIS and TEA totals reconcile to overall candidates and to source-pinned/unpinned subtotals.
- A source pin is not accepted if its original source Git SHA or metadata marker drifted; unexpected or symlinked entries fail closed.
- The copied source and preview file are classified as byte-identical vs transformed; neither condition grants reuse rights.
- A top-level JSON metadata field named `source`, `publisher`, `license`, or similar **only means a key exists**; it does not establish origin or usage rights.
- Any unexpected `approved` data decision is an explicit crosswalk fail until a separate, evidence-backed per-file process is approved.
- Read-only synthetic tests prove existing candidate matches, missing evidence, a newly added candidate, source drift, no accidental rights acceptance, and redacted summaries.

## Current official-source caution

TEA's [site policies](https://tea.texas.gov/about-tea/welcome-and-overview/site-policies) include conditions on reuse of site materials; availability of school accountability records alone does not settle copyright or redistribution terms for all 200 filename-classified candidates. The [Texas Legislative Council 2025–26 School Districts resource](https://data.capitol.texas.gov/dataset/school-districts/resource/57fb5e91-c849-4a33-aaa4-ea073ca98f8f) declares a Creative Commons Attribution license on its **district boundaries**. It is not a blanket license for school attendance zones, GuideK12, MetroStudy, or other GIS data, and the repo-specific derivative still requires provenance and attribution checks.

When a file lacks independent source terms, retain pending status and prefer a clearly labeled link to the publisher or excluding that file from any future broad Production bundle. Original family Pages UAT remains untouched. Cloudflare Pages, family authentication, repo visibility, source history, external APIs, billing, school assignments, and live GIS remain out of scope.

## Remaining steps after inventory

1. Review candidate files **without pinned evidence** first, using the local source-key signal to separate missing metadata from recorded-but-not-verified provenance.
2. Verify every actual official dataset license/version, provenance transformation and attribution before proposing `approved`, `excluded` or `restricted` changes to the rights manifest. Do not infer permission from website reachability, a published PDF or a web map.
3. Continue per-file reviews in bounded groups (TEA/education, school-GIS, other data families), run this exact-build count and drift test after each data change.
4. Preserve all Publication `NO-GO` flags until separate legitimate release gates, owner signoff and verified security controls complete.

## Verified exact-build audit numbers — 2026-11-23

Read-only [SEC-04 candidate crosswalk run #45203457265](https://github.com/kevinim/kevinim.github.io/actions/runs/45203457265) on PR #402 confirms the following for the current **sanitized preview**:

| Classification | All candidates | Pinned source evidence in build | Missing pinned evidence |
| --- | ---: | ---: | ---: |
| Education/TEA filename candidate | 200 | 7 | 193 |
| School-GIS filename candidate | 44 | 7 | 37 |
| **Total** | **244** | **14** | **230** |

- The original 15 pinned source records include **14 in the build and 1 not shipped**. All 14 in-build source files are byte-identical to the pinned repository originals (14 unchanged, 0 transformed). SHA equality is only provenance/version evidence, **not reuse authorization**.
- Of the **230 without pinned source evidence**, **200** have a top-level JSON field that resembles `source`, `publisher`, `metadata`, `provenance`, or another provenance key; the actual value, official publisher and reuse entitlement remain **unverified**.
- The other **30** lack these recognized **top-level key names**. Some could contain provenance in nested structures or companion documents; do **not** label them as necessarily unsourced or illegally republished.
- All 244 files are enumerated only in the ignored, machine-readable local review queue with P0/P1/P2 priority labels. The CI-safe report shows totals only.
- The complete static preview still contains **288** data/media files with **0 approved and 288 pending**. Rights registry remains unchanged, and `publicProductionApproved=false`.

**Next exact tasks:** begin the 30 top-level-metadata-gap candidates, resolve each to an exact original source/reuse terms/source-year evidence (or classify as internal derived/reference only); proceed with the 200 source-key-bearing unpinned candidates by independent publisher verification; then review rights for the 14 pinned candidates. No dataset should be marked `approved` based on a field name, file checksum or official web page being reachable.

All counts above are as of the PR #402 branch's unmerged build, **not a new live Pages release**.
