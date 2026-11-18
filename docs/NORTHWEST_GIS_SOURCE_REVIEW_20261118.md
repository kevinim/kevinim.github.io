# Northwest ISD — 2026–27 Finder vs. 2022 public GIS source inventory

Reviewed: 2026-11-18 (America/New_York). School district: **Northwest ISD**, TEA LEA `061911`.

## Result

- **Research inventory completed** for the previously reported three public ArcGIS candidate layers; full current-year geometry ingestion **not approved**.
- Official 2026–27 campus attendance maps and address/grade School Zone Locator are available at https://www.nisdtx.org/schoolfinder (redirects to MyPlanware). The district approved the 2026–27 rezoning **January 12, 2026**. **Romer Elementary** and **Barksdale Middle** opened with new attendance boundaries in August 2026.
- Separately, the district approved **2027–28 high-school boundaries November 9, 2026**, adding a Davis High zone. This is *future* from the target 2026–27 dataset: do not merge those polygons or assume it remains a mere proposal.
- Three machine-readable public **historical candidate** polygon services exist. Their recorded last edit dates are in **2022**; these dates are *not* a verified 2022–23 academic school year. The middle/high layers are titled **planning areas**, not confirmed current operational campus attendance polygons.
- A publicly accessible ArcGIS feature service is not independent evidence of the source being district-authoritative for enrollment, exact 2026–27 coverage, campus-ID parity, or permission to replicate/rehost the layer. No geometry is downloaded, copied or displayed by this research change. Production address-to-campus assignment remains on the official Finder link.

## Direct source evidence

| Level | Publisher layer | Geometry / field | Metadata last edit | Academic year | Release |
| --- | --- | --- | --- | --- | --- |
| Elementary | [NWISD elementary attendance zones](https://services3.arcgis.com/qnlpi19w6R1Ta48m/ArcGIS/rest/services/NWISD_Elementary_School_Attendance_Zones/FeatureServer/0) | polygon, `School_Boundary` | 2022-02-17 | **unverified** | research only |
| Middle | [Middle School New Planning Area](https://services3.arcgis.com/qnlpi19w6R1Ta48m/ArcGIS/rest/services/NISD_New_Attendance_Zones/FeatureServer/2) | polygon, `MID_NAME` | 2022-11-17 | **unverified** | research only |
| High | [High School New Planning Areas](https://services3.arcgis.com/qnlpi19w6R1Ta48m/ArcGIS/rest/services/NISD_New_Attendance_Zones/FeatureServer/1) | polygon, `HIGH_NAME` | 2022-11-17 | **unverified** | research only |

Each layer has a public ArcGIS REST metadata page with polygon geometry and the above source fields. None of the pages establishes a 2026–27 version or explicit permission for external site republishing.

District-owned sources:
- [Approved 2026–27](https://www.nisdtx.org/departments/facilities/attendance-boundaries/proposed-2026-2027-boundaries): Romer, Barksdale, adjustments and grade-based grandfather exceptions.
- [Approved 2027–28](https://www.nisdtx.org/departments/facilities/attendance-boundaries/2027-2028-boundaries): November 9, 2026 vote; must not contaminate 2026–27.
- [Attendance Boundaries and official Finder](https://www.nisdtx.org/departments/facilities/attendance-boundaries): source of actual address/grade current assignment.

## Intake and QA

Data contract: `data/west-dfw-zone-source-audit-2026.json` contains level, exact source URL, recorded *data-last-edit*, unknown academic year, completeness and rights flags. No feature coordinates or residence queries are stored.

**Academic-year field correction:** `verifiedPolygonAcademicYear` for Northwest is `null` because none of the three GIS candidates has a verified academic-year/authorized geometry. The separately maintained `verifiedOfficialFinderAcademicYear` is `2026-27`; it refers **only** to the board-approved current operating Finder. The supplementary provenance census therefore reports Northwest geometry as `unverified`, not `2026-27`.

Enforcement: `scripts/audit-west-dfw-zone-sources.cjs` pins the three exact source URLs and dates, refuses year inflation, forbidden source-host swaps, reuse approval assertions, partial-district inferred coverage, and any automatic polygon display/assignment. `tests/audit-west-dfw-zone-sources.test.cjs` has negative tests for each failure mode. West DFW integrated GitHub Actions executes these checks when relevant files change.

User-facing: the existing West DFW note identifies 2022 as the *last edited date*, not a school-year publication date. The official 2026–27 Finder remains linked and no unsafe overlay is introduced.

## Remaining work before school-level map layer activation

1. Request existing approved 2026–27 E/M/H GIS export or documented live layer from the district GIS / Facilities office. Ask whether any 2022 areas are identical to 2026–27 or were superseded. Preserve approval date, exact school year, source attribution and reuse/embedding terms.
2. Obtain roster and campus code crosswalk, confirm Romer/Barksdale presence and impacted schools, test polygon coverage across actual district jurisdiction, islands and holes; do not substitute the 2022 planning layer for missing current schools.
3. Check at least three non-residential public addresses per grade level in the district School Zone Locator, including newly affected school areas and boundaries; retain evidence without private household addresses.
4. If reuse/embedding rights allow historical references, render live publisher-linked **orange dashed source-year-unknown** shapes as a clearly labeled historical reference only. Never silently label as `2022–23` or `2026–27`.
5. For any **current assigned school** feature, separately satisfy the existing release gate for exact address+grade+year and special student/transfer exceptions. Then run real mobile/desktop marker, map layer and privacy QA and obtain release sign-off.

**Disposition:** Northwest source research `DONE`; current-year GIS import `BLOCKED_SOURCE_RIGHTS_AND_YEAR`; 2026–27 official address Finder `AVAILABLE`; changes in this PR `SOURCE_REGISTRY_AND_NOTICES_ONLY`.
