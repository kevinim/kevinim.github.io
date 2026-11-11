# CFBISD public 2025–26 attendance map reconstruction — Phase 1, Nov 10 2026

## Objective

Convert the three published **approved (not pre-rezoning)** elementary/middle/high map illustrations into a traceable, eventually georeferenced reference layer, then compare it with the **current official GuideK12 address Finder**. Preserve all existing school/GIS release restrictions until geometry and residence-level matches are verified.

## Working artifacts created

1. `data/cfb-approved-zone-raster-reference-2026.json`: exact official March 6, 2025-approved E/M/H raster URLs. Effective 2025–26. No publisher GeoJSON claimed.
2. `features/cfb-approved-zone-atlas.js/.css`: collapsible original-image atlas inside existing CFB Finder panel; image is loaded only after user selects a grade; approved rezoning descriptions for 14 boundary-review targets; two historical official Finder public-property holdouts (Nov 7 records). No copied/rehosted district image, cross-origin DOM read, address transfer or simulated auto assignment.
3. `data/cfb-elementary-raster-calibration-draft.json`: 14 *rough visual* image school-symbol pixel measurements paired to original TEA 9-digit campus IDs and 2024–25 NCES building point coordinates. The school point is not a zone polygon and original image was not independently GPS-calibrated.
4. `scripts/measure-cfb-raster-registration.cjs`: least-squares pixel→local-meter affine reference fit and per-anchor residuals, ephemeral QA artifact `elementary-affine-draft.json`.
5. `scripts/extract-cfb-approved-raster-pixels.py`: isolated experimental color contour extraction from official raster URLs for all three grades. Output only unlabelled **image pixel coordinate** rings in 7-day QA artifacts. They are not GeoJSON, not WGS84, not school zone names, not publicly deployed.
6. `scripts/recheck-cfb-public-finder-holdouts.cjs`: live advisory recheck of the two already publicly documented school campus/apartment base addresses. Must click the exact **native** GuideK12 address candidate and read actual `Assigned school` labels; the generic "Matching Results" school catalogue is an invalid outcome.

## Quantified elementary calibration, first attempt

The first free GitHub Actions execution produced:

- 14 approximate campus-point anchors, **0 visually certified** school map pixel anchors
- **356.4 meters RMSE**, **601.9 meters p95**
- `verdict = DRAFT_NO_GO`, `imagePreviewAllowed = false`, `autoResidenceAssignmentAllowed = false`
- 0 generated georeferenced school-boundary polygons
- 0 reconstructed-polygon-vs-current-GuideK12 address matching tests

This is not a school zone mapping result. The original images can be viewed normally, but a misaligned/rotated raster must **not** be overlaid as if tied to an exact residence.

## Current official Finder baseline

The previously vetted 2026-11-07 two-public-address fixture `tests/cfb-official-resident-finder-verified-2026-11-07.json` lists:

| Public test property | Elementary | Middle | High |
| --- | --- | --- | --- |
| 1600 S Josey Ln (public school campus) | McLaughlin Strickland | Perry | Turner |
| 1011 S Main St (public apartment complex base address, individual units unverified) | Carrollton | Perry | Newman Smith |

Those rows resulted from actually selecting the native official Finder autocomplete candidate. Simply typing or using "Find on Map" can return **all schools** without an assigned status; this cannot be counted as a cross-check. The 2026–27 per-campus machine-readable geometry vintage remains unverified.

## Next engineering work: exact order

1. Obtain native high-resolution image assets through an authorized publisher path. Validate source version and all approved zone campus labels. Do not use pre-March-2025 maps.
2. Correct at least 8 visually reviewed street-intersection/school-symbol image coordinate anchors **per grade**, and compare with separately sourced geodetic controls. Recalculate leave-one-out RMSE and edge registration residual; the current rough 356m result is unacceptable for property-level use.
3. Trace each grade's campus-specific boundary into labelled polygons. Keep exact provenance (publisher source raster, grade, school/year, digitization method, confidence, any holes/coverage gaps). Source pixel color contours are only unsorted cues, not certified polygons.
4. Test topological consistency: no unexplained overlapping school-grade territories, no major gaps, correct high school campus label aliases, no retired Central/Furneaux/McCoy/Long default assignments.
5. Verify **several public, exact-property address samples per school zone** and on both sides of selected grade boundaries against current GuideK12 with *native exact address candidate selected*. If ambiguous/out-of-ISD or apartment unit-split, mark unverified, no approximate guessing.
6. Report each grade separately: eligible polygon count, source year, independent holdout counts/matches, boundary adjacency disagreements and user-visible confidence. Only after verified data and legal-use authorization consider a special **reference map layer** (distinct visual styling and warnings). Leave automated school assignment blocked by the existing Conditional School Release gate until independent current-year proof.

## Release distinction

A green **Phase-1 atlas CI** only validates the original map view, reference copy, math and security. It does not promote any CFB school-zone polygon, update district registry `CFB.address`, turn on GIS-based assignment or certify a residential address. The experimental color extractor and live Finder probe have advisory CI jobs; a failing outside provider must not downgrade trustworthy existing data or cause a fabricated green.

No paid services, no mass address scraping, no sensitive household information, no student records, no main merge or production deployment from this draft without explicit release authorization.
