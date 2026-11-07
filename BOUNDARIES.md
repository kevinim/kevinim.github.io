# North Dallas Explorer — school boundaries, ratings and census data

**Primary production site:** https://kevinim.github.io/  
**GitHub repository:** `kevinim/kevinim.github.io` (`main`)  
**Checked:** 2026-11-06 (America/New_York)  
**Active school year:** 2026–27

## Public facility street addresses and Plano cross-layer QA — 2026-11-06

- Tested **four public institutional addresses** (never private homes) against official live district address/coordinate Finders, independent Esri address geocodes and published school zone polygons: Frisco ISD HQ `5515 Ohio Dr` → Shawnee Trail / Clark / Lebanon Trail; Frisco City Hall `6101 Frisco Square Blvd` → Bright / Griffin / Frisco; Prosper ISD HQ `605 E 7th St` → official Infofinder codes 102/042/001; Prosper High campus `301 Eagle Dr` → codes 108/042/001. **4/4 public property samples agree**. Frisco results are official Finder UI snapshots, while Prosper API is re-callable. Exact coordinates and limits in `tests/public-address-finder-crosscheck-2026.json`, recheck script `scripts/check-public-address-finders-live.mjs`.
- The Plano current operating 2026–27 Finder's internally 2025–26-named **44 elementary polygons** were sampled at **50 strictly interior points per polygon (2,200 points)** and compared to distinct current district-published 11 feeder chains and all three upper school-zone layers. **0 uncovered polygons / 0 cross-layer feeder disagreements**. Checks ensure each point has exactly one middle, high and senior zone and that it matches one official elementary feeder chain, including the two official Jackson east/west of Coit paths. Audit file `tests/plano-feeder-geometry-audit-2026.json`; reproducible live checker `scripts/check-plano-feeder-zones-live.mjs`. This is independent district document vs GIS cross-check, not independent actual home-address lookup.
- CFBISD GuideK12 on public headquarters `1445 N Perry Rd` displayed an unfiltered school listing and no uniquely visible zoned school in this browser attempt. Marked **inconclusive**; do NOT generalize that the official Finder is broken or that all addresses fail.
- **No accuracy percentage for actual residential addresses** is claimed. School campuses, office buildings and civic buildings do not establish a right to enroll; geocoded parcel position, district registrar and address/unit/grade-specific exceptions still matter.

## Current official district Finder is practical zoning source — 2026-11-06

Operational policy: A district's **currently published School Finder** is the practical line source. Its old internal GIS field-year does not by itself invalidate the currently served map. Keep separately **(1) currently district-operated** and **(2) independently certified 2026–27 GIS source vintage**.

- **Frisco/Prosper:** independently 2026–27 school GIS (green).
- **Plano:** 2026–27 SchoolFinder's ArcGIS WebMap embeds `Plano_ISD_School_Districts`, still named 2025–26. The dashboard now loads its 4 FeatureServer layers **live** (3 Senior, 6 High, 11 Middle and 44 Elementary polygons representing 42 elementary schools). Independently published feeder paths contain **exactly the same school names**: senior 3/3, high 6/6, middle 11/11, elementary 42/42. This is a school-name crosscheck, NOT per-address verification. If ArcGIS cannot be fetched, the dashboard uses a clearly historical cached reference, not a purported live source (blue live, orange old).
- **Lewisville:** the district's current locator links the live `Lewisville SZF 2627` webmap, including high school polygons with internal `SCHL_YEAR=2025–26`; 173/174 public apartment points internally agree at all 4 levels, one 5289 Hwy 121 disagreement remains. Operational Finder link is blue, not independent 2026–27 proof.
- **Allen:** 2019/2023 campus GIS unlinked to current Find-A-School street address table, so old orange dashed zones are now hidden by default. Current published 1,689 street rows / 1,687 parsed and split-apartment exception remain the primary address source.
- **CFB:** official GuideK12 current address search primary; board-approved 2025–26 elementary/middle/high **map images** are linked on dashboard. The images are not vector GIS. No exact home-to-campus polygon was invented.

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

### CFBISD confirmed 2026–27 feeder patterns (not GIS) — 2026-11-06

CFBISD's [official enrollment FAQ](https://www.cfbisd.edu/enrollment-page/frequently-asked-questions-about-enrollment) explicitly labels its feeder table **2026–27**. The 21 zoned elementary schools route to **5 middle** and **4 high** schools; the table also distinguishes Pre-K and bilingual assignments. The structured verbatim row snapshot is `cfb-official-feeder-reference-2026.json`. **No attendance-zone vectors or address-level entitlement are inferred.** The official 2026–27 [transfer guidelines](https://www.cfbisd.edu/students/transfer-enrollment-page/transfer-guidelines) independently confirm the academic-year scope. Specifically, McLaughlin-Strickland feeds Perry Middle then Turner High, so middle-school identity must **not** be used to infer high school. CFB remains **lookup-only** for GIS, and 2/6 current-year polygon coverage is unchanged.

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

## Allen split apartments — mandatory address-level review before GIS-based school inference

- [Allen ISD Find-A-School](https://www.allenisd.org/page/findaschool) explicitly documents **four apartment addresses with building/unit-specific district eligibility**: 4450 S Ridge Rd, 4700 S Ridge Rd, 6551 McKinney Ranch Pkwy and 7830 Van Tuyl Pkwy.
- Prior parser conservatively excluded these addresses from the **Allen** street-table assignment, but that alone could let a **Frisco GIS point-in-polygon** match display an apparently current **Frisco** campus for a split property. New `allen-apartment-exceptions.js` enforces a hard-stop for **all** automatic matched school candidates for these four addresses (on high-confidence geocodes) and renders the actual official exception notes. This prevents a false binary Allen/Frisco assignment when geocoding loses apartment/unit.
- Preserve the typed original (including unit) in memory and comparison entries; check both typed and geocoded addresses after reopening a saved candidate. A complete unit must be confirmed with Allen/Frisco enrollment; the published notes do **not** authorize auto-assigning based solely on unit suffix.
- This is a safety change only: does not promote Allen's historic 2019/2023 GIS or establish a 2026–27 current-year district-wide geometry.

## Lewisville apartment point/polygon internal cross-validation — 2026-11-06

- Downloaded 174 apartment point geometries in Web Mercator from the district-linked [public apartment service](https://server.metrostudygis.com/arcgis/rest/services/apartments_lewisville/FeatureServer/0), independently intersected them against the *same* 2026–27 locator WebMap's **676 elementary fragment polygons, 15 middle polygons and 5 high polygons** (using `ELEM_PLAN1`, `INT_NAME`, `MID_NAME`, `HIGH_NAME` school fields).
- **173/174 apartment entries agree at all four listed campus levels**. Exactly **one internal disagreement**: `Budget Suites of America / 5289 STATE HIGHWAY 121`. The apartment table indicates `SOUTHRIDGE / DURHAM / LEWISVILLE HARMON / LEWISVILLE`, but its point lies in polygon fields `CAMEY / LAKEVIEW / THE COLONY / THE COLONY`. This is distinct from the *other* Budget Suites at `2175 S STATE HIGHWAY 121`, which matches its Lewisville polygons. Independent public address geocoding also places 5289 State Highway 121 in **The Colony**; this supports the locator point but is not school eligibility proof.
- The conflict is retained in `lewisville-official-apartments.json` as an explicit `internal-map-conflict`, and the UI shows **both** contradictory school sets with a stop-warning instead of declaring an assigned school. Confirm with Lewisville Student Services or official Find an Apartment.
- These 173 internal agreements are **not** 173 independently verified 2026–27 address assignments: the polygon's HIGH `SCHL_YEAR` still reads 2025–26; the independent apartment service has no year field.

## Lewisville official locator-linked apartment table — checked 2026-11-06

- The [district 2026–27 School Locator](https://www.lisd.net/resources/families/school-locator) has an explicit separate **Find an Apartment** flow.
- The district-linked ArcGIS WebMap `Lewisville SZF 2627` (item `03c099e24d304c4fa0f4ce8a76c10062`) includes the [public apartments feature layer](https://server.metrostudygis.com/arcgis/rest/services/apartments_lewisville/FeatureServer/0) with `APT, ADDRESS, ELEM_NAME, INT_NAME, MID_NAME, HIGH_NAME` fields.
- All **174 public apartment rows** were retrieved (173 distinct names, 4 lacking street address, all four campus columns present). No resident/owner data downloaded. Local site UI can search them without sending typed apartment names to a third party.
- Critically **the apartment table has no school-year field**; the 2026–27 webmap link alone does not independently verify all its school assignments. Show campus names as advisory only, not a current-year geospatial boundary or specific apartment-unit eligibility. An apartment's name/street cannot determine its building/unit assignments. Confirm in the actual official locator.

## Allen official address assignments and Allen/Lewisville GIS catalog — rechecked 2026-11-06

- Live Allen ISD `Find-A-School` table re-fetched: **1,689 public street/range rows**. All **1,688 cached rows** matched the same six-column official source (street, number range, elementary, middle, ninth-grade, high) after normalizing Markdown-escaped asterisks in four street names. The one intentionally omitted source row, `Moss Haven PL / 2009 – 202-216`, is malformed and remains unassignable; cached `Crestview Heights / 2050 Peak St` is also malformed, so only **1,687 rows** are parseable. Four published apartment-specific exclusion addresses remain quarantined.
- No published school year in the Allen street table; do not upgrade the 2023 / 2019 school-level GIS.
- Official public Infofinder `GetRedistricts` catalogs rechecked for Allen client `AI03835938622` (2023 elementary/middle sets) and Lewisville client `LI3VBOFR0JM` (four `25-26 SY` groups). **Neither provides a 2026–27 named school-boundary collection**, so they do not qualify as latest-zone geometry for this dashboard. The current Lewisville district School Locator is labeled 2026–27, but its separate MetroStudy GIS geometry year is still not fully evidenced.

## CFB 2026–27 official feeder sources: full three-way audit — 2026-11-06

- Compared all seven fields of every one of 21 zoned elementary rows on three independently retrieved district-controlled tables: [Enrollment FAQ](https://www.cfbisd.edu/enrollment-page/frequently-asked-questions-about-enrollment), [Transfer Guidelines](https://www.cfbisd.edu/students/transfer-enrollment-page/transfer-guidelines), [Pre-K Campuses](https://www.cfbisd.edu/students/prek-enrollment-page/pre-k-campuses).
- **20/21 rows match in every one of the 3 sources**. Exactly **1/21 row conflicts**: Farmers Branch Elementary. FAQ/Transfer agree on **Field Middle → Turner High**; Pre-K table says **Bush Middle → Ranchview High**. Majority source agreement is not proof of actual property address assignment; preserve `unresolved-do-not-auto-assign` and link the current GuideK12 address search.
- This is evidence that the other 20 *published feeder rows* agree, NOT evidence of 2026–27 current school-level GIS or any apartment-specific address eligibility.

## Texas home address autocomplete — 2026-11-06

- Home input now suggests **up to five Texas numbered street addresses** after at least 4 characters including a number, using Esri World Geocoding `/suggest` with a 320ms debounce and abortable requests; no API key is required on the public Esri endpoint used by the existing geocoder.
- **Important filter:** Esri `searchExtent=-106.65,25.8,-93.5,36.5` alone can return Oklahoma and Arkansas due to the rectangular extent. The UI therefore shows only `isCollection=false`, explicit `, TX, ZIP` or `, Texas, ZIP` street-address suggestions, excludes duplicated records and POIs, and limits to five entries. Esri `magicKey` is sent to the matching `findAddressCandidates` request when the user selects an item, as required by Esri's REST docs.
- Accessibility: listbox/combobox with arrow keys, Enter, Escape, Tab, pointer selection and visible focus. Selecting a suggestion geocodes an address with the **existing precision gate**; no suggestion by itself establishes a verified property parcel, school zone or registration eligibility.
- Privacy: typing any partial address may transmit that prefix to Esri after a brief pause. The disclosure is visible at the input. No stored address cache or new backend was added. Manual full-address submission continues to work if no suggestion is shown.

## P0 official address-school evidence — November 6, 2026

- **Important Plano 2026–27 correction:** the district's [2026–27 SchoolFinder](https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder) links to [current ArcGIS Experience](https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4b48af4), item `73a3f873d9c040348d6e723ed4b48af4`. Its public config references WebMap `68c373c99db1425e9f0030a689efa742` last modified 2025-05-02, and its underlying senior/high/middle/elementary group layers use exactly `Plano_ISD_School_Districts/FeatureServer/{0,1,2,3}` — the same service as our 2025–26 reference. **The district's live 2026–27 *front end* uses those geometries; this does NOT establish a 2026–27 geodata vintage or prove no changes.** Do not upgrade freshness count.
- Separate legacy page `webservice.pisd.edu/SchoolFinderForSchoolWires/` returned empty results in browser for two *public campus/district addresses*, including district headquarters 2700 W 15th and Robinson MS 6701 Preston Meadow. The legacy app has no explicit year; do not use it as a fallback for current official results.
- **Prosper live independent check:** public official `SearchLocation` API at `infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation`, client `PI5FFG7RYZ1`, can return school codes for a coordinate. `official-school-review.js` builds a user-triggered query, compares codes across 3 local current GIS levels, and labels it *coordinate-level only*. The API may not allow cross-origin browser requests; errors report unavailable, never official match.
- **Plano / Allen / Lewisville / CFB:** no independently callable 2026–27 website-supported endpoint established. The dashboard instead lets a user open each official district lookup, manually record its exact school name and academic year, and compare to the local GIS/street-based candidate **without treating the user transcription as independent verification**. Apartments and split feeders continue to require official district confirmation.
- All address/result verification inputs are in-memory only, and saved candidate comparisons preserve that session-local manual evidence. No unofficial API proxy or credential bypass.

## P0 school residence location checks — 2026-11-06

- **Collin CAD**: publicly exposed ArcGIS FeatureServer layer `CCAD_Parcel_Feature_Set/FeatureServer/4` was live-tested with point coordinates at publicly listed Allen High School (300 Rivercrest Blvd). It returned exactly one parcel with matching `situsConcat`, `propYear:2027`. This validates access and schema, not residential school assignments. A residence coordinate is sent ONLY upon clicking "필지 주소 대조"; no owner fields are requested. Street-address matches are distinguishable from mismatches, no matches, ambiguous overlaps and server errors. Parcel school-tax code is *not* a school-campus zone.
- **Current-year boundary edge risk**: Frisco and Prosper official 2026–27 geometry only; measure approximate meter distance from home pin to all matched school polygon rings. If within a conservative **150 m review buffer**, show extra warning and do not highlight a definite matched school; confirm actual address + grade + apartment with district. Existing 2/6 GIS evidence status stays unchanged.
- **Candidate comparison restore**: preserve original Esri geocoder confidence and optional independently checked parcel result in memory. Previously reopening a saved address silently lost its geocoding verification and downgraded confidence.
- Not verified: genuine enrollment by unit or special program, the four unverified-year ISDs, city-specific tax-ISD parcel status. District lookup remains authoritative.

## P0 school location and assignment protections — 2026-11-06

- 14 documented school closures/retirements are excluded from the live campus choices through `school-lifecycle.js`: 1 Frisco, 4 Plano, 5 Lewisville, 4 CFB. In particular, Frisco's Staley Middle was retired after 2025–26 but is still present with a 2026 TEA rating and 2024–25 NCES coordinates. Never infer current operating status from a rating or old point.
- Home geocoding uses `geocode-quality.js`. Unless Esri returns a precise `PointAddress` or `Subaddress` with score ≥95, a Texas result, and no ZIP mismatch, automatic assigned-school candidates are suppressed. A rough map pin is still shown with a clear warning; the district's locator is the final authority. Comparison cards preserve this quality flag.
- School detail shows the school coordinate source (including old City of Plano or NCES vintages) rather than implying all pins were verified in 2026–27.
- **CFB official contradiction**: [2026–27 enrollment FAQ](https://www.cfbisd.edu/enrollment-page/frequently-asked-questions-about-enrollment) says Farmers Branch ES → Field Middle / Turner High; [2026–27 Pre-K campus table](https://www.cfbisd.edu/students/prek-enrollment-page/pre-k-campuses) says Bush Middle / Ranchview High. The source conflict is recorded; no automated feeder assignment is permitted.
- Current-year geometry for Allen, Plano, Lewisville and CFB **remains unverified** despite these safety improvements.

## Release QA and maintenance

Run `node scripts/verify-main-data.mjs` locally or through the GitHub Actions main-site data-integrity workflow. Its checks cover existing HTML script parsing, critical home/commute/compare functionality hooks, valid files, counts, six-district provenance and the absence of the unsafe 2019 Plano fallback.

Before changing geometry: verify the source owner, layer version, school-year fields, campus-name linkage, polygon ring structure and at least several boundary-adjacent home addresses. Keep data vintages visible. Merge only after checks and re-test the real root domain; changing `data-science-team/docs` will **not** change the production root site.
