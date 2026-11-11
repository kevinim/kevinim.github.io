# Track A — opt-in school GIS reference candidate prototype (2026-11-10)

## Purpose and non-authorization
User wants useful school names after a home search, while independent residential school assignment certification remains unfinished. **This is a Draft-only opt-in visual research interface**, not authorization to merge into Pages.

The existing `features/conditional-school-release.js` remains unchanged, with zero approved residential districts. `home.assignment`, `homeSchoolMatches`, the home-selected boundary map and markers remain governed by the pre-existing automatic assignment gate.

## User action
1. Select a geocoded Texas location through the existing search.
2. The normal address card continues to warn **학교 자동 배정 미인증** and offers the district's official Finder.
3. Only if the underlying data is a nonambiguous current-year `FISD`, `PROSPER`, or live `043907` GIS point-in-polygon result, a button **GIS 참고 후보 직접 보기 · 실제 배정 미인증** appears.
4. A click (not page load) renders school names by grade plus source, year and missing-grade notices. They are visually designated **reference-only**, without any map/home-school highlight or assignment grant.
5. New address, clear, split-building, conflict, low-quality geocode, boundary-adjacent, feeder issue, offline/error or unknown year shows **no opt-in school names**. Users still have the official Finder path.

## Data/source-year rules
- Frisco and Prosper: registered official 2026–27 zone references (not residential confirmation).
- McKinney: source available only while live official Finder boundary data has been loaded; never a stale offline cached zone.
- Plano and Lewisville: current Finder may use mixed/older year polygons, so **no preview in this first slice**. Allen historical GIS, CFB without verified campus polygon and other DFW districts are excluded.
- No address or coordinates are saved or passed to preview module. No new network request is made, only registered trusted HTTPS outbound link upon user click.
- Geometry is validated as a nonempty polygon shape and then **stripped** from preview model. School names are inserted with `textContent` to prevent HTML injection.

## Testing
- `node --test tests/school-reference-preview.test.cjs`.
- `node scripts/test-school-reference-preview-browser.cjs` (requires Playwright Chromium), 390px and 1366px, synthetic school/address only, blocks third-party network calls. Checks closed default, click, official URL, text injection, hard warnings, disabled assignment, no home-highlight and clear.
- Reuse existing compact Finder QA GitHub Actions workflow with no paid tools, no external Finder scraping, no deployment.
- Existing `tests/externalized-main-bootstrap.test.cjs` retains strict HTML byte baseline except the explicitly reviewed B+ A anchors.

## Release decision
**Track A may be reviewed as code but is NOT production-authorized under `docs/CONDITIONAL_GO_SCOPE_2026-11-09.md`.** Its existing prohibition on residence-specific GIS candidate names must be reviewed and explicitly amended before public exposure of even opt-in results. A green CI is not that review, a verified Finder address, or actual school assignment. Stop at Draft until owner + independent security/GIS QA approve the revised informational scope. No CFB Draft source is consumed or modified.
