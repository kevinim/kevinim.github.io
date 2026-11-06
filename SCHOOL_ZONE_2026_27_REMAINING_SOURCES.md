# Four remaining North Dallas ISDs — authoritative 2026–27 campus-zone source gaps

**Review date:** 2026-11-06 (America/New_York)  
**Production repository:** `kevinim/kevinim.github.io`  
**Status:** Frisco 2026–27 verified/live and Prosper 2026–27 verified/live (31 zones; 43 independent lookup checks). The four ISDs below are **not** verified current-year geospatial polygons.

## 2026-11-06 follow-up findings — Allen and Plano

### Allen Find-A-School (official live published table, not GIS)

- Retrieved all **1,689 current published rows** from https://www.allenisd.org/page/findaschool and compared to the root dashboard's **1,687 previous cached rows**. Four apparent differences were only escaped asterisk formatting in apartment exception annotations.
- Two genuine new rows: **Peak St, 2050 → Evans elementary / Ereckson middle / Lowery ninth-grade / Allen High** (valid; added); **Moss Haven PL, `2009 – 202-216`** (invalid numeric range; quarantined, no made-up correction).
- The official source also has a previously cached malformed row **Crestview Heights, `2050 Peak St`**, which is text rather than a numeric range. It is retained as source evidence and remains rejected by the assignment matching regex.
- Final cached rows **1,688**, valid auto-parseable numeric ranges **1,687**; official rows **1,689**, unusable source ranges **2**. Four apartment/unit-specific exceptions must remain subject to registrar verification. Details: `allen-official-address-source-audit-2026.json`.
- The official address table does **not** label itself as school year 2026–27. It cannot confirm that the public City of Allen 2019/2023 GIS shapes are current.

### Plano current feeder paths (official current web page, not current GIS)

- Captured **11 official published feeder paths** from https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/attendance-boundary-descriptions : **42 unique elementary schools**, **11 middle**, **6 high**, **3 senior high**. Matched every listed elementary/middle/high **campus name** to the source of the production dashboard's 64 **2025–26 polygon features**, but this **does not prove** the 2025–26 polygon geometry is unchanged for 2026–27.
- **Jackson Elementary is a documented exception:** **east of Coit Rd** goes to Wilson Middle → Vines High → Plano Senior, **west of Coit Rd** goes to Frankford Middle → Shepton High → Plano West Senior. A school name match alone must never determine secondary feeder for this campus.
- Structured source snapshot: `plano-official-feeder-reference-2026.json`. Its `academicYearExplicit` is `null` because the feeder page itself does not state the academic school year.
- Official public `blueraster.pisd` ArcGIS search found no newer published 2026–27 polygon version; 2026–27 SchoolFinder frontend still references `2526` layers. **Still needs written PISD confirmation of no zone changes or an actual 2026–27 GIS file**.

**Result:** Both districts' public *non-GIS* assignment/reference records are improved, but **the current-year polygon coverage is unchanged (2/6 verified overall: Frisco and Prosper).** Do not call either Allen or Plano 2026–27 GeoJSON without further official evidence.

## Audit

| District | Current official parent lookup | Newest public candidate actually checked | Blocker for 2026–27 GeoJSON | Verified follow-up |
| --- | --- | --- | --- | --- |
| **Plano ISD** | [2026–27 SchoolFinder](https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder) | Owner `blueraster.pisd` public ArcGIS search: 14 relevant items; map app last modified **2025-04-25**, `Plano_ISD_School_Districts` FeatureServer last modified **2025-03-28**; ES/MS/HS/Senior boundaries all labeled **2526** | Newer `2627` school polygons or signed source-year equivalence confirmation not published in these publicly searchable items | Request district GIS/SchoolFinder team provide 2026–27 campus-zone GIS export/FeatureServer or confirm unchanged 2025–26 boundary geometries |
| **Allen ISD** | [Find A School](https://www.allenisd.org/page/findaschool) includes street-number campus assignment table and specific apartment unit exceptions | Official [Attendance Boundary Map](https://5il.co/1w80d) resolves to **`1_Allen_ISD_Attendance_Zone_Map_2024_2025_Wall.png`**. City GIS has ES/MS `YearUpdated=2023`, HS `YearUpdated=2019`; other public Infofinder client `AI03835938622` catalogs **2023** boundaries. Public ArcGIS item `Allen ISD Master Map & School Locator` modified 2025, but its data endpoint returns 403 | No 2026–27 confirmed geospatial source available without access restriction; official street-range lookup cannot be naively converted into precise property polygons | Request enrollment/zoning office current-year polygons/approval and address-level exceptions. Do not circumvent protected ArcGIS subscription |
| **Lewisville ISD** | [2026–27 School Locator](https://www.lisd.net/resources/families/school-locator), with **separate apartment lookup** | Official linked MetroStudy ArcGIS web map `SZF 2627` has 34 elementary school-name polygons (676 geometry pieces), 15 middle, 5 high. **High `SCHL_YEAR=2025-26`; ES/MS year fields absent.** Separate public Infofinder client `LI3VBOFR0JM` catalogs **25-26** school-year boundaries | Current-year web app title alone does not establish the source polygon vintage; no written source-year confirmation | [Lewisville Student Services](https://www.lisd.net/resources/families/school-locator): `studentservices@lisd.net`, 469-713-5206. Request full 2026–27 GIS/export, explicit unchanged-zone determination and apartment-specific exceptions |
| **Carrollton–Farmers Branch ISD** | [Official School Search](https://www.cfbisd.edu/students/school-maps-locator-system), embedding current [GuideK12 locator](https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/) | Board-approved March 6, 2025 zone maps and 2026–27 enrollment search. GuideK12 uses **raster PNG `school_map_tile`**, not a published GeoJSON export. Public 2024 ArcGIS `Carrollton_Farmer_ISD` layer `/55` contains only entire ISD footprint with census `ELSDLEA`, `GEOID`, `SCHOOLYEAR` attributes, **not campus-specific zones**; contractor also publishes school points | No official per-campus current vector/polygon endpoint discovered. Raster or full-ISD district outline is not address-accurate campus enrollment zoning | [CFB enrollment](https://www.cfbisd.edu/students/school-maps-locator-system): `enroll@cfbisd.edu`; request a 2026–27 GuideK12-supported GIS export/shapefile or documented FeatureServer |

## Official data and exclusion links

### Plano
- [District-owned FeatureServer source (2025–26)](https://services4.arcgis.com/uBV8NRVfoRJv7qWn/arcgis/rest/services/Plano_ISD_School_Districts/FeatureServer)
- [ArcGIS SchoolFinder experience (2025 map item)](https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4b48af4)
- Owner `blueraster.pisd` ArcGIS public search query returned no newer `2627` school polygon item at review.

### Allen
- [Public City of Allen elementary MapServer](https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_Elementary/MapServer)
- [Current campus assignment and apartment building-number exceptions](https://www.allenisd.org/page/findaschool)
- [2023 alternate public zone catalog](https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistricts?clientId=AI03835938622)
- ArcGIS `b685b4d250fd495ebfe9a3977333b189` subscription data is protected; **not scraped or bypassed**.

### Lewisville
- [Public MetroStudy locator GIS](https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/03c099e24d304c4fa0f4ce8a76c10062/data?f=json)
- [25–26 alternate public zone catalog](https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistricts?clientId=LI3VBOFR0JM)
- [Official current School Locator and Student Services contact](https://www.lisd.net/resources/families/school-locator)

### Carrollton–Farmers Branch
- [District 2025 school rezoning approval](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning)
- [Current parent address school search](https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/)
- [Census-level full ISD boundary (NOT campus attendance)](https://services3.arcgis.com/KkgpUIloCxkczPwY/arcgis/rest/services/Carrollton_Farmer_ISD/FeatureServer/55)
- School point data `CFBISD_SchoolPoints` is not enrollment-zone geometry.
- **Exclude unrelated GIS results**: `Allen County Schools` ArcGIS belongs to Allen County (not Allen ISD TX), and a generic `School Attendance Boundaries` item last updated 2026 belongs to Montana (extent near 47°N, −114°W). An update date without geography verification is unsafe.

## Minimum source request

For each outstanding district, ask for **approved 2026–27 attendance boundary polygons by campus and grade** as GeoJSON, shapefile, or publicly queryable ArcGIS FeatureServer, including:
1. Explicit effective school year and board-approval / confirmation date;
2. Elementary, middle, high campus names and TEA campus IDs (or unambiguous lookup keys);
3. Complete district-wide WGS84 polygons, islands and holes, **not** district exterior polygons or ZIPs;
4. Written confirmation of whether 2025–26 data are unchanged for 2026–27, if no new file exists;
5. Any apartment, street-range, grandfathering, special-program or grade exceptions;
6. Public-dashboard redistribution terms or an official embeddable lookup alternative.

**No requests were sent on behalf of the user.** Source discovery and documentation only. Any future file must pass current-year evidence, geometry QA and independent official address/source checks before changing production status.
