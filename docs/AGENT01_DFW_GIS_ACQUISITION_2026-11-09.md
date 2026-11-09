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
- If all three pass, writes **quarantined, source-year-unknown** `artifacts/agent01-irving-gis-stage/QUARANTINED-source-year-unknown.geojson` locally in the CI job, plus a provenance JSON report. These are not tracked in Git or loaded in the dashboard.
- If a source layer or any field is missing/ambiguous, exits nonzero and reports the blocker. An ArcGIS map being embedded on an official page is not enough to certify a school-year boundary.
- Normalized features explicitly have `schoolYear:null`, `campusId:null`, `sourceYearVerified:false`, `independentFinderVerified:false`, and `status:'QUARANTINED_YEAR_UNKNOWN'`.

## Verification

- Unit QA: source identity, unique grade-layer selection, host allowlist, WGS84 polygon topology/bounds, fail-closed school-name check, no unapproved promotion.
- No runtime implementation files modified; production school marker, school-type filter, and boundary selection code remains byte-for-byte unchanged by this Draft.
- **Not completed:** publisher 2026–27 GIS vintage and TEA ID mapping, source reuse authorization, actual residence→Finder→campus→visible zone E2E browser QA. Do not describe unit tests or a successful staging fetch as these acceptance tests.

## Release decision

**NO-GO.** Only promote Irving to a separately reviewed future integration branch after exact year, campus ID/name/grade mapping, rights, independent official address holdouts and browser screenshot QA pass. PR #148's mandatory release gate remains active. No PR merge or production deployment is authorized.
