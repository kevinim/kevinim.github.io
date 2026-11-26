# DFW newly discovered unconfigured GIS source intake — 2026-11-21

## Scope and disposition

The dashboard's existing 11-county TEA census identifies **108 public ISDs** and distinct official parent guidance for all 108. This research adds **four source-level reviews** totaling **147 campus inventory records** (Mesquite 51, Wylie 22, Rockwall 23, Richardson 51). None of these counts is a new certified polygon or residential assignment.

The purpose is to move the next unconfigured ISDs from an **unreviewed-source gap** to an **explicit, reviewable source candidate**, without changing `data/dfw-school-coverage-matrix-2026.json`'s deterministic denominator or falsely increasing a school-specific GIS completeness rate.

| District | Public source | Verified | Still missing |
|---|---|---|---|
| Mesquite ISD | [City of Mesquite municipal ArcGIS MapServer/6](https://gisservice.cityofmesquite.com/arcgis/rest/services/onlinemaps/neighborhood_vitality/MapServer/6) | Polygon feature layer; `ES_ZONE`, `MS_Zone`, `HS_Zone`; GIS supports geoJSON query | Academic year, whole-district coverage, campus-ID reconciliation, reuse/embedding terms, independent address-grade comparison |
| Wylie ISD (Collin County, TEA 043914) | [District Maps](https://www.wylieisd.net/our-district/district-profile/district-maps) and [2025–26 rezoning / 2026–27 feeder](https://www.wylieisd.net/our-district/rezoning-2025-26) | Official map/finder and distinct 2026–27 feeder pattern; **2026–27 campus polygon vintage NOT verified** | Verified Collin district school-zone vector, school-year confirmation, intermediate/junior-high feeder handling and reuse terms |
| Rockwall ISD | [District school attendance areas page](https://www.rockwallisd.com/new-student/new-student/school-attendance-areas) and [PDF map](https://resources.finalsite.net/images/v1746561842/rockwallisdcom/xu447xmnec7gsjl7ekfh/2026-2027ZoningwithnewMS.pdf) | **Source year disputed**: publisher heading 2026–27, embedded document-viewer link label 2023–24; filename 2026–2027 is not enough to resolve | Year reconciliation, reusable per-campus vector, edge QA, official residence-by-grade finder/inquiry |
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
2. Wylie (Collin County): reject the Abilene Wylie ISD PDF; inspect the Collin district's published map, address finder and 2026–27 feeder pattern. Preserve distinct K–4 / 5–6 / 7–8 / 9–12 school stages, identify verified vector availability, and never equate the wrong district's zone map with this district.
3. Rockwall: reconcile official webpage's 2026–27 heading with 2023–24 embedded viewer caption before attributing an academic year. Check PDF georeferencing, new middle-school zone and official inquiry; bus route lookup explicitly does **not** certify attendance.
4. Richardson: inspect official school finder and identify its GIS backend, if publicly documented; keep older PDF in an independent reference category.
5. Only after rights/quality QA, release a school-specific **historical reference** overlay (orange dashed; explicit vintage), or current-year verified overlay with separate residence certification.

**Actual status of this batch:** source discovery + source-year/gap classification only. **No new attendance polygons loaded or deployed.** No claim of completed GIS expansion in the map.

## Provenance correction — 2026-11-21 (P0 source-identity gate)

The first published source inventory incorrectly associated a 2026–27 `files-backend.assets.thrillshare.com/.../Wisd/.../2026-27-Attendance-Zones.pdf` document with DFW Wylie ISD. That PDF lists **Highway 83/84**, **Buffalo Gap Road**, East/West/South Elementary and Wylie High School. Those names belong to **the Abilene Wylie ISD** (publisher `www.wyliebulldogs.org`, physical office **6251 Buffalo Gap Road, Abilene, TX 79606**). It is *not* the 043914 southern Collin County Wylie district in the 108-ISD census. The correct publisher `www.wylieisd.net` describes 23 campuses around Wylie/Sachse/Murphy/Lucas/Lavon, including Wylie High and **Wylie East High**; the source mismatch is material and cannot be hidden behind a year label.

**Corrected release:** The Abilene PDF is fully removed from the DFW source manifest and no longer asserted as a valid 2026–27 campus map. The Collin district's current map/official school-bus finder, Jan 2025 approved rezoning effective 2025–26, and 2026–27 feeder pattern remain supported. In this specific manifest both the school-specific GIS year and installed polygons remain **unknown/0**. The current official district website separately instructs parents to use its address finder for definite zone assignment.

Rockwall publisher's [attendance areas page](https://www.rockwallisd.com/new-student/new-student/school-attendance-areas) has a **2026–27** heading but labels the actual linked PDF in its page body as effective **2023–24**, while the linked PDF filename contains **2026–2027**. The PDF is retained as a publisher reference but `sourceSchoolYear=null` until the contradictory source identity/year statements are resolved. The same page explicitly states that its bus route finder is *not* an official attendance-zone decision tool.

**No new campus attendance polygon has been added.** Source status changes require deterministic validation in `tests/dfw-next-gis-source-candidates.test.cjs`; the renderer now fails closed if wrong Wylie/Abilene links or unsupported Rockwall school years reappear. These are source-quality fixes, not a certified E/M/H residence assignment.

Sources checked: https://www.wyliebulldogs.org/article/2594492 ; https://www.wylieisd.net/our-district/district-profile ; https://www.wylieisd.net/our-district/district-profile/district-maps ; https://www.wylieisd.net/our-district/rezoning-2025-26 ; https://www.rockwallisd.com/new-student/new-student/school-attendance-areas .

## 2026-11-25 incremental review — Melissa ISD (TEA 043908)

The original four-district inventory above remains a dated 2026-11-21 snapshot. The dashboard now has a **fifth researched source-card candidate**: Melissa ISD (9 TEA campus records; five-source intake totals 156 campus records). **It does not add campus polygons**: DFW runtime remains 6 primary GIS + 2 optional GIS + 100 no-campus-polygon ISDs.

Verified independent district announcement, December 19, 2025:

- [Melissa Move](https://www.melissaisd.org/o/nce/article/2608592) confirms that **2026–27 elementary zones were board-approved in March 2025**. Cardinal Renaissance Academy (Elementary #6) opens in 2026–27; families in its assigned zone and district GT students may have enrollment choices. GIS-only elementary assignment would be unsafe.

- [Interactive Zoning Map](https://www.melissaisd.org/page/interactive-zoning-map) is the district-controlled public entry point. The live selected school-year, E/M/H geometry completeness, campus ID crosswalk, rights and CORS were **not independently verified**. The null sourceSchoolYear describes **live map geometry**; approvedElementaryYear 2026-27 refers only to the board-approved E map announcement.

- No live source geometry was copied; no private residence queried or stored; no automatic student assignment or redistribution permission granted.

- Follow-up: inspect publisher locator year selection and grade layers, crosscheck public non-residential points and CRA choice exceptions; confirm embedding rights before any reference polygon activation.

Files: data/dfw-next-gis-source-candidates-20261121.json, features/dfw-school-coverage-renderer.js, tests/dfw-next-gis-source-candidates.test.cjs. SEC-04 rightsDecision remains pending and the updated link-only JSON blob SHA is pinned.

- Provenance clarification (2026-11-25): the official Melissa **online zoning help page still describes 2025–26** as its shown school-year guide; its separate board announcement confirms approval of the **2026–27 elementary** attendance zones. This is not proof that every live GIS E/M/H polygon was refreshed. The candidate's per-row review date and guide year are recorded independently of its unknown `sourceSchoolYear`.
