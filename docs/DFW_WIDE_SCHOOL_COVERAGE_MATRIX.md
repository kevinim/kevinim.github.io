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
| ISDs with a registered, allowlisted official school-confirmation entry | 85 |
| ISDs with no *registered* parent entry path in this dashboard | **43** |
| Registered parent guidance rate among 108 observed ISDs | **78.7%** |
| TEA school records within the 23 unregistered ISDs | **61** |

These are **source administrative county-of-record proxies**, not boundaries of every district serving residential parcels. TEA districtCounty does not determine a particular campus's position or a student's enrollment eligibility. Cross-county districts and schools not in the supplied source may be missed. NCTCOG's broader 12-county area adds **Hood County**, which this TEA source omits; **unknown is not zero**. These 152 observed LEAs do not prove exhaustive real-estate parcel service coverage.

## Sixth batch: twelve more official parent guidance paths (stacked on PR #157; not deployed)

**Verified 2026-11-09.** Registrations rise **73 → 85/108 (78.7%)**, matching TEA campus records **1827 → 1880/1941**. **23 districts / 61 TEA school records** remain without registered official parent guidance.

| TEA code | ISD | Official district entry | Caveat |
| --- | --- | --- | --- |
| 249902 | Boyd | https://www.boydisd.net/enrollments | Boyd ISD 공식 등록·전출 및 ASCENDER Parent Portal 안내입니다. 주소별 학교 배정 Finder가 아니며, 거주지와 학년에 따른 실제 캠퍼스는 학군 PEIMS 담당자에게 확인해야 합니다. |
| 184909 | Brock | https://www.brockisd.net/apps/pages/index.jsp?pREC_ID=1200231&termREC_ID=&type=d&uREC_ID=532370 | Brock ISD 2026–27 공식 Skyward 학생 등록입니다. TEA School District Locator는 학군 외곽 조회이지 학교별 지정학교 검색기가 아닙니다. 학년별 캠퍼스 및 학군 밖 전학 승인 여부를 확인하세요. |
| 220910 | Lake Worth | https://www.lwisd.org/registration-process | Lake Worth ISD 2026–27 공식 등록 안내입니다. 제출 거주지 서류는 학교 측이 검토하지만 공개 주소검색기는 아닙니다. 학군 밖 전학 및 특수 프로그램 예외와 실제 학년별 지정학교를 별도 확인하세요. |
| 184908 | Peaster | https://www.peaster.net/parents-students | Peaster ISD 공식 학부모 페이지는 ASCENDER 및 신규 Pre-K·Kindergarten 등록과 전학 안내로 연결됩니다. Pre-K·K 등록 안내를 모든 학년 배정으로 해석하지 말고 1–12학년 주소별 학교는 학군에 확인하세요. |
| 061903 | Pilot Point | https://www.pilotpointisd.com/ | Pilot Point ISD 공식 사이트의 Getting Started → Registration Information에서 등록 절차를 확인하세요. 2026–27 학군 밖 전학은 별도이며 공개 주소별 학교 검색기는 확인되지 않았습니다. |
| 249903 | Bridgeport | https://www.bridgeportisd.net/enrollment | Bridgeport ISD 2026–27 공식 등록 안내입니다. 학군 밖 학생은 별도 전학 신청이 필요합니다. 학군 외곽 지도는 학교별 출석구역 폴리곤이 아니므로 학년별 지정학교는 Registrar에게 확인하세요. |
| 116903 | Commerce | https://www.commerceisd.org/for-parents/back-to-school/student-online-registration | Commerce ISD 공식 학생 등록 안내에는 CES PK–2, ACW 3–5, CMS 6–8, CHS 9–12 캠퍼스별 학년이 나옵니다. 학년별 캠퍼스 목록은 주소 배정 증명이 아니며 학군 경계와 전학 여부도 확인해야 합니다. |
| 043904 | Farmersville | https://www.farmersvilleisd.net/apps/pages/index.jsp?pREC_ID=2424228&type=d&uREC_ID=445987 | Farmersville ISD 공식 안내는 2026–27 Pre-K, K–12 신규·재학생 등록과 전학 절차를 구분합니다. Skyward 등록은 주소별 학교검색기가 아니므로 주소와 학년의 지정학교는 학군에 문의하세요. |
| 057919 | Sunnyvale | https://www.sunnyvaleisd.com/page/enrolling-in-sisd | Sunnyvale ISD 공식 Enrolling 페이지는 학년별 네 캠퍼스와 학군 거주 확인용 지도를 안내합니다. SISD Attendance Zone 지도는 학군 경계이지 학교별 2026–27 배정 폴리곤은 아닙니다. |
| 061906 | Ponder | https://www.ponderisd.net/page/registration-information | Ponder ISD 공식 홈페이지의 Registration 26–27 링크입니다. 페이지에서 개별 주소별 학교 배정 결과나 최신 학교별 경계는 확인되지 않았습니다. 학년 및 거주지 배정은 등록 담당자에게 문의하세요. |
| 116908 | Quinlan | https://www.quinlanisd.net/apps/pages/index.jsp?pREC_ID=915702&type=d&uREC_ID=415959 | Quinlan ISD 공식 등록 및 2026–27 전학 안내입니다. Pre-K와 기존 학생은 절차가 다르며 ASCENDER 등록은 공개 주소별 배정 Finder가 아닙니다. 정확한 캠퍼스는 학군 담당자에게 확인하세요. |
| 126906 | Keene | https://www.keeneisd.org/student-central/enrollment-and-registration | Keene ISD 공식 Enrollment 페이지는 신규·기존 학생 등록을 안내합니다. 학군 밖 학생은 제한적 Open Enrollment 승인이 필요하며 등록은 주소별 학교검색이 아닙니다. 지정 캠퍼스는 Registrar에 확인하세요. |

These twelve district pages are classified **official-inquiry**, not address-by-grade assignment Finder. Student registration portals, transportation, district outer maps, campus grade lists and school district boundary maps do not demonstrate current 2026–27 campus attendance polygons. No household address entered, no polygons generated, no third-party data rehosted. Provenance: `data/dfw-parent-source-evidence-batch6-2026.json`.

## Fifth batch: 8 official parent guidance entries (stacked on PR #150; not deployed)

**Reviewed 2026-11-09.** Eight additional district-owned parent pages extend registered official routes from 65 to **73/108 (67.6%)**, covering **1,827/1,941** TEA campus rows and leaving **35 ISDs / 114 rows** unregistered. These are safe links, not independent address-by-grade determinations or current-year campus GIS.

| TEA code | ISD | Official route | Type | Limitation |
| --- | --- | --- | --- | --- |
| 061908 | Sanger | https://www.sangerisd.net/studentsparents/enrollment/new-student-registration | official-inquiry | 2026–27 공식 신규 등록 경로입니다. 학군에 공개 주소별 지정학교 자동 검색기가 확인된 것은 아닙니다. 초등·중등·고등학교와 학년별 배정은 학군 등록 담당자에게 확인하세요. |
| 129904 | Kemp | https://www.kempisd.org/132520_3 | official-inquiry | 신규학생 공식 ASCENDER 등록 절차입니다. 거주지 제출 기능은 공개 학교 배정 Finder가 아닙니다. 학년별 캠퍼스와 실거주지 배정은 학군 등록 담당자에게 문의하세요. |
| 129905 | Mabank | https://www.mabankisd.net/page/parentstudent.home | official-inquiry | 2026–27 공식 Enrollment 안내입니다. 등록 페이지는 공개 주소별 학교 검색기가 아닙니다. 캠퍼스별 학년 및 거주지 배정은 학군 Registrar에 직접 확인하세요. |
| 061912 | Lake Dallas | https://www.ldisd.net/about-us/about-the-district/attendance-zones | official-map | 공식 Attendance Zones는 초등학교 세 곳의 구역 지도와 중·고등학교 학년별 단일 캠퍼스 정보를 제공합니다. 도면 적용 학년도와 개별 주소 배정은 학군에서 확인하세요. 이는 인증된 최신 GIS 폴리곤이 아닙니다. |
| 126901 | Alvarado | https://www.alvaradoisd.net/about/registration | official-inquiry | 2026–27 공식 Skyward 등록 안내입니다. 등록은 공개 주소별 배정 검색이 아닙니다. 캠퍼스별 출석구역 및 전학 예외는 구분되므로 학년과 주소별 학교는 학군 Registrar에 확인하세요. |
| 126911 | Godley | https://www.godleyisd.net/resources/attendance-zones | official-map | 공식 Attendance Zones에서 PK–5 초등학교는 세 구역이며 6학년·7–8학년·9–12학년은 각각 지정 캠퍼스로 안내됩니다. 초등 지도에는 2022–23 시작 기준이 표시되므로 2026–27 최신 경계와 주소 배정을 별도 확인하세요. |
| 061905 | Krum | https://www.krumisd.net/students-families/registration/enrollment | official-inquiry | 공식 Enrollment 페이지에서 2026–27 학군 내/외 전학과 신규 등록을 안내합니다. 공개 주소검색기 및 현행 학교별 경계는 검증되지 않았으며, 주소·학년에 따른 학교는 해당 Registrar에 확인하세요. |
| 220914 | Kennedale | https://www.kennedaleisd.net/registration/2026-2027/new-student-registration | official-inquiry | 2026–27 공식 신규 등록 절차입니다. 학교가 신청 및 거주지를 검토하는 등록 절차는 공개 주소검색기가 아닙니다. 주소별 지정학교나 전학 예외는 해당 학교에 직접 확인하세요. |

Six routes are **enrollment/registrar inquiry only**; Lake Dallas and Godley are **official maps only**. Every new district has `zoneKey:null`, zero certified current-year campus polygons and no tested residential assignment. None of the 8 sites received a private address, and no GIS redistribution rights were assumed. Evidence and source limitations: `data/dfw-parent-source-evidence-batch5-2026.json`. Before map activation, follow independent address-to-school and geometry gates from Draft PR #148.

## Fourth batch: 8 more official parent routes (Draft, not deployed)

Eight additional school districts were verified through their district-operated public landing pages on 2026-11-09. They increase the **registered official parent entry paths** from 57 to **65/108 (60.2%)**, covering 54 more TEA school records: 1,730→**1,784/1,941**. The 11-county proxy still has **43 ISDs / 157 records** without a registered route. Neither 60.2% nor the campus-row total is a measure of current-year polygons or address-by-grade verification.

| TEA code | ISD | Source type | District-operated landing page | Important limitation |
| --- | --- | --- | --- | --- |
| 184902 | Springtown | Inquiry / enrollment only | https://www.springtownisd.net/page/enrollment | 2026–27 공식 학생 등록 안내입니다. 주소별 지정학교 검색기는 이 페이지에서 확인되지 않았습니다. 배정 학교와 학년별 예외는 교육청 등록 담당자에게 확인하세요. 2027–28 신설 초등학교 계획을 2026–27 배정으로 간주하지 마세요. |
| 220920 | White Settlement | Locator entry | https://www.wsisd.com/students-families/enrollment | 2026–27 공식 Enrollment의 Which School Will My Child Attend 및 School Site Locator로 주소를 조회하세요. Fine Arts·STEAM 선택, 전학·학군 외 Open Enrollment는 일반 배정과 다르며 최종 배정은 학교가 확인합니다. |
| 220917 | Castleberry | Locator entry | https://www.castleberryisd.net/enrollnow/enrollnow | 학군 Register Now의 SchoolSearch에서 주소별 학교 배정구역을 검색하세요. Find on Map으로 경계를 볼 수도 있으나 현재 학년도와 학년·전학 예외는 등록 담당자에게 다시 확인하세요. 지도 도형은 대시보드에 수집·검증되지 않았습니다. |
| 129903 | Kaufman | Locator entry | https://www.kaufmanisd.net/page/kisd-school-zone-finder/ | 학군 공식 KISD School Zone Finder에 주소를 입력해 학교 구역을 확인하세요. 학교별 학년 범위, 2026–27 현재 적용 여부, 예외·전학은 학군에 재확인하세요. Finder 경계는 대시보드 지도에 검증·탑재되지 않았습니다. |
| 116901 | Caddo Mills | Locator entry | https://www.caddomillsisd.org/page/26-27-student-enrollment-information | 2026–27 학군 공식 등록 안내의 Elementary School Zoning 검색으로 주소별 초등학교를 확인하세요. 중·고등학교 구역, 학년별 변경, 전학·특수교육 배정은 이 초등 검색만으로 확정할 수 없으며 학군에 별도 문의하세요. |
| 249905 | Decatur | Locator entry | https://www.decaturisd.us/page/enrollment | 2026–27 공식 Enrollment에서 City of Decatur의 DISD Elementary School Attendance Zones 지도를 열고 주소를 검색하세요. 세 개 초등 경계만 해당하며 STEM Academy는 별도 지원, 중·고는 학교에 확인해야 합니다. 외부 GIS를 대시보드 경계로 복제하지 않았습니다. |
| 070905 | Ferris | Inquiry / enrollment only | https://www.ferrisisd.org/departments/student-support-services/enrollment-registration | 2026–27 공식 Enrollment/Registration 안내입니다. 학군 내 거주증명과 학년별 등록을 확인하되, 이 등록 페이지가 주소별 학교 검색기는 아닙니다. 일반 지정학교와 학군 밖 전학은 별도 절차이므로 등록 담당자에게 확인하세요. |
| 043919 | Lovejoy | Inquiry / enrollment only | https://www.lovejoyisd.net/page/quick-links | Lovejoy ISD의 공식 Quick Links로 이동하세요. 2026–27 신규 등록 안내에서 연결한 Enrollment for New Students 직접 주소는 점검 시 404였으므로, 주소·학년별 배정과 등록 경로는 학군에 직접 문의해야 합니다. Lovejoy Scholars 별도 선발과 일반 거주지 배정을 혼동하지 마세요. 현행 학교별 경계와 자동 주소검색은 검증되지 않았습니다. |

**Evidence classification:** five district pages explicitly offer some locator or elementary-area search; three are registration/inquiry-only. For all eight, current-year campus polygon and verified specific residential assignment remain **unknown/unverified**. No address, grade, mapping layer, rating, polygon, or personal data was added or sent to an external provider. Source limitations and authoritative links are preserved in `data/dfw-parent-source-evidence-batch4-2026.json`.

**Release requirement:** this stacked PR builds on #147 → #144 → #141 and must be rechecked against upstream after independent approval. Mandatory address→district Finder→school→map polygon evidence in Draft PR #148 remains a separate NO-GO requirement. Offline data integrity checks cannot substitute for independent address and map browser UAT or resolve unknown boundaries.

## Third batch: direct school locators versus district-only registration inquiries

**Stacked Draft PR after #144 (not released).** Eight additional district-operated entry points examined on 2026-11-09. We label **2 address/attendance locator pages** separately from **6 official enrollment or inquiry pages with unverified address-to-campus results**. The latter must NEVER be described in the UI as a confirmed address finder. Both are parent-route guidance only and no household-specific assignment was verified.

| TEA code | District | Route quality | Official landing page | Limitation |
| --- | --- | --- | --- | --- |
| 199902 | Royse City | District enrollment / inquiry only | https://www.rcisd.org/page/enroll | 공식 신규 등록 안내입니다. 2025–26 초등 경계 지도와 2026 중학교 신설·재조정 자료가 있어 구버전 배정선을 현행으로 사용하지 마세요. 최신 학년도·주소별 학교는 학군에 직접 확인하세요. |
| 070903 | Ennis | District enrollment / inquiry only | https://www.ennis.k12.tx.us/o/eisd/page/new-to-ennis-isd | 공식 New to Ennis ISD 등록 안내입니다. 주소별 School Finder 작동 및 2026–27 배정 경계는 확인되지 않았으므로 등록 담당자에게 주소와 학년을 문의하세요. |
| 220904 | Everman | District enrollment / inquiry only | https://www.eisd.org/page/registration-for-new-returning-students | 교육청의 신규·재학생 등록 경로입니다. 일반 지정학교와 Open Enrollment·전학은 다르며, 주소별 School Finder가 확인되지 않아 교육청 등록 담당자에게 직접 확인하세요. |
| 116905 | Greenville | District enrollment / inquiry only | https://www.greenvilleisd.com/page/student-services/ | 학군 Student Services의 New Student Online Enrollment Registration에서 등록을 시작하세요. 등록 페이지는 주소별 출석구역 조회기가 아니며 초·중·고 최종 배정은 교육청에 별도로 문의하세요. |
| 126905 | Joshua | Official locator entry | https://www.joshuaisd.org/our-district/attendance-zones | 공식 Attendance Zones의 Interactive School Zone Finder에서 주소별 학교를 찾으세요. 게시 지도와 실제 현행 학년·특별프로그램 배정은 학군에 재확인하세요. |
| 129906 | Terrell | District enrollment / inquiry only | https://www.terrellisd.org/page/enrollment-and-registration | 공식 Enrollment and Registration 안내입니다. 주소별 배정 확인용 별도 Finder는 검증되지 않았으므로 등록 담당자에게 학년·주소와 학교 지정 여부를 문의하세요. |
| 061907 | Aubrey | District enrollment / inquiry only | https://www.aubreyisd.net/page/getting-started-at-aubrey-isd | 공식 Getting Started 안내와 2026–27 전학 정보로 이동하세요. 공개 중학교 경계 자료는 2025–26 승인본이며 현행 학년·주소별 구역 확인 또는 자동 Finder 검증은 별도 필요합니다. |
| 057911 | Highland Park (Dallas) | Official locator entry | https://www.hpisd.org/about/enrollment | Dallas의 Highland Park ISD 공식 Enrollment 페이지에서 School Site Locator와 HPISD Boundary Map으로 주소를 확인하세요. Amarillo의 동명 Highland Park ISD와 혼동하지 마세요. 전학·증빙·학년별 배정은 학교에서 확인하세요. |

The eight entries add **81 TEA campus records** and move the registered-parent-route metric from 49/108 (45.4%) to **57/108 (52.8%)**; school-row coverage 1,649→1,730 of 1,941, leaving **51 districts** and **211 school records** with no dashboard-linked official parent route. This metric counts a *safe registered official entry point*, including district inquiry-only pages; it is NOT a 52.8% success rate for address and grade lookup. An independent direct-locator-only measure for this batch is 2/8. DFW-wide school polygon and verified resident assignment coverage stay **unknown**. School choice, transfer, past map vintages and the two different Highland Park ISDs are explicitly distinguished.

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

P0 means the dashboard has not registered the district's official parent route, not that the district lacks a Finder. Ranked by TEA campus records.

| Priority | ISD | TEA school records |
| ---: | --- | ---: |
| 1 | PARADISE ISD | 4 |
| 2 | VENUS ISD | 4 |
| 3 | ALVORD ISD | 3 |
| 4 | BLAND ISD | 3 |
| 5 | BLUE RIDGE ISD | 3 |
| 6 | BOLES ISD | 3 |
| 7 | CELESTE ISD | 3 |
| 8 | CHICO ISD | 3 |
| 9 | GRANDVIEW ISD | 3 |
| 10 | LONE OAK ISD | 3 |

## Three independent levels of evidence

**1 — Parent-facing official route:** 85/108 registered after all stacked PRs, with exact HTTPS allowlisted links. Landing pages/zone maps/choice procedures are not necessarily a verified address-and-grade lookup.

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

Continue detailed, current-year school assignment routing checks for the six official-inquiry districts in the third batch, then source the **23 remaining unregistered ISDs**, not just favorite suburbs. For each, store TEA code, authority URL, last verification date, active year, grade, search/map/choice/inquiry type, GIS availability and licensing, missing reason and next action. Expand source boundaries to Hood and any cross-county overlap before labeling the DFW geographic denominator exhaustive. Confirm school-specific missing reasons with a browser source audit, including school-choice exceptions and transient failures.
