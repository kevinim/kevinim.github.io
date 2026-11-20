# Plano and Lewisville public map source / year closure — Nov 20, 2026

Scope: owner-approved next DFW GIS/source priority after CFB + Denton. **No district-email waiting**, no fabricated GIS current-year approvals, no user residence submitted or logged. Source-linked reference candidate is distinct from district-approved, public GIS, certified residence school, vendor API and redistribution rights.

## Plano ISD (TEA 043910)

- Official **2026–27** SchoolFinder: https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder and its current linked ArcGIS 4-level service https://services4.arcgis.com/uBV8NRVfoRJv7qWn/arcgis/rest/services/Plano_ISD_School_Districts/FeatureServer . The layer fields remain marked **2526 / 2025–26** (`SR2526`, `HIGH2526`, `MID2526`, `ELEM2526`). This is a real official link **not proof** that all shapes were independently revalidated for 2026–27.
- Existing source feature manifest: 64 polygons, elementary 44, middle 11, high 6, **senior high 3**. 62 of the 63 loaded dashboard schools had reference name linkage in a prior CI run (not TEA 69-campus current GIS rate, not house assignment accuracy). A separate feeder table 11 paths and 2,200 interior geometry-versus-feeder checks (zero discrepancy) validate consistency among district-linked sources, **not** legally zoned street address.
- **Independent City of Plano OpenData**: https://maps.planogis.org/arcgiswad/rest/services/OpenData/SchoolAttendanceZones/FeatureServer ; official layer metadata states *January 2020 last edited based on school year 2019–20*. This separate historic GIS must never be substituted for the Finder's 2025–26 source or labelled 2026–27. Source https://maps.planogis.org/arcgiswad/rest/services/OpenData/SchoolAttendanceZones/FeatureServer/1 .
- **Parent-facing feeder**: https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/attendance-boundary-descriptions . Jackson Elementary splits **east/west of Coit Rd**, and Plano has senior high in addition to high. Do not infer from a three-level E/M/H ZIP school roster.
- Historical recorded public business address ArcGIS point query produced four service-based level matches, but the parent SchoolFinder browser itself returned no independently confirmed complete address result. Current verified household-level assignment rate remains unknown; UI must explicitly link to the official SchoolFinder.

## Lewisville ISD (TEA 061902)

- Official **2026–27 School Locator** https://www.lisd.net/resources/families/school-locator instructs how to select an address on its map and explicitly says use a different **Find an Apartment** icon and apartment name for multi-unit housing.
- District-linked web map https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/03c099e24d304c4fa0f4ce8a76c10062/data?f=json . High zones carry a **2025–26** source reference; elementary/middle school-specific geometry's effective academic year remains unverified. A previously inspected Infofinder manifest also listed 25–26 layers; the site has 2026–27 parent UI but linked vector vintage is not proven consistent in all grades.
- Previous source-linked mapping inventory had **696 multipart fragments**, with **53 of 54** loaded dashboard school entries name-matched; neither is 2026–27 verified campus GIS coverage or household correctness across the TEA 57-campus list.
- Apartment reference table: 174 rows / 173 distinct names; 173 of 174 tabular point labels matched a map-derived E/M/9th/high set; **one conflicting Budget Suites of America at 5289 S Highway 121** has a 4-stage discrepancy between the same publisher's apartment listing and polygons. No source wins automatically. Multi-unit specific assignments require the official Find an Apartment experience. The apartment source did not carry a verified school year; do not equate 173/174 with a new admission accuracy rate.
- Lewisville official feeder page https://www.lisd.net/our-district/about/attendance-zones carries split-feeder school names marked `*` that can feed multiple campuses; cannot infer precise school from elementary attendance alone.

## Product implementation

- `data/dfw-plano-lewisville-source-vintage-20261120.json`: six dimensions kept separate: official parent locator publication, source field vintage, reference GIS visibility, special grades/apartments/split patterns, independent official result, and rehosting/approval rights.
- Existing lazy `features/dfw-school-coverage-renderer.js`: strictly validates both source records; adds **Plano 연도 / Lewisville 연도** quick links to show compact collapsible year-specific caveats and official parent lookup links. Old CFB/Denton evidence and 108/108 parent guidance registry remain unchanged.
- No new feature-layer download, no third-party API via home address, no parent location information transmitted. The `ConditionalSchoolRelease` residential approval set stays empty. An unavailable/new-source failure must leave the existing DFW explorer functional and never mark the missing GIS as 2026–27 confirmed.
- Strict Node negative evidence validation and Playwright 390/1366px regression; new loader/renderer cache URL version only, with historical HTML pin assertions explicitly reconciled. No new CI workflow, free GitHub Pages only.

## Research outcome and next movement

Both districts have usable and already linked **reference** maps but **current-year zone accuracy and actual household assignment are not certified**. Public-source research for these two is closed as an *evidence pass*, not as full residence E/M/H deployment. Do not wait for ISD email or a complete current-year original GIS before moving to additional high-priority DFW ISDs. Source updates should be a separately verifiable change with source year and affected campuses, no silent overwrites.
