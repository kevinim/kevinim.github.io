# Allen ISD historical GIS precision restoration — 2026-11-21

Tracking: [GIS issue #376](https://github.com/kevinim/kevinim.github.io/issues/376) / TX-P1-01. This restores **historical reference shape precision only**, never certified 2026–27 school assignment.

## Root cause and independent publisher evidence

The 20 existing `allen-attendance-historical.geojson` features were highly simplified. A bounded 120×120 point sample exposed 5 elementary and 2 middle same-grade overlaps. The City of Allen ArcGIS service returned exactly **one** school at six replayed non-residential point samples, but the existing local reference contained both.

At the Green/Cheatham sample (-96.706807, 33.132692):
- The simplified local **Green** polygon contained the point.
- The publisher's original high-precision **Green** polygon did **not**.
- Publisher `/query` spatial response returned **Cheatham** (YearUpdated 2023).

Vertex evidence before/after:
- Green Elementary: 44 → 176;
- Cheatham Elementary: 59 → 178;
- Boon Elementary: 50 → 169;
- all 20 school features: **787 → 5,668** vertices.

Official public source:
- E: https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_Elementary/MapServer/0
- M: https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_Middle/MapServer/0
- H: https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_High_School/MapServer/0
- Parent registrar authority: https://www.allenisd.org/page/findaschool

Direct per-layer `/query?where=1%3D1&outFields=SchoolName,YearUpdated,SchoolAddress&outSR=4326&returnGeometry=true&f=geojson` was read as a public, non-address-specific municipal GIS source. The geometry is **unmodified** except serialized as JSON. Original school identities and `YearUpdated` were independently checked against the previous file; E16/M3 `2023`, H1 `2019`.

## Six nonresidential point-query holdouts

| Elementary or Middle | Longitude | Latitude | Old local sources | Published source and restored file |
| --- | ---: | ---: | --- | --- |
| Evans / Green | -96.716904 | 33.103397 | Evans + Green | Green |
| Green / Cheatham | -96.706807 | 33.132692 | Green + Cheatham | Cheatham |
| Green / Boon | -96.689980 | 33.105773 | Green + Boon | Boon |
| Bolin / Vaughan | -96.655203 | 33.073311 | Bolin + Vaughan | Bolin |
| Ford / Curtis | -96.621548 | 33.100230 | Ford + Curtis | Curtis |
| Kerr / Green | -96.7144185 | 33.1262058 | Kerr + Green | Kerr |

These are mathematical public point fixtures, **not household addresses** and not source evidence for 2026–27 school admission.

## Implementation and safety

1. `allen-attendance-historical.geojson` now contains the City of Allen's original-precision WGS84 GeoJSON polygon vertices with the same 20 named campuses, retained historical years, `current:false` and `sourceDistrict:'AISD'`; it remains orange dashed **reference only**.
2. `data/school-data-release-lock.json` pins the reviewed new Git blob identity, historic-only classification, unchanged 20 feature count, and direct source check date. No other school-source file is changed.
3. `tests/allen-historical-original-precision.test.cjs` checks all source classifications, 5,668 vertices, polygon rings, six official point holdouts, exact Git blob SHA and zero residential auto grants.
4. The existing `school-polygon-linkage-census.yml` workflow runs the new test (no additional CI workflow, queue or network request).
5. The public GIS service currently publishes a historical data layer (E/M YearUpdated=2023; H=2019). Metadata publication date differs from update year and cannot be invented. City GIS is not a legal survey. User must verify address/street/unit and actual enrollment at the official Allen ISD Finder before leasing.
6. Source attribution: City of Allen GIS / Allen ISD. Geometry is a public city-hosted reference used for a personal noncommercial project; retain rights and attribution review before broader commercial redistribution.

## Release and rollback

Run existing source integrity/preflight, polygon linkage and real browser map-marker tests; a passing unit suite is not deployed Pages evidence. Verify 1366px and 390px school-selected shape rendering, historical label and reference-only behavior after deploy. Rollback to the prior blob `5486f7c71d9f95dd4c6f9d99c01ed992df1c8474` and manifest SHA only if regressions are proven. Do not revert to simplified shapes merely because they have fewer coordinates.

**Remaining:** 2026–27 independent exact-residence Finder certification; other historical zones' full residential and age validation; Prosper E/M/H cross-grade mismatch source/land-use classification, and campus enrollment capacity exceptions.
