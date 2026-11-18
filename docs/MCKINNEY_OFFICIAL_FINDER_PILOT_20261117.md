# McKinney ISD official Finder GIS — first integration slice

Repository: kevinim/kevinim.github.io
Branch: feat/address-gis-school-candidates-20261117
Date: 2026-11-17 / 2026-11-18
Status: **DRAFT — NOT MERGED, NOT RELEASED**
Goal: Address search → official current school GIS match → TEA campus identity comparison → clear address-specific results.

## Already confirmed source hierarchy
1. District adoption: McKinney ISD Board approved the elementary/middle/high 2026–27 zoning changes on 2025-12-15: https://www.mckinneyisd.net/article/2600626.
2. District-published 2026–27 interactive attendance map:
   https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/4789/Misd/2b4531ec-510a-479a-b82f-d550714c8565/McKinney_ISD_Attendance_Zones_26_27.html?disposition=inline
3. District zone instructions: https://www.mckinneyisd.net/page/attendance-zones-maps/.
4. MetroStudy WebMap referenced by existing McKinney official School Zone Finder:
   https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/23b28d101ba947498650f6c7b9ef251b/data?f=json.
5. Official MetroStudy School Zone Finder entry:
   https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125.
6. Published TEA 2026 campus ratings with 9-digit campus IDs: `tea-ratings-2026.json`.

## Technical flow implemented in the pilot
- On **explicit user address search**, existing ArcGIS geocoding resolves the candidate and its precision. The postal city (e.g. McKinney) is never treated as an ISD assignment.
- Existing `loadBoundaryData` pulls the district-linked live MetroStudy WebMap **without sending the user's address to that endpoint**. A 2026–27 elementary year and known distinct school counts are required before marking the overlay live.
- Existing `schoolAssignmentFor(home)` performs point-in-polygon across **all district sources**, rejecting cross-district conflicts, poor geocode precision, and near-boundary ambiguity. The real address and coordinates are held in memory only.
- `features/mckinney-finder-crosscheck.js` accepts only a McKinney `043907` live Finder-derived candidate and exact, trusted official link. Checks each elementary/middle/high level separately and rejects conflicting names, bad source geometry, and outdated year labels. If one school level carries an older explicit year, that grade's names are excluded but independently valid levels remain with an explicit missing-grade/year warning.
- Joins a school by provider nine-digit `043907###` campus ID to **2026 official TEA** campus records when possible. A name-only match is explicitly labeled weaker than an ID match; contradictory IDs/names or duplicate campuses fail closed.
- Address-priority cards show source-derived school names, level, source year confidence, linked TEA grade and match type. **They are reference candidates, not enrollment-certified assigned schools.** The user is shown the official locator link for final confirmation.
- No source-only GIS candidates are passed to `home.assignment`, school-list `data-sid`, selected-home attendance polygons or Leaflet home school markers. `ConditionalSchoolRelease` stays zero-grant.
- No address logs, new fees, secret keys, server/database, sign-in, or address persistence.

## Live QA and anti-regression
- `tests/mckinney-finder-crosscheck.test.cjs`: 2026–27 elementary/middle/high; TEA identity strength; stale mid/high partial suppression; wrong Frisco/Prosper district; poor geocode; duplicate/invalid records; no private address data; immutable zero-grant.
- `scripts/test-mckinney-finder-crosscheck-browser.cjs`: Playwright at 390px/1366px, synthetic-only campus/address, no third-party network, HTML injection inert; no school list/marker promotion; stale and wrong-district behavior; address-clear recovery.
- `scripts/check-mckinney-official-source-live.mjs`: fetch public MetroStudy current WebMap and **independently published** McKinney 2026–27 interactive map from a GitHub Actions runner, report source counts and per-level SCHL_YEAR labels, aggregate name agreement without logging a property address. This establishes live source consistency only; a publisher web map and vendor GIS can share common underlying data.
- CI in `.github/workflows/verify-school-grade-zones-uat.yml` and `.github/workflows/mckinney-official-finder-source-qa.yml`.

## NO-GO / open acceptance criteria
**Do not claim complete official residence→E/M/H verified enrollment until all these pass:**
- Live official address-query UI/API: retrieve explicit elementary/middle/high assignment for at least 3 reviewed **residential** holdout cases across 2 McKinney ISD ZIPs, with authorized public/synthetic addresses, consented residences, or official district test fixtures. District-linked GIS matches are not themselves independent API/official UI responses.
- Independently demonstrate middle and high 2026–27 **geometry year** (elementary year alone does not prove the others). Compare live MetroStudy source with district's adopted 2026–27 maps and resolve any conflicts.
- Validate provider license/reuse/API traffic policy and any CORS/credential restrictions. Do not scrape closed enrollment data or store student/personal information.
- Exact TEA Campus ID and grade coverage across each E/M/H holdout; account for grandfathering, transfers, capacity and apartment splits.
- Browser search → clickable campus → verified boundary polygon tests at mobile/desktop, privacy, security and accessibility. Observe no wrong-district results for a McKinney postal address within Frisco ISD.
- Explicit independent GIS/QA sign-off, code review and owner authorization; then add a reviewed, immutable district grant in a separate PR. Do not fake the 64-character evidence digest.

## Release decisions
The user requested **McKinney first**, so all official auto-assignment promotion work is limited to McKinney ISD. Existing PR #322's generic Frisco/Prosper informational display remains separate from this pilot. The approved release does not include further districts until the McKinney audit finishes.

If live source QA or CI fails, keep draft, document the failure and correct the source/consumer; do not bypass the checks. No production claim before the current GitHub Pages output is checked and verified.
