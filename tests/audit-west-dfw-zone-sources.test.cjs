'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {validateManifest,requireHttps,KELLER_LAYERS}=require('../scripts/audit-west-dfw-zone-sources.cjs');
const source=JSON.parse(fs.readFileSync('data/west-dfw-zone-source-audit-2026.json','utf8'));
const ui=JSON.parse(fs.readFileSync('data/west-dfw-districts-2026.json','utf8'));
const copy=()=>structuredClone(source);
const check=plan=>validateManifest(plan,ui);

test('source inventory stays link-only: four districts, no executable polygon releases',()=>{
 const r=check(copy());
 assert.equal(r.status,'REUSE_BLOCKED_OFFICIAL_FINDER_ONLY');
 assert.equal(r.districts.length,4);
 assert.equal(r.keller.layerFeatureCountTotal,41);
 assert.equal(r.keller.verifiedVintage,'2018-19');
 assert.equal(r.publicDeploymentPerformed,false);
 assert.ok(r.districts.every(d=>d.rawPolygonAutoPublish===false&&d.licenseVerified===false));
});
test('Keller 2018-19 geometry may not masquerade as current official 2026-27',()=>{
 const p=copy();p.districts.find(d=>d.code==='220907').verifiedPolygonAcademicYear='2026-27';
 assert.throws(()=>check(p),/keller_stale_gis_classification|current_finder_year_does_not_authorize_geojson/);
});
test('each of the four actual city GIS layer year fields is pinned and human-reviewable',()=>{
 assert.equal(KELLER_LAYERS.length,4);
 for(const id of [2,3,4,5]){
  const p=copy(),d=p.districts.find(d=>d.code==='220907');
  const layer=d.observedLayers.find(l=>l.id===id);
  layer.observedSchoolYears=['2026-27'];
  assert.throws(()=>check(p),/keller_2018_19_layer_vintage_incorrect/);
 }
});
test('observed layer feature counts cannot silently change',()=>{
 const p=copy();
 p.districts.find(d=>d.code==='220907').observedLayers[0].observedFeatureCount=1;
 assert.throws(()=>check(p),/keller_2018_19_layer_vintage_incorrect/);
});
test('2026-27 Northwest official Finder is not a distributable GeoJSON release',()=>{
 const p=copy(),d=p.districts.find(d=>d.code==='061911');
 assert.equal(d.verifiedPolygonAcademicYear,null);
 assert.equal(d.verifiedOfficialFinderAcademicYear,'2026-27');
 assert.equal(d.verifiedRawPolygonEndpoint,null);
 assert.equal(d.reuseRights,'not-reviewed');
 d.reuseRights='approved';
 assert.throws(()=>check(p),/west_boundary_source_evidence_invalid/);
});
test('NW current school-year Finder date never becomes a verified GIS geometry year',()=>{
 const original=copy(),d=original.districts.find(x=>x.code==='061911');
 assert.equal(d.verifiedPolygonAcademicYear,null);
 assert.equal(d.verifiedOfficialFinderAcademicYear,'2026-27');
 const corrupted=copy();
 corrupted.districts.find(x=>x.code==='061911').verifiedPolygonAcademicYear='2026-27';
 assert.throws(()=>check(corrupted),/northwest_year_or_license_unverified/);
 const missingFinder=copy();
 missingFinder.districts.find(x=>x.code==='061911').verifiedOfficialFinderAcademicYear=null;
 assert.throws(()=>check(missingFinder),/northwest_year_or_license_unverified/);
});
test('Northwest 2022 ArcGIS lead is recorded without licensed campus polygon promotion',()=>{
 const r=check(copy());
 assert.equal(r.northwest.candidateLayers,3);
 assert.equal(r.northwest.currentOfficialFinderYear,'2026-27');
 assert.equal(r.northwest.futureApprovedYear,'2027-28');
 assert.equal(r.northwest.academicYearVerifiedForCandidates,false);
 assert.equal(r.northwest.importedPolygonCount,0);
 assert.equal(r.northwest.reusePermissionVerified,false);
 const nw=source.districts.find(d=>d.code==='061911');
 assert.deepEqual(nw.historicalCandidateLayers.map(x=>x.dataLastEdit),
  ['2022-02-17','2022-11-17','2022-11-17']);
 assert.equal(ui.districts.find(d=>d.code==='061911').localSchoolPolygonCount,0);
});
test('Northwest GIS cannot be silently promoted by year/rights/changed host or newer future boundary',()=>{
 const examples=[
  d=>{d.historicalCandidateLayers[0].academicYearVerified='2026-27';},
  d=>{d.historicalCandidateLayers[1].reusePermissionVerified=true;},
  d=>{d.historicalCandidateLayers[2].completeDistrictCoverageVerified=true;},
  d=>{d.historicalCandidateLayers[0].layerUrl='https://evil.example.com/FeatureServer/0';},
  d=>{d.historicalCandidateLayers[0].dataLastEdit='2026-11-18';},
  d=>{d.historicalCandidateLayers.push({...d.historicalCandidateLayers[0]});},
  d=>{d.futureYearApprovedUrl='https://www.nisdtx.org/schoolfinder';}
 ];
 for(const change of examples){
  const p=copy();change(p.districts.find(d=>d.code==='061911'));
  assert.throws(()=>check(p),/northwest_(historical_gis_cannot_be_promoted|year_or_license_unverified)/);
 }
 const p=copy();
 p.evidence.push({kind:'arcgis',district:'061911',
  url:'https://services3.arcgis.com/qnlpi19w6R1Ta48m/ArcGIS/rest/services/NotApproved/FeatureServer/0',
  status:'attacker-controlled URL within same trusted host'});
 assert.throws(()=>check(p),/northwest_evidence_endpoint_not_approved/);
});
test('Carroll enrollment year and GCISD printable maps cannot claim current polygon evidence',()=>{
 const p=copy();
 p.districts.find(d=>d.code==='220919').verifiedPolygonAcademicYear='2026-27';
 assert.throws(()=>check(p),/unverified_source_year_was_promoted_to_current/);
 const q=copy();
 q.districts.find(d=>d.code==='220906').verifiedPolygonAcademicYear='2026-27';
 assert.throws(()=>check(q),/unverified_source_year_was_promoted_to_current/);
});
test('any enable flag or automatic polygon/address assignment fails closed',()=>{
 for(const field of ['automaticPolygonIngestionEnabled','polygonDisplayEnabled',
   'exactAddressAssignmentEnabled','redistributionRightsVerified']){
  const p=copy();p.globalReleaseState[field]=true;
  assert.throws(()=>check(p),/release_block_violation/);
 }
});
test('forged GIS endpoints and provider domains are rejected before import',()=>{
 const p=copy();p.districts[1].verifiedRawPolygonEndpoint='https://attacker.example.com/MapServer';
 assert.throws(()=>check(p),/unapproved_raw_gis_endpoint/);
 assert.equal(requireHttps('https://www.kellerisd.net/about-kisd/maps','www.kellerisd.net'),true);
 for(const url of ['http://www.kellerisd.net/about-kisd/maps',
  'https://www.kellerisd.net.evil.test/anything',
  'https://bad@www.kellerisd.net/about-kisd/maps',
  'javascript:alert(1)']){
   assert.equal(requireHttps(url,'www.kellerisd.net'),false,url);
 }
});
test('no current map school zone configuration may be inferred from a school point location',()=>{
 const r=check(copy());
 assert.ok(r.districts.every(d=>d.sourceStatus!=='current-deployed-polygon'));
});
test('no home location or residential address is transmitted or stored by provenance check',()=>{
 const output=JSON.stringify(check(copy()));
 assert.equal(output.includes('latitude'),false);
 assert.equal(output.includes('longitude'),false);
 assert.equal(output.includes('streetAddress'),false);
});
test('school provenance classification rejects unknown revisions, duplicate codes and missing evidence',()=>{
 const a=copy();a.districts[0].mapStatus='verified-2026-27';
 assert.throws(()=>check(a),/evidence_invalid/);
 const b=copy();b.districts[1].code=b.districts[0].code;
 assert.throws(()=>check(b),/district_id_drift/);
 const c=copy();c.evidence=[];
 assert.throws(()=>check(c),/manifest_invalid/);
});

test('Keller current UI exposes historical reference warning without any boundary toggle',()=>{
 const d=ui.districts.find(d=>d.code==='220907');
 assert.match(d.dataNote,/2018–19/);
 assert.match(d.dataNote,/사용하지 않습니다/);
 assert.equal(d.localSchoolPolygonCount,0);
 assert.equal(d.boundaryStatus,'external-official-finder-only');
});
