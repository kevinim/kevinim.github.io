# DFW-wide school assignment coverage matrix (2026-11-09)

**Project decision:** [Issue #125](https://github.com/kevinim/kevinim.github.io/issues/125). Prioritize the entire DFW region, not just six ISDs or the 29 registered school districts.

## Geographic and source denominator

The initial automated census uses the **11-county Dallas–Fort Worth–Arlington MSA** (Collin, Dallas, Denton, Ellis, Hunt, Johnson, Kaufman, Parker, Rockwall, Tarrant, Wise). [BLS county definition](https://www.bls.gov/regions/southwest/news-release/areaemployment_dallasfortworth.htm).

| Measure | TEA source count |
| --- | ---: |
| TEA 2026 school records with a district county in these 11 counties | 2,182 |
| District/LEA identifiers | 152 |
| Named ISDs | 108 |
| Other LEAs (charter/alternative/special types require classification) | 44 |
| ISDs with a registered, allowlisted official school-confirmation entry | 37 |
| ISDs with no *registered* parent entry path in this dashboard | **71** |
| Registered parent guidance rate among 108 observed ISDs | **34.3%** |
| TEA school records within the 71 unregistered ISDs | **435** |

These are **source administrative county-of-record proxies**, not boundaries of every district serving residential parcels. TEA districtCounty does not determine a particular campus's position or a student's enrollment eligibility. Cross-county districts and schools not in the supplied source may be missed. NCTCOG's broader 12-county area adds **Hood County**, which this TEA source omits; **unknown is not zero**. These 152 observed LEAs do not prove exhaustive real-estate parcel service coverage.

## 2026-11-09 parent-facing official guidance added (8 ISDs)

This is a **verified official entry URL** and appropriate instructions/limitations. It does **not** certify an address result, modern GIS polygon, school assignment, or district boundary. Parents must enter address and grade at the district's official tool; application-based or transfer schools require separate confirmation.

| TEA code | District | Official page | Caution |
| --- | --- | --- | --- |
| 220905 | Fort Worth | https://enrollment.fwisd.org/new-to-fwisd | 2026–27 School Site Locator; 2026 closures and choice options must be reviewed |
| 220901 | Arlington | https://www.aisd.net/district/about/school-directory | Use Search by Home Address; Zoned vs Signature Program |
| 220908 | Mansfield | https://www.mansfieldisd.org/student-central/attendance-zones | Find My Bus; some published maps still say 2025–26 |
| 057910 | Grand Prairie | https://www.gpisd.org/about-gpisd/campus-listings-and-map | Campus Locator by Attendance Zone; choice-school exceptions |
| 220918 | Eagle Mountain–Saginaw | https://www.emsisd.com/enroll/find-your-school-zone | 2026–27 Finder; middle school changes and grandfathered 7th graders |
| 220902 | Birdville | https://www.birdvilleschools.net/families | Boundary Locator from family entry; open enrollment is separate |
| 220912 | Crowley | https://www.crowleyisdtx.org/parents-students/enrollment-student-registration/attendance-zones | School locator requires grade-level selection, 9th vs 10–12th may differ |
| 126902 | Burleson | https://www.burlesonisd.net/families-students/enrollment-information | BISD School Search; choice campus/lottery not automatic zoning |

**Reconciliation:** 8 official entries, 399 TEA school rows previously in P0; registered count 29→37 of 108 ISDs (26.9%→34.3%); unregistered 79→71 (834→435 campus records). GIS mapping is *unchanged*. All new entries are added to the exact-host outbound allowlist. The parents' address and grades are never submitted by the dashboard.

## Highest remaining school confirmation backlog

P0 means the dashboard has **not yet verified and registered a parent assignment path**. It does *not* mean the school district lacks an official Finder.

| Priority | ISD | Campus records |
| ---: | --- | ---: |
| 1 | Waxahachie | 18 |
| 2 | Duncanville | 14 |
| 3 | Midlothian | 13 |
| 4 | Royse City | 13 |
| 5 | Aledo | 12 |
| 6 | Azle | 12 |
| 7 | Cleburne | 12 |
| 8 | Ennis | 12 |
| 9 | Weatherford | 12 |
| 10 | Cedar Hill | 11 |

Other TEA LEAs (44) are tracked separately. A charter or choice program cannot be treated as an ordinary address-assigned ISD.

## Three independent levels of evidence

**1 — Parent-facing official route:** 29/108 currently registered, with exact HTTPS allowlisted links. Landing pages/zone maps/choice procedures are not necessarily a verified address-and-grade lookup.

**2 — School-by-school map polygon linkage:** not yet measurable as a DFW-wide current-year rate. Previous browser *reference minima* exist only for seven districts: Frisco 73/73, Plano 62/63, Allen 21/22 (historical), Lewisville 53/54 (mixed year), Prosper 31/31, CFB 0/30 (official Finder, no exported GIS), McKinney 25/30 (live source and exceptions). These are per-session loaded school matches, **not** current-year legal enrollment results. The other 145 districts do not receive fabricated 0% scores.

**3 — Verified residential assignment:** this requires a real address, grade, year and authoritative district confirmation. No district-level overall rate is claimed from the current dataset.

## Reproducible files and QA

- Machine-readable source inventory: data/dfw-school-coverage-matrix-2026.json
- Rebuild: node scripts/build-dfw-school-coverage-matrix.cjs
- Exact check: node scripts/build-dfw-school-coverage-matrix.cjs --check
- Source/priority tests: tests/dfw-school-coverage-matrix.test.cjs
- Campus-level actual browser polygons/absence reasons: scripts/school-polygon-linkage-browser.cjs, joined by scripts/merge-dfw-school-coverage-runtime.cjs
- Session artifact: artifacts/dfw-school-coverage/runtime-district-linkage.json, uploaded from the school polygon linkage workflow
- User interface: optional **collapsed** DFW coverage panel beside the school list; data fetched only on opening; district/ISD search and P0/P1/P2 filters

The JSON reports missing *reason* states, including no known official parent route, no ingested school boundary, historical polygons, unresolved vintage, other program enrollment and source failure (inconclusive). Report unknown separately. Never infer an attendance zone from a campus marker, municipality, ZIP code, nearby school, or TEA rating.

## Next work

Continue parent-source verification with Waxahachie, Duncanville, Midlothian, Royse City, Aledo, Azle, Cleburne and Ennis, then work through **all 71 unregistered ISDs**, not just favorite suburbs. For each, store TEA code, authority URL, last verification date, active year, grade, search/map/choice/inquiry type, GIS availability and licensing, missing reason and next action. Expand source boundaries to Hood and any cross-county overlap before labeling the DFW geographic denominator exhaustive. Confirm school-specific missing reasons with a browser source audit, including school-choice exceptions and transient failures.
