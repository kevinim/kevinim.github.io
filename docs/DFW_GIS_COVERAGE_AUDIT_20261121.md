# DFW 전체 학군 GIS 연결 현황 — 2026-11-21

> **현행 배포 여부와 독립적이며, 읽기 전용 재집계 보고서입니다.** 기준은 `main`의 2026-11-09 TEA 학군 매트릭스와 2026-11-20까지 공개 소스 연구, 그리고 2026-11-21 저장소 코드 확인입니다. 108개 ISD는 TEA 행정상 소속 카운티에 따른 표본이지 모든 부지의 실제 학군 경계가 아닙니다.

## 판정 기준

- `26–27 지도`: 공식 현행 학교별 GIS 원본이 대시보드 기본 GIS 경로에 연결됨. 입학 배정 인증은 아님.
- `Finder 참고`: 공식 Finder 연계 경계가 지도에 있지만 원본의 GIS 학년도/주소 정확성을 독립적으로 확정하지 못함.
- `과거 참고`: 역사적 공식 GIS를 연도를 표시해 참고로 제공하며 2026–27 배정으로 표기하지 않음.
- `클릭형 GIS`: 주소 선택 뒤 명시적 클릭 시 외부 공식 GIS에서 임시로 도형을 표시. 기본 지도 `zoneKey`와 별도.
- `미연결`: 현재 대시보드에서 학교별 GIS 도형을 렌더링하지 않음. 공식 PDF/이미지/주소검색/외부 GIS의 존재를 부정하지 않음.

## 핵심 재집계

- 공립 ISD **108개**, 공식 부모 안내 링크 등록 **108개** (자동 배정 108개라는 뜻 아님).
- 2026–27 학교별 GIS 소스 **2개**: Frisco / Prosper.
- 기본 지도 학교별 GIS 소스 **6개**: Frisco / Prosper / Plano / Lewisville / McKinney / Allen.
- 주소 선택 후 클릭형 GIS **2개**: Dallas / Irving.
- 위 GIS 렌더링이 없는 학군 **100개**; 학교별 공개 자료 미존재 판정과 혼동 금지.
- 독립 공식 거주지 E/M/H 자동 배정이 승인·입증된 학군 **0개**; DFW 전체 학교/주택/면적 GIS 커버리지 비율은 **산출 불가**.
- 구버전 '7개 소스 평가 / 101개 미설정'은 **평가 범위 분류**이고 이번 '6개 기본+2개 클릭 /100개 미렌더링'은 **실제 코드 기능 분류**입니다. 서로 다른 분모와 기준이므로 수치를 혼합하면 안 됩니다.

## 카운티별 기능 분포

| 카운티 (행정상) | 공립 ISD | 기본 GIS | 클릭형 GIS | 학교별 GIS 미렌더링 |
|---|---:|---:|---:|---:|
| COLLIN | 14 | 5 | 0 | 9 |
| DALLAS | 14 | 0 | 2 | 12 |
| DENTON | 11 | 1 | 0 | 10 |
| ELLIS | 10 | 0 | 0 | 10 |
| HUNT | 10 | 0 | 0 | 10 |
| JOHNSON | 9 | 0 | 0 | 9 |
| KAUFMAN | 7 | 0 | 0 | 7 |
| PARKER | 8 | 0 | 0 | 8 |
| ROCKWALL | 2 | 0 | 0 | 2 |
| TARRANT | 16 | 0 | 0 | 16 |
| WISE | 7 | 0 | 0 | 7 |

## 중요 소스 및 블로커

| 학군 | 공개 자료·GIS 기준 | 배포된 형태 및 미해결 |
|---|---|---|
| Frisco | 공식 2026–27 JSON, 75개 구역 피처 | 기본 지도. 2026-11-09 브라우저 73/73 매칭 최소치; 거주지 예외 별도 |
| Prosper | 공식 2026–27, 31개 캠퍼스 구역 | 기본 지도. 원본 좌표 검사 43/43은 실제 거주지 검증과 다름 |
| Plano | Finder 연계 64개 도형, 필드명 2025–26 | 기본 참고 GIS. 2026–27 Finder 운영과 GIS 학년도 별개; Senior High 별도 |
| Lewisville | Finder 연계 696개 multipart 조각, HS 2025–26/E·M 연도 미확정 | 기본 참고 GIS. 아파트 전용 검색·분리 진학 예외 |
| McKinney | 2026–27 Finder 연계 지도, 이전 브라우저 25개 연결 최소치 | 기본 참고 GIS. 정확한 주거지 공식 결과 자동 수신되지 않음 |
| Allen | 시 GIS 2019/2023, 20개 도형; 별도 공식 도로명 표 | 과거 참고 경계, 세대·아파트 예외 |
| Dallas | 시교육청 ArcGIS 135 E / 30 M / 22 H = 187 도형; GIS 편집 2026-07-22 | 선택 후 클릭형 참고. 2026–27 공식 PDF도 별도 존재하나 GIS 학년도 증명 없음 |
| Irving | 공개 E 2024–25, M 2025–26, H 학년도 미확정 | 선택 후 클릭형 임시 GIS; 상시/인증 경계 아님 |
| CFB | 2025–26 공식 승인 이미지 3, 2020 편집 시 GIS 30개 과거 도형 | 현재 폴리곤 0. 2025 재배정과 과거 지도의 충돌. Finder 직접 링크 |
| Denton | 공식 2026–27 PDF 39, GIS 파생 QA 후보 39 | 공개 지도 도형 0. 경계 20.6m 사례와 100m 검증 보류, 사용 권리 미확인 |
| Northwest | 2022 최종 수정 ArcGIS 후보 E/M/H 3개 층 | 2026–27 최신 동일성·원본 권리 미확인, 지도 미연결 |
| Keller | 2018–19 연도 필드 GIS 41개 피처 | 현행 배정으로 전용 불가, 참고 소스만 조사 |

## 학군별 108개 전체 확인표

이 표의 **공식 링크는 학부모 안내 진입점**입니다. 링크가 존재하더라도 주소·학년 입력 결과를 대시보드로 자동 전송하거나 독립적으로 확인한다는 뜻은 아닙니다.

| TEA 학군 ID | 학군 | 행정 카운티 | TEA 학교 기록 | GIS 표시 | 공식 학부모 안내 |
|---|---|---|---:|---|---|
| 043901 | ALLEN ISD | COLLIN | 23 | 과거 참고 | [원본](https://www.allenisd.org/page/findaschool) |
| 043902 | ANNA ISD | COLLIN | 10 | 미연결 | [원본](https://www.annaisd.org/parents-students/attendance-zones) |
| 043917 | BLUE RIDGE ISD | COLLIN | 3 | 미연결 | [원본](https://www.brisd.net/page/student-enrollment-information) |
| 043903 | CELINA ISD | COLLIN | 8 | 미연결 | [원본](https://www.celinaisd.com/who-we-are/attendance-zones) |
| 043918 | COMMUNITY ISD | COLLIN | 9 | 미연결 | [원본](https://www.communityisd.org/parents) |
| 043904 | FARMERSVILLE ISD | COLLIN | 4 | 미연결 | [원본](https://www.farmersvilleisd.net/apps/pages/index.jsp?pREC_ID=2424228&type=d&uREC_ID=445987) |
| 043905 | FRISCO ISD | COLLIN | 76 | 26–27 지도 | [원본](https://www.friscoisd.org/page/2026-2027-zones/) |
| 043919 | LOVEJOY ISD | COLLIN | 6 | 미연결 | [원본](https://www.lovejoyisd.net/page/quick-links) |
| 043907 | MCKINNEY ISD | COLLIN | 33 | Finder 참고 | [원본](https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125) |
| 043908 | MELISSA ISD | COLLIN | 9 | 미연결 | [원본](https://www.melissaisd.org/page/interactive-zoning-map) |
| 043910 | PLANO ISD | COLLIN | 69 | Finder 참고 | [원본](https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder) |
| 043911 | PRINCETON ISD | COLLIN | 16 | 미연결 | [원본](https://www.princetonisd.net/departments/enrollment/attendance-zones) |
| 043912 | PROSPER ISD | COLLIN | 32 | 26–27 지도 | [원본](https://www.prosper-isd.net/page/attendance-boundaries/) |
| 043914 | WYLIE ISD | COLLIN | 22 | 미연결 | [원본](https://www.wylieisd.net/our-families/back-to-school/frequently-asked-questions) |
| 057903 | CARROLLTON-FARMERS BRANCH ISD | DALLAS | 35 | 미연결 | [원본](https://www.cfbisd.edu/students/school-maps-locator-system) |
| 057904 | CEDAR HILL ISD | DALLAS | 11 | 미연결 | [원본](https://www.chisd.net/services/lacy-enrollment-center/k-12-new-student-registration) |
| 057922 | COPPELL ISD | DALLAS | 16 | 미연결 | [원본](https://www.coppellisd.com/page/enrollment) |
| 057905 | DALLAS ISD | DALLAS | 237 | 클릭형 GIS | [원본](https://www.dallasisd.org/departments/demographic-studies/find-your-school/schoolsite-locator-interactive-map) |
| 057906 | DESOTO ISD | DALLAS | 11 | 미연결 | [원본](https://www.desotoisd.org/cms/one.aspx?pageId=21214842) |
| 057907 | DUNCANVILLE ISD | DALLAS | 14 | 미연결 | [원본](https://www.duncanvilleisd.org/buildingthefuture/rezoning) |
| 057909 | GARLAND ISD | DALLAS | 66 | 미연결 | [원본](https://www.garlandisd.net/choose-your-school/tips-help-you-choose) |
| 057910 | GRAND PRAIRIE ISD | DALLAS | 37 | 미연결 | [원본](https://www.gpisd.org/about-gpisd/campus-listings-and-map) |
| 057911 | HIGHLAND PARK ISD | DALLAS | 8 | 미연결 | [원본](https://www.hpisd.org/about/enrollment) |
| 057912 | IRVING ISD | DALLAS | 35 | 클릭형 GIS | [원본](https://www.irvingisd.net/departments-services/registration/new-student-registration) |
| 057913 | LANCASTER ISD | DALLAS | 10 | 미연결 | [원본](https://www.lancasterisd.org/page/attendance-zone-locator) |
| 057914 | MESQUITE ISD | DALLAS | 51 | 미연결 | [원본](https://mesquiteisd.org/attendance-zones) |
| 057916 | RICHARDSON ISD | DALLAS | 51 | 미연결 | [원본](https://web.risd.org/home/schools/) |
| 057919 | SUNNYVALE ISD | DALLAS | 4 | 미연결 | [원본](https://www.sunnyvaleisd.com/page/enrolling-in-sisd) |
| 061910 | ARGYLE ISD | DENTON | 7 | 미연결 | [원본](https://www.argyleisd.com/about/soaring-together/district-boundaries-zones) |
| 061907 | AUBREY ISD | DENTON | 8 | 미연결 | [원본](https://www.aubreyisd.net/page/getting-started-at-aubrey-isd) |
| 061901 | DENTON ISD | DENTON | 46 | 미연결 | [원본](https://www.dentonisd.org/families/attendance-zones) |
| 061905 | KRUM ISD | DENTON | 5 | 미연결 | [원본](https://www.krumisd.net/students-families/registration/enrollment) |
| 061912 | LAKE DALLAS ISD | DENTON | 5 | 미연결 | [원본](https://www.ldisd.net/about-us/about-the-district/attendance-zones) |
| 061902 | LEWISVILLE ISD | DENTON | 57 | Finder 참고 | [원본](https://www.lisd.net/resources/families/school-locator) |
| 061914 | LITTLE ELM ISD | DENTON | 12 | 미연결 | [원본](https://www.littleelmisd.net/for-parents/enrollment-registration/attendance-zones) |
| 061911 | NORTHWEST ISD | DENTON | 37 | 미연결 | [원본](https://www.nisdtx.org/departments/facilities/attendance-boundaries) |
| 061903 | PILOT POINT ISD | DENTON | 5 | 미연결 | [원본](https://www.pilotpointisd.com/265282_3) |
| 061906 | PONDER ISD | DENTON | 4 | 미연결 | [원본](https://www.ponderisd.net/page/registration-information) |
| 061908 | SANGER ISD | DENTON | 6 | 미연결 | [원본](https://www.sangerisd.net/studentsparents/enrollment/new-student-registration) |
| 070901 | AVALON ISD | ELLIS | 1 | 미연결 | [원본](https://www.avalonisd.net/apps/pages/index.jsp?pREC_ID=220809&type=d&uREC_ID=111233) |
| 070903 | ENNIS ISD | ELLIS | 12 | 미연결 | [원본](https://www.ennis.k12.tx.us/o/eisd/page/new-to-ennis-isd) |
| 070905 | FERRIS ISD | ELLIS | 6 | 미연결 | [원본](https://www.ferrisisd.org/departments/student-support-services/enrollment-registration) |
| 070907 | ITALY ISD | ELLIS | 2 | 미연결 | [원본](https://www.italyisd.org/page/student-enrollment) |
| 070915 | MAYPEARL ISD | ELLIS | 3 | 미연결 | [원본](https://www.maypearlisd.org/students-families/enrollment-and-registration) |
| 070908 | MIDLOTHIAN ISD | ELLIS | 13 | 미연결 | [원본](https://www.midlothianisd.org/enrollment/find-my-school) |
| 070909 | MILFORD ISD | ELLIS | 1 | 미연결 | [원본](https://www.milfordisd.org/) |
| 070910 | PALMER ISD | ELLIS | 3 | 미연결 | [원본](https://www.palmer-isd.org/o/phs/page/back-2-school) |
| 070911 | RED OAK ISD | ELLIS | 9 | 미연결 | [원본](https://www.redoakisd.org/district-85/roisd-attendance) |
| 070912 | WAXAHACHIE ISD | ELLIS | 18 | 미연결 | [원본](https://www.wisd.org/departments/transportation) |
| 116915 | BLAND ISD | HUNT | 3 | 미연결 | [원본](https://www.blandisd.us/11759_4) |
| 116916 | BOLES ISD | HUNT | 3 | 미연결 | [원본](https://www.bolesisd.com/) |
| 116901 | CADDO MILLS ISD | HUNT | 6 | 미연결 | [원본](https://www.caddomillsisd.org/page/26-27-student-enrollment-information) |
| 116910 | CAMPBELL ISD | HUNT | 2 | 미연결 | [원본](https://www.campbellisd.org/for-parents/prospective-parents) |
| 116902 | CELESTE ISD | HUNT | 3 | 미연결 | [원본](https://www.celesteisd.org/) |
| 116903 | COMMERCE ISD | HUNT | 4 | 미연결 | [원본](https://www.commerceisd.org/for-parents/back-to-school/student-online-registration) |
| 116905 | GREENVILLE ISD | HUNT | 10 | 미연결 | [원본](https://www.greenvilleisd.com/page/student-services/) |
| 116906 | LONE OAK ISD | HUNT | 3 | 미연결 | [원본](https://www.loneoakisd.net/for-parents/enrollment-registration) |
| 116908 | QUINLAN ISD | HUNT | 4 | 미연결 | [원본](https://www.quinlanisd.net/apps/pages/index.jsp?pREC_ID=915702&type=d&uREC_ID=415959) |
| 116909 | WOLFE CITY ISD | HUNT | 3 | 미연결 | [원본](https://www.wcisd.net/) |
| 126901 | ALVARADO ISD | JOHNSON | 5 | 미연결 | [원본](https://www.alvaradoisd.net/about/registration) |
| 126902 | BURLESON ISD | JOHNSON | 20 | 미연결 | [원본](https://www.burlesonisd.net/families-students/enrollment-information) |
| 126903 | CLEBURNE ISD | JOHNSON | 12 | 미연결 | [원본](https://www.c-isd.com/students-families) |
| 126911 | GODLEY ISD | JOHNSON | 5 | 미연결 | [원본](https://www.godleyisd.net/resources/attendance-zones) |
| 126904 | GRANDVIEW ISD | JOHNSON | 3 | 미연결 | [원본](https://www.gvisd.org/zebrafamilyconnection) |
| 126905 | JOSHUA ISD | JOHNSON | 10 | 미연결 | [원본](https://www.joshuaisd.org/our-district/attendance-zones) |
| 126906 | KEENE ISD | JOHNSON | 4 | 미연결 | [원본](https://www.keeneisd.org/student-central/enrollment-and-registration) |
| 126907 | RIO VISTA ISD | JOHNSON | 3 | 미연결 | [원본](https://www.rvisd.net/apps/pages/index.jsp?type=d&uREC_ID=413241) |
| 126908 | VENUS ISD | JOHNSON | 4 | 미연결 | [원본](https://www.venusisd.net/en-US/enrollment) |
| 129901 | CRANDALL ISD | KAUFMAN | 9 | 미연결 | [원본](https://www.crandall-isd.net/attendancezone) |
| 129902 | FORNEY ISD | KAUFMAN | 24 | 미연결 | [원본](https://www.forneyisd.net/about-us/attendance-zones) |
| 129903 | KAUFMAN ISD | KAUFMAN | 7 | 미연결 | [원본](https://www.kaufmanisd.net/page/kisd-school-zone-finder/) |
| 129904 | KEMP ISD | KAUFMAN | 6 | 미연결 | [원본](https://www.kempisd.org/132520_3) |
| 129905 | MABANK ISD | KAUFMAN | 6 | 미연결 | [원본](https://www.mabankisd.net/page/parentstudent.home) |
| 129910 | SCURRY-ROSSER ISD | KAUFMAN | 3 | 미연결 | [원본](https://www.scurry-rosser.com/documents/enrollment-and-registration/786030) |
| 129906 | TERRELL ISD | KAUFMAN | 9 | 미연결 | [원본](https://www.terrellisd.org/page/enrollment-and-registration) |
| 184907 | ALEDO ISD | PARKER | 12 | 미연결 | [원본](https://www.aledoisd.org/parents-students/new-and-returning-student-registration/registration-frequently-asked-questions) |
| 184909 | BROCK ISD | PARKER | 5 | 미연결 | [원본](https://www.brockisd.net/apps/pages/index.jsp?pREC_ID=1200231&termREC_ID=&type=d&uREC_ID=532370) |
| 184911 | GARNER ISD | PARKER | 1 | 미연결 | [원본](https://www.garnerisd.net/registration) |
| 184904 | MILLSAP ISD | PARKER | 3 | 미연결 | [원본](https://www.millsapisd.net/parents-students/registration/2026-2027-new-student-registration) |
| 184908 | PEASTER ISD | PARKER | 5 | 미연결 | [원본](https://www.peaster.net/parents-students) |
| 184901 | POOLVILLE ISD | PARKER | 3 | 미연결 | [원본](https://www.poolville.net/student-enrollment-and-transfers) |
| 184902 | SPRINGTOWN ISD | PARKER | 8 | 미연결 | [원본](https://www.springtownisd.net/page/enrollment) |
| 184903 | WEATHERFORD ISD | PARKER | 12 | 미연결 | [원본](https://www.weatherfordisd.com/apps/pages/index.jsp?type=d&uREC_ID=236882) |
| 199901 | ROCKWALL ISD | ROCKWALL | 23 | 미연결 | [원본](https://www.rockwallisd.com/new-student/new-student/school-attendance-areas) |
| 199902 | ROYSE CITY ISD | ROCKWALL | 13 | 미연결 | [원본](https://www.rcisd.org/page/enroll) |
| 220901 | ARLINGTON ISD | TARRANT | 74 | 미연결 | [원본](https://www.aisd.net/district/about/school-directory) |
| 220915 | AZLE ISD | TARRANT | 12 | 미연결 | [원본](https://www.azleisd.net/page/attendance-zones-school-locator/) |
| 220902 | BIRDVILLE ISD | TARRANT | 31 | 미연결 | [원본](https://www.birdvilleschools.net/families) |
| 220919 | CARROLL ISD | TARRANT | 11 | 미연결 | [원본](https://www.southlakecarroll.edu/district-information/district-departments/student-services/online-enrollment-portal) |
| 220917 | CASTLEBERRY ISD | TARRANT | 7 | 미연결 | [원본](https://www.castleberryisd.net/enrollnow/enrollnow) |
| 220912 | CROWLEY ISD | TARRANT | 23 | 미연결 | [원본](https://www.crowleyisdtx.org/parents-students/enrollment-student-registration/attendance-zones) |
| 220918 | EAGLE MT-SAGINAW ISD | TARRANT | 32 | 미연결 | [원본](https://www.emsisd.com/enroll/find-your-school-zone) |
| 220904 | EVERMAN ISD | TARRANT | 11 | 미연결 | [원본](https://www.eisd.org/page/registration-for-new-returning-students) |
| 220905 | FORT WORTH ISD | TARRANT | 134 | 미연결 | [원본](https://enrollment.fwisd.org/new-to-fwisd) |
| 220906 | GRAPEVINE-COLLEYVILLE ISD | TARRANT | 20 | 미연결 | [원본](https://www.gcisd.net/page/attendance-area-maps/) |
| 220916 | HURST-EULESS-BEDFORD ISD | TARRANT | 32 | 미연결 | [원본](https://www.hebisd.edu/parents-students/map-attendance-zones/map-attendance-zones) |
| 220907 | KELLER ISD | TARRANT | 40 | 미연결 | [원본](https://www.kellerisd.net/about-kisd/maps) |
| 220914 | KENNEDALE ISD | TARRANT | 5 | 미연결 | [원본](https://www.kennedaleisd.net/registration/2026-2027/new-student-registration) |
| 220910 | LAKE WORTH ISD | TARRANT | 5 | 미연결 | [원본](https://www.lwisd.org/registration-process) |
| 220908 | MANSFIELD ISD | TARRANT | 48 | 미연결 | [원본](https://www.mansfieldisd.org/student-central/attendance-zones) |
| 220920 | WHITE SETTLEMENT ISD | TARRANT | 8 | 미연결 | [원본](https://www.wsisd.com/students-families/enrollment) |
| 249901 | ALVORD ISD | WISE | 3 | 미연결 | [원본](https://www.alvordisd.net/registration) |
| 249902 | BOYD ISD | WISE | 5 | 미연결 | [원본](https://www.boydisd.net/enrollments) |
| 249903 | BRIDGEPORT ISD | WISE | 4 | 미연결 | [원본](https://www.bridgeportisd.net/enrollment) |
| 249904 | CHICO ISD | WISE | 3 | 미연결 | [원본](https://www.chicoisdtx.net/District/Department/68-Enrollment-Registration) |
| 249905 | DECATUR ISD | WISE | 6 | 미연결 | [원본](https://www.decaturisd.us/page/enrollment) |
| 249906 | PARADISE ISD | WISE | 4 | 미연결 | [원본](https://www.pisd.net/enrollment-registration) |
| 249908 | SLIDELL ISD | WISE | 1 | 미연결 | [원본](https://www.slidellisd.net/parents) |

## 실행 우선순위 및 종료 기준

1. **P0: 지도 연결 상태 표시** — 메인6/클릭형2/미렌더링100을 별개 숫자로 표시하고, 현재 행정 카운티 분모와 원본 GIS 수정년도/학년도를 보존. 기존 7개 학군 브라우저 연결 최소치(2026-11-09)를 최신 현행 검증률로 재라벨링하지 않음.
2. **P1: 가장 영향력이 큰 미렌더링 학군** — Fort Worth, Arlington, Garland(선택제), Richardson, Mesquite, Mansfield, Denton, CFB, Northwest, Keller, Grand Prairie 순으로 최신 공식 초·중·고 GIS / 이미지 / PDF / 주소 Finder를 분리 수집·검증. 우선순위는 TEA 학교기록 크기와 기존 연구 증거를 고려하되 정확한 현재 주택 분포 순위가 아님.
3. **P1: 과거 자료 재사용** — 2026–27이 아니어도 폐기하지 말 것. GIS 업데이트일과 공식 학년도는 별도로 표기, 오렌지 점선 참고로만 표시. 재구성 자료는 원본과 재가공 여부를 구분.
4. **P1: GIS 연결 QA** — 학군 전체 및 각 E/M/H(9th/Senior 포함) 유형별 도형 누락·중복·캠퍼스 ID·경계 위상·제외 캠퍼스를 점검. 학교 건물 마커, ZIP, 학군 외곽선만으로 학교 지정구역을 대체하지 않음.
5. **P0: 주소→학교 별도 배포게이트** — 독립적인 공식 Finder의 동일 주소·호수·학년도·학년 결과를 실제 검증하기 전에는 참고 GIS를 확정 자동 배정으로 승격하지 않음.
6. **운영 정책** — 300개 action queue 무시, 교육청 회신 대기 없음. 공개 자료가 확인되지 않으면 '미확인/미탑재'로 기록하고 다음 학군 진행. 새로운 경계는 소스권리·예외·독립검증 후 별도 PR로 릴리스.

## 근거 파일

- `data/dfw-school-coverage-matrix-2026.json` (2026-11-09 baseline, 108 공립 ISD / 44 기타 LEA)
- `data/school-polygon-linkage-baseline.json` (2026-11-09 브라우저 최소 연결치; 현행 GIS 비율 아님)
- `district-registry.js` (기본 지도 GIS `zoneKey` 지정)
- `dallas-attendance-live.js`, `irving-official-spatial.js` (주소 선택 후 클릭형 참고 GIS)
- `data/dfw-cfb-denton-public-source-status-20261120.json`
- `docs/PLANO_LEWISVILLE_PUBLIC_GIS_YEAR_CLOSEOUT_20261120.md`
- `docs/NORTHWEST_GIS_SOURCE_REVIEW_20261118.md`
- `docs/WEST_DFW_GIS_SOURCE_REVIEW.md`
- `docs/RESIDENTIAL_SCHOOL_CROSSCHECK_20261121.md`

이 재집계는 코드·출처·문서 근거의 **read-only 상태 보고**로 GIS 레이어, 학군 자동 배정 권한, 저장소 메인 UI, 주소 처리, 라이브 배포는 변경하지 않습니다.
