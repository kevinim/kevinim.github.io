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
| ISDs with a registered, allowlisted official school-confirmation entry | 49 |
| ISDs with no *registered* parent entry path in this dashboard | **59** |
| Registered parent guidance rate among 108 observed ISDs | **45.4%** |
| TEA school records within the 59 unregistered ISDs | **292** |

These are **source administrative county-of-record proxies**, not boundaries of every district serving residential parcels. TEA districtCounty does not determine a particular campus's position or a student's enrollment eligibility. Cross-county districts and schools not in the supplied source may be missed. NCTCOG's broader 12-county area adds **Hood County**, which this TEA source omits; **unknown is not zero**. These 152 observed LEAs do not prove exhaustive real-estate parcel service coverage.

## Follow-up official parent guidance: 12 additional ISDs (stacked on PR #141)

These twelve **district-operated HTTPS** parent pages have been researched on November 9, 2026. This stage registers official entry links and source cautions **only**—never an inferred address assignment or map polygon. No private home or office address was submitted.

| TEA code | District | Official district page | Source/year/grade caution |
| --- | --- | --- | --- |
| 070912 | Waxahachie | https://www.wisd.org/departments/transportation | 학군 Transportation의 Find Your School에서 공식 검색기로 이동하세요. 버스노선과 학교 배정은 다르며 주소·학년별 배정은 학군에서 확인하세요. |
| 057907 | Duncanville | https://www.duncanvilleisd.org/buildingthefuture/rezoning | 2026–27 변경된 출석구역을 확인하세요. 이전 Current Zoning과 Proposed Feeder Pattern을 확정 배정으로 혼동하지 말고 학군의 전학 예외를 확인하세요. |
| 070908 | Midlothian | https://www.midlothianisd.org/enrollment/school-boundaries | 공식 Find My School에서 주소별 초·중·고 배정을 확인하세요. 신설 도로·신축 단지는 검색에 반영되지 않을 수 있어 경계 부근은 학군에 재확인하세요. |
| 126903 | Cleburne | https://www.c-isd.com/students-families | 학군 Students & Families의 Find My School Zone에서 주소별 학교 확인을 진행하세요. 학년도와 학년·전학 예외는 등록담당자에게 재확인하세요. |
| 184907 | Aledo | https://www.aledoisd.org/parents-students/new-and-returning-student-registration/registration-frequently-asked-questions | 공식 등록 FAQ에서 Attendance Zone Committee의 최종 초·중학교 경계 지도를 참조하세요. 게시 지도는 2024년 채택본으로 2026–27 적용 여부를 학군에 확인하세요. 자동 주소 Finder는 미확인입니다. |
| 184903 | Weatherford | https://www.weatherfordisd.com/apps/pages/index.jsp?type=d&uREC_ID=236882 | 공식 School Zone Finder에서 주소를 검색하세요. 초·중학교 구역과 학년도·전학 예외를 구분하여 학군에 확인하세요. |
| 220915 | Azle | https://www.azleisd.net/page/attendance-zones-school-locator/ | 2026–27 School Search에서 주소를 입력하세요. 변경된 초등 PK–5 및 주니어하이 6–8 학년 구역을 확인하세요. |
| 057904 | Cedar Hill | https://enroll.chisd.net/enrollment/ | 학군 공식 Enrollment의 School Finder에서 주소별 학교를 확인하세요. Signature Studies 및 학군내·학군외 전학은 별도 심사입니다. |
| 057906 | DeSoto | https://www.desotoisd.org/cms/one.aspx?pageId=21214842 | 학군 공식 Attendance Zones 지도에서 주소를 검색하세요. Selective Enrollment·Choice·전학은 일반 주소별 배정과 다르고 적용 학년도는 별도 확인이 필요합니다. |
| 057913 | Lancaster | https://www.lancasterisd.org/page/attendance-zone-locator | 공식 Attendance Zone Locator에서 주소별 지정 초등학교를 확인하세요. 중·고등학교와 특수프로그램 배정은 별도 검증이 필요합니다. |
| 070911 | Red Oak | https://www.redoakisd.org/district-85/roisd-attendance | School Zone Locator는 주소별 초등학교 구역을 보여줍니다. 중·고등학교·경계 밖 주소·전학은 학군에서 별도 확인하세요. |
| 129901 | Crandall | https://www.crandall-isd.net/attendancezone | 학군 Attendance Zone Finder에서 주소를 확인하세요. 성장에 따라 배정구역이 매년 재검토되므로 2026–27 적용 여부와 최신 변경사항을 확인하세요. |

**Registration metric:** 37→49 of 108 ISDs (**34.3%→45.4%**), +12 districts and +143 TEA campus rows; linked school records 1,506→1,649 of 1,941. Remaining 59 districts / 292 campus records. Distinct coverage metrics: official parent link ≠ current GIS polygon ≠ confirmed address + grade enrollment. Aledo maps are labeled effective 2024; Duncanville changes in 2026–27; Lancaster/Red Oak locator scope is elementary. No zero-value GIS or assignment rates are inferred.

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

P0 means the dashboard has not registered a verified district-owned parent entry page; it does not mean the district lacks a Finder.

| Priority | ISD | Campus records |
| ---: | --- | ---: |
| 1 | ROYSE CITY | 13 |
| 2 | ENNIS | 12 |
| 3 | EVERMAN | 11 |
| 4 | GREENVILLE | 10 |
| 5 | JOSHUA | 10 |
| 6 | TERRELL | 9 |
| 7 | AUBREY | 8 |
| 8 | HIGHLAND PARK | 8 |
| 9 | SPRINGTOWN | 8 |
| 10 | WHITE SETTLEMENT | 8 |

Other TEA LEAs (44) are tracked separately. A charter or choice program cannot be treated as an ordinary address-assigned ISD.

## Three independent levels of evidence

**1 — Parent-facing official route:** 49/108 currently registered, with exact HTTPS allowlisted links. Landing pages/zone maps/choice procedures are not necessarily a verified address-and-grade lookup.

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

Continue official parent-source verification with Royse City, Ennis, Everman, Greenville, Joshua and **all 59 remaining unregistered ISDs**, not just favorite suburbs. For each, store TEA code, authority URL, last verification date, active year, grade, search/map/choice/inquiry type, GIS availability and licensing, missing reason and next action. Expand source boundaries to Hood and any cross-county overlap before labeling the DFW geographic denominator exhaustive. Confirm school-specific missing reasons with a browser source audit, including school-choice exceptions and transient failures.
