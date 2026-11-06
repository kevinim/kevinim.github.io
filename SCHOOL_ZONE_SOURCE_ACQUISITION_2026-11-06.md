# 2026–27 attendance-zone source acquisition — North Dallas Explorer

**Production repository:** `kevinim/kevinim.github.io` (only)  
**Investigation date:** November 6, 2026  
**Scope:** school-by-school attendance areas for Plano, Allen, Lewisville, Prosper and Carrollton–Farmers Branch. Frisco remains the verified reference district.

## Provenance rules

A school district *outer boundary* is NOT a per-campus attendance zone. Texas Education Agency / Texas Legislative Council district shapefiles cannot replace a school-level enrollment map. The mere date a GIS layer was edited does not prove its school-year. Confirm the **school-year explicitly in the source**, whether the layer covers the **entire district**, and whether school identifiers match official campuses. Only an official locator's approved current-year polygons can be classified as "year verified"; specific home/apartment placements can still have exceptions.

## Current acquisition results

| ISD | Official 2026–27 information | Public vector polygons | Acquisition/production status | Outstanding |
| --- | --- | --- | --- | --- |
| Frisco | 2026–27 official `school.borders.2627.json` | 75 features | Verified current; production map active | Spot-check address exceptions |
| **Prosper** | District-linked Infofinder i exposes 2026–27 elementary, middle, high groups | **31 school zones = 33 polygon parts (35 rings), 20 elementary + 7 middle + 4 high** | **Original current-year vectors acquired and converted to `prosper-attendance-2026.geojson`; staged, NOT yet active in production map/home assignment** | Compare representative addresses in current district locator and approved PDF before activation |
| Plano | Public 2026–27 SchoolFinder web page; linked Web Map uses `2526` GIS layer names | 64 polygons, 2025–26 | Older reference active; no newer 2026–27 geometries found in Plano-owned public ArcGIS catalog | Request current-vintage GIS or authoritative confirmation unchanged |
| Allen | Public address-based school assignments and "Attendance Boundary Map" linked to a **2024–25 PNG** | City of Allen GIS 20 polygons, 2019/2023 | Historical reference only | Request latest campus polygons/board-validated zones. A 2025 ArcGIS "Master Map & School Locator" item is token-protected (403) and cannot be accessed as public vector |
| Lewisville | Official **2026–27 locator** and public MetroStudy ArcGIS web-map `SZF 2627` | 676 elementary geometry pieces, 15 middle polygons, 5 high polygons | Current-year locator source obtained; **high polygons explicitly `SCHL_YEAR=2025-26`** and elementary/middle are undated. Production renders as unverified year | Obtain vendor/district year equivalence; address-validate high, middle, elementary |
| CFBISD | District public School Search embeds current GuideK12, reflecting March 6, 2025 board-approved zones and used for 2026–27 registration | No validated public vector download found. GuideK12 client renders school boundaries via PNG `school_map_tile` endpoint | Official current search + 2025 approved maps secured as links, **not** a GeoJSON | Request GIS shapefile or vendor-supported export; compare approved 2025 and current 2026–27 |

**Bottom line:** official **current-year geometries acquired for 2 of 6 districts** (Frisco active + Prosper staged). **Live site** still displays current-year Frisco only until Prosper's address-level validation is completed. Do not claim 2/6 live yet.

## Prosper — authoritative georeferenced source (ACQUIRED)

School district official page: https://www.prosper-isd.net/page/attendance-boundaries/  
Official parent-facing current locator: https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1  
Current school-year group catalog:
https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistricts?clientId=PI5FFG7RYZ1

Full anonymous GET endpoints invoked by the official viewer:

- **Elementary 20:** https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistrict?clientId=PI5FFG7RYZ1&redistrictId=1
- **Middle 7:** https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistrict?clientId=PI5FFG7RYZ1&redistrictId=2
- **High 4:** https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistrict?clientId=PI5FFG7RYZ1&redistrictId=3

Group names are **exactly** `2026-2027 ELEMENTARY SCHOOL`, `2026-2027 MIDDLE SCHOOL`, `2026-2027 HIGH SCHOOL`. All 31 campus codes join to official TEA/Prosper district `043912NNN` campus identifiers. One new school, Jim Bridges Middle (`043912048`), is not present in the 2026 preliminary TEA ratings but is present in the 2026–27 official zone source.

The viewer encodes polygons using Google polyline with **1e6 precision**; its public `IFIMap.js` is the reference: https://www.infofinderi.com/ifi/script/IFIMap.js . Rings are explicitly closed in the GeoJSON export; polygon islands and holes are preserved as MultiPolygon. Some source ring-collection strings contain *literal backslashes not escaped as JSON*; handle the quoted ring separators carefully to preserve the same polygon bytes.

**Snapshot:** `prosper-attendance-2026.geojson`: 31 school features, 33 polygon parts, 35 rings, 1,706 WGS84 vertices after ring closure.  
**Regenerator:** `node scripts/fetch-prosper-2026-zones.mjs`. Runs manually, validates exact `2026-2027` source title, grade counts, TEA school codes, geographic bounds and topology. Do not silently overwrite the snapshot if the official source changes.

Official **approved 2026–27 map PDFs** (all three levels, not georeferenced GIS):

- Elementary: https://aptg.co/vgDpkm
- Middle: https://aptg.co/ty_VGv
- High: https://aptg.co/hmz4Ps

The middle-school map includes the new **Bridges** attendance zone approved November 17, 2025: https://www.prosper-isd.net/article/2560387

Older `prosper-celina-reference-2026.geojson` (13 local Celina study-area features) is **NOT district-wide** and has an unverified school-year. Keep it only as historical reference/rollback; do not combine it with current-year polygons or use for 2026–27 assignments.

## Other four districts — authoritative entry points and blockers

### Plano
- Official 2026–27 finder: https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder
- Experience item `73a3f873d9c040348d6e723ed4b48af4` and web map `68c373c99db1425e9f0030a689efa742`.
- Public `Plano_ISD_School_Districts/FeatureServer` has senior high/high/middle/elementary source layer names `2526`, last edited March–April 2025: https://services4.arcgis.com/uBV8NRVfoRJv7qWn/arcgis/rest/services/Plano_ISD_School_Districts/FeatureServer
- 2025–26 Plano campus closures and boundary shifts **were real**; no assumption that 2019 polygons still apply.
- **Needed:** 2026–27 snapshot or written PISD mapping-office verification that `2526` layer geometries are unchanged for 2026–27.

### Allen
- Official current finder and unit-level exceptions: https://www.allenisd.org/page/findaschool
- The map currently linked in that page: https://5il.co/1w80d → `1_Allen_ISD_Attendance_Zone_Map_2024_2025_Wall.png` (NOT 2026–27).
- City-published GIS sources: https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_Elementary/MapServer (16 elementary and 3 middle school zones with `YearUpdated=2023`; 1 high school zone with `YearUpdated=2019` in separate layer).
- Public ArcGIS item titled `Allen ISD Master Map & School Locator`, item ID `b685b4d250fd495ebfe9a3977333b189`, updated Aug 27, 2025. Its web-map data returns **403 subscription disabled**, and linked feature service requires an access token. Do not bypass access controls or represent it as available data.
- **Needed:** school district zoning office current geo file or 2026–27 map and confirmation of apartment-level exceptions.

### Lewisville
- Official locator: https://www.lisd.net/resources/families/school-locator
- Public 2026–27 web-map: https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/03c099e24d304c4fa0f4ce8a76c10062/data?f=json
- Elementary feature collection has **676 physical geometrical pieces representing 34 unique elementary school names**, middle 15 school polygons, high 5 polygons. **High school attribute `SCHL_YEAR=2025-26`; elementary/middle no explicit school-year field**.
- The webmap excludes the five elementary schools officially retired after 2024–25; this corroborates post-2025 consolidation but is **not proof that all shapes are unchanged in 2026–27**. Retirements: https://www.lisd.net/news/~board/all-district-news/post/district-update-dec-24
- **Needed:** LISD or map vendor confirmation of current-year source geometry, especially high layer; keep official locator available for address validation.

### Carrollton–Farmers Branch
- District's current official lookup: https://www.cfbisd.edu/students/school-maps-locator-system
- Live GuideK12 address/map app: https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/
- March 6, 2025 board-approved rezoning (effective 2025–26): https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning
- School map illustrations on the approval page:
  - Elementary: https://resources.finalsite.net/images/f_auto,q_auto/v1750789234/cfbisdedu/m03d0jbfr3hqfnrg7eka/elementary-zones.jpg
  - Middle: https://resources.finalsite.net/images/f_auto,q_auto/v1738861157/cfbisdedu/raatffwyo1ypgwihngcu/middleschoolproposed-02.png
  - High: https://resources.finalsite.net/images/f_auto,q_auto/v1738861128/cfbisdedu/lhksclpohnt5xm2zvgsq/highschoolproposed-02.png
- **Caution:** the middle/high file names contain `proposed`, even though they are displayed under approved-map headings. Treat the vendor current-address lookup as the authoritative reference until confirmed.
- Current GuideK12 uses screen tiles `school_map_tile` (PNG) with address-based searches; no public documented GeoJSON/FeatureServer endpoint found. Do not infer precise parcel shapes from PNG screenshots.
- **Needed:** district/GuideK12 vendor current campus-zone shapefile or GeoJSON export and permission for reuse.

## Cross-check: secondary public Infofinder school-zone catalogs — 2026-11-06

The public parent-facing Transfinder district directory at https://www.infofinderi.com/tfi/default.aspx?invalidid=T lists separate school locator clients. Following its published client links and reading the same **anonymous, public `GetRedistricts`** endpoint used by the official interface yielded:

- **Allen ISD** — directory client `AI03835938622`, https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistricts?clientId=AI03835938622. The published catalogs are `Middle School Boundary Set 2023`, `Redistricting Elementary 2023`, `LOWERY FRESHMAN CENTER`, `AHS`. These are **not** verified 2026–27 vectors; no update to Allen's "historical" status.
- **Lewisville ISD** — directory client `LI3VBOFR0JM`, https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/GetRedistricts?clientId=LI3VBOFR0JM. Its four catalog titles are `25-26 SY Elementary`, `25-26 SY Middle Schools`, `25-26 SY High School`, `25-26 SY 9th & 10th grade`. Again **not** current-year source confirmation, despite the separate MetroStudy web app being titled 2026–27.
- **Prosper ISD** — independently linked public district client `PI5FFG7RYZ1` really did report **`2026-2027`** for all three age groups, so its current-year vector acquisition status is distinct.

This independently corroborates why 2023 Allen and 2025–26 Lewisville polygons must not be silently promoted to 2026–27. Parent-facing links may support school transportation rather than enrollment assignments; GIS years cannot be inferred from a transport portal's title.

## Acquisition gates before production activation

1. Validate source academic year, grade, school ID, geometry bounds and polygon rings.
2. Test at least two known residential addresses per campus level plus border/exception addresses using the district's official address-search results. No invented property addresses; obtain district-confirmed public examples or verified test locations.
3. Test home school assignment, campus selection, ZIP map interactions and existing comparisons in real browser.
4. Only then update the production overlay/assignment logic and change the **live** freshness tally to 2/6. A data file saved in the repository alone does not upgrade the live site.
