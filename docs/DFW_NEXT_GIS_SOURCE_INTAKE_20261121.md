# DFW newly discovered unconfigured GIS source intake — 2026-11-21

## Scope and disposition

The dashboard's existing 11-county TEA census identifies **108 public ISDs** and distinct official parent guidance for all 108. This research adds **four source-level reviews** totaling **147 campus inventory records** (Mesquite 51, Wylie 22, Rockwall 23, Richardson 51). None of these counts is a new certified polygon or residential assignment.

The purpose is to move the next unconfigured ISDs from an **unreviewed-source gap** to an **explicit, reviewable source candidate**, without changing `data/dfw-school-coverage-matrix-2026.json`'s deterministic denominator or falsely increasing a school-specific GIS completeness rate.

| District | Public source | Verified | Still missing |
|---|---|---|---|
| Mesquite ISD | [City of Mesquite municipal ArcGIS MapServer/6](https://gisservice.cityofmesquite.com/arcgis/rest/services/onlinemaps/neighborhood_vitality/MapServer/6) | Polygon feature layer; `ES_ZONE`, `MS_Zone`, `HS_Zone`; GIS supports geoJSON query | Academic year, whole-district coverage, campus-ID reconciliation, reuse/embedding terms, independent address-grade comparison |
| Wylie ISD | [2026–27 official district boundary PDF](https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/5327/Wisd/9eaeab1f-77e5-4f95-9897-d3238ca30cca/2026-27-Attendance-Zones.pdf?disposition=inline) | Explicit 2026–27 publication context | Approved vector output, geometry quality, feeder/intermediate rules, reuse terms |
| Rockwall ISD | [2026–27 zoning with new middle school](https://resources.finalsite.net/images/v1746561842/rockwallisdcom/xu447xmnec7gsjl7ekfh/2026-2027ZoningwithnewMS.pdf) | 2026–27 district attendance-zone map | Reusable GeoJSON, parcel-edge QA, independent Finder result |
| Richardson ISD | [district map](https://web.risd.org/home/wp-content/uploads/2024/03/OnlineProjectResizeMp.pdf) and [RISD official lookup route](https://web.risd.org/home/schools/) | Published district map + lookup entry | Map's actual academic year, current GIS polygons, redistribution permissions |

Garland ISD is not treated as a conventional residence-zone GIS candidate: the existing source inventory categorizes its school admissions as a **choice process**, so a municipal generic school-zone layer must not be treated as automatic Garland ISD E/M/H assignment.

## Rules

- The new file `data/dfw-next-gis-source-candidates-20261121.json` is an optional **source-reference manifest**, not a hosted GIS dataset. Every district has `installedSchoolPolygons: 0`, `liveSchoolAssignmentCertified: false`, and `sourceReuseRightsVerified: false`.
- Neither the optional UI source explorer nor this data file sends a home address to a third party. Only publisher links are surfaced after user interaction.
- The Mesquite GIS has school-name labels, but **no independently proven 2026–27 academic year or full district E/M/H coverage**. Do not infer current assignment from polygon, ZIP, city or school marker.
- Unlike data extraction that might need a license, direct links to already-published authoritative map sources are provided without copying geometry.
- Source edit time and academic-year approval are different. Retain older official maps with exact known year where available, otherwise label the year **unverified**.
- District replies are **not a blocking dependency**. Advance to the next source in the queue when no public reusable vector is available.

## Next technical checkpoints

1. Mesquite: GIS attribute count, uniqueness and empty zone-label QA; compare campus IDs/names against current 51-campus TEA snapshot and 2026–27 Mesquite independent locator, assess municipal coverage/geometry gaps and applicable embedding rights.
2. Wylie: inspect PDF georeferencing and reconstructability; preserve intermediate / junior-high split and compare to official feeder paths.
3. Rockwall: check if PDF has georeferenced polygons and match new middle-school zone against source map and approved academic year.
4. Richardson: inspect official school finder and identify its GIS backend, if publicly documented; keep older PDF in an independent reference category.
5. Only after rights/quality QA, release a school-specific **historical reference** overlay (orange dashed; explicit vintage), or current-year verified overlay with separate residence certification.

**Actual status of this batch:** source discovery + source-year/gap classification only. **No new attendance polygons loaded or deployed.** No claim of completed GIS expansion in the map.
