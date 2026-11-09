# Denton ISD public campus point audit — 2026-11-09 (NOT attendance polygons)

## Finding: the campus points already existed

Do **not** infer the dashboard's full school coverage from the initial `schools.json` alone.
It currently contains 73 school point rows (63 Plano, 10 Frisco), but
`nces-locations-2024.json` also has **46** Denton ISD campus ID records.
The full app's `loadRatings()` joins the NCES points to 2026 preliminary TEA
campus rating records. It can display *all 39* schools linked to Denton's
official 2026–27 individual school-zone PDFs in Draft #169, after asynchronous
load completion. A prior browser QA made its 0-Denton conclusion prematurely.

The new `data/denton-campus-public-points-2026.json` is a small **independent
audit register** and is **not** appended to `schools.json` or ingested as
duplicate school markers. The main app keeps using the previously present
NCES coordinates, with audited provenance and exact 2026–27 campus grade types.

## Sources and measured results

- Published 2024–25 Texas Education Agency AskTED export (ArcGIS
  `EXTERNAL_schools`):
  https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/EXTERNAL_schools/FeatureServer/0
- Public-domain NCES EDGE 2024–25 school point locations:
  https://services1.arcgis.com/Ua5sjt3LWTPigjyD/ArcGIS/rest/services/Public_School_Locations_Current/FeatureServer/0
- Current district school-specific 2026–27 PDF maps, 26 elementary/9 middle/4 high:
  https://www.dentonisd.org/families/attendance-zones

In the live source probe, 51 Denton records were returned by district name
(AskTED's district-code predicate returned zero because the source field uses
a different code format); 35 of the 39 published 2026–27 campus IDs have
valid TEA geocoded points, all of which have source geocode scores >=95.
All 39 have NCES points already stored in the repo.

**31 of 39** TEA points agree with the corresponding 2024–25 NCES campus ID
point within **250m**. They get an explicit `two-source-historical` school
marker provenance. This verifies two old point locations are reasonably
consistent, **not** a current campus entrance, attendance eligibility, or
school-zone map.

### Eight 2026–27 campus PDFs still lack two-source point corroboration

| Nine-digit TEA campus ID | School | Why held for manual review |
| --- | --- | --- |
| 061901003 | Denton High School | TEA and NCES coordinates differ by 350m |
| 061901045 | Calhoun Middle | TEA and NCES coordinates differ by 304m |
| 061901050 | Rodriguez Middle | TEA and NCES coordinates differ by 459m |
| 061901132 | Anita Reeves Elementary | TEA data has no matched NCES ID in its source attributes |
| 061901051 | Pat Hagan Cheek Middle | TEA source geometry missing; NCES 2024–25 point present |
| 061901129 | Sandbrock Ranch Elementary | TEA source geometry missing; NCES 2024–25 point present |
| 061901130 | Fred Hill Elementary | TEA source geometry missing; NCES 2024–25 point present |
| 061901131 | Dorothy Martinez Elementary | TEA source geometry missing; NCES 2024–25 point present |

All eight continue to display only the 2024–25 NCES **school point** with
a visible independent-verification warning. Their district official
school-specific 2026–27 PDF reference remains available upon click.

Current school address reference for the four missing TEA coordinate cases:
- Cheek: https://cheekms.dentonisd.org/our-school
- Sandbrock Ranch: https://sandbrockes.dentonisd.org/our-school
- Fred Hill: https://www.dentonisd.org/post-details/~board/district-headlines/post/hill-dedication
- District-wide current school directory: https://www.dentonisd.org/our-district/our-schools

## Runtime and browser QA rules

- Use exact nine-digit TEA district/campus IDs for connecting the official
  Denton PDF roster and grade level, never fuzzy school-name/ZIP guesses.
- Verify the 31 two-source evidence entries against the existing NCES JSON;
  reject invalid coordinates, grade, year, duplicate IDs, changed risk flags,
  or source distances exceeding 250m.
- Render existing campus locations only. Do not promote these points to GIS
  attendance polygons. An opened PDF reference must still state
  `GIS polygon not available`.
- Wait for complete existing NCES+TEA and ZIP GeoJSON initialization before
  testing actual school markers, to avoid the asynchronous default ZIP
  `fitBounds()` resetting an early test map view.
- Mobile 390px and desktop 1366px Chromium tests must click Bell (elementary),
  Navo (middle), Braswell (high) and unverified Cheek, confirm exact source
  PDF, visible provenance warning, and **zero invented school zone polygons**.
- CI and screenshots use free GitHub Actions only. No residential addresses,
  household coordinates or individual student information are saved.

## Release status

**NO_GO under #148.** We have 39 Denton public school point locations and
39 official school-specific PDFs; **zero verified Denton 2026–27 GIS attendance
polygons**. DFW per-campus GIS source-connected coverage is unchanged at 7/108
ISDs. Do not merge/deploy to Production without explicit user approval.
