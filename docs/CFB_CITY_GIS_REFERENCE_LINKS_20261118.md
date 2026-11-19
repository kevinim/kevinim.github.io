# CFB ISD — school-level legacy City GIS source links (2026-11-18)

**Scope:** CFB / TEA `057903`. Informational source navigator only. The school-attendance *geometry* has **not** been imported into the dashboard; the exact-address school-assignment gate remains closed.

## Source-specific results

The City of Carrollton publishes three public, machine-readable ArcGIS FeatureServer **school attendance polygon layers**. Historical CFBISD-only features were independently measured in the prior [AG02 field audit](CFB_AG02_HISTORICAL_GIS_AND_ROAD_ANCHOR_AUDIT_2026-11-10.md).

| Level | Historic CFB polygons | Data last edited by publisher | Portion of 2025–26 CFB jurisdiction covered by old features | Original publisher layer |
| --- | ---: | --- | ---: | --- |
| Elementary | 20 | 2020-03-23 18:20 UTC | **74.09%** | [City elementary zones](https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/ElementarySchoolZones/FeatureServer/0) |
| Middle | 6 | 2020-03-23 18:39 UTC | 98.62% | [City middle zones](https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/MiddleSchoolZones/FeatureServer/0) |
| High | 4 | 2020-03-23 18:52 UTC | 99.53% | [City high zones](https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services/HighSchoolZones/FeatureServer/0) |

**Important:** The date is the GIS layer's last edit timestamp, *not* a certified 2020–21 or 2026–27 school year. Features must be filtered using `SCHOOLDISTRICT` = `Carrollton-Farmers Branch ISD`; the publisher-hosted services can include other school districts. The percentage comparison is old attendance polygon area vs a *separate 2025–26 district jurisdiction outline*. It is not a school roster completion or household eligibility statistic.

The March 6, 2025 CFBISD approved rezoning closed/repurposed the historic default zones for **Central, Furneaux and McCoy Elementary** and **Long Middle**. School-specific 2020 polygon boundaries must not be treated as adopted 2025–26 maps or present 2026–27 household assignments.

## Dashboard integration now provided

- The already present, lazy, collapsed CFB original-source atlas contains a **second collapsed '시 정부 학교별 과거 GIS 원본 · 2020년 최종 수정'** section with 3 publisher-direct school GIS layer links.
- Source metadata is stored in `data/cfb-historical-city-gis-links-2020.json` (URL, level, last edit time, historic feature counts, area coverage and reuse flags). No geometry copied, no address sent to the city, no remote GeoJSON network calls on initial map load.
- The renderer `features/cfb-approved-zone-atlas-renderer.js` validates exact GIS service URLs, CFB jurisdiction identity, timestamp, known closed schools and no-assignment/redistribution flags before displaying the links. A mismatch hides all old layer links, leaving the official 2026–27-address Finder available.
- `tests/cfb-historical-city-gis-links.test.cjs` tests negative forgery, false source year, rights, release flag and incomplete-layer counts; `scripts/test-cfb-raster-atlas-browser.cjs` checks opt-in hidden default, link URLs and the absence of unintended external requests on 390px/1366px viewports.

**This is a reference SOURCE link integration, not a CFB polygon layer inside Leaflet.** The CFB dashboard map still has no certified campus-specific geometry for current assignment. The historic city source cannot by itself fill the elementary 26% missing coverage, remove 2025 school closings, or certify any address.

## Publisher rights and acquisition next step

- [City Maps and official GIS data-request path](https://www.cityofcarrollton.com/about-us/about-the-city/city-maps): requests for GIS records go through the City Secretary's Open Records Request process. External source linking is different from republication of geometry on our site.
- [City GIS records request](https://www.cityofcarrollton.com/government/city-manager-s-office/city-secretary/make-an-open-records-request): ask whether the source was superseded in 2025/2026, request any publisher-owned newer campus GIS datasets and precise terms for family UAT embedding/public rehosting.
- [CFBISD official address-based School Search](https://www.cfbisd.edu/students/school-maps-locator-system): district describes March 6, 2025 approved zones and 2026–27 enrollment; its address/grade response takes priority over 2020 historical map references.
- [CFBISD 2025–26 approved rezoning](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning): raster source with maps and named street/neighborhood changes.
- [CFBISD Public Information Requests](https://www.cfbisd.edu/departments/public-information-requests): an existing no-fee-without-approval school GIS records request was sent **November 9, 2026**, as verified in connected Sent mail. No substantive district reply was found in an inbox search on **November 18, 2026**. This is **not** permission or a district acknowledgement.

### School-level map overlay release is still source-dependent

Obtain authorized E/M/H current data or the City-approved use of historic publisher GIS; filter to CFB, verify campus IDs and closed-school exclusion, measure coverage/topology, independently compare official Finder results for address+grade across all distinct zones and apartment exceptions, and then review reference styling and privacy separately. **Do not silently convert this source link into a map-level or home-assignment layer.**

**Step status:** Historical municipal source discovery, metadata, source UI and guards: `DONE` when CI & Pages pass. Historical polygon *rendering*: `NOT_IMPLEMENTED` due incomplete baseline & unresolved use/QA. Present-year certified school GIS: `SOURCE_REQUEST_PENDING`.
