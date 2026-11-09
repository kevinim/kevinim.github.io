# DFW non-CFB school assignment source quality audit — 2026-11-09

**Scope:** ten non-CFB school districts already registered in the school source registry. Improves the accuracy of the *existing* parent-facing school-source footnotes and school-year context. **Adds no school district, campus polygon, private address, external API request, permission, school-click code or deployment**. Changes build on the stacked parent guidance series through PR #150; all upstream PRs must be reviewed and merged in order.

## Evidence source hierarchy

1. **Authoritative current-year district Finder / school-year selection:** where actually documented for the intended academic year, links are usable for a parent to look up specific address and grade. The dashboard has not performed live residential E2E verification for these ten districts.
2. **District-approved attendance rezoning or per-campus PDF:** confirms grade/year changes and exception notices but does not by itself provide re-usable school-specific polygon GIS or guarantee assignment for every home.
3. **City GIS with explicit old year:** may be a helpful historical source but cannot be labeled 2026–27 based on API existence or upload timestamp. Keller GIS observations are **2018–19**.
4. **Future proposals:** must never be shown as current-year legal school zones, even when a link or future interactive finder is on the official website.

## Ten source-based corrections now visible through the coverage registry

| ISD | Critical 2026–27 finding | Follow-up / non-confirmed item |
| --- | --- | --- |
| Carroll | 2026–27 Carroll Elementary feeds Eubanks Intermediate and Dawson Middle | 2027–28 Durham Intermediate closure and grades 6–8 restructuring must not be back-applied; campus GIS absent |
| Keller | Official parent Maps and district locator exist | Separate 2018–19 City of Keller ES/intermediate/MS/HS polygon layers are historical; current licensed GIS not confirmed |
| Northwest | 2026–27 school boundaries board-approved January 12, with new Romer ES and Barksdale MS | 2027–28 HS proposed areas are **not** current; grade 5/7/8 grandfathering may supersede simple zoning; no licensed GIS downloaded |
| Grapevine-Colleyville | Dove and Bransford Elementary consolidated for 2026–27 | District printed map vintage, special transfer/lottery, campus-level vector GIS and automated address lookup unverified |
| Celina | Current Elementary Attendance Boundaries online | 2027–28 elementary boundary changes are proposals; current middle/high campus assignment and GIS not verified on that source |
| Princeton | Official separate **2026–27** and **2027–28** school finders and grade maps | Select correct current year; future maps cannot replace them |
| Anna | 2026–27 interactive maps; apartments have a separate named-complex selector | Regular street-address query alone may not resolve unit-specific assignment |
| Denton | March 24 2026 board-approved elementary rezoning repurposes Paloma Creek starting 2026–27 | 2028–29 Mia Price HS boundary maps are not current; transfer exceptions and per-campus GIS not verified |
| Melissa | Official map page specifically describes **2025–26** | Its current 2026–27 edition must be verified; cannot silently promote its map to current source |
| Little Elm | District publishes elementary and middle school zones via official Finder | High school and source GIS academic year require independent confirmation |

## Campus-level transition evidence (separate from TEA historical ratings)

Machine-readable campus status file: `data/dfw-noncfb-campus-transition-evidence-2026.json` (7 evidence rows). Five records carry the exact historical nine-digit TEA campus ID; the two newly opened Northwest campuses use **null**, not an invented ID, and preserve unrated status until their real official identities become available in an updated TEA extract.

| District | TEA ID | Campus | Effective year | Correct interpretation |
| --- | --- | --- | --- | --- |
| Denton | `061901120` | Paloma Creek Elementary | 2026–27 | Repurposed; no general intake in this year; address-specific student reassignment needed |
| GCISD | `220906103` | Dove Elementary | 2026–27 | Consolidated; former TEA record not a currently zoned school |
| GCISD | `220906108` | Bransford Elementary | 2026–27 | Consolidated; former TEA record not a currently zoned school |
| Carroll | `220919106` | Durham Intermediate | **2027–28** | Future closure; **do not** mark closed in 2026–27 |
| Carroll | `220919102` | Carroll Elementary | 2026–27 | Still active, feeder route changed; not a closed campus |
| Northwest | `null` | Romer Elementary | 2026–27 | New school opened in Aug 2026, absent from supplied preliminary TEA 2026 rating snapshot |
| Northwest | `null` | Barksdale Middle | 2026–27 | New school opened in Aug 2026, absent from supplied preliminary TEA 2026 rating snapshot |

The campus-level tests reconcile all five identifiers and names to `tea-ratings-2026.json`, confirm the two Northwest schools are absent there and preserve the distinction between a future plan and an already-effective reassignment. These records **do not update the historical TEA snapshot**, do not claim any household assignment, and do not themselves render school markers or polygons. They are an explicit supplemental source for future safe school-detail UI treatment.

## Data and fail-closed QA

- Machine-readable per-district sources, grade coverage, year issues and special-campus exceptions: `data/dfw-noncfb-grade-year-source-evidence-2026.json`.
- The source evidence preserves a `sourceFootnote` for each district; `district-registry.js` passes it to the user-facing source guidance and the deterministic `data/dfw-school-coverage-matrix-2026.json` captures it as `parentGuidance.yearCaution`.
- New `tests/dfw-noncfb-grade-year-source-quality.test.cjs` rejects missing current/future caveats, wrong official HTTPS links, invented campus geometry, undocumented year, unconfirmed reuse, and changes to the known 65/108 source-route denominator. No change to (null) DFW-wide GIS coverage or (null) residential E2E coverage.
- Existing West DFW school sources and school marker/zone code remain untouched.
- Neither source evidence nor tests authorizes bulk automated Finder access or GIS republication. Official Finder provider/district rights must be reviewed before creating a licensed derived reference polygon. A footnote is **not** a substitute for this.
- Strict independent residential address → official Finder → exact campus → school click → visible map polygon release gate remains NO-GO pending evidence (separate PR #148). This batch does not waive it.

## Official research references (2026-11-09)

- Carroll: https://www.southlakecarroll.edu/district-information/district-departments/student-services/online-enrollment-portal and https://www.southlakecarroll.edu/consolidation
- Keller: https://www.kellerisd.net/about-kisd/maps and https://gis.cityofkeller.com/arcgis/rest/services/Kellermaps/KEL_KISD_AGO/MapServer
- Northwest: https://www.nisdtx.org/departments/facilities/attendance-boundaries/proposed-2026-2027-boundaries and https://www.nisdtx.org/departments/facilities/attendance-boundaries/2027-2028-boundaries
- Grapevine-Colleyville: https://www.gcisd.net/page/attendance-area-maps/ and https://www.gcisd.net/article/2594779
- Celina: https://www.celinaisd.com/who-we-are/attendance-zones
- Princeton: https://www.princetonisd.net/departments/enrollment/attendance-zones
- Anna: https://www.annaisd.org/parents-students/attendance-zones
- Denton: https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27 and https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification
- Melissa: https://www.melissaisd.org/page/interactive-zoning-map
- Little Elm: https://www.littleelmisd.net/for-parents/enrollment-registration/attendance-zones

**Next source-to-map work (separately approved and licensed):** first seek official 2026–27 downloadable campus GIS from Northwest or Denton, because they have explicit board-approved year-specific sources; otherwise perform permitted Finder sample cross-validation. Explicitly exclude CFB from this independent workstream. No production merge until owner sign-off and checks against updated main.
