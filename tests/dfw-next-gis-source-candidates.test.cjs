'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/dfw-next-gis-source-candidates-20261121.json'),'utf8'));
const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/dfw-school-coverage-matrix-2026.json'),'utf8'));
test('five source candidates are evidence only, distinct and present in 108-ISD census',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.reviewedOn,'2026-11-21');
 assert.equal(manifest.schoolAssignmentCertified,false);
 assert.equal(manifest.publicGeometryHosted,false);
 assert.equal(manifest.geometryRedistributionApproved,false);
 assert.deepEqual(manifest.districts.map(x=>x.code),['057914','043914','199901','057916','043908']);
 assert.equal(new Set(manifest.districts.map(x=>x.code)).size,5);
 assert.equal(manifest.districts.reduce((n,x)=>n+x.inventoryCampuses,0),156);
 for(const x of manifest.districts){
  const d=matrix.districts.find(d=>d.code===x.code);
  assert.ok(d,d?.name||x.code);
  assert.equal(d.category,'public-isd');
  assert.equal(d.teaCampusRecords,x.inventoryCampuses);
  assert.equal(d.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(d.parentGuidance.status,'registered-official-source');
  assert.equal(x.installedSchoolPolygons,0);
  assert.equal(x.liveSchoolAssignmentCertified,false);
  assert.equal(x.sourceReuseRightsVerified,false);
  assert.equal(x.officialParent.startsWith('https://'),true);
 }
});
test('Mesquite polygon schema is a candidate only, not current school assignment',()=>{
 const m=manifest.districts[0];
 assert.equal(m.sourceKind,'municipal-attendance-polygon');
 assert.equal(m.publisher,'City of Mesquite');
 assert.equal(m.publisherGIS,'https://gisservice.cityofmesquite.com/arcgis/rest/services/onlinemaps/neighborhood_vitality/MapServer/6');
 assert.deepEqual(m.schoolAttributes,['ES_ZONE','MS_Zone','HS_Zone']);
 assert.equal(m.sourceGeometry,'esriGeometryPolygon');
 assert.equal(m.sourceSchoolYear,null);
 assert.equal(m.sourceLastEdited,null);
 // The official school's 52-entry locator catalog is not the frozen TEA 51-record
 // snapshot and must never auto-promote a zoning polygon or missing campus ID.
 assert.equal(m.inventoryCampuses,51);
 assert.equal(m.districtLocatorPublicSchoolCount,52);
 assert.equal(m.districtLocatorUrl,'https://mesquiteisd.org/attendance-zones');
 assert.equal(m.districtLocatorObservedOn,'2026-11-26');
 assert.equal(m.districtToTeaCampusIdentityVerified,false);
 assert.equal(m.sourceSchoolYear,null);
 assert.equal(m.sourceReuseRightsVerified,false);
 assert.equal(m.liveSchoolAssignmentCertified,false);
 assert.match(m.notes,/campus ID membership.*NOT verified/);
});
test('Wylie Collin County is not silently swapped with Abilene Wylie ISD',()=>{
 const w=manifest.districts[1];
 assert.equal(w.code,'043914');
 assert.equal(w.sourceKind,'district-current-maps-feeder-only');
 assert.equal(w.publisher,'Wylie ISD (southern Collin County)');
 assert.equal(w.officialParent,'https://www.wylieisd.net/our-district/district-profile/district-maps');
 assert.equal(w.sourceContextUrl,'https://www.wylieisd.net/our-district/rezoning-2025-26');
 assert.equal(w.sourceDocument,null);
 assert.equal(w.sourceSchoolYear,null);
 assert.match(w.sourceYearEvidence,/Abilene/);
 assert.match(w.notes,/Buffalo Gap/);
 assert.doesNotMatch(JSON.stringify(manifest),/files-backend\.assets\.thrillshare\.com/);
 assert.equal(w.publisherGIS,null);
 assert.equal(w.installedSchoolPolygons,0);
});
test('Rockwall PDF source is preserved but conflicting year is unverified',()=>{
 const x=manifest.districts[2];
 assert.equal(x.sourceKind,'district-pdf-conflicting-year-label');
 assert.equal(x.sourceSchoolYear,null);
 assert.match(x.sourceYearEvidence,/2023-24/);
 assert.match(x.sourceYearEvidence,/2026-27/);
 assert.equal(x.sourceDocument,'https://resources.finalsite.net/images/v1746561842/rockwallisdcom/xu447xmnec7gsjl7ekfh/2026-2027ZoningwithnewMS.pdf');
 assert.equal(x.installedSchoolPolygons,0);
 assert.equal(x.liveSchoolAssignmentCertified,false);
});
test('Richardson has an independent historical map, but not a certified source year',()=>{
 const x=manifest.districts[3];
 assert.equal(x.publisherGIS,null);
 assert.match(x.sourceDocument,/web\.risd\.org\/home/);
 assert.equal(x.sourceSchoolYear,null);
 assert.equal(x.installedSchoolPolygons,0);
 const schoolRelease=fs.readFileSync(path.join(__dirname,'../features/conditional-school-release.js'),'utf8');
 assert.match(schoolRelease,/APPROVED_AUTO_DISTRICTS\s*=\s*Object\.freeze\(\{\}\)/);
});

test('lazy coverage renderer validates candidate sources fail closed before displaying',()=>{
 const vm=require('node:vm');
 const renderer=fs.readFileSync(path.join(__dirname,'../features/dfw-school-coverage-renderer.js'),'utf8');
 const a=renderer.indexOf(' function validNextGISSources(data){');
 const b=renderer.indexOf(' function validTexasWorks(extra,district){',a);
 assert.ok(a>0&&b>a);
 const ctx={};
 vm.runInNewContext(renderer.slice(a,b),ctx,{timeout:1000});
 const valid=ctx.validNextGISSources(manifest);
 assert.equal(valid.size,5);
 assert.equal(valid.get('057914').sourceKind,'municipal-attendance-polygon');
 const changed=fn=>{const v=structuredClone(manifest);fn(v);return v};
 assert.equal(ctx.validNextGISSources(changed(x=>x.schoolAssignmentCertified=true)),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.publicGeometryHosted=true)),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.geometryRedistributionApproved=true)),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[0].sourceSchoolYear='2026-27')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[0].installedSchoolPolygons=51)),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[0].publisherGIS='https://evil.test/fake')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts.push(x.districts[0]))),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[1].sourceDocument='https://files-backend.assets.thrillshare.com/fake.pdf')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[1].sourceSchoolYear='2026-27')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[1].officialParent='https://www.wyliebulldogs.org')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[2].sourceSchoolYear='2026-27')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[2].sourceYearEvidence='2026-27')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[4].liveMapCurrentYearIndependentlyVerified=true)),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[4].approvedElementaryYear='2025-26')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[4].locatorGuideSchoolYear='2026-27')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[4].reviewedOn='2026-11-21')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[4].sourceSchoolYear='2026-27')),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[4].sourceReuseRightsVerified=true)),null);
 assert.equal(ctx.validNextGISSources(changed(x=>x.districts[4].officialParent='https://evil.test/locator')),null);
 assert.match(renderer,/NEXT_GIS_FILE='\.\/data\/dfw-next-gis-source-candidates-20261121\.json\?v=3'/);
 assert.match(renderer,/newEvidence=nextGIS\?\.get\(d\.code\)/);
 assert.match(renderer,/GIS 후보 발견 · 지도 미탑재/);
 assert.doesNotMatch(renderer,/innerHTML\s*=|eval\s*\(/);
});
test('Melissa 2026-27 board-approved elementary zones are locator evidence, not certified live campus geometry',()=>{
 const m=manifest.districts[4];
 assert.equal(m.code,'043908');
 assert.equal(m.inventoryCampuses,9);
 assert.equal(m.sourceKind,'district-interactive-zoning-reference-only');
 assert.equal(m.publisherGIS,null);
 assert.equal(m.sourceSchoolYear,null);
 assert.equal(m.approvedElementaryYear,'2026-27');
 assert.equal(m.reviewedOn,'2026-11-25');
 assert.equal(m.locatorGuideSchoolYear,'2025-26');
 assert.equal(m.liveMapCurrentYearIndependentlyVerified,false);
 assert.equal(m.installedSchoolPolygons,0);
 assert.equal(m.liveSchoolAssignmentCertified,false);
 assert.equal(m.sourceReuseRightsVerified,false);
 assert.equal(m.officialParent,'https://www.melissaisd.org/page/interactive-zoning-map');
 assert.equal(m.sourceContextUrl,'https://www.melissaisd.org/o/nce/article/2608592');
 assert.match(m.notes,/Cardinal Renaissance Academy/);
 const {official}=require('../trusted-link-policy.js');
 assert.equal(official(m.officialParent),m.officialParent);
 assert.equal(official('https://www.melissaisd.org.evil.test/page/interactive-zoning-map'),null);
});

test('only exact city-publisher GIS domain is an approved new source link',()=>{
 const {official}=require('../trusted-link-policy.js');
 assert.equal(official('https://gisservice.cityofmesquite.com/arcgis/rest/services/onlinemaps/neighborhood_vitality/MapServer/6'),
  manifest.districts[0].publisherGIS);
 assert.equal(official('https://www.mesquiteisd.org/189249_2'),manifest.districts[0].officialParent);
 assert.equal(official('https://www.wylieisd.net/our-district/district-profile/district-maps'),manifest.districts[1].officialParent);
 assert.equal(official('https://www.wyliebulldogs.org/article/2594492'),null);
 assert.equal(official('https://www.mesquiteisd.org.evil.test/'),null);
 assert.equal(official('https://gisservice.cityofmesquite.com.evil.test/'),null);
 assert.equal(official('https://evil.test/'),null);
});
