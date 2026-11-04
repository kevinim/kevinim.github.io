# School attendance boundary data — North Dallas Explorer

Generated / reviewed: 2026-11-03 (America/New_York)

## Automated map layers

| File | District | Polygons | Original authority | School-year / record vintage | Status |
| --- | --- | ---: | --- | --- | --- |
| `plano-attendance-2019.geojson` | Plano ISD | 132 | City of Plano OpenData SchoolAttendanceZones FeatureServer (layers 0–3) | 2019–20 (metadata updated Jan 2020) | Historical reference only |
| `allen-attendance-historical.geojson` | Allen ISD | 20 | City of Allen GIS School_Attendance_Boundary_[Elementary/Middle/High_School] | 2023 (elementary, middle); 2019 (high) | Historical reference only |

Each feature contains a `school` name, `sourceDistrict`, `gradeLevel`, `sourceVintage`, and `current:false` field. ZIP ZCTAs are separate from attendance boundaries. No public map should imply historical zones are current admission-eligible residences.

The website automatically fetches both GeoJSON files, matches the clicked school to its area, and displays historical polygons in orange dashed borders alongside explicit year labels and links to official current address lookups. No user upload is necessary.

## Matching QA

Compared map data with known school names from the municipal 2022 coordinates and published 2026 A-rated school listings:

- Plano ISD: 62 of 63 known campuses have a matching historical polygon (Academy High School is an unmatched specialty campus).
- Allen ISD: 12 of 14 known campuses have matching historical polygons (George J Anderson Early Childhood School and Lowery Freshman Center excluded). Nine matches use unique campus surname aliases.
- Match totals indicate historical data linkage only, **not** current boundary accuracy.

## Current 2026–27 sources

- Frisco ISD official zone search: https://www.friscoisd.org/page/2026-2027-zones/
- Frisco ISD official 2026–27 map PDFs: https://www.friscoisd.org/page/2026-2027-zones/ and https://www.friscoisd.org/page/zone-downloads/
- Prosper ISD official zone maps / address lookup: https://www.prosper-isd.net/page/attendance-boundaries/
- Plano ISD official descriptions: https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/attendance-boundary-descriptions
- Plano 2025–26 closures/rezoning: https://www.pisd.edu/about-our-district/long-range-facility-plan/background
- Allen ISD official address check: https://www.allenisd.org/page/findaschool

**Newer campus-level polygons are not yet available as a verified public georeferenced vector source for Frisco, Prosper, or the rezoned 2026 Plano geography.** Color-coded schematic PDF maps cannot safely be interpreted as precise parcel-level polygons without georeferencing and independent map/address-level validation. The dashboard links to the current official 2026–27 lookup rather than generating false boundaries.

## Other map data

- `zips.geojson`: 11 NCTCOG/Census ZCTAs, not school zones.
- `schools.json`: 73 City of Plano GIS coordinates, last updated 2022.
- `schools2026-{1,2,3,4}.json`: 26 2026 address-based geocoded locations, quality-filtered. Combined map coverage 96 school coordinates after deduplicating.
- `ratings2026.json`: 108 A-rated scores from published 2026 campus lists citing TEA; absence from this list must be displayed as unverified, not as a failing grade.
- OSRM route-duration estimates do not include traffic. Exact address-to-campus assignment must always be checked with the district.

