# North Dallas Explorer — school boundaries, ratings and census data

**Primary production site:** https://kevinim.github.io/  
**GitHub repository:** `kevinim/kevinim.github.io` (`main`)  
**Checked:** 2026-11-06 (America/New_York)  
**Active school year:** 2026–27

## School attendance polygons: six-district audit

**Source acquisition update (2026-11-06):** The full official **2026–27 Prosper ISD** 31-campus polygons have been acquired into the new, source-validated `prosper-attendance-2026.geojson` file, with a reproducible `scripts/fetch-prosper-2026-zones.mjs` converter. After **43/43 independent source lookups** (31 school-zone interiors and 12 boundary-adjacent points), the official 31-zone source is now **active in the production map and school candidates for home addresses**. The former 13-zone Celina file is retained only as a historical reference. Specific residence/unit/program enrollment exceptions still require district confirmation. Full research log: [SCHOOL_ZONE_SOURCE_ACQUISITION_2026-11-06.md](SCHOOL_ZONE_SOURCE_ACQUISITION_2026-11-06.md).

| District | Geometry currently used | Vintage and confidence | Official address lookup |
| --- | --- | --- | --- |
| Frisco ISD | Live `static.friscoisd.org/js/json/school.borders.2627.json` | **2026–27**, latest-year source; capacity and enrollment exceptions still apply | [FISD zones](https://www.friscoisd.org/page/2026-2027-zones/) |
| Plano ISD | `plano-locator-reference.geojson`, **64** polygons sourced from official Plano ArcGIS `Plano_ISD_School_Districts/FeatureServer` | **2025–26** (`2526` fields); current-year equivalence **unverified** | [Plano SchoolFinder](https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder) |
| Allen ISD | `allen-attendance-historical.geojson`, **20** polygons | Elementary 16 + middle 3: **2023**; high 1: **2019**. Historical only | [Allen Find-A-School](https://www.allenisd.org/page/findaschool) |
| Lewisville ISD | Live MetroStudy ArcGIS Web Map `03c099e24d304c4fa0f4ce8a76c10062` polygon feature collections | Locator is titled **2026–27**, but the **high-school polygon layer reports `SCHL_YEAR: 2025-26`**; middle/elementary GIS polygons have no definitive source-year field. Historical/undated reference only | [LISD School Locator](https://www.lisd.net/resources/families/school-locator) |
| Prosper ISD | **`prosper-attendance-2026.geojson`, 31 whole-district campus zones** (20 elementary, 7 middle, 4 high) | **Official 2026–27 Infofinder i**; independently checked **43/43** interior and boundary-edge points against district's live school-assignment search. Active in map/home candidates. Actual residence and enrollment exceptions must still be checked by ISD | [Prosper 2026–27 approved boundaries](https://www.prosper-isd.net/page/attendance-boundaries/) / [Current Infofinder i](https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1) |
| Carrollton–Farmers Branch ISD | No GIS polygon linked | Official locator references **March 6, 2025 board-approved** zones and 2026–27 registration. Public GuideK12 search is available but its polygons are not independently exported/validated | [CFB School Search](https://www.cfbisd.edu/students/school-maps-locator-system) / [Current GuideK12 address tool](https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/) |

**Interpretation:** **Two of six** districts now render verified 2026–27 campus attendance polygons in the live app (**Frisco and Prosper**). Current polygon shapes indicate potential school zones, not enrollment eligibility. This is not the percentage of schools, students, residences or land affected. The 2025/2023 data can still be a useful *visual reference*, but must not be labeled current.

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

### Prosper/Celina city GIS discovery — 2026-11-06

A search of public ArcGIS feature services identified three feature layers owned by `lisakasemodel-celinatx` / City of Celina. All three have a last data edit of **2026-09-09**, but **none records an academic school year**:

- [Elementary school zones](https://services1.arcgis.com/x4nhme9V33KOzAfr/arcgis/rest/services/Prosper_ISD_Elementary_Zones/FeatureServer/0): 7 polygons, including Johnson, Christie, Light Farms, Thomson, Lilyana, Boyer and Smothermon.
- [Middle school zones](https://services1.arcgis.com/x4nhme9V33KOzAfr/arcgis/rest/services/Prosper_ISD_Middle_Zones/FeatureServer/8): 3 polygons, Moseley, Reynolds and Bridges.
- [High school zones](https://services1.arcgis.com/x4nhme9V33KOzAfr/arcgis/rest/services/PISDHighZones/FeatureServer/43): 3 polygons, Prosper, Walnut Grove and Richland. The original high-layer label field is misleadingly called `MiddleScho`, so it was normalized using the **high-school service's** identity, not the field name.

The exported WGS84 GeoJSON is stored in `prosper-celina-reference-2026.geojson`. Each feature has `current:false`, `sourceDistrict:PROSPER`, `gradeLevel`, source URL and explicit partial-coverage/vintage caveats. This is **not a complete Prosper ISD zone map**, and a city GIS edit date is **not proof** of 2026–27 enrollment eligibility. The app **no longer loads these 13 Celina polygons at all**; the historical partial file is retained for audit and rollback, not address-to-school assignment. The district's [approved Jim Bridges Middle School zone](https://www.prosper-isd.net/article/2560387) and official approved 2026–27 PDFs remain the source of truth.

**2026 campus gap:** Jim Bridges Middle School opened in 2026–27 and is absent from the 2026 TEA rating extract. Added to searchable school list as an explicitly *unrated/new campus*, without fabricated school coordinates; the listed address comes from [Prosper ISD's official Maps & Directions](https://www.prosper-isd.net/o/pisd/page/maps-directions). An official address lookup is still required.

### Prosper current-year official independent cross-check — 2026-11-06

The current parent-facing [Prosper Infofinder i](https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1) exposes **two independent public functions**: `GetRedistrict` provides georeferenced zone shapes and `SearchLocation` returns the actual campus codes assigned to a coordinate selected in the map.

- **31 of 31** campus zones: selected a deep-interior WGS84 coordinate for every school and confirmed that the independent `SearchLocation` response returned that school's campus code.
- **12 of 12** boundary-adjacent coordinates: used pairs on both sides of **six campus-to-campus borders** (two elementary, two middle, two high). All 12 official search results agreed with the expected polygon side and returned different school codes across each boundary.
- **Total: 43 of 43 successful**, with no campus-code disagreements. Full vector QA cases: `tests/prosper-official-location-checks-2026.json`. Repeatable official live test: `node scripts/check-prosper-official-locator.mjs`.
- These are **synthetic map-click coordinates, not verified residential street addresses**. Registration eligibility, apartment unit-level exceptions, transfers and special programs are not proven by polygon coverage. The site labels results as school *candidates* and links to the official district lookup.

### Plano and Allen current official lookup audit — 2026-11-06

**Plano:** The current district [Attendance Boundary Descriptions](https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/attendance-boundary-descriptions) page publishes **11 elementary→middle→high→senior feeder routes** (43 elementary references corresponding to 42 unique elementary campus names, 11 middle campuses, 6 high campuses and 3 senior highs). All 42 elementary, 11 middle and 6 high names have matching campuses in the **2025–26** linked ArcGIS source. This provides **campus-name/feeder consistency only**, **not verification that the boundary geometries remain unchanged for 2026–27**.

A critical exception is **Jackson Elementary**: the official district describes a split **east of Coit Road → Wilson Middle → Vines High → Plano Senior High**, and **west of Coit Road → Frankford Middle → Shepton High → Plano West Senior High**. The single school name is not enough to infer either chain for an address. The dashboard now warns on selecting Jackson. A reproducible structured snapshot of the undated published feeder reference is in `plano-official-feeder-reference-2026.json` (`academicYearExplicit:null`). Official 2026–27 [Plano SchoolFinder](https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder) remains the address-level authority.

**Allen:** Audited the current official [Find A School](https://www.allenisd.org/page/findaschool) table at **1,689 visible street-range rows** vs **1,687 originally cached**. Found a valid additional official entry **2050 Peak St → Evans / Ereckson / Lowery / Allen High**; added it to the snapshot. Another newly published row **Moss Haven PL, range `2009 – 202-216`** is malformed and was **not imported**. An existing official row **Crestview Heights, range `2050 Peak St`** is also malformed and is retained only as source provenance, never numerically matched. Thus **1,688 rows in the updated local snapshot, of which 1,687 are parseable numeric address ranges**; **2 malformed official rows** in total. Four markdown-escaped `***SEE NOTES BELOW` display differences were normalized as **formatting**, not new address records.

Neither the current Allen address table nor the separate City GIS has an explicitly verified **2026–27 campus boundary source year**. The street-level source is useful for *candidate* assignments only; it cannot upgrade 2019/2023 GIS polygons to current-year status. The four apartment/unit exceptions in the district's official guide remain explicitly excluded from automatic assignment and require an Allen registrar confirmation. Data-quality evidence: `allen-official-address-source-audit-2026.json`.

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
| `prosper-celina-reference-2026.geojson` | 13 partial reference polygons | City of Celina updated September 9, 2026; academic school year **not documented**; **archived only, NOT loaded** |
| `prosper-attendance-2026.geojson` | **31 full Prosper campus attendance zones** | **Official 2026–27 Infofinder i**: 20 elementary, 7 middle, 4 high; exact school year and identifiers verified. **Live school boundary and address-candidate use after 43/43 official crosschecks** |
| `plano-official-feeder-reference-2026.json` | 11 official Plano feeder routes | Published page current but academic year not stated; Jackson east/west Coit split |
| `allen-official-address-source-audit-2026.json` | 1,689 official Allen street rows, 1,687 parseable | 2 malformed ranges excluded from numeric matching; no 2026–27 zone-year confirmation |
| `school-data-provenance.json` | Six district records and key file counts | Machine-readable audit updated November 6, 2026 |

**No guessed 2026–27 GeoJSON** should be constructed from a schematic PDF or mixed-year locator without validated alignment to district addresses. Verify any specific home, grade, and special program at the district itself.

## Release QA and maintenance

Run `node scripts/verify-main-data.mjs` locally or through the GitHub Actions main-site data-integrity workflow. Its checks cover existing HTML script parsing, critical home/commute/compare functionality hooks, valid files, counts, six-district provenance and the absence of the unsafe 2019 Plano fallback.

Before changing geometry: verify the source owner, layer version, school-year fields, campus-name linkage, polygon ring structure and at least several boundary-adjacent home addresses. Keep data vintages visible. Merge only after checks and re-test the real root domain; changing `data-science-team/docs` will **not** change the production root site.
