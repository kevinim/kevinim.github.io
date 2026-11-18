# McKinney 2026–27 GIS reference safety audit — November 18, 2026

## Scope and safety claim
This release hardens **school building location references** derived from the publicly available McKinney ISD/MetroStudy GIS and TEA 2026 campus inventory. It does **not** certify that a specific residence is assigned to any campus. The user-facing status must continue to say `GIS 참고 후보 · 배정 미인증`. `ConditionalSchoolRelease` current-year residential approvals must remain zero.

## Confirmed public-source evidence
- McKinney ISD district-linked 2026–27 school locator: https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125
- District adopted zone maps and publisher live source test: `scripts/check-mckinney-official-source-live.mjs`.
- Public source health last validated 17 distinct elementary / 5 middle / 3 high school zones; the elementary layer contained 468 polygon pieces. Elementary GIS features marked `2026-27`; middle and high feature-level source-year fields did **not** independently state `2026-27`.
- TEA 2026 ratings are separate from residence zone boundaries. A rating match or a school campus building coordinate does not prove assigned school.

## Changes and negative checks
- A nonempty malformed, wrong-district, or non-string publisher Campus ID must no longer silently fall through to name matching.
- A directory school with a Campus ID different from the uniquely validated TEA/publisher ID must fail closed.
- A directory row with the same Campus ID but a conflicting name against the corresponding official TEA record must fail closed.
- Bennett and Boyd shortened GIS names may be joined only through explicitly curated unique TEA ID/name aliases; missing evidence, duplicate identities or conflicts never create an alternate map pin.
- All lookups remain source-only, no residential address or coordinate is written to files/storage/logs, and exact authorized source hosts are retained.
- Browser cache script tag version is bumped to prevent delivery of the previous less-strict identity guard.

## Continuous public source monitoring
`.github/workflows/mckinney-official-finder-source-qa.yml` runs every day at 12:17 UTC, as well as on relevant pull requests and manual dispatch. It checks synthetic identity/year cases and the live public publisher source against district-adopted names, grade-zone counts, source years and raw-layer structure. It deliberately does not send or store a home address or test a residence. If the publisher changes or is unreachable, the run should fail rather than claim new assignments.

## Outstanding P0 release blockers
1. Obtain a documented, permitted, independent **official school locator address-result** interface or equivalent authoritative address-specific evidence. A Web AppBuilder `find=` navigation link is not an E/M/H assignment results API.
2. Validate a representative, district-authorized set of current-year address-to-elementary/middle/high holdouts with edge-of-zone, changed-zone, multifamily and McKinney-postal-city-in-Frisco/Prosper cases. No real residential addresses belong in this public repository or CI logs.
3. Independently verify middle/high zone provenance and 2026–27 validity at the feature level, including the district's adopted map topology.
4. Until these gates pass, never set an official enrollment certification, display ZIP schools as assigned, infer assignments from proximity or TEA ratings, or turn reference campus markers into certified residence markers.

## Operations
On a failed nightly workflow, review the actual failure, confirm current official publisher source and campus names, and publish a narrowly scoped verified repair with PR checks and Pages live smoke. Passing this scheduled workflow is **not** evidence that a specific residence's assigned schools have been independently verified.
