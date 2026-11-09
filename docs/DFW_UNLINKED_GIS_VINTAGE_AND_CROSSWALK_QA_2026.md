# DFW unconnected school GIS provenance and bootstrap QA

Verified 2026-11-09; **independent Draft only; NO production merge/deploy.**
This stacked work is based on #164, which is based on #162. It does not touch
the independent CFB Finder-derived interpolation work (#149/#154/#155/#163)
or downgrade the #148 residential-assignment NO_GO release gate.

## Critical separation of evidence

| Observation | What it establishes | What it does **not** establish |
| --- | --- | --- |
| 107/108 districts with official parent paths, #160 | District parent/inquiry route located | Exact address assignment or campus GIS |
| 7/108 ISDs with configured campus polygon sources after #164 | Some school-level geometry can be loaded | Validity for every district, campus, or academic year |
| Dallas 135 elementary + 30 middle + 22 high publisher polygons | 187 geometries in the public Dallas publisher source | Independent 2026-27 enrollment/assignment truth |
| Live TEA crosswalk script | Recorded campus-code equality and unresolved name exceptions | GIS vintage, school feeder, specialty and apartment exceptions |
| Desktop 1366px/mobile 390px GIS browser | Nonresidential polygon -> map overlay visibly renders | Legally assigned schools for an actual residence |
| #165 public apartment building address smoke test | Actual geocoder/form/marker/rendering path works | Unit-level home assignment or official Finder match |

TEA campus records use the 2026 *preliminary* accountability snapshot, not the 2026-27 street directory.
The Dallas ArcGIS source last-edit date 2026-07-22 is not independent evidence of school-year validity.
The read-only crosswalk `scripts/audit-dallas-campus-ids.cjs` loads official publisher geometry
in memory, checks all 187 zone records against TEA nine-digit campus IDs and names,
reports mapping exceptions by grade in runner temporary storage (not committed or rehosted),
and **always** reports `readyForProduction:false` and `schoolYearOfGISConfirmed:false`.
It does not persist addresses, coordinates or polygon geometry.

## Additional source research: Northwest ISD, historical GIS quarantine

Actual ArcGIS campus-specific feature layers were identified in the Northwest district context
at `services3.arcgis.com/qnlpi19w6R1Ta48m`. However they were last modified in 2022,
including some explicitly marked 2022-23. The district has since adopted
2026-27 attendance boundaries, including new schools and shifted zones.
**Do not ingest these ArcGIS polygons into `state.zoneData` or label them as current.**
Official current lookup: https://www.nisdtx.org/schoolfinder
District published boundary decision:
https://www.nisdtx.org/departments/facilities/attendance-boundaries/proposed-2026-2027-boundaries

See `data/dfw-unlinked-gis-triage-2026.json` for dated layer URLs, district-specific
follow-ups and rejected misleading geospatial results (a Fort Worth district outline
and Austin-area AISD layer). This catalog is a research inventory, **not** 2026-27 school
GIS data and does not increase 7/108 source-connected districts.

## Release and CI requirements

This Draft adds `.github/workflows/dfw-unlinked-gis-provenance-qa.yml`, which runs
the centralized canonical versioned bootstrap check, existing public-preview XSS/source
trust regression, unlinked GIS vintage test, TEA crosswalk and real publisher-polygon
mobile/desktop browser test, with 390px and 1366px rendered Leaflet map and school-candidate screenshots preserved as short-lived, no-address CI artifacts. The bootstrap guard allows reviewed cache versions like
`v=5` while still rejecting missing, duplicate, cross-origin, inline or malformed
external script tags; it removes outdated `v=3` checks without disabling CSP.

Release remains NO_GO until independent official Finder vs public nonprivate holdouts
and property-specific legally appropriate cases satisfy gate #148, GIS year/provenance
and permissions are verified, campus crosswalk exceptions reviewed, and the user
explicitly approves any Production deployment. No paid services or addresses stored.

Additional false-positive safeguard: a 2026–27 `GCS` Locator Map ArcGIS layer occurs outside Texas (~80°W); it is **not** Grapevine-Colleyville ISD (GCISD), and must never count toward DFW school-zone coverage.
