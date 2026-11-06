# North Dallas Explorer — school boundaries, ratings and census data

**Primary production site:** https://kevinim.github.io/  
**GitHub repository:** `kevinim/kevinim.github.io` (`main`)  
**Checked:** 2026-11-05 (America/New_York)  
**Active school year:** 2026–27

## School attendance polygons: six-district audit

| District | Geometry currently used | Vintage and confidence | Official address lookup |
| --- | --- | --- | --- |
| Frisco ISD | Live `static.friscoisd.org/js/json/school.borders.2627.json` | **2026–27**, latest-year source; capacity and enrollment exceptions still apply | [FISD zones](https://www.friscoisd.org/page/2026-2027-zones/) |
| Plano ISD | `plano-locator-reference.geojson`, **64** polygons sourced from official Plano ArcGIS `Plano_ISD_School_Districts/FeatureServer` | **2025–26** (`2526` fields); current-year equivalence **unverified** | [Plano SchoolFinder](https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder) |
| Allen ISD | `allen-attendance-historical.geojson`, **20** polygons | Elementary 16 + middle 3: **2023**; high 1: **2019**. Historical only | [Allen Find-A-School](https://www.allenisd.org/page/findaschool) |
| Lewisville ISD | Live MetroStudy ArcGIS Web Map `03c099e24d304c4fa0f4ce8a76c10062` polygon feature collections | Locator is titled **2026–27**, but the **high-school polygon layer reports `SCHL_YEAR: 2025-26`**; middle/elementary GIS polygons have no definitive source-year field. Historical/undated reference only | [LISD School Locator](https://www.lisd.net/resources/families/school-locator) |
| Prosper ISD | No GIS polygon linked; approved 2026–27 PDF maps available | Official current-year map exists, but no parcel-validated vector geometry has been imported | [Prosper Attendance Boundaries](https://www.prosper-isd.net/page/attendance-boundaries/) |
| Carrollton–Farmers Branch ISD | No GIS polygon linked | Official locator references **March 6, 2025 board-approved** zones and 2026–27 registration. No geometry export verified | [CFB School Search](https://www.cfbisd.edu/students/school-maps-locator-system) |

**Interpretation:** Exactly **one of six** districts has 2026–27 current-year **polygon source** verified for this site's map (Frisco). This is not the percentage of schools, students, residences or land affected. The 2025/2023 data can still be a useful *visual reference*, but must not be labeled current.

### Plano ArcGIS lineage

- Official SchoolFinder ArcGIS Experience item: `73a3f873d9c040348d6e723ed4b48af4`, linked web map `68c373c99db1425e9f0030a689efa742`.
- Official `Plano_ISD_School_Districts` FeatureServer layer titles: Senior High 2526, High 2526, Middle 2526, Elementary 2526; data edits dated March–April 2025.
- The production site already has 64 polygons of that vintage in `plano-locator-reference.geojson`, with explicit unverified-year labeling. **Do not recopy the project site's parallel 64-polygon file** or mistakenly replace these with 2019 maps.
- `plano-attendance-2019.geojson` (132 features, 2019–20 municipal source) is retained **only as an archival file**. Since 2026-11-05 it is **not loaded by the main application and not used as school-click fallback**. If a campus is unmatched to 2025–26 reference, show no polygon rather than a misleading older shape.

### Lewisville ArcGIS lineage

- Official web app `8b1628e7345e4a98a4dcf6c852581656`, web map `03c099e24d304c4fa0f4ce8a76c10062` at `portal.metrostudygis.com`.
- Elementary boundary feature collection contains 676 *geometrical pieces* (not 676 schools); middle 15 polygons; high 5 polygons.
- High-school source field `SCHL_YEAR` is 2025–26 across all 5 polygons, while elementary/middle source year is not explicit. The web app title is insufficient evidence to upgrade these geometries to verified 2026–27.
- School point feature collection includes older `2016-17` metadata, which is not itself the boundary school-year.

### Allen and address-level exceptions

- City of Allen official public GIS has elementary 16 + middle 3 polygons last marked 2023 and high 1 polygon marked 2019. These are **historical** references.
- `allen-address-schools.json` is a separate **year-undated** official address-index reference. It is not a substitute for confirming enrollment eligibility. Allen ISD explicitly lists apartment/unit-level school-district exceptions; check actual building and unit in the official site.

## Demographics, ratings, locations and commute data

| File or source | Coverage | Vintage / usage |
| --- | --- | --- |
| `dfw-demographics.json` | 292 ZIP/ZCTA profiles | 2020–2024 ACS five-year estimates; latest five-year ZIP-granularity release as of this review. Census plans 2021–2025 five-year for Dec 2026 |
| `tea-ratings-2026.json` | 2,282 TEA DFW-area campus records | 2026 preliminary accountability ratings downloaded Nov 3, 2026; school-ID linked where possible |
| `nces-locations-2024.json` | 2,213 location records | 2024–25 school address/coordinate reference; coordinates are not proof of current assignment |
| `dfw-zcta-boundaries.geojson` and `county-scopes.json` | Regional ZIP polygons and county scopes | ZIP statistics boundaries **are not** school attendance boundaries |
| `jpm-road-times-2026-11-04.json`, `jpm-60min-isochrone-2026-11-04.geojson` | ZIP representative route calculations and 60-minute isochrone | Road network estimates from Nov 4, 2026; **no traffic** or parcel-specific guarantee |
| `school-data-provenance.json` | Six district records and key file counts | Machine-readable audit written November 5, 2026 |

**No guessed 2026–27 GeoJSON** should be constructed from a schematic PDF or mixed-year locator without validated alignment to district addresses. Verify any specific home, grade, and special program at the district itself.

## Release QA and maintenance

Run `node scripts/verify-main-data.mjs` locally or through the GitHub Actions main-site data-integrity workflow. Its checks cover existing HTML script parsing, critical home/commute/compare functionality hooks, valid files, counts, six-district provenance and the absence of the unsafe 2019 Plano fallback.

Before changing geometry: verify the source owner, layer version, school-year fields, campus-name linkage, polygon ring structure and at least several boundary-adjacent home addresses. Keep data vintages visible. Merge only after checks and re-test the real root domain; changing `data-science-team/docs` will **not** change the production root site.
