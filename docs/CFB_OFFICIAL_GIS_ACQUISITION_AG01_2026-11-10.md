# AG 01 — CFBISD official GIS acquisition and handoff (2026-11-10)

## Outcome

**Verified current campus-level attendance-zone polygons: 0.** The district publishes 2025–26 approved E/M/H *raster images* and a live 2026–27-context GuideK12 school finder. This does not prove a redistributable 2026–27 campus polygon GIS exists.

Draft PR #208 (https://github.com/kevinim/kevinim.github.io/pull/208) already contains the 3 whole-grade approved raster images, an initial calibration, Texas 2025–26 GIS **district outlines**, and experimental unsanctioned tracing. AG01 does not modify these files or UI; its new inventory is additive.

## Reusable files

- data/cfb-official-gis-acquisition-2026-11-10.json: six district-published images (3 whole-grade and 3 supplemental), metadata sources, year, rights and discrepancies.
- scripts/check-cfb-official-gis-acquisition.cjs: offline fail-closed provenance validation. Optional --live tests public raster HEAD and ArcGIS metadata only; no GuideK12 scraping.
- tests/cfb-official-gis-acquisition.test.cjs: native Node test for source boundaries and negative release promotion.

Commands:
    node --test tests/cfb-official-gis-acquisition.test.cjs
    node scripts/check-cfb-official-gis-acquisition.cjs
    node scripts/check-cfb-official-gis-acquisition.cjs --live

Remote fetch failures are advisory and do not authorize geometry. No raw third-party images are copied into the repo.

## Acquired/located evidence

| Source | Verified/located object | Year | Rights | E/M/H polygon? |
| --- | --- | --- | --- | --- |
| https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning | Districtwide approved E/M/H raster images, previously linked by #208 | 2025–26 | Publisher page is public; external reproduction/derivation not established | No |
| https://www.cfbisd.edu/about-us/facility-planning-advisory-group/proposed-plan-for-furneaux-elementary | Furneaux closed-zone local image; Davis and Thompson reassignment | 2025–26 | Public viewing; reuse uncertain | No |
| https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/proposed-plan-for-mccoy-elementary | McCoy local image; Good, Blanton, Carrollton reassignment | 2025–26 | Public viewing; reuse uncertain | No |
| https://www.cfbisd.edu/about-us/facility-planning-advisory-group/proposed-plan-for-long-middle-school | Long local image; Blalack and Polk reassignment | 2025–26 | Public viewing; reuse uncertain | No |
| https://data.capitol.texas.gov/dataset/school-districts | Texas Legislative Council 2025–26 official **ISD JURISDICTION** shapefile, https://services2.arcgis.com/5MVN2jsqIrNZD4tP/arcgis/rest/services/School_Districts__2026/FeatureServer/0; already reused by #208 | 2025–26 | Creative Commons Attribution explicitly on portal | No |
| https://services3.arcgis.com/KkgpUIloCxkczPwY/ArcGIS/rest/services/CFBISD_SchoolPoints/FeatureServer/3 | esriGeometryPoint, historical NCES 2021–22 public school locations | 2021–22 | Underlying NCES source public domain per layer metadata; hosting terms separate | No |
| https://dunaway.com/project/carrollton-farmers-branch-isd-gis-mapping/ | Contractor notes CFBISD attendance-zone GIS overlays; no public export found | Unconfirmed | No export rights established | Not verified |
| https://www.cfbisd.edu/students/school-maps-locator-system | Official GuideK12 live address search | Current | Data/API bulk extraction rights not established | No published export verified |
| https://tea.texas.gov/families-and-students/school-district-locator/geographic-data | TEA warns district outlines cannot determine attendance zones | Not applicable | Informational | No |

No CFB-authenticated 2025–26 or 2026–27 campus-level GeoJSON, shapefile, FGDB or ArcGIS service was verified. No separate official PDF suitable as a vector GIS source was verified here. Public image access and file rehosting permission must be evaluated separately.

## Two inconsistencies among official 2025–26 pages

1. **McCoy split:** The districtwide approved rezoning table groups Parks of Carrollton, Jackson Place, Bluffview and Bluffview II under a reassignment to *Blanton*; the detailed McCoy approved plan assigns those areas to *Good*. Do not resolve this by silently guessing from a raster; seek current exact-address Finder confirmation and district clarification.
2. **Furneaux:** Districtwide approved table says *Woodlake* subdivision on Frankford Rd, while the Furneaux detailed page says *Woodland* subdivision on Frankford Road. Do not assume these names mean the same location.

Sources: https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning ; https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/proposed-plan-for-mccoy-elementary ; https://www.cfbisd.edu/about-us/facility-planning-advisory-group/proposed-plan-for-furneaux-elementary

## Agent handoff

**AG 02 georeferencing:** Read rasterAssets in the JSON. Add the three *partial-area* official images to control-point/road alignment evidence for the parent E/M/H maps in #208. Treat all pixels as unregistered until independently measured. The source images do not provide spatial reference.

**AG 03 polygon reconstruction:** Use local map images as constraints around Furneaux, McCoy and Long. Flag Good-versus-Blanton and Woodlake-versus-Woodland in feature metadata as unresolved; four consolidated campuses (Central, Furneaux, McCoy, Long) are historical, not automatically zoned 2026–27. District outline may clip the reconstruction but cannot supply internal campus boundaries. Assign actual TEA campus IDs only after joining to authoritative project data.

**AG 04 independent Finder QA:** Validate exact public residential base-address candidates in the native GuideK12 autocomplete and read actual Assigned School, not a generic matching list. Prioritize both sides of split zones. No unit numbers, student data or private household address collection. Finder observations do not confer GIS redistribution rights.

## Unresolved acquisition and alternatives

- Await the separately submitted CFBISD Public Information Request for *existing* E/M/H vector files or available GIS service endpoints with exact school year, approval date, TEA campus IDs and use/derivative permissions.
- Seek district/Dunaway authorization for the particular attendance-zone layers implied by the contractor's case study; no paid commissioned work or fee without express approval.
- If none are releasable, rely on the AG02/AG03 2025–26 raster reconstruction **only as provenance-labelled reference geometry** and AG04 Finder cross-check, never unverified home assignment.
- The separate school-boundary polygon approval and production release gates remain NO-GO. AG01 changes only its independent branch; no main merge.
