# Denton ISD — 2026–27 GeoPDF source, 39 candidate shapes and present GIS release blockers

Reviewed **2026-11-18 Eastern**. District TEA LEA `061901`. This replaces the inaccurate suggestion that Denton ISD's official 2026–27 PDFs have **no machine-readable geographic information**. There are two different facts:

1. **39 official E/M/H school-zone PDFs** (26 elementary, 9 middle, 4 high) are already individually linked from `denton-official-zone-references.js` by exact TEA campus ID. Their three official *aggregate* school-zone PDFs contain embedded GeoPDF geographic metadata and vector fill paths.
2. A **past independent QA-only extraction** reproduced 39 polygon candidates from those PDFs. **Zero** of those shapes has been imported/rehosted in Production, and no parcel-level school assignment has been certified.

## Authoritative current academic year / exact publisher links

| Grade | Official aggregate GeoPDF | Published school-zone roster | Staging polygons (previous experiment) | Publicly loaded |
| --- | --- | ---: | ---: | ---: |
| Elementary | [2026–27 district elementary GeoPDF](https://resources.finalsite.net/images/v1777570580/dentonisdorg/t3wht3nvxuf01iatrebo/AllElementaryMap_26-27.pdf) | 26 | 26 | **0** |
| Middle | [2026–27 district middle GeoPDF](https://resources.finalsite.net/images/v1777570133/dentonisdorg/q7tnltynklrfsfhmsisi/AllMiddleSchoolZoneMaps_26-27.pdf) | 9 | 9 | **0** |
| High | [2026–27 district high GeoPDF](https://resources.finalsite.net/images/v1777570662/dentonisdorg/j5syiqjmelhlufew9q6a/AllHighSchoolZoneMaps_26-27.pdf) | 4 | 4 | **0** |

[Official full campus index](https://www.dentonisd.org/families/attendance-zones) · [Official residence School Locator](https://webquery-2-denton-tx.etstack.io/).

The PDF page-level `/VP`/`/Measure` geographical control points and `EPSG:2276` source geographic reference were previously audited in [Denton GeoPDF → GeoJSON POC](DENTON_2026_GEOPDF_TO_GEOJSON_POC.md). The previous QA scripts produced synthetic-independent ID, polygon topology and 9 official Finder grade-match checks. The previous **9/9** are sampled matches, not a district-wide accuracy percentage or exact parcel enrollment certification.

**Critical near-boundary failure:** the earlier staging found a public address point within **73.2 m** of a PDF-derived middle boundary and an approximate public CAD parcel within **20.6 m** of the derived boundary. The latter is explicitly `NO_GO` under the current near-edge uncertainty rule. Four embedded PDF control-point reprojection residuals do **not** measure parcel/boundary accuracy.

The distinct GIS-original export permission was not obtained. The **2026–27 board-approved Paloma Creek Elementary reassignment** became effective after a March 24, 2026 vote; it must be reflected in any accepted elementary layer. [Board-approved 2026–27 update](https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27). The [proposed 2028–29 middle/high changes](https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification) must **not** be brought forward into the 2026–27 layer.

## Independent second spatial reference lead (partial, not Denton-wide)

The [Town of Flower Mound SchoolAttendance_MS MapServer](https://gismaps.flower-mound.com/wafmp/rest/services/Basemap/SchoolAttendance_MS/MapServer) publishes Polygon feature layer 0 with `School_District`, `Elementary`, `Middle`, `High` fields. The municipal source states its coverage is **within the Town of Flower Mound**, including several school districts, **not** the whole Denton ISD. Its data school year and consistency with 2026–27 Paloma Creek changes have not been independently established. It is neither a 39-campus GIS replacement nor production-rehostable by implication. It is recorded as a research lead only, not loaded on the map.

## Rights and requested original records

The existing Nov 9 Texas Public Information Act request asks Denton ISD for **existing** E/M/H attendance zone vector layers, exact effective year, school identity and reuse terms. Connected Sent mail confirms the request was sent. A search of the connected mailbox on **Nov 18** returned **no substantive reply**, not a district rejection or licensing approval. There is no reason to submit a redundant request immediately. [Denton ISD Public Records](https://www.dentonisd.org/our-district/departments-services/records-management/public-information-requests) says response is typically within ten business days depending on volume and complexity. No private email IDs, user addresses or mailbox URLs are committed.

## Changes in this step

- Source registry `data/denton-2026-27-gis-source-disposition.json` now explicitly distinguishes **39 derived historical QA candidates** from **0 production-published GIS**. It fixes the prior misleading ‘PDF images without GIS coordinate information’ language.
- `scripts/check-denton-geopdf-status.cjs` + `tests/denton-geopdf-provenance-and-panel.test.cjs` fail closed if anyone silently promotes 39 candidate shapes into released/authorized current GIS, claims reuse permission, substitutes a future-year layer or conflates the municipal source.
- The existing 39-campus PDF selector now contains a second **collapsed** source panel with the three original authoritative district-hosted GeoPDF links and visible current GIS limitations. It performs **no network fetch** beyond existing dashboard data, and makes no map layers or residence assignments.
- The existing Denton PDF source CI and separate **actual GeoPDF extraction workflow** are triggered by this source-provenance update. The latter must continue to publish **only nonidentifying QA status summaries**, not the 39 raw GIS features or PDF assets; the existing workflow keeps seven-day QA artifact retention.
- The file `denton-official-zone-references.js` remains responsible only for exact official-source URLs. Student-address and school-release logic is untouched.

## Next exact steps to map polygons

1. Reproduce the current published three-GeoPDF extraction; compare prior **39/39** IDs, geometry validity, elementary Paloma Creek transition and nonoverlap, inspect fresh CI report for exceptions.
2. Obtain district permission/terms allowing derivative public GIS **embedding or redistribution**, or a live publisher-owned GIS view contract. Publicly downloadable PDF does not itself prove website GeoJSON republishing rights.
3. Independently query official exact-address, grade and special-program Finder at **both sides of boundary edges**, hold uncertainty cases and record only privacy-safe summaries. Keep eight unresolved campus point discrepancies separate from the zone shape.
4. Release school-selected **reference boundaries** with visible school year, publisher/derivative distinction and orange dashed reference styling if source rights permit. Never silently mark a reference polygon as a certified residence assignment. Obtain QA signoff before a full current-year home-school auto assignment.

**Disposition:** Official GeoPDF source and 39-campus historical staging evidence **documented**; dashboard original publisher source navigation **implemented**; 39 actual production Leaflet polygons **not yet deployed**; live/owner rights and near-edge certified parcel results remain **NO_GO**.
