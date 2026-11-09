# P0-3: Publicly listed Prosper homes ↔ official point lookup ↔ 2026–27 GIS ↔ actual dashboard map

**Read-only QA.** Per user instruction, P0-1 official GIS collection and P0-2 Allen current-year GIS are being handled separately. No source or app data modifications, main merge, publishing, license override, or fees.

## Work isolation

- **Base:** #162 `feature/address-selected-auto-school-map-20261109`, the address-selected auto school candidate map implementation.
- **Separate parallel work:** #165 Frisco public residences; #170 CFB/Allen public listing assignments; #164/#167 Dallas/Northwest GIS. None of these branches or files were updated.
- **This QA:** Prosper ISD only, because 2026–27 attendance zone polygons already exist in `prosper-attendance-2026.geojson`, with 31 school zones (elementary 20, middle 7, high 4) and district-linked Infofinder school lookup source.

## Source and coverage definitions

- Publicly advertised, individual-house listings from [HAR Prosper listings](https://www.har.com/prosper/realestate/for_sale) and [HAR Sunfish listing](https://www.har.com/homedetail/2970-sunfish-st-prosper-tx-75078/16360593). **No owner names, resident identifiers, student data or private unit numbers.**
- Live Esri `PointAddress` / `Subaddress` with score ≥95, *exact street number*, normalized road name, `Region=TX/Texas`, and matching ZIP. No ZIP, city centroid, parcel polygon or geocoder interpolation used as school assignment evidence.
- Live official **Prosper ISD Infofinder** `SearchLocation` returns three school codes at the precisely geocoded property point. The point endpoint is district-linked; its data is not independently confirmed via the visual Finder UI.
- Current reference `prosper-attendance-2026.geojson` contains 2026–27 year group names, 31 campus polygon features and TEA campus crosswalk. We require exactly one elementary, middle and high polygon containing the point, current-year per-feature provenance, and exact set equality with the three live official codes.
- **Important correlation:** Official lookup and current GIS both come from the same vendor family. Agreement corroborates source and dashboard implementation but is not an independent enrollment/legal assignment guarantee.
- Actual dashboard Chromium uses live Esri geocoding (not replay), opens the selected address, checks its elementary/middle/high polygon codes and Leaflet shapes, clicks a real school-list button and verifies the map. After `X` clear, house marker and home-zone layers must disappear.
- This work is not an approval of publication rights, household enrollment, special-program or unit-based exceptions, or the full DFW district coverage rate.

## Verified on 2026-11-09

| Publicly listed single-family address | ES (GIS/Infofinder campus code) | MS code | HS code | Live official point ↔ 2026–27 GIS | Actual mobile/desktop map |
|---|---|---|---|---|---|
| 1441 Kirkwood Ln, Prosper TX 75078 | Jana L Thomson Elementary (119) | Reynolds Middle (042) | Prosper High (001) | MATCH | PASS / PASS |
| 771 Salada Dr, Prosper TX 75078 | R Steve Folsom Elementary (101) | Lorene Rogers Middle (041) | Walnut Grove High (006) | MATCH | PASS / PASS |
| 560 Corley Dr, Prosper TX 75078 | Windsong Ranch Elementary (106) | William Rushing Middle (044) | Richland High (007) | MATCH | PASS / PASS |
| 2970 Sunfish St, Prosper TX 75078 | Chuck and Cindy Stuber Elementary (111) | William Rushing Middle (044) | Richland High (007) | MATCH | PASS / PASS |
| 1524 Vermillion Dr, listing says Prosper TX **75078** | n/a | n/a | n/a | **NOT VERIFIED: Esri gave Celina TX 75009** | intentionally not tested |

**Totals:** 4/5 addresses had one precise point and three matched campus codes, 0 observed school-code disagreements, 1 address quarantined for ZIP mismatch. Actual browser checks: 4 houses × (390px mobile and 1366px desktop) = **8/8 pass**. All 8 displayed three grade-level Leaflet polygon *features* within one GeoJSON wrapper group, matching school list markers, selected school polygons, and successful address clear state without stale layers.

Note: Leaflet wraps the three home polygons in one `L.geoJSON` layer group. Counting `homeZoneGroup.getLayers()` gives **one wrapper**, not one polygon. This QA initially flagged 1 layer incorrectly; the test was repaired to count the three child `L.GeoJSON` shapes. No dashboard code changes were needed.

## Reproducible evidence

- [GitHub Actions run 42662366558](https://github.com/kevinim/kevinim.github.io/actions/runs/42662366558): completed success after the address-clear guardrail was included.
- Action artifact: `prosper-public-houses-live-official-gis-evidence`, comprising `official-lookup-vs-gis.json`, `dashboard-browser-map-e2e.json` and 8 actual UI screenshots. Artifact is retained for five days.
- Tests: `node --test tests/prosper-public-home-crosscheck-core.test.cjs` — 9 assertions/test cases; negative tests for street/ZIP geocoder mismatch, source year, polygon overlap, missing grade and school code drift. Run script: `node scripts/run-prosper-listed-home-live-source-crosscheck.cjs` then `node scripts/test-prosper-public-house-dashboard-browser.cjs` with Playwright installed.

## Remaining release blockers / next sequence

- **NO-GO** for production school-assignment certification. A district-linked GIS/Infofinder match does not certify any individual student's enrolled school or non-zoned exceptions, and P0 release gate #148 still requires truly independent reviewed residential end-to-end evidence.
- Keep **1524 Vermillion Dr** unverified; do not force 75078 or assign a campus from a mismatched 75009 geocoder result. An official postal/street correction or independent property record would be needed.
- Before generalizing beyond Prosper: verify all intended year and grade programs, manually inspect boundary-adjacent holdouts, school open/close changes, and district-provided exceptions; review GIS terms and current-year licensing as needed.
- Merge and end-user release always require user signoff, and must be evaluated on the eventual merged head, not just this dependent Draft PR.
