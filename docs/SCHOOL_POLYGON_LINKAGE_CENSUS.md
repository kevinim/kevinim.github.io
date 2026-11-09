# School directory ↔ attendance polygon linkage census

**Draft / read-only.** This measures the existing dashboard's runtime matchability of loaded school listings to available polygon layers. It is **not** an official student assignment audit or a verified districtwide school-universe percentage.

## Method

1. Run the exact pull request website in an isolated local Chromium session (no user address input, no credential/API-key access, no production deployment).
2. Wait for the dashboard to load school data, ratings and local/live polygon sources using its existing functions.
3. For every loaded elementary, middle and high school, reuse `SchoolBoundaryMatch.findSchoolBoundary` so the audit reflects real dashboard school-name / campus-ID / grade matching logic.
4. Separately record whether the district has configured polygon data, source request failed, polygons were loaded, grade-specific polygons exist, or name/ID matching could be involved.
5. Verify actual Leaflet layer creation for **one matching school per district and school level** in this isolated browser, to catch matches that fail during rendering. This sampling does not establish every school's marker visibility.
6. Publish a machine-readable school-only report to the GitHub Actions artifact. No home addresses, query text, family destination presets, personal coordinates or user identifiers are collected.

## Categories

| Class | Meaning | Reason to avoid overclaiming |
|---|---|---|
| `matched` | Existing app matched a school to one or more polygons | Geometry may be historical, not current enrollment |
| `source-fetch-failed` | Runtime official/layer fetch failed | Cannot infer GIS is absent merely because server was unavailable |
| `no-source-configured` | No polygon dataset registered for that district (e.g. CFB) | Official address Finder may still work |
| `no-loaded-polygon-source` | Configured polygon source returned no loaded features, without a recorded error | Needs loader/source investigation |
| `no-grade-polygon-source` | Some polygons loaded, none at school grade level | Grade mapping or limited source coverage |
| `school-not-found-in-source` | Grade polygons exist but school was not matched | Could be true GIS omission, name discrepancy, closure, feeder/special program |
| `possible-id-linkage-gap` | Same campus identifier appears in a loaded polygon but app missed it | Hypothesis of mapping pipeline issue; needs review |
| `possible-name-linkage-gap` | Surname/name hint appears in grade polygons but app missed it | Heuristic, NOT proof of a mapping bug |
| `special-campus-no-standard-zone` | Existing school exception covers nonstandard school/program | Not a standard attendance polygon deficit |
| `not-a-zoned-campus` | Campus type does not support standard attendance zones | No missing GIS conclusion |
| `render failure` | App `matched`, but actual sampled `drawBoundary()` created zero Leaflet layers | Confirmed local drawing regression in sampled scenario; blocks CI |

## Coverage denominator

Percent = matched school entries / elementary-middle-high entries loaded by the running dashboard. This is not the percentage of official schools in an ISD with current 2026–27 polygons. The report separates **six target districts** (Frisco, Plano, Allen, Lewisville, Prosper, CFB) from McKinney and other districts.

Current/finder-year statuses stay separate: Frisco and Prosper sourced 2026–27 maps; Allen local GIS is historical; Plano/Lewisville live Finder-linked layer years may differ; CFB uses an address Finder without dashboard polygon source; McKinney depends on live Finder data.

## CI thresholds and interpretation

- A run is flagged if fewer than 200 selectable schools were loaded, a target district unexpectedly has zero schools, or no real polygon display sample was possible.
- A sampled actual map rendering failure blocks the job.
- A third-party source outage is marked `INCONCLUSIVE_SOURCE_AVAILABILITY`, not reported as a source-coverage deficiency; the job still produces evidence if core directory loaded.
- `PASS_WITH_SOURCE_LIMITATIONS` means only the current browser session was examined. No silent inference of GIS source freshness or address eligibility.
- Report names are campus names from public school data, never household address text.

## Verified PR browser baseline — 2026-11-09

**Reference:** GitHub Actions workflow run `42548036191` on the isolated PR, after all six target district sources had loaded successfully in that session. All counts below are currently loaded school-directory records, **not** districtwide official school totals or a current-year enrollment guarantee.

| District | Loaded schools | Polygon-linked | Unlinked | Per-session source evidence |
|---|---:|---:|---:|---|
| Frisco | 73 | 73 | 0 | 75 2026–27 source features, live district feed |
| Plano | 63 | 62 | 1 | 64 Finder-linked features, underlying year not independently confirmed 2026–27; 1 special campus |
| Allen | 22 | 21 | 1 | 20 historical GIS features (2019/2023); 1 special campus; **not current assignment** |
| Lewisville | 54 | 53 | 1 | 696 Finder-linked features (multipart/mixed vintages); 1 special campus |
| Prosper | 31 | 31 | 0 | 31 official 2026–27 local source features |
| CFB | 30 | 0 | 30 | No dashboard per-campus polygon source; 29 source gaps and 1 special campus, despite operational resident Finder |
| **Six districts** | **273** | **240** | **33** | **87.9% app linkage, not districtwide official coverage** |
| Additional McKinney | 30 | 25 | 5 | 476 loaded Finder features; 5 special/nonstandard campuses |

**Interpretation:** Of the 33 unmatched entries in the target-six audit, 29 are CFB schools with no configured GIS source and 4 are explained special-campus cases. There were **zero observed ID/name linkage hints and zero known district source-fetch failures**. One actual Leaflet render sample per available district/grade combination passed (18/18).

**Allen P0 marker verification:** 21 schools with valid location points in the Allen directory; after fitting the Allen school point bounds, 21 were expected visible and **21 real map marker layers matched**. This is a local PR browser test, not proof that a future production build cannot regress.

**Broader data note:** 1,712 elementary/middle/high entries were loaded across all Texas districts, including **1,409 outside the six target districts**. Many of those other districts do not have configured polygon layers in this DFW dashboard. Therefore the broad `15.5%` app-linkage percentage must **not** be presented as an official DFW school GIS coverage measure.

### Guardrail against regression

`data/school-polygon-linkage-baseline.json` pins the observed **minimum counts** per district from the reference run. `scripts/verify-school-linkage-baseline.cjs` fails CI if a normally loaded district loses listed campuses or linked boundaries, the baseline's source-vintage classification changes silently, the polygon render sample is too small, or Allen location markers disappear.

If a real remote source request fails, that district is classified **INCONCLUSIVE** and excluded from missing-geometry assertions; do not simply replace it with invented boundaries. Refresh baseline minima only after a documented legitimate district change and an independently reviewed browser source audit.

## Runtime dependencies

The live Frisco, Plano, Lewisville and McKinney services may change independently of the pinned Git revision. File integrity is covered by PR #84. To reproduce this audit with a specific version, record PR head SHA and GitHub Actions run ID; do not compare findings from different runtime network conditions as if they measured the same dataset.

## Integration and non-conflict

This PR is stacked on Draft PR #84 (which depends on #79, #78 and #72). It introduces only `scripts/school-polygon-linkage-audit.cjs`, `scripts/school-polygon-linkage-browser.cjs`, `tests/school-polygon-linkage-audit.test.cjs`, this document and a dedicated workflow. It does not change `school-boundary-match.js`, map rendering, markers, source data files, Pages, login or cloud settings. School-provenance PR #73 and external API audit #76 remain independent.

## QA log

Initial current baseline counts should be taken from the new GitHub Actions `SCHOOL_LINKAGE_DISTRICT` lines; they depend on real district feed availability in each run. Review source load errors and classification by district rather than treating a single headline missing percentage as an official GIS deficit.
