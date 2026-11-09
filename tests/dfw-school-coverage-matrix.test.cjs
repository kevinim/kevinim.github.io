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
 assert.equal(s.publicISDsWithRegisteredParentRoute,107);
 assert.equal(s.publicISDsMissingRegisteredParentRoute,1);
 assert.equal(s.registeredParentRouteRatePublicISDPercent,99.1);
 assert.equal(s.publicISDCampusRowsWithUnverifiedParentRoute,3);
 assert.equal(s.publicISDCampusRowsWithRegisteredParentRoute,1938);
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
 assert.deepEqual(committed.priorityQueue.filter(code=>byCode(code).priority==='P0'),['249904']);
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
 assert.deepEqual(committed.priorityQueue.slice(0,3),['249904','057905','220905']);
 assert.equal(committed.summary.registeredParentRouteRatePublicISDPercent,99.1);
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
 assert.ok(html.includes('./features/dfw-school-coverage-panel.js?v=1'));
 assert.ok(html.includes('./features/dfw-school-coverage-panel.css?v=1'));
 assert.match(html,/src="\.\/school-zone-ui\.js\?v=\d+"/);
 const ui=fs.readFileSync(path.join(root,'features/dfw-school-coverage-panel.js'),'utf8');
 assert.ok(ui.includes('document.createElement'));
 assert.ok(!ui.includes('.innerHTML'));
 assert.ok(ui.includes('window.TrustedLinkPolicy?.official?.(url)'));
 assert.ok(ui.includes('panel.open&&!started'));
});
