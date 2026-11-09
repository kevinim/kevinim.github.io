# Agent 01 — non-overlapping DFW GIS acquisition, 2026-11-09

**Draft staging only / NO-GO.** No production GIS overlay, no changes to existing map markers, school filters, finder logic, or boundary auto-display. No main deployment. Research and tests use free public endpoints; ArcGIS maps are queried without residential addresses.

## Duplication preflight
- Main was inspected, including baseline school polygon inventory and district registry.
- Existing #162 implements address-to-school map; #164 already captures 187 Dallas publisher school boundaries. Do **not** count or re-ingest Dallas.
- #167 quarantines Northwest ISD's 2022-era data. Do **not** duplicate or promote it.
- Denton #169/#174/#176 and CFB #149/#154/#155/#163/#170 are excluded.
- The #160 parent-directory 107/108 result is separate from true campus GIS, and remains a Draft dependency.
- Latest #164 branch reports 7/108 district school-level source configurations and 101 without such integration. Its current-year metadata identifies 2 confirmed current-year source districts. This branch does **not** claim improvement to those figures.

## New source leads checked
1. **Irving ISD, TEA 057912**: the district's own [current campus-level pages](https://www.irvingisd.net/departments-services/performance-outcomes-data/planning/current-campus-level-maps) embed three ArcGIS Web Maps:
   - Elementary map `a9ea586919d64c7e9aaa7193572f46d3`
   - Middle map `64c8ba47e77346de9d6812736693debc`
   - High map `94e441e70e5049daa74c0cc2bb5a7cad`
   - The GIS inventory records legacy `Final_EL_Zones_23_24`, `ReBound_MS_Zones_v5`, and older high-school sources, which cannot silently be treated as school year 2026–27. The district [approved elementary changes effective 2024–25 and middle changes for 2025–26](https://theinsider.irvingisd.net/2023/12/18/irving-isd-board-approves-measures-to-rebalance-enrollment-prevent-budget-shortfall/). It has a [current address-based finder](https://www.irvingisd.net/departments-services/registration/find-my-assigned-school) but we have **not** cross-checked independent residential holdouts. Source GIS year and TEA campus IDs remain unverified.
2. **Fort Worth ISD**: [2026–27 boundary/closure work](https://www.fwisd.org/about/betterspaces/boundary-maps), no independently verified current school-level GIS.
3. **Mansfield ISD**: [school-level downloadable map guidance](https://www.mansfieldisd.org/student-central/attendance-zones), but 2025–26 listing and no verified 2026–27 editable GIS.
4. **Rockwall ISD**: [2026–27 attendance map and inquiry](https://www.rockwallisd.com/new-student/new-student/school-attendance-areas); a separately indexed Rockwall County polygon service depicts *ISD outer* boundaries, not school attendance zones.
5. **Castleberry ISD**: [SchoolSearch](https://www.castleberryisd.net/enrollnow/enrollnow) for addresses; indexed `CISD_Boundaries_2026` is an outer district boundary, not campus zones.
6. **Wylie ISD**: [2025–26 rezoning and later feeder changes](https://www.wylieisd.net/our-district/rezoning-2025-26), no certified 2026–27 ArcGIS layers.
7. **Plano historical city open data** is already represented by existing Plano reference GIS. The City's official [OpenData/SchoolAttendanceZones](https://maps.planogis.org/arcgiswad/rest/services/OpenData/SchoolAttendanceZones/FeatureServer) four-layer source explicitly says **2019–20** for elementary/middle/high. Do not count as another current source.

## Staging GIS conversion

`node scripts/agent01-probe-irving-gis.cjs --live`

- Reads public ArcGIS Web Map item metadata and the district's three exact Web Map IDs; discovers a uniquely named grade-specific layer.
- Only accepts HTTPS `services*.arcgis.com` polygon FeatureServer/MapServer layer URLs.
- Requests ArcGIS GeoJSON with `outSR=4326` and checks rings, bounds, source grade, school names, feature completeness.
- For every grade passing source and polygon validation, writes **quarantined, source-year-unknown** `artifacts/agent01-irving-gis-stage/QUARANTINED-source-year-unknown.geojson` locally in the CI job, plus a provenance JSON report. These are not tracked in Git or loaded in the dashboard.
- If a source layer or any field is missing/ambiguous, retains any independently valid grade-specific geometry in local quarantine, exits nonzero and reports the blocker. An ArcGIS map being embedded on an official page is not enough to certify a school-year boundary.
- Normalized features explicitly have `schoolYear:null`, `campusId:null`, `sourceYearVerified:false`, `independentFinderVerified:false`, and `status:'QUARANTINED_YEAR_UNKNOWN'`.

## Verification

- Unit QA: source identity, unique grade-layer selection, host allowlist, WGS84 polygon topology/bounds, fail-closed school-name check, no unapproved promotion.
- No runtime implementation files modified; production school marker, school-type filter, and boundary selection code remains byte-for-byte unchanged by this Draft.
- **Not completed:** publisher 2026–27 GIS vintage and TEA ID mapping, source reuse authorization, actual residence→Finder→campus→visible zone E2E browser QA. Do not describe unit tests or a successful staging fetch as these acceptance tests.

## Release decision

**NO-GO.** Only promote Irving to a separately reviewed future integration branch after exact year, campus ID/name/grade mapping, rights, independent official address holdouts and browser screenshot QA pass. PR #148's mandatory release gate remains active. No PR merge or production deployment is authorized.

## Measured live extraction — 2026-11-09

[GitHub Actions read-only source run #42674417115](https://github.com/kevinim/kevinim.github.io/actions/runs/42674417115) demonstrated that the actual three district-embedded ArcGIS WebMaps have different layer configurations:

| Grade | Source layer observed | Polygon features extracted | Release result |
| --- | --- | ---: | --- |
| Elementary | `New_EL_Zones_24_25` | **18** | 2024–25 in source title; historical, not 2026–27 |
| Middle | `ReBound_MS_Zones_v5` and related school-name fields | **7** | Academic year not independently confirmed |
| High | Only school location and district outline layers seen | **0** | No independently identifiable high school attendance polygons |

**25 features were normalized to GeoJSON with WGS84 coordinates, per-grade school names and their exact ArcGIS layer URL** and retained ONLY in the ephemeral Actions job local directory. No polygon geometry was committed to Git, attached to the CI metadata artifact, or served to map clients. The per-grade audit records ArcGIS original CRS, map item owner, URL, feature counts and explicit year/ID/ownership/assignment unverified flags.

The live-source staging check is **expected to remain red / NO_GO** when a grade lacks a validated layer; this is a meaningful source incompleteness blocker, not evidence that released map functionality is broken. Independently, the unit/regression safety job passed on the source-staging branch. An official district website embedding a map does not independently certify the item owner, last edit, academic year, reuse rights, or correctness for a property.

Do not claim these 25 features represent 25 distinct verified current-year campuses until grade-level `schoolCount`, TEA ID crosswalk and 2026–27 authoritative Finder agreement are reviewed.

## Follow-up: Irving high-school embedded GIS recovered (2026-11-09)

The previous statement that the high school WebMap has only campus points and no attendance polygons was **incorrect**. The [district's official High School Boundary Map](https://www.irvingisd.net/departments-services/performance-outcomes-data/planning/current-campus-level-maps/high-school-boundary-map) embeds the original Esri `featureCollection.layers[0].featureSet.features` and does not advertise a regular FeatureServer URL for that layer. Raw item `94e441e70e5049daa74c0cc2bb5a7cad` is an ArcGIS Web Map last modified **2020-08-28T21:25:24Z**.

| Grade | Actual input | Source grade and location validation | School count | Year/release |
| --- | --- | --- | ---: | --- |
| Elementary | `New_EL_Zones_24_25/FeatureServer/4` | District-linked Esri public polygon, 4326 output | 18 | **2024–25** in source title; historical |
| Middle | `ReBound_MS_Zones_v5/FeatureServer/5` | District-linked Esri public polygon, 4326 output | 7 | Layer academic year unverified |
| High | WebMap `94e441e70e5049daa74c0cc2bb5a7cad`, embedded `High Schools` (`high`), `HIGH_DESC` | **3 polygons**, original WKID 102100/3857, strict single-ring Web Mercator → 4326; Irving, Macarthur, Nimitz | 3 | Map modified 2020; effective boundary year not confirmed |
| **Total** | | **28 distinct named features** | **28** | All CI-local and non-production |

New `scripts/agent01-irving-embedded-high.cjs` converts only the exact pinned high school WebMap and its single well-defined polygon feature layer, with explicit three-school allowlist, exactly three records and closed-ring/DFW-bound checks. Any unfamiliar or multi-ring topology fails closed to avoid changing legal borders inadvertently. The original WebMap is district-linked, but ArcGIS item ownership, source reuse and 2026–27 zoning validity remain unverified.

**Preliminary TEA campus-name reference crosswalk:** `data/irving-provisional-tea-crosswalk-2026.json` explicitly enumerates 18 elementary, 7 middle and 3 high source labels mapped to TEA 9-digit campus IDs from `tea-ratings-2026.json` (2026 preliminary snapshot). `scripts/agent01-irving-tea-crosswalk.cjs` rejects unknown source names, duplicated IDs, missing grades or any attempt to assert current-year verification. It adds only `provisionalTEAReferenceId`; the true source `campusId` remains null and the campus assignment verification flags remain false.

One known gap: TEA `057912048` (Lorenzo de Zavala Middle) is not represented among the seven current public middle polygons. This may reflect the district's STEM/choice model; absence must **not** be represented as an inferred eighth polygon, nor a campus closure. Parent-address Finder remains the assignment authority.

**Limits:** 28 school references linked to a preliminary TEA roster are NOT 28 independently verified, current 2026–27 attendance polygons. No household address data were queried, stored or published. No production source configuration, campus marker, school filter or map rendering file is modified. Existing mandatory #148 NO_GO must remain active until the current-year official Finder/address holdouts, authoritative layer rights, and rendered dashboard school-click QA are independently satisfied.


## November 9 second pass — resolving actionable NO-GO gates

### A. The operational district School Locator is now source-chain verified

The current [Irving ISD Find My Assigned School page](https://www.irvingisd.net/departments-services/registration/find-my-assigned-school) links directly to the [Irving ArcGIS Instant Lookup app](https://iisd1.maps.arcgis.com/apps/instant/lookup/index.html?appid=f27bba7ee02141c58c8c9375431effa2). The app ID is `f27bba7ee02141c58c8c9375431effa2`, last modified **2026-10-06T17:25:54Z**, and its exact referenced WebMap is `8004c79f6dd144b6996e7240c5182507`, modified **2026-08-20T20:28:42Z**. The app and WebMap are publicly accessible and have the same ArcGIS account owner. The app's actual lookup source IDs resolve to:

- Elementary `18dade44172-layer-14` → `New_EL_Zones_24_25/FeatureServer/4`: **18** polygons. Label still indicates **2024–25**.
- Middle `195aa532ade-layer-9` → `ReBound_MS_Zones_v5/FeatureServer/5`: **7** polygons. Live WebMap calls this layer **MS_Zones_25-26**.
- High `HS_Zone_Robust_shapefile_8340` → embedded `HS_Zone_Robust`: **3** polygons. Raw vertex geometry verified equal to the old district high boundary WebMap.

This is strong evidence of **the exact polygon sources actively selected by the district's operational Locator**, but the app/map update dates do **not** independently certify each boundary as approved 2026–27 or authorize independent republication.

`scripts/agent01-verify-irving-live-finder.cjs` implements an independent *read-only* multi-item provenance guard from district HTML link → ArcGIS app config → linked WebMap → grade layer identifiers; any source change fails the gate. It saves only provenance metadata to CI artifacts.

### B. Source-specific De Zavala exception is resolved

The [Irving ISD School Choice FAQ](https://www.irvingisd.net/families/school-choice/faq) explicitly states that incoming 2026–27 grade-6 students may apply to **de Zavala Middle School STEM Academy**, while existing grades 7–8 continue without reapplying. The district's board rebalanced de Zavala as a School of Opportunity starting 2025–26. Therefore there are seven ordinary middle geographic zones and a separate application-based school; the "missing eighth middle school zone" is a **false data-quality gap**.

`school-boundary-match.js` contains the narrowly-scoped Irving `057912048` special-campus exception. It tells the user why no ordinary polygon is displayed and links the official FAQ. It does not fabricate a polygon or change other district mappings.

### C. An operational read-only fallback is implemented without redistributing GIS

The PR changes the Irving `district-registry.js` official lookup from the indirect registration page to the district-linked official ArcGIS Locator directly, and adds only the **exact** `iisd1.maps.arcgis.com` host to `trusted-link-policy.js`. The registry keeps `zoneKey:null` and `address:null`. Thus users can independently query official school assignments while unapproved polygon data never enter the normal map source or automatic home assignment. Unsupported host aliases and spoofed URLs are denied.

The live browser test of the actual third-party ArcGIS app was attempted using a public non-residential campus address, but its search field failed to render in the external browser automation environment. There is **no independent visual Finder-result certification**, and that specific gate remains open.

### D. Public-address GIS holdout path implemented

`scripts/agent01-irving-public-address-qa.cjs` tests the three publicly published school **campus** addresses of Barton, Brown and Farine. It geocodes the locations without API keys and checks the exact district Locator elementary, middle and high zone source geometries; it demands a one-to-one zone per grade, at least 97 geocoding score, and the expected public elementary campus. No residential addresses, apartment numbers, household data or student records are used or uploaded.

The three manual preliminary elementary source queries matched their respective campuses. CI runs this complete 3-level check and stores *only the public campus IDs, geocoder confidence, school names and explicit non-enrollment warning*, not the queried addresses or complete shapes. Results are a **technical point-in-zone QA**, not legally confirmed current school attendance or Finder UI search.

### Remaining independent release blockers

- Effective school-year and zoning changes *within* historical-titled 2024–25/2025–26 source layers must be reconciled with district 2026–27 approvals, or the actual live Locator must certify the specific address-level result through a working browser.
- District or ArcGIS owner must clarify acceptable reuse if hosting copied polygon geometry. Safe external linking to their own Locator does not require copying.
- Production address → elementary/middle/high assignment with reliable external official Finder comparison remains **NO_GO**. A school campus coordinate is not a residential assignment holdout.
- Agent 06 must investigate the independent historical Git Gitleaks finding; it is outside Agent 01's remit. No merge, production deployment, or release sign-off is authorized by this PR.

The Draft branch implementation supplies a **one-click official Locator handoff** as a functional fallback now, not a substitute for automatic 2026–27 assignment certification.
