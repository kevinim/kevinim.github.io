# CFB + Denton 2026 public GIS/source closeout (owner no-reply policy)

Audit as of 2026-11-20. This is a public-source research closeout and explicit UI gap labeling, **not** graduation to residential auto-assignment or public GIS rights.

## Definitions

- **Officially approved:** a district board approved an attendance map/rezoning. This does not establish that the dashboard obtained a machine-readable polygon or may rehost the district original.
- **Usable public reference:** officially published URL, year/source provenance and reference layer. An older GIS with actual last-edit date can be linked as historical, not secretly presented as current.
- **Current vector geometry:** genuine school-specific, year-matched and source-rights-reviewed polygons with campus ID linkage and independent grade/address holdouts. Current **certified** E/M/H geometry remains 0 for both CFB and Denton in this workflow.
- **Automatic school assignment:** separately requires exact residence/grade crosscheck; do not infer from ZIP, city, historic polygons or a parent searcher that the site cannot read.

## CFB (`057903`)

1. **District-approved 2025–26 raster:** elementary/middle/high 3 maps, approved Mar 6, 2025. Official https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning .
2. **Official 2026–27 Finder & feeder:** https://www.cfbisd.edu/students/school-maps-locator-system and official 2026–27 feeder table https://www.cfbisd.edu/enrollment-page/frequently-asked-questions-about-enrollment . Existing embedded GuideK12 opt-in and separate current feeder UI retained.
3. **Municipal ArcGIS polygons:** city GIS edited Mar 23, 2020. Historic CFB-specific 20 E, 6 M, 4 H = 30 shapes. 2020 is the GIS *edit date*, **not an independently verified school year**. The source geometry covers only part of the later district and predates campus closures/rezoning. Direct source links already in the opt-in CFB atlas, with no rehosting or unapproved address inference. https://www.cityofcarrollton.com/about-us/about-the-city/city-maps .
4. **Conflicts:** published school labels McCoy/Blanton and Furneaux/Woodlake/Woodland disagree; keep conflict and direct official Finder rather than guess.
5. **Disposition:** public source research complete, no current authenticated E/M/H vector source or redistribution rights, no independent residence assignment. Do not await district email.

## Denton (`061901`)

1. **2026–27 official PDFs**: 39 campus maps (26 E / 9 M / 4 H) publicly linked at https://www.dentonisd.org/families/attendance-zones . Three district aggregate GeoPDFs contain native geographical information; 39 school polygon candidates were previously extracted in QA-only staging.
2. **Actual released polygons:** **0**. A public CAD parcel 20.6m from a derived middle-school boundary fails the 100m near-edge uncertainty guard. The 9/9 sampled official Finder matches do not constitute 100% residence coverage. No independent rights to rehost official drawings confirmed.
3. **Official Locator:** https://webquery-2-denton-tx.etstack.io/ . March 24, 2026 board-approved 2026–27 Paloma Creek rezoning: https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27 . Future 2028–29 high/middle proposal must never contaminate current year.
4. **Disposition:** 39 official PDF source links and grade/campus labels already in dashboard. Do not auto publish the staged polygons or treat a parcel centerpoint as verified enrollment. No correspondence gate; continue to the next ISD.

## Implementation and release protocol

- Add `data/dfw-cfb-denton-public-source-status-20261120.json`: year, official URL, data availability, public reference, missing/current GIS, rights and actual address certification tracked independently for these two districts.
- `features/dfw-school-coverage-renderer.js`: on opening the existing DFW coverage panel only, read and validate status manifest; when searched/clicked, CFB or Denton row shows a collapsed, source-dated summary, specific geometry blockers and official Finder link. Quick buttons find both districts without overwhelming the main dashboard.
- The 108/108 parent guidance registration metric is untouched; it is **not** a claim of 108 automated address lookups. No change to `APPROVED_AUTO_DISTRICTS`, no proxy/scraper, no private addresses.
- Fail closed if the status manifest is missing/modified: existing DFW district table remains available without incorrectly upgrading any GIS.
- Tests: Node strict data/status and negative tamper tests in existing coverage test suite, plus synthetic-data responsive browser QA for both district lookup buttons, details and request timing. No additional GitHub Actions workflow.

Next district research moves forward under the owner rule: publicly accessible year-labelled historical/official maps can be referenced; absent geometry is reported without waiting for response. Different ISDs can have different levels of readiness.
