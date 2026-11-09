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
 '057905':{en:"Dallas",ko:"댈러스",zoneKey:"057905",currency:"published",address:"polygon",campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.dallasisd.org/departments/demographic-studies/find-your-school/schoolsite-locator-interactive-map",officialNote:"교육청이 공개한 초·중·고 GIS 도형은 2026년 7월에 갱신되었으나 2026–27 개별 배정 학년도와 Finder의 독립 대조는 완료되지 않았습니다. 지도는 후보 참고용이며 최종 지정학교는 SchoolSite Locator 및 PowerSchool 주소대장·등록 담당자에게 확인해야 합니다. 선택형·Magnet은 별도 신청입니다.",label:{}},
 '043918':{en:"Community",ko:"커뮤니티",zoneKey:null,currency:null,address:null,campusIdMatch:true,
  lookupKind:"finder-guidance",official:"https://www.communityisd.org/parents",officialNote:"공식 학부모 페이지에서 Find Your Campus(es)로 연결됩니다. 2024–25 과거 지도는 현재 배정으로 취급하지 마세요.",label:{}},
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
 if(d.currency==='published')return live?'publisher-provisional':null;
 return null;
}
// Map display class for a school's zone: 'official' (2026-27 verified),
// 'finder' (live official finder, layer year may differ) or 'historical'.
function districtZoneDisplay(code,liveFinder){
 const d=DISTRICT_REGISTRY[code];if(!d)return 'historical';
 const live=!!liveFinder?.[d.zoneKey];
 if(d.currency==='always'||(d.currency==='live'&&live))return 'official';
 if(d.currency==='finder'&&live)return 'finder';
 if(d.currency==='published'&&live)return 'published';
 return 'historical';
}
const DISTRICT_API={DISTRICT_REGISTRY,districtInfo,districtZoneKey,districtName,districtUsesCampusId,districtPolygonStatus,districtZoneDisplay};
if(typeof module!=='undefined')module.exports=DISTRICT_API;
if(typeof window!=='undefined')Object.assign(window,DISTRICT_API);
