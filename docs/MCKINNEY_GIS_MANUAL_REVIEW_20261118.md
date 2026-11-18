# McKinney GIS candidates → user-reviewed school form (2026-11-18)

## Scope
- Existing McKinney official 2026–27 MetroStudy public GIS crosscheck already supplies *reference-only* school candidates after a precise address is selected. The public Web AppBuilder `find=` handoff opens the district-linked Finder but does **not** return the Finder's address-to-elementary/middle/high assignment response to this application.
- This PR adds an explicit `GIS 참고 후보를 초·중·고 선택란에 채우기 (배정 미인증)` button when at least one vetted in-memory directory record matches the current home's McKinney reference. Clicking it opens the existing manual review panel and preselects only eligible dropdown options. It **never clicks Apply, writes to `home.assignment`, draws a marker, saves an address, or asserts independent official residence verification**.
- The user must separately open the official [26–27 School Locator](https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125), inspect the address result for each level, and deliberately apply their own selected references. The existing school card labels remain explicitly unverified; the manually displayed list is **not** a school enrollment certificate.

## Data guards
- Preview only with `kind=reference-only`, `district=043907`, and `independentOfficialAddressVerified=false`.
- Candidate must point to the *same loaded directory object* with district `043907`, appropriate E/M/H level, valid district campus ID, and matching GIS campus ID when supplied.
- Drop stale source-year candidates, duplicates, missing directory records, wrong district/status; changing the home resets all prior manual choices.
- If only one or two grades pass, the rest remain empty; never guess absent schools.
- No new third-party request, private address in URL, GIS scraping, storage, background call, or elevated GitHub permission.
- `APPROVED_AUTO_DISTRICTS` remains empty. No change to certified assignment gating.

## QA and rollout
- Unit: `node --test tests/home-school-manual-bridge.test.cjs`
- Browser: existing local server then `node scripts/test-home-school-manual-bridge-browser.cjs` at 1280px and 390px with synthetic schools only.
- Required repo CI, bootstrap integrity, strict CSP/XSS, source provenance and independent Pages smoke after any authorized merge.
- Fail closed if school source is malformed, identity conflicts, live provider is unavailable or its calendar year is stale.
- Rollback: revert this UI/bridge PR or remove button; all official GIS and address data paths are unchanged.

## Remaining P0 blocker
**No approved, documented official address-result API exists in this integration.** The publicly documented ArcGIS Web AppBuilder `find` parameter is navigation/search, not a cross-origin JSON contract for elementary/middle/high assignments. GIS agreement and the user's manually applied selections cannot populate an official-certification flag. Before automation, obtain authorized read contract and separately validated real address/grade holdouts, source-year and exception handling, plus explicit release gate review.

See also `docs/MCKINNEY_2026_27_OFFICIAL_FINDER_HANDOFF_20261117.md` and issue #216.
