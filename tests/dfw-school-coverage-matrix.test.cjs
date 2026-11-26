'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {buildFromRepo,buildCoverage,COUNTIES}=require('../scripts/build-dfw-school-coverage-matrix.cjs');
const root=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const committed=load('data/dfw-school-coverage-matrix-2026.json');
const byCode=code=>committed.districts.find(x=>x.code===code);

test('committed DFW-wide matrix matches deterministic build byte-for-byte',()=>{
 const actual=buildFromRepo(root);
 assert.deepEqual(actual,committed);
 assert.equal(fs.readFileSync(path.join(root,'data/dfw-school-coverage-matrix-2026.json'),'utf8'),
  JSON.stringify(actual,null,2)+'\n','snapshot is outdated; rerun build script');
});

test('full 11-county source proxy, separate public ISDs and other TEA LEAs',()=>{
 assert.equal(COUNTIES.length,11);
 assert.equal(committed.geographicDefinition.counties.length,11);
 assert.match(committed.geographicDefinition.caveat,/NOT a certified list/);
 assert.match(committed.geographicDefinition.extendedRegion,/Hood/);
 const s=committed.summary;
 assert.equal(s.sourceCampusRows,2182);
 assert.equal(s.teaDistrictCodes,152);
 assert.equal(s.publicISDs,108);
 assert.equal(s.otherLEAs,44);
 assert.equal(s.publicISDsWithRegisteredParentRoute,108);
 assert.equal(s.publicISDsMissingRegisteredParentRoute,0);
 assert.equal(s.registeredParentRouteRatePublicISDPercent,100);
 assert.equal(s.publicISDCampusRowsWithUnverifiedParentRoute,0);
 assert.equal(s.publicISDCampusRowsWithRegisteredParentRoute,1941);
 assert.equal(s.otherLEACampusRows,241);
 assert.equal(s.publicISDCampusRows+s.otherLEACampusRows,s.sourceCampusRows);
 assert.equal(committed.districts.length,152);
 assert.equal(new Set(committed.districts.map(d=>d.code)).size,152);
 assert.equal(committed.priorityQueue.length,152);
 assert.equal(new Set(committed.priorityQueue).size,152);
 assert.equal(s.campusPolygonCoverageAllDFWPercent,null);
 assert.equal(s.exactAddressAssignmentCoveragePercent,null);
});

test('PRIORITY P0 targets verified missing parent lookup route across whole DFW',()=>{
 assert.deepEqual(committed.priorityQueue.filter(code=>byCode(code).priority==='P0'),[]);
 assert.equal(byCode('249904').priority,'P1');
 assert.equal(byCode('249904').parentGuidance.lookupType,'official-inquiry');
 for(const code of committed.priorityQueue.filter(code=>byCode(code).priority==='P0')){
  const x=byCode(code);
  assert.equal(x.priority,'P0');
  assert.equal(x.parentGuidance.status,'not-verified');
  assert.equal(x.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(x.geometry.matchedLoadedPercent,null);
 }
 for(const x of committed.districts.filter(x=>x.category==='public-isd')){
  assert.equal(x.priority==='P0',x.parentGuidance.status==='not-verified',x.name);
 }
});


test('eight verified official parent entry sources are registered without inventing GIS or address assignment',()=>{
 const codes=['220905','220901','220908','057910','220918','220902','220912','126902'];
 const {DISTRICT_REGISTRY}=require('../district-registry.js');
 const {official}=require('../trusted-link-policy.js');
 let campuses=0;
 for(const code of codes){
  const record=byCode(code),entry=DISTRICT_REGISTRY[code];
  assert.ok(record&&entry,'missing source '+code);
  assert.equal(record.category,'public-isd');
  assert.equal(entry.zoneKey,null);
  assert.equal(entry.address,null);
  assert.equal(entry.lookupKind,'finder-guidance');
  assert.match(entry.officialNote,/주소|School|학군/);
  assert.equal(official(entry.official),entry.official);
  assert.equal(record.parentGuidance.registryKey,code);
  assert.equal(record.parentGuidance.officialUrl,entry.official);
  assert.equal(record.parentGuidance.status,'registered-official-source');
  assert.equal(record.parentGuidance.lookupType,'finder-guidance');
  assert.equal(record.parentGuidance.yearCaution,entry.officialNote);
  assert.equal(record.priority,'P1');
  assert.equal(record.geometry.status,'no-dashboard-school-polygons-configured');
  assert.equal(record.missingReason,'official-parent-route-linked-but-campus-gis-not-ingested');
  assert.equal(record.geometry.matchedLoadedPercent,null);
  campuses+=record.teaCampusRecords;
 }
 assert.equal(campuses,399);
 assert.deepEqual(committed.priorityQueue.slice(0,2),['057905','220905']);
 assert.equal(committed.summary.registeredParentRouteRatePublicISDPercent,100);
 assert.equal(official('https://untrusted.example.invalid/locator'),null);
});

test('canonical nine-digit TEA campus ID reconciles alias ISD codes to actual districts',()=>{
 const known=[
  ['043905','FISD'],['043910','PISD'],['043901','AISD'],['061902','LISD'],
  ['043912','PROSPER'],['057903','CFB'],['043907','043907']
 ];
 for(const [code,key] of known){
  const row=byCode(code);
  assert.ok(row,'missing '+code);
  assert.equal(row.parentGuidance.registryKey,key);
  assert.equal(row.parentGuidance.status,'registered-official-source');
  assert.equal(row.geometry.status,'reference-browser-minimum-only');
 }
 const a=byCode('043901');
 assert.equal(a.geometry.confirmedCurrentYear,false);
 assert.match(a.geometry.vintageMode,/historical/);
 assert.ok(byCode('043905').geometry.confirmedCurrentYear);
 assert.ok(byCode('043912').geometry.confirmedCurrentYear);
 const cfb=byCode('057903');
 assert.equal(cfb.geometry.referenceMatchedMinimum,0);
 assert.equal(cfb.geometry.referenceLoadedMinimum,30);
 assert.equal(cfb.parentGuidance.status,'registered-official-source');
 assert.equal(cfb.missingReason,'official-parent-route-linked-but-campus-gis-not-ingested');
});

test('district-level source gaps never become fabricated student address assignments',()=>{
 for(const d of committed.districts){
  assert.ok(d.teaCampusRecords>=1);
  assert.ok(['P0','P1','P2'].includes(d.priority));
  assert.match(d.limitation,/unverified|measurement|Reference|audited|investigated|separately/);
  if(d.geometry.status!=='reference-browser-minimum-only'){
   assert.equal(d.geometry.referenceMatchedMinimum,null);
   assert.equal(d.geometry.matchedLoadedPercent,null);
  }
  if(d.parentGuidance.status==='not-verified'){
   assert.equal(d.parentGuidance.officialUrl,null);
  }
  if(d.category!=='public-isd'){
   assert.equal(d.missingReason,'other-lea-admissions-model-needs-classification');
  }
 }
 assert.equal(byCode('057909').parentGuidance.lookupType,'choice-process');
 assert.equal(byCode('220916').parentGuidance.lookupType,'official-map');
 assert.equal(byCode('199901').parentGuidance.lookupType,'official-inquiry');
});

test('unknown official link host, duplicate TEA campus ID and inconsistent aliases fail build',()=>{
 const tea=load('tea-ratings-2026.json'),registry=require('../district-registry.js').DISTRICT_REGISTRY;
 const base=load('data/school-polygon-linkage-baseline.json');
 const altered=structuredClone(tea);
 altered.data.push({...altered.data.find(x=>x.districtCounty==='DALLAS')});
 assert.throws(()=>buildCoverage(altered,registry,base),/duplicate_tea_campus_id/);
 const corrupted=structuredClone(registry);
 corrupted['057905'].official='https://example.invalid/fake-finder';
 assert.throws(()=>buildCoverage(tea,corrupted,base),/district_official_link_not_approved/);
});

test('HTML loads optional coverage UI without modifying inline CSP bootstrap',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('id="dfwSchoolCoveragePanel"'));
 assert.ok(html.includes('id="dfwSchoolCoverageContent"'));
 assert.ok(html.includes('./features/dfw-school-coverage-panel.js?v=7'));
 assert.ok(html.includes('./features/dfw-school-coverage-panel.css?v=1'));
 assert.ok(html.includes('src="./school-zone-ui.js?v=1"'));
 const ui=fs.readFileSync(path.join(root,'features/dfw-school-coverage-renderer.js'),'utf8');
 assert.ok(fs.readFileSync(path.join(root,'features/dfw-school-coverage-panel.js'),'utf8').includes("./features/dfw-school-coverage-renderer.js?v=7"));
 assert.equal(require('node:child_process').execFileSync('git',['hash-object','features/dfw-school-coverage-renderer.js'],{cwd:root,encoding:'utf8'}).trim(),
  'f77757153a58089abf7582bb30038b1b17192690','Reviewed DFW renderer including CFB/Denton public-source disclosure must remain byte-for-byte pinned');
 assert.ok(ui.includes('document.createElement'));
 assert.ok(!ui.includes('.innerHTML'));
 assert.ok(ui.includes('window.TrustedLinkPolicy?.official?.(url)'));
 assert.ok(ui.includes('panel.open&&!started'));
});


test('CFB and Denton public-source research is explicit, year-labelled, and not a GIS or enrollment grant',()=>{
 const evidence=load('data/dfw-cfb-denton-public-source-status-20261120.json');
 assert.equal(evidence.schemaVersion,1);
 assert.equal(evidence.reviewedOn,'2026-11-20');
 assert.equal(evidence.districtReplyRequired,false);
 assert.equal(evidence.exactAddressAutoAssignmentCertified,false);
 assert.equal(evidence.entries.length,2);
 assert.deepEqual(evidence.entries.map(x=>x.code),['057903','061901']);
 for(const row of evidence.entries){
  assert.equal(row.researchPass,'public-sources-inventoried');
  assert.equal(row.currentYearCertifiedCampusPolygons,0);
  assert.equal(row.officialResidenceLookupAutoIntegrated,false);
  assert.equal(row.sourceGeometryRightsConfirmed,false);
  assert.equal(row.currentOfficialSchoolLookup.readsResultsIntoDashboard,false);
  assert.equal(row.currentOfficialSchoolLookup.available,true);
  assert.equal(byCode(row.code).parentGuidance.status,'registered-official-source');
 }
 const cfb=evidence.entries[0],denton=evidence.entries[1];
 assert.equal(cfb.currentReferenceSchoolYear,'2025–26');
 assert.equal(cfb.currentParentLookupSchoolYear,'2026–27');
 assert.equal(cfb.approvedBoundaryRaster.boardApprovedOn,'2025-03-06');
 assert.equal(cfb.approvedBoundaryRaster.count,3);
 assert.equal(cfb.historicalMunicipalGIS.sourceLastEditedYear,2020);
 assert.equal(cfb.historicalMunicipalGIS.academicYearConfirmed,false);
 assert.equal(cfb.historicalMunicipalGIS.current,false);
 assert.equal(cfb.historicalMunicipalGIS.ingested,false);
 assert.equal(cfb.historicalMunicipalGIS.cfbFeatureCount,30);
 assert.deepEqual(cfb.historicalMunicipalGIS.grades,{elementary:20,middle:6,high:4});
 assert.equal(denton.currentReferenceSchoolYear,'2026–27');
 assert.deepEqual(denton.officialPdfMaps.grades,{elementary:26,middle:9,high:4});
 assert.equal(denton.officialPdfMaps.count,39);
 assert.equal(denton.qaOnlyDerivedShapes.count,39);
 assert.equal(denton.qaOnlyDerivedShapes.published,false);
 assert.equal(denton.qaOnlyDerivedShapes.nearBoundaryPublicParcelMeters,20.6);
 assert.equal(denton.qaOnlyDerivedShapes.uncertainEdgeGuardMeters,100);
 assert.equal(denton.qaOnlyDerivedShapes.independentFinderSamplesPassed,9);
 assert.equal(denton.qaOnlyDerivedShapes.independentFinderSamplesTotal,9);
 assert.equal(denton.currentYearCertifiedCampusPolygons,0);
});

test('malformed evidence cannot upgrade school geometry and coverage panel remains lazy',()=>{
 const vm=require('node:vm');
 const source=fs.readFileSync(path.join(root,'features/dfw-school-coverage-renderer.js'),'utf8');
 const start=source.indexOf(' function validPublicSources(data){');
 const end=source.indexOf(' function validTexasWorks(extra,district){',start);
 assert.ok(start>0&&end>start);
 const scope={};
 vm.runInNewContext(source.slice(start,end),scope,{timeout:1000});
 const evidence=load('data/dfw-cfb-denton-public-source-status-20261120.json');
 const valid=scope.validPublicSources(evidence);
 assert.equal(valid.size,2);
 assert.equal(valid.get('057903').district,'CFB');
 assert.equal(valid.get('061901').district,'DENTON');
 const modified=(fn)=>{const copy=JSON.parse(JSON.stringify(evidence));fn(copy);return copy};
 assert.equal(scope.validPublicSources(modified(x=>x.districtReplyRequired=true)),null);
 assert.equal(scope.validPublicSources(modified(x=>x.entries[0].sourceGeometryRightsConfirmed=true)),null);
 assert.equal(scope.validPublicSources(modified(x=>x.entries[1].qaOnlyDerivedShapes.published=true)),null);
 assert.equal(scope.validPublicSources(modified(x=>x.entries[1].officialPdfMaps.count=38)),null);
 assert.equal(scope.validPublicSources(modified(x=>x.entries[0].historicalMunicipalGIS.academicYearConfirmed=true)),null);
 assert.equal(scope.validPublicSources(modified(x=>x.entries[0].currentYearCertifiedCampusPolygons=30)),null);
 assert.equal(scope.validPublicSources(modified(x=>x.entries.push(x.entries[0]))),null);
 assert.match(source,/PUBLIC_SOURCE_FILE='\.\/data\/dfw-cfb-denton-public-source-status-20261120\.json'/);
 assert.match(source,/공개자료 조사 완료 · 현행 학교별 GIS 미확보/);
 assert.match(source,/const link=safeLink\(proof\.currentOfficialSchoolLookup\.sourceUrl\)/);
 assert.doesNotMatch(source,/innerHTML\s*=|eval\s*\(/);
 const policy=fs.readFileSync(path.join(root,'features/conditional-school-release.js'),'utf8');
 assert.match(policy,/APPROVED_AUTO_DISTRICTS\s*=\s*Object\.freeze\(\{\}\)/);
});


test('Plano/Lewisville source vintages, 4-grade Plano and apartment exception are not enrollment grants',()=>{
 const d=load('data/dfw-plano-lewisville-source-vintage-20261120.json');
 assert.equal(d.schemaVersion,1);
 assert.equal(d.reviewedOn,'2026-11-20');
 assert.equal(d.districtReplyRequired,false);
 assert.equal(d.schoolAddressOfficialCertification,false);
 assert.equal(d.geometryReuseAuthorizationInferred,false);
 assert.deepEqual(d.districts.map(x=>x.code),['043910','061902']);
 const [plano,lisd]=d.districts;
 for(const x of d.districts){
  assert.equal(x.locatorYear,'2026–27');
  assert.equal(x.verifiedFor2026_27,false);
  assert.equal(x.displayReferenceOnly,true);
  assert.equal(x.locatorInteractiveResultReadByDashboard,false);
  assert.equal(x.currentResidentialAutomaticAssignmentCertified,false);
  assert.equal(x.sourceGeometryRightsIndependentlyConfirmed,false);
  assert.equal(byCode(x.code).geometry.confirmedCurrentYear,false);
 }
 assert.equal(plano.sourceFieldYear,'2025–26');
 assert.deepEqual(plano.servicePolygonCounts,{elementary:44,middle:11,high:6,senior:3,total:64});
 assert.equal(plano.cityHistoricalZones.sourceAcademicYear,'2019–20');
 assert.equal(plano.cityHistoricalZones.sourceLastEditedOn,'2020-01');
 assert.equal(plano.districtIndependentResidentialAddressConfirmed,0);
 assert.equal(plano.linkedAppCampusCount,62);
 assert.equal(plano.loadedAppCampusCount,63);
 assert.match(plano.specialCase,/Coit Rd/);
 assert.equal(lisd.sourceFieldYear,'high 2025–26; elementary/middle unverified');
 assert.equal(lisd.featureCountMixedMultipart,696);
 assert.equal(lisd.linkedAppCampusCount,53);
 assert.equal(lisd.loadedAppCampusCount,54);
 assert.deepEqual([lisd.apartmentEvidence.rows,lisd.apartmentEvidence.referencePolygonPointMatches,lisd.apartmentEvidence.conflicts],[174,173,1]);
 assert.equal(lisd.apartmentEvidence.conflictingGradeLevels,4);
 assert.equal(lisd.apartmentEvidence.schoolYearVerified,false);
 assert.match(lisd.specialCase,/5289/);
});

test('Plano/Lewisville optional vintages are independently fail-closed without modifying certificate gate',()=>{
 const vm=require('node:vm');
 const source=fs.readFileSync(path.join(root,'features/dfw-school-coverage-renderer.js'),'utf8');
 const start=source.indexOf(' function validPlanoLewisvilleSources(data){');
 const end=source.indexOf(' function validTexasWorks(extra,district){',start);
 assert.ok(start>0&&end>start);
 const ctx={};
 vm.runInNewContext(source.slice(start,end),ctx,{timeout:1000});
 const manifest=load('data/dfw-plano-lewisville-source-vintage-20261120.json');
 const result=ctx.validPlanoLewisvilleSources(manifest);
 assert.equal(result.size,2);
 assert.equal(result.get('043910').key,'PISD');
 assert.equal(result.get('061902').key,'LISD');
 const mutation=fn=>{const copy=structuredClone(manifest);fn(copy);return copy};
 assert.equal(ctx.validPlanoLewisvilleSources(mutation(x=>x.districtReplyRequired=true)),null);
 assert.equal(ctx.validPlanoLewisvilleSources(mutation(x=>x.geometryReuseAuthorizationInferred=true)),null);
 assert.equal(ctx.validPlanoLewisvilleSources(mutation(x=>x.districts[0].verifiedFor2026_27=true)),null);
 assert.equal(ctx.validPlanoLewisvilleSources(mutation(x=>x.districts[1].apartmentEvidence.conflicts=0)),null);
 assert.equal(ctx.validPlanoLewisvilleSources(mutation(x=>x.districts[1].apartmentEvidence.schoolYearVerified=true)),null);
 assert.equal(ctx.validPlanoLewisvilleSources(mutation(x=>x.districts[0].servicePolygonCounts.senior=0)),null);
 assert.equal(ctx.validPlanoLewisvilleSources(mutation(x=>x.districts.push(x.districts[0]))),null);
 assert.match(source,/const PLANO_LEWISVILLE_FILE='\.\/data\/dfw-plano-lewisville-source-vintage-20261120\.json'/);
 assert.match(source,/공식 검색기 운영 · GIS 학년도 미검증/);
 assert.match(source,/const url=safeLink\(vintage\.locatorSource\)/);
 assert.doesNotMatch(source,/innerHTML\s*=|eval\s*\(/);
 const gate=require('../features/conditional-school-release.js');
 assert.equal(gate.releaseSummary().currentYearResidentialDistrictApprovals,0);
});
