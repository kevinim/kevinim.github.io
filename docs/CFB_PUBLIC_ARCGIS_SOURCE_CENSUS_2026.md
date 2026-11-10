# CFB school attendance zone GIS — public ArcGIS service acquisition probe

Scope: Read-only public ArcGIS REST metadata and ArcGIS public item-search results. No spatial feature queries of school polygons; no direct address or student data, no district login, no copy/rehosting or license assumptions.

Current CFBISD School Search follows the approved March 6, 2025 zones:
https://www.cfbisd.edu/students/school-maps-locator-system
2025–26 grade-band board rezoning summary:
https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning

Known public GIS sources that DO NOT establish current CFB E/M/H attendance polygons:

* https://services3.arcgis.com/KkgpUIloCxkczPwY/ArcGIS/rest/services/CFBISD_SchoolPoints/FeatureServer/3 — esriGeometryPoint, 2021–22 NCES EDGE SCHOOL LOCATION POINTS, NOT zones. Public-domain NCES points, not approved 2026 site/zone proof.
* https://services8.arcgis.com/A76GjgcBUTTcwFGS/arcgis/rest/services/Schools_with_Attendance_Boundary/FeatureServer/0 — boundary-sounding name is insufficient. Verify geometry type, year, district, original publisher.
* https://services8.arcgis.com/K3KZyCukvfGuGXEj/ArcGIS/rest/services/Schools_zones_8a46b5816cd64546b662104bcb090ec4/FeatureServer/2 — actual esriGeometryPolygon, but public metadata does not establish current CFBISD ownership or district zoning authority. Unrelated polygons must not enter DFW site.

Live free script examines these 3 metadata sources and three ArcGIS public item searches. Each newly surfaced item is a REVIEW CANDIDATE, not an approved current official GIS. Verified original school-level GIS=0 until exact publisher, campus IDs, effective year, school assignment correlation and rights are established. Do not confuse CFBISD with Houston CFISD (Cypress-Fairbanks ISD) or city school traffic-speed zones.

Existing written public-records request already sent Nov 9; no duplicate request. Once native official source is received, add specific source adapter with visible Track B uncertainty, immutable school assignment block and browser QA before any main merge.

Status: QA-only, not a production geometry release.

## Executed real public API result — GitHub Actions 42737708890

All **10/10 PR workflows passed**, including source-discovery live ArcGIS public REST metadata. Three direct service endpoints returned usable metadata:

- CFBISD_SchoolPoints — **esriGeometryPoint**, 2021–22 NCES building locations only, not school zone polygons.
- Schools_with_Attendance_Boundary layer 0 — **esriGeometryPoint**, despite the misleading service title.
- Schools_zones_... layer 2 — **esriGeometryPolygon**, but lacks proven CFB district owner/2025 Board-effective year/source authority.

Three live ArcGIS item-catalog searches completed without provider errors and found **0 items whose title/description jointly established CFB ISD school-zone identity**. This does NOT prove no private or other unindexed district GIS exists; it confirms the inspected public candidate services cannot be promoted to official 2026–27 CFB campus-zone GIS. District's existing official GIS records request remains the acquisition path. Do not fetch geometry or record any residential address in this census.

Evidence: https://github.com/kevinim/kevinim.github.io/actions/runs/42737708890
