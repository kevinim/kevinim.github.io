'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official}=require('../trusted-link-policy.js');
const {knownBoundaryException,findSchoolBoundary}=require('../school-boundary-match.js');
const F=require('../scripts/agent01-verify-irving-live-finder.cjs');
function fixtures(){
 const app={id:F.APP_ID,type:'Web Mapping Application',owner:'rzamora_IISD1',access:'public',modified:1791307554000};
 const mapItem={id:F.MAP_ID,type:'Web Map',owner:'rzamora_IISD1',access:'public',modified:1787257722000};
 const config={values:{webmap:F.MAP_ID,zoneLookupLayers:{layers:Object.values(F.SOURCES).map(x=>({id:x.id}))}}};
 const webMap={operationalLayers:Object.values(F.SOURCES).map((x,i)=>x.embedded?{
  id:x.id,title:x.title,featureCollection:{layers:[{layerDefinition:{geometryType:'esriGeometryPolygon',
   extent:{spatialReference:{wkid:102100}}},featureSet:{features:['Irving HS','Macarthur HS','Nimitz HS'].map(NAME=>({attributes:{NAME}}))}}]}
 }:{id:x.id,title:x.title,url:x.url})};
 return {html:'<a href="'+F.APP_URL+'">School Locator</a>',app,config,mapItem,webMap};
}
test('exact official user-visible Irving Finder and secure trusted domain',()=>{
 assert.equal(DISTRICT_REGISTRY['057912'].zoneKey,null,'no 2026-27 certified GIS source');
 assert.equal(DISTRICT_REGISTRY['057912'].address,null,'no auto home assignment without certified source');
 assert.equal(DISTRICT_REGISTRY['057912'].official,'https://www.irvingisd.net/departments-services/registration/new-student-registration');
 assert.equal(official(F.APP_URL),F.APP_URL); // explicit in home GIS UI, not a registry data mutation
 assert.equal(DISTRICT_REGISTRY['057912'].lookupKind,'finder-guidance');
 assert.equal(official(F.APP_URL),F.APP_URL);
 for(const bad of [F.APP_URL.replace('iisd1.maps.arcgis.com','iisd1.maps.arcgis.com.attacker.test'),
   F.APP_URL.replace('https:','http:'),'https://iisd1.maps.arcgis.com@evil.test/']){
  assert.equal(official(bad),null);
 }
});
test('official app source chain proves live linkage without claiming all GIS years current',()=>{
 const f=fixtures(),report=F.verifyChain(f.html,f.app,f.config,f.mapItem,f.webMap);
 assert.equal(report.locatorConfigMatchesSource,true);
 assert.equal(Object.keys(report.sourceGrades).length,3);
 assert.equal(report.sourceGrades.elementary.academicYearEmbeddedInTitle,'2024-25');
 assert.equal(report.sourceGrades.middle.academicYearEmbeddedInTitle,'2025-26');
 assert.equal(report.currentYearGisCertified,false);
 assert.equal(report.productionZoneLoaderAllowed,false);
 assert.equal(report.publicResidentialAddressCrosschecked,false);
});
test('every possible source drift fails closed',()=>{
 const f=fixtures();
 assert.throws(()=>F.verifyChain('',f.app,f.config,f.mapItem,f.webMap),/no longer links/);
 assert.throws(()=>F.verifyChain(f.html,{...f.app,owner:'untrusted'},f.config,f.mapItem,f.webMap),/owner changed/);
 assert.throws(()=>F.verifyChain(f.html,f.app,{values:{...f.config.values,webmap:'changed'}},f.mapItem,f.webMap),/WebMap drift/);
 const missing=fixtures();missing.webMap.operationalLayers.pop();
 assert.throws(()=>F.verifyChain(missing.html,missing.app,missing.config,missing.mapItem,missing.webMap),/missing locator map layer/);
 const changed=fixtures();changed.webMap.operationalLayers[0].url='https://evil.test/not-a-source';
 assert.throws(()=>F.verifyChain(changed.html,changed.app,changed.config,changed.mapItem,changed.webMap),/different GIS source/);
});
test('De Zavala 2026-27 application school is not a missing normal eighth zone',()=>{
 for(const name of ['Lorenzo De Zavala Middle School','De Zavala Middle School STEM Academy']){
  const school={district:'057912',name,type:'middle',id:'057912048'};
  const e=knownBoundaryException(school);
  assert.match(e?.reason||'',/일반 주소별 자동 배정 학교가 아닙니다/);
  assert.equal(e.sourceUrl,'https://www.irvingisd.net/families/school-choice/faq');
  const geo=Array.from({length:7},(_,i)=>({properties:{school:'Other Middle '+i,gradeLevel:'middle'}}));
  const m=findSchoolBoundary(school,geo);
  assert.equal(m.status,'special-campus-no-standard-zone');
 }
 const other=knownBoundaryException({district:'057912',name:'Austin Middle School'});
 assert.equal(other,null);
});
