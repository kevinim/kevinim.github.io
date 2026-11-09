'use strict';
// One place for every per-district capability. Adding a district means adding
// one entry here (plus its data loader); map display, address lookup, labels,
// rating-by-campus-ID and official links all read from this table.
//
//  zoneKey       key in state.zoneData / state.liveFinder (null = no zones)
//  currency      'always'   2026-27 verified source (Frisco, Prosper)
//                'live'     current only while the official finder loaded
//                           live (McKinney); otherwise not used at all
//                'finder'   live official finder => 'finder-current',
//                           stored copy => 'reference' (Plano, Lewisville)
//                'historical' past GIS reference only (Allen polygons)
//  address       'polygon'  address lookup by zone polygons
//                'frisco'   polygons, de-duplicated by school + grades
//                'allen-table' official address range table (allen-lookup.js)
//                null       no automatic address lookup
//  campusIdMatch match finder campuses to TEA ratings by campus ID
const DISTRICT_REGISTRY={
 FISD:{en:'Frisco',ko:'프리스코',zoneKey:'FISD',currency:'always',address:'frisco',campusIdMatch:false,
  official:'https://www.friscoisd.org/page/2026-2027-zones/',label:{current:'최신 경계상 후보 · 프리스코 2026–27'}},
 PROSPER:{en:'Prosper',ko:'프로스퍼',zoneKey:'PROSPER',currency:'always',address:'polygon',campusIdMatch:true,
  official:'https://www.prosper-isd.net/page/attendance-boundaries/',label:{current:'최신 경계상 후보 · 프로스퍼 2026–27'}},
 AISD:{en:'Allen',ko:'앨런',zoneKey:'AISD',currency:'historical',address:'allen-table',campusIdMatch:false,
  official:'https://www.allenisd.org/page/findaschool',label:{}},
 LISD:{en:'Lewisville',ko:'루이스빌',zoneKey:'LISD',currency:'finder',address:'polygon',campusIdMatch:true,
  official:'https://www.lisd.net/resources/families/school-locator',label:{'finder-current':'현행 공식 Finder 경계 · 루이스빌',reference:'과거 GIS 참고 · 루이스빌'}},
 PISD:{en:'Plano',ko:'플레이노',zoneKey:'PISD_LOOKUP',currency:'finder',address:'polygon',campusIdMatch:false,
  official:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder',label:{'finder-current':'현행 공식 Finder 경계 · 플레이노',reference:'2025–26 저장본 참고 · 플레이노'}},
 '043907':{en:'McKinney',ko:'매키니',zoneKey:'043907',currency:'live',address:'polygon',campusIdMatch:true,
  official:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125',label:{'finder-current':'2026–27 공식 Finder 경계 · 매키니'}},
 // West DFW: district IDs verified against TEA. Official external locator only;
 // no authorized, school-specific current-year GIS has been ingested.
 '220919':{en:'Carroll',ko:'캐럴',zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:'finder-guidance',official:'https://www.southlakecarroll.edu/district-information/district-departments/student-services/online-enrollment-portal',label:{}},
 '220907':{en:'Keller',ko:'켈러',zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:'finder-guidance',official:'https://www.kellerisd.net/about-kisd/maps',label:{}},
 '061911':{en:'Northwest',ko:'노스웨스트',zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:'finder-guidance',official:'https://www.nisdtx.org/departments/facilities/attendance-boundaries',label:{}},
 '220906':{en:'Grapevine-Colleyville',ko:'그레이프바인–콜리빌',zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:'official-map',official:'https://www.gcisd.net/page/attendance-area-maps/',label:{}},
 // Surrounding DFW parent-facing official links; no inferred GIS or enrollment.
 '043914':{en:"Wylie",ko:"와일리",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.wylieisd.net/our-families/back-to-school/frequently-asked-questions",officialNote:"학군 공식 FAQ에서 주소별 학교·버스 검색기로 이동하세요. 경계 지도만으로 배정을 확정하지 마세요.",label:{}},
 '043908':{en:"Melissa",ko:"멀리사",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.melissaisd.org/page/interactive-zoning-map",officialNote:"공식 지도 안내에 2025–26 학년도 문구가 남아 있습니다. 조회 화면에서 적용 학년도를 확인하거나 교육청에 문의하세요.",label:{}},
 '043903':{en:"Celina",ko:"셀라이나",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.celinaisd.com/who-we-are/attendance-zones",officialNote:"현행 배정 안내와 2027–28 예정 변경안이 같은 페이지에 있습니다. 현행 학년도만 확인하세요.",label:{}},
 '061914':{en:"Little Elm",ko:"리틀엘름",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.littleelmisd.net/for-parents/enrollment-registration/attendance-zones",officialNote:"학군 공식 Interactive School Zone Finder에 주소를 입력하세요. 프로그램·학년별 예외를 확인하세요.",label:{}},
 '061901':{en:"Denton",ko:"덴턴",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"official-map",official:"https://www.dentonisd.org/families/attendance-zones",officialNote:"2026–27 학년별 공식 구역 지도입니다. 주소·학년 최종 확인은 교육청 School Locator에서 하세요.",label:{}},
 '057922':{en:"Coppell",ko:"코펠",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.coppellisd.com/page/enrollment",officialNote:"교육청의 Find Your School 단계에서 거주 주소를 입력해 배정학교를 확인하세요.",label:{}},
 '057916':{en:"Richardson",ko:"리처드슨",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://web.risd.org/home/schools/",officialNote:"교육청 Schools 페이지의 School Finder에서 주소를 입력하세요. Magnet 및 전학은 별도입니다.",label:{}},
 '043911':{en:"Princeton",ko:"프린스턴",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.princetonisd.net/departments/enrollment/attendance-zones",officialNote:"2026–27 현행 구역과 2027–28 차기 구역이 모두 게시돼 있습니다. 2026–27만 사용하세요.",label:{}},
 '043902':{en:"Anna",ko:"애나",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.annaisd.org/parents-students/attendance-zones",officialNote:"26–27 Interactive Map에서 주소를 입력하세요. 아파트는 별도 검색을 지원합니다.",label:{}},
 '061910':{en:"Argyle",ko:"아가일",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"official-map",official:"https://www.argyleisd.com/about/soaring-together/district-boundaries-zones",officialNote:"학군 공식 초·중·고 배정 지도입니다. 개별 주소·학년도는 교육청에서 추가 확인하세요.",label:{}},
 '057909':{en:"Garland",ko:"갈런드",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"choice-process",official:"https://www.garlandisd.net/choose-your-school/tips-help-you-choose",officialNote:"Garland ISD는 일반적인 자동 주소 배정이 아니라 Choice of School입니다. 희망 학교 신청과 배정 통지로 최종 확인하세요.",label:{}},
 '220916':{en:"Hurst-Euless-Bedford",ko:"허스트–율레스–베드퍼드",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"official-map",official:"https://www.hebisd.edu/parents-students/map-attendance-zones/map-attendance-zones",officialNote:"학교 주소 검색기는 2026년 7월부터 전산 전환으로 일시 중단 안내가 있습니다. 공식 온라인 지도 또는 교육청에 확인하세요.",label:{}},
 '199901':{en:"Rockwall",ko:"록월",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"official-inquiry",official:"https://www.rockwallisd.com/new-student/new-student/school-attendance-areas",officialNote:"2026–27 학군 배정 지도와 Attendance Zone Inquiry를 제공합니다. 버스 노선 검색은 배정 증명이 아닙니다.",label:{}},
 '057914':{en:"Mesquite",ko:"메스키트",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://mesquiteisd.org/attendance-zones",officialNote:"School Locator에서 주소를 검색하세요. 캠퍼스 지도와 진학 경로는 별도 자료입니다.",label:{}},
 '057912':{en:"Irving",ko:"어빙",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.irvingisd.net/departments-services/registration/new-student-registration",officialNote:"등록 안내 페이지의 School Locator에서 주소별 배정학교를 확인하세요.",label:{}},
 '129902':{en:"Forney",ko:"포니",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"official-map",official:"https://www.forneyisd.net/about-us/attendance-zones",officialNote:"2026–27 승인 배정지도입니다. 2027–28 변경안은 아직 확정된 현행 배정이 아닙니다.",label:{}},
 '057905':{en:"Dallas",ko:"댈러스",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.dallasisd.org/departments/demographic-studies/find-your-school/schoolsite-locator-interactive-map",officialNote:"공식 SchoolSite Locator로 주소·학년별 학교를 확인하세요. 최종 배정은 PowerSchool 주소대장과 학교 등록담당자에게 확인하세요. 선택형 학교는 별도 신청입니다.",label:{}},
 '043918':{en:"Community",ko:"커뮤니티",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.communityisd.org/parents",officialNote:"공식 학부모 페이지에서 Find Your Campus(es)로 연결됩니다. 2024–25 과거 지도는 현재 배정으로 취급하지 마세요.",label:{}},
 '220905':{en:"Fort Worth",ko:"포트워스",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://enrollment.fwisd.org/new-to-fwisd",officialNote:"2026–27 Enrollment의 School Site Locator에서 주소별 지정 학교를 확인하세요. Choice 프로그램과 선택 가능한 학교는 실제 주소 배정과 구분해야 하며 2026년 통합·폐교 변경도 확인하세요.",label:{}},
 '220901':{en:"Arlington",ko:"알링턴",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.aisd.net/district/about/school-directory",officialNote:"2026–27 School Directory의 Search by Home Address에서 Zoned 학교를 확인하세요. Signature Program 등은 별도 신청·선발이며 주소 자동배정과 다릅니다.",label:{}},
 '220908':{en:"Mansfield",ko:"맨스필드",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.mansfieldisd.org/student-central/attendance-zones",officialNote:"학군 공식 Attendance Zones의 Find My Bus로 주소별 학교를 확인하세요. 페이지에 2025–26 지도가 남아 있을 수 있으므로 2026–27 적용 여부를 확인하고 K–4 제한적 선택제와 구분하세요.",label:{}},
 '057910':{en:"Grand Prairie",ko:"그랜드프레리",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.gpisd.org/about-gpisd/campus-listings-and-map",officialNote:"학군 공식 Campus Locator by Attendance Zone으로 주소별 배정 후보를 확인하세요. Fine Arts/Choice 캠퍼스는 일반 주소 배정과 다를 수 있습니다.",label:{}},
 '220918':{en:"Eagle Mountain–Saginaw",ko:"이글마운틴–새기노",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.emsisd.com/enroll/find-your-school-zone",officialNote:"2026–27 School Zone Finder에서 주소와 초·중·고 배정을 확인하세요. 2026–27 중학교 경계 변경과 기존 7학년 grandfathered 선택/이전 신청 예외를 확인하세요.",label:{}},
 '220902':{en:"Birdville",ko:"버드빌",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.birdvilleschools.net/families",officialNote:"학군 공식 가족 안내의 Boundary Locator에 집 주소를 입력하세요. 학군 밖 거주와 Open Enrollment 신청은 주소별 Zoned 학교와 별도로 처리됩니다.",label:{}},
 '220912':{en:"Crowley",ko:"크롤리",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.crowleyisdtx.org/parents-students/enrollment-student-registration/attendance-zones",officialNote:"공식 School Locator에서 주소를 입력하고 Boundaries에서 학년을 선택하세요. 9학년과 10–12학년 캠퍼스가 달라질 수 있어 진학 경로를 함께 확인하세요.",label:{}},
 '126902':{en:"Burleson",ko:"벌리슨",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.burlesonisd.net/families-students/enrollment-information",officialNote:"공식 Enrollment의 BISD School Search에 주소를 입력해 Zoned 학교를 찾으세요. 초등 Choice 학교·별도 추첨 및 전학 신청은 일반 주소 배정과 다릅니다.",label:{}},
 '070912':{en:"Waxahachie",ko:"왁서해치",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.wisd.org/departments/transportation",officialNote:"학군 Transportation의 Find Your School에서 공식 검색기로 이동하세요. 버스노선과 학교 배정은 다르며 주소·학년별 배정은 학군에서 확인하세요.",label:{}},
 '057907':{en:"Duncanville",ko:"던컨빌",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-map",official:"https://www.duncanvilleisd.org/buildingthefuture/rezoning",officialNote:"2026–27 변경된 출석구역을 확인하세요. 이전 Current Zoning과 Proposed Feeder Pattern을 확정 배정으로 혼동하지 말고 학군의 전학 예외를 확인하세요.",label:{}},
 '070908':{en:"Midlothian",ko:"미들로시언",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.midlothianisd.org/enrollment/school-boundaries",officialNote:"공식 Find My School에서 주소별 초·중·고 배정을 확인하세요. 신설 도로·신축 단지는 검색에 반영되지 않을 수 있어 경계 부근은 학군에 재확인하세요.",label:{}},
 '126903':{en:"Cleburne",ko:"클리번",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.c-isd.com/students-families",officialNote:"학군 Students & Families의 Find My School Zone에서 주소별 학교 확인을 진행하세요. 학년도와 학년·전학 예외는 등록담당자에게 재확인하세요.",label:{}},
 '184907':{en:"Aledo",ko:"앨리도",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-map",official:"https://www.aledoisd.org/parents-students/new-and-returning-student-registration/registration-frequently-asked-questions",officialNote:"공식 등록 FAQ에서 Attendance Zone Committee의 최종 초·중학교 경계 지도를 참조하세요. 게시 지도는 2024년 채택본으로 2026–27 적용 여부를 학군에 확인하세요. 자동 주소 Finder는 미확인입니다.",label:{}},
 '184903':{en:"Weatherford",ko:"웨더퍼드",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.weatherfordisd.com/apps/pages/index.jsp?type=d&uREC_ID=236882",officialNote:"공식 School Zone Finder에서 주소를 검색하세요. 초·중학교 구역과 학년도·전학 예외를 구분하여 학군에 확인하세요.",label:{}},
 '220915':{en:"Azle",ko:"애즐",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.azleisd.net/page/attendance-zones-school-locator/",officialNote:"2026–27 School Search에서 주소를 입력하세요. 변경된 초등 PK–5 및 주니어하이 6–8 학년 구역을 확인하세요.",label:{}},
 '057904':{en:"Cedar Hill",ko:"시더힐",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://enroll.chisd.net/enrollment/",officialNote:"학군 공식 Enrollment의 School Finder에서 주소별 학교를 확인하세요. Signature Studies 및 학군내·학군외 전학은 별도 심사입니다.",label:{}},
 '057906':{en:"DeSoto",ko:"디소토",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-map",official:"https://www.desotoisd.org/cms/one.aspx?pageId=21214842",officialNote:"학군 공식 Attendance Zones 지도에서 주소를 검색하세요. Selective Enrollment·Choice·전학은 일반 주소별 배정과 다르고 적용 학년도는 별도 확인이 필요합니다.",label:{}},
 '057913':{en:"Lancaster",ko:"랭커스터",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.lancasterisd.org/page/attendance-zone-locator",officialNote:"공식 Attendance Zone Locator에서 주소별 지정 초등학교를 확인하세요. 중·고등학교와 특수프로그램 배정은 별도 검증이 필요합니다.",label:{}},
 '070911':{en:"Red Oak",ko:"레드오크",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.redoakisd.org/district-85/roisd-attendance",officialNote:"School Zone Locator는 주소별 초등학교 구역을 보여줍니다. 중·고등학교·경계 밖 주소·전학은 학군에서 별도 확인하세요.",label:{}},
 '129901':{en:"Crandall",ko:"크랜달",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.crandall-isd.net/attendancezone",officialNote:"학군 Attendance Zone Finder에서 주소를 확인하세요. 성장에 따라 배정구역이 매년 재검토되므로 2026–27 적용 여부와 최신 변경사항을 확인하세요.",label:{}},
 '199902':{en:"Royse City",ko:"로이스시티",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.rcisd.org/page/enroll",officialNote:"공식 신규 등록 안내입니다. 2025–26 초등 경계 지도와 2026 중학교 신설·재조정 자료가 있어 구버전 배정선을 현행으로 사용하지 마세요. 최신 학년도·주소별 학교는 학군에 직접 확인하세요.",label:{}},
 '070903':{en:"Ennis",ko:"에니스",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.ennis.k12.tx.us/o/eisd/page/new-to-ennis-isd",officialNote:"공식 New to Ennis ISD 등록 안내입니다. 주소별 School Finder 작동 및 2026–27 배정 경계는 확인되지 않았으므로 등록 담당자에게 주소와 학년을 문의하세요.",label:{}},
 '220904':{en:"Everman",ko:"에버먼",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.eisd.org/page/registration-for-new-returning-students",officialNote:"교육청의 신규·재학생 등록 경로입니다. 일반 지정학교와 Open Enrollment·전학은 다르며, 주소별 School Finder가 확인되지 않아 교육청 등록 담당자에게 직접 확인하세요.",label:{}},
 '116905':{en:"Greenville",ko:"그린빌",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.greenvilleisd.com/page/student-services/",officialNote:"학군 Student Services의 New Student Online Enrollment Registration에서 등록을 시작하세요. 등록 페이지는 주소별 출석구역 조회기가 아니며 초·중·고 최종 배정은 교육청에 별도로 문의하세요.",label:{}},
 '126905':{en:"Joshua",ko:"조슈아",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.joshuaisd.org/our-district/attendance-zones",officialNote:"공식 Attendance Zones의 Interactive School Zone Finder에서 주소별 학교를 찾으세요. 게시 지도와 실제 현행 학년·특별프로그램 배정은 학군에 재확인하세요.",label:{}},
 '129906':{en:"Terrell",ko:"테럴",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.terrellisd.org/page/enrollment-and-registration",officialNote:"공식 Enrollment and Registration 안내입니다. 주소별 배정 확인용 별도 Finder는 검증되지 않았으므로 등록 담당자에게 학년·주소와 학교 지정 여부를 문의하세요.",label:{}},
 '061907':{en:"Aubrey",ko:"오브리",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.aubreyisd.net/page/getting-started-at-aubrey-isd",officialNote:"공식 Getting Started 안내와 2026–27 전학 정보로 이동하세요. 공개 중학교 경계 자료는 2025–26 승인본이며 현행 학년·주소별 구역 확인 또는 자동 Finder 검증은 별도 필요합니다.",label:{}},
 '057911':{en:"Highland Park (Dallas)",ko:"하이랜드파크(댈러스)",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.hpisd.org/about/enrollment",officialNote:"Dallas의 Highland Park ISD 공식 Enrollment 페이지에서 School Site Locator와 HPISD Boundary Map으로 주소를 확인하세요. Amarillo의 동명 Highland Park ISD와 혼동하지 마세요. 전학·증빙·학년별 배정은 학교에서 확인하세요.",label:{}},
 // Batch 4: official parent entry only; NOT certified campus GIS or residential assignment.
 '184902':{en:"Springtown",ko:"스프링타운",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.springtownisd.net/page/enrollment",officialNote:"2026–27 공식 학생 등록 안내입니다. 주소별 지정학교 검색기는 이 페이지에서 확인되지 않았습니다. 배정 학교와 학년별 예외는 교육청 등록 담당자에게 확인하세요. 2027–28 신설 초등학교 계획을 2026–27 배정으로 간주하지 마세요.",label:{}},
 '220920':{en:"White Settlement",ko:"화이트세틀먼트",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.wsisd.com/students-families/enrollment",officialNote:"2026–27 공식 Enrollment의 Which School Will My Child Attend 및 School Site Locator로 주소를 조회하세요. Fine Arts·STEAM 선택, 전학·학군 외 Open Enrollment는 일반 배정과 다르며 최종 배정은 학교가 확인합니다.",label:{}},
 '220917':{en:"Castleberry",ko:"캐슬베리",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.castleberryisd.net/enrollnow/enrollnow",officialNote:"학군 Register Now의 SchoolSearch에서 주소별 학교 배정구역을 검색하세요. Find on Map으로 경계를 볼 수도 있으나 현재 학년도와 학년·전학 예외는 등록 담당자에게 다시 확인하세요. 지도 도형은 대시보드에 수집·검증되지 않았습니다.",label:{}},
 '129903':{en:"Kaufman",ko:"카우프먼",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.kaufmanisd.net/page/kisd-school-zone-finder/",officialNote:"학군 공식 KISD School Zone Finder에 주소를 입력해 학교 구역을 확인하세요. 학교별 학년 범위, 2026–27 현재 적용 여부, 예외·전학은 학군에 재확인하세요. Finder 경계는 대시보드 지도에 검증·탑재되지 않았습니다.",label:{}},
 '116901':{en:"Caddo Mills",ko:"캐도밀스",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.caddomillsisd.org/page/26-27-student-enrollment-information",officialNote:"2026–27 학군 공식 등록 안내의 Elementary School Zoning 검색으로 주소별 초등학교를 확인하세요. 중·고등학교 구역, 학년별 변경, 전학·특수교육 배정은 이 초등 검색만으로 확정할 수 없으며 학군에 별도 문의하세요.",label:{}},
 '249905':{en:"Decatur",ko:"디케이터",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"finder-guidance",official:"https://www.decaturisd.us/page/enrollment",officialNote:"2026–27 공식 Enrollment에서 City of Decatur의 DISD Elementary School Attendance Zones 지도를 열고 주소를 검색하세요. 세 개 초등 경계만 해당하며 STEM Academy는 별도 지원, 중·고는 학교에 확인해야 합니다. 외부 GIS를 대시보드 경계로 복제하지 않았습니다.",label:{}},
 '070905':{en:"Ferris",ko:"페리스",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.ferrisisd.org/departments/student-support-services/enrollment-registration",officialNote:"2026–27 공식 Enrollment/Registration 안내입니다. 학군 내 거주증명과 학년별 등록을 확인하되, 이 등록 페이지가 주소별 학교 검색기는 아닙니다. 일반 지정학교와 학군 밖 전학은 별도 절차이므로 등록 담당자에게 확인하세요.",label:{}},
 '043919':{en:"Lovejoy",ko:"러브조이",zoneKey:null,currency:null,address:null,campusIdMatch:false,
  lookupKind:"official-inquiry",official:"https://www.lovejoyisd.net/page/quick-links",officialNote:"Lovejoy ISD의 공식 Quick Links로 이동하세요. 2026–27 신규 등록 안내에서 연결한 Enrollment for New Students 직접 주소는 점검 시 404였으므로, 주소·학년별 배정과 등록 경로는 학군에 직접 문의해야 합니다. Lovejoy Scholars 별도 선발과 일반 거주지 배정을 혼동하지 마세요. 현행 학교별 경계와 자동 주소검색은 검증되지 않았습니다.",label:{}},
 CFB:{en:'CFB',ko:'캐럴턴–파머스브랜치',zoneKey:null,currency:null,address:null,campusIdMatch:false,
  official:'https://www.cfbisd.edu/students/school-maps-locator-system',label:{}}
};
function districtInfo(code){return DISTRICT_REGISTRY[code]||null}
function districtZoneKey(code){return DISTRICT_REGISTRY[code]?.zoneKey||code}
function districtName(code,lang='en'){const d=DISTRICT_REGISTRY[code];return d?(lang==='ko'?d.ko:d.en):null}
function districtUsesCampusId(code){return !!DISTRICT_REGISTRY[code]?.campusIdMatch}
// Polygon address-lookup status for a district, or null when it must not be used.
function districtPolygonStatus(code,liveFinder){
 const d=DISTRICT_REGISTRY[code];if(!d||!['polygon','frisco'].includes(d.address))return null;
 const live=!!liveFinder?.[d.zoneKey];
 if(d.currency==='always')return 'current';
 if(d.currency==='live')return live?'finder-current':null;
 if(d.currency==='finder')return live?'finder-current':'reference';
 return null;
}
// Map display class for a school's zone: 'official' (2026-27 verified),
// 'finder' (live official finder, layer year may differ) or 'historical'.
function districtZoneDisplay(code,liveFinder){
 const d=DISTRICT_REGISTRY[code];if(!d)return 'historical';
 const live=!!liveFinder?.[d.zoneKey];
 if(d.currency==='always'||(d.currency==='live'&&live))return 'official';
 if(d.currency==='finder'&&live)return 'finder';
 return 'historical';
}
const DISTRICT_API={DISTRICT_REGISTRY,districtInfo,districtZoneKey,districtName,districtUsesCampusId,districtPolygonStatus,districtZoneDisplay};
if(typeof module!=='undefined')module.exports=DISTRICT_API;
if(typeof window!=='undefined')Object.assign(window,DISTRICT_API);
