# West DFW district and ZIP explorer — Safe UAT-only addition

**Status: Draft PR only; no merge, no GitHub Pages deployment, no Cloudflare or login changes.**

## Official district IDs and sources (2026-11-08 verification)

| District | TEA LEA code | Official locator/map | What is verified | What is NOT verified |
|---|---|---|---|---|
| Carroll ISD | `220919` | https://www.southlakecarroll.edu/district-information/district-departments/student-services/online-enrollment-portal | 2026–27 enrollment and official attendance zone access | No approved downloadable per-campus GIS polygons |
| Keller ISD | `220907` | https://www.kellerisd.net/about-kisd/maps | Official elementary/secondary maps and address locator | Current-year digital GIS export and residency eligibility |
| Northwest ISD | `061911` | https://www.nisdtx.org/departments/facilities/attendance-boundaries | Board-approved 2026–27 boundaries and a year-selectable School Zone Locator | An authorized polygon export for reuse; 2027–28 is a proposal at this date |
| Grapevine-Colleyville ISD | `220906` | https://www.gcisd.net/page/attendance-area-maps/ | Official printable maps and district contact information | Current-year GIS GeoJSON and property-specific assignment |

IDs checked against Texas Education Agency records. No imaginary district codes or geometry were introduced. City vs ISD boundary caveat: Southlake and Westlake are NOT single-district places.

## Implemented

- Added 4 western districts to shared `district-registry.js` with `zoneKey:null`, `currency:null`, `address:null`. This deliberately prevents unsupported address-to-school polygon assignment, while enabling names and official lookup links.
- Added official-data manifest `data/west-dfw-districts-2026.json`, includes verified source domains and explicit school-year limitations.
- Added mobile-friendly, collapsible panel under **초·중·고 학교 찾기** with official district links and data-driven counts from the existing loaded TEA school directory.
- Added seven existing ACS demographic ZIP shortcuts: Southlake 76092; Westlake/Trophy Club/Roanoke 76262; Keller 76248; Colleyville 76034; Grapevine 76051; Haslet 76052; Justin 76247. Clicking uses the existing `selectZip()` and fit-to-ZIP polygon + school markers.
- Added a separate Westlake Academy **public charter admissions** notice; 76262 ZIP does NOT imply Town of Westlake residency or Westlake Academy primary admissions priority.
- Reused existing 2026 TEA school rating records and NCES 2024–25 campus point references; no new geocoding API, keys, user accounts, tracking, school GIS, or house data.
- New Cypress-free `node:test` checks plus isolated Chromium browser smoke at 1280px and 390px for ZIP selection and school markers.

## Newly identified GIS research lead (not integrated)

The City of Keller operates an ArcGIS map service at https://arcgis.cityofkeller.com/arcgis/rest/services/Kellermaps/KEL_KISD_AGO/MapServer . Its service index lists Elementary School Boundaries (layer 2), High School Boundaries (3), Intermediate School Boundaries (4), and Middle School Boundaries (5). **Verified follow-up (2026-11-09): each of layers 2, 3, 4 and 5 reports `SCHL_YEAR=2018-19`; 41 total polygon features across levels. This is historical reference data, NOT current 2026–27 boundaries.** The source-change date, official campus identifier reconciliation, geographic completeness and reuse terms remain unverified. No geometry from this service is shipped, downloaded or shown in this PR. See `docs/WEST_DFW_GIS_SOURCE_REVIEW.md` and the fail-closed source audit. The official Keller ISD address lookup still controls enrollment confirmation.

## Known limitations — intentional

- The official four districts' school-specific current-year polygon geometry is NOT connected to the map. The dashboard shows campus locations and opens official Finder/zone maps. No zero-source school is mislabeled as 2026–27 official polygon coverage.
- School rating records are 2026 preliminary; school point coordinates are 2024–25 NCES references, not a claim of current campus location.
- City names, ZIP/ZCTA boundaries, district borders, charter admissions regions and campus attendance boundaries are five DIFFERENT geographic concepts.
- School assignment can depend on building/unit, child grade, separate program/transfer rules and annually approved rezoning. The official district lookup is authoritative.
- Northwest ISD's 2027–28 proposed high school changes as of November 8, 2026 are not applicable current 2026–27 assignments.
- Production cannot be deployed by this PR. Existing school coverage guardrail #86 still uses its original six-district denominator, and western districts must not be added to that numerator before verifying their current-year official polygon GIS.

## Deployment dependencies

Stacks on Draft PR #86 (which depends on #84 → #79 → #78 → #72). Merge/rebase those parents before any release. This PR changes only district registry, school panel hooks in index, new West feature assets/manifest/tests/workflow/docs. Main remains untouched. Existing `school-boundary-match.js` and historical GIS assets remain unchanged.

## Future optional work

Retrieve licensing-approved school-specific GIS boundaries from each ISD where possible. Verify names, LEA/campus IDs, grade spans, academic year and geometry integrity, compare live official address finder for samples, then add polygons only through separately reviewed school data PR. Until then official links are the safe alternative.

Sources: TEA geographic records, the four district websites above, and https://www.westlakeacademy.org/admissions/admissions-process .
