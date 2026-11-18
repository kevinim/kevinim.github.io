# 2026–27 Official GIS school reference names after address search — scoped review

Date: 2026-11-17 (America/New_York)
Branch: `feat/address-gis-school-candidates-20261117`
Scope: **Informational reference names only**. Independent residential school assignment = **NO-GO**.

## User request and prior failure

The user requested `주소 검색 → 공식 검색기 연동 → 교차검증 → 반영`. Existing Pages geocodes an address and loads district-specific GIS, but `ConditionalSchoolRelease` intentionally has zero production-approved residential districts. Previous address-first release then hid all school list/markers as soon as an address was chosen. This made a home in a district with usable 2026–27 campus boundary data look like a location without schools.

A link to an external official Finder is **not** an integration with its address-result API. This PR does not misrepresent links as integration or auto-certify a residential assignment. Frisco official locator explicitly says the search is only a guide and is not 100% accurate.

## Reviewed compromise: text-only GIS candidates

1. `home-lookup-v2.js` computes `schoolAssignmentFor(home)` (source GIS only), runs the existing `SchoolReferencePreview.plan` source/year/geocode/conflict/geometry checks, then stores only its reference plan and source status on the **current in-memory home object**. No search/address is persisted or logged.
2. `dashboard-main.js` displays `gis-reference` names immediately below address search **only** when the plan is `reference-only`, is tagged `2026–27`, and its district is `FISD`, `PROSPER`, or live `043907`. Names are inserted with `textContent`.
3. Match GIS candidate to the campus directory with exact normalized **district + level + campus name**, accepting only one match. TEA grade appears only for a uniquely linked campus; missing match is **학교 기록 연결 미확인**. Original source name remains visible rather than making the entire reference list disappear.
4. Show year, publisher, school level, grade, missing levels, capacity/transfer exceptions and the vetted official Finder URL. **Labels: `GIS 후보 · 배정 미인증`**, never `배정 완료` or `공식 검색 결과 수신`.
5. **Never** put source-only references into `home.assignment`, `homeSchoolMatches`, school markers, school list, or selected-address polygons. The existing immutable zero-grant `ConditionalSchoolRelease` remains untouched. The advanced opt-in reference detail remains available separately.
6. Missing/failed/ambiguous, historical, split-building, weak-geocode or boundary-adjacent source returns explicit `배정 미확인` or `자료 오류` with reason and official Finder route; does not invent campuses or suppress failure.
7. For cities with multiple ISDs (e.g. McKinney), honor reviewed district GIS over postal city; no McKinney-only finder routing. Earlier fix #321 remains.

## Governance and limitations

This is an **owner-requested change in disclosure scope** relative to the 2026-11-10 opt-in-only review. It provides default *text-only source candidates*, not an assigned-school list. It must not be merged solely because static CI passed: review the full privacy/source-rights implications of showing existing registered current-year source names without a second click. Existing GIS was already used on the site, but this document does not assert source redistribution rights, official API permission, or published residential validation.

No claim of a direct official address result API, no bypass of browser CORS, no scraping/rehosting behind paywalls or robots restrictions, no paid provider. Automated true residence→Finder→E/M/H verification still needs:
- district-specific documented legal interface or licensed official data;
- current-year evidence, geocoder precision, boundary holdouts and exception review;
- independent residential holdout tests per district, school and grade;
- campus ID linkage to TEA, source freshness and UI click tests;
- explicit independent reviewer PASS and source-rights grant before assigning schools.

Existing `scripts/check-public-address-finders-live.mjs` demonstrates that Frisco official UI snapshots and Prosper live Infofinder are two **different** kinds of verification; Frisco snapshots do not constitute a live official address query.

## Tests

- `tests/address-school-focus.test.cjs`: wrong/stale district blocks; authorized current-year source returns only text candidates; no auto-highlight/list; current-home selection does not leak.
- `scripts/test-school-reference-preview-browser.cjs`: synthetic current-year GIS renders safe source-labeled text before opt-in details, XSS inert; home list remains empty; apartment ambiguity closes; official link kept.
- `tests/externalized-main-bootstrap.test.cjs`: every executable byte outside the three reviewed dashboard sections remains pinned to #321; default/main HTML and all unrelated JS are unchanged.
- Run full GitHub Actions CI: security/CSP, public preview, GIS, CFB, mobile, TEA, viewport and performance regressions.

## Rollback

Restore the previous script asset versions (`dashboard-main.js?v=11`, `home-lookup-v2.js?v=22`) and revert only this change's UI state additions. `ConditionalSchoolRelease` remains zero-grant regardless.
