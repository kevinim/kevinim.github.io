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
