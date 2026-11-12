'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const audit=read('data/denton-eight-campus-coordinate-exceptions-2026.json');
const gis=read('data/denton-2026-27-gis-source-disposition.json');
const prior=read('data/denton-campus-public-points-2026.json');
const ref=require('../denton-official-zone-references.js');
const nces=new Map(read('nces-locations-2024.json').data.map(s=>[s.id,s]));
const expected=['061901003','061901045','061901050','061901051','061901129','061901130','061901131','061901132'].sort();
test('the 8 held Denton campuses match existing point exclusions, 39 official PDFs and NCES points exactly',()=>{
 assert.equal(audit.schemaVersion,1);
 assert.equal(audit.district,'061901');
 assert.equal(audit.exceptions.length,8);
 assert.deepEqual(audit.exceptions.map(x=>x.id).sort(),expected);
 assert.deepEqual([...prior.excludedIds].sort(),expected);
 for(const r of audit.exceptions){
  const official=ref.ROWS.find(x=>x.id===r.id);
  assert.ok(official,'missing official Denton PDF ID '+r.id);
  assert.equal(official.level,r.level);
  assert.ok(ref.validPdf(official.url));
  assert.ok(nces.has(r.id),'NCES point unavailable '+r.id);
  assert.match(r.schoolSourceUrl,/^https:\/\/(?:[a-z0-9-]+\.)?dentonisd\.org\//);
  assert.match(r.publicCampusAddress.street,/^[0-9]+[ A-Za-z.]+$/);
  assert.equal(r.publicCampusAddress.state,'TX');
  assert.match(r.publicCampusAddress.zip,/^\d{5}$/);
  assert.equal(r.priorNCESPointAvailable,true);
  assert.equal(r.currentLocationCoordinateApproved,false);
  assert.equal(r.currentAttendanceZoneApproved,false);
  assert.equal(r.status,'current-campus-address-crosschecked-coordinate-unverified');
  assert.ok(!Object.hasOwn(r,'ll')&&!Object.hasOwn(r,'polygon')&&!Object.hasOwn(r,'geometry'),
    'Do not invent coordinate or attendance geometry for a held campus');
 }
});
test('three historical point disagreements stay >250m; one ID bridge and four missing TEA geometries stay quarantined',()=>{
 const groups={};
 for(const x of audit.exceptions)groups[x.historicalPointDiscrepancy]=(groups[x.historicalPointDiscrepancy]||0)+1;
 assert.deepEqual(groups,{'coordinate-disagreement':3,'tea-nces-id-missing':1,'tea-geometry-missing':4});
 assert.deepEqual(audit.exceptions.filter(x=>x.historicalDistanceMeters!==null).map(x=>x.historicalDistanceMeters).sort((a,b)=>a-b),[304,350,459]);
 const cheek=audit.exceptions.find(x=>x.id==='061901051');
 assert.equal(cheek.publicCampusAddress.city,'Aubrey');
 assert.ok(/Prosper/.test(cheek.notes),'record official directory vs PDF label discrepancy');
 const dentonHigh=audit.exceptions.find(x=>x.id==='061901003');
 assert.match(dentonHigh.publicCampusAddress.street,/Bronco Way/);
 const calhoun=audit.exceptions.find(x=>x.id==='061901045');
 assert.match(calhoun.publicCampusAddress.street,/Crescent/);
 assert.equal(audit.eightCurrentCampusCoordinatesVerified,false);
 assert.equal(audit.schoolAttendanceZonePolygonVerified,false);
 assert.equal(audit.addressAssignmentVerified,false);
 assert.equal(audit.readyForProduction,false);
});
test('no non-Denton or historic geometry source is promoted to 2026–27 school-level GIS',()=>{
 assert.equal(gis.schemaVersion,1);
 assert.equal(gis.district,'061901');
 assert.equal(gis.schoolYear,'2026-27');
 assert.equal(gis.officialCurrentYearPdfCount,39);
 assert.deepEqual(gis.expectedCampusGradeCounts,{elementary:26,middle:9,high:4});
 assert.equal(gis.verifiedCurrentYearSchoolPolygonLayerCount,0);
 assert.equal(gis.currentYearSchoolPolygonsAcquired,false);
 assert.equal(gis.publishCurrentYearGeometry,false);
 assert.equal(gis.officialAddressAssignmentCertified,false);
 assert.equal(gis.releaseGate.status,'NO_GO');
 assert.equal(gis.releaseGate.productionMergeApproved,false);
 assert.ok(gis.sources.length>=6);
 for(const s of gis.sources){
  assert.equal(s.usableAsCurrentCampusPolygon,false);
  assert.match(s.url,/^https:\/\//);
 }
 assert.ok(gis.sources.some(s=>s.kind==='county-administrative-isd-polygon'));
 assert.ok(gis.sources.some(s=>s.kind==='current-district-residential-school-locator'));
});

test('official 2026–27 PDF-vs-live-directory ZIP discrepancies remain unresolved for Hill and Martinez',()=>{
 assert.equal(audit.currentYearPdfVsLiveDirectoryZipConflicts,2);
 const expected=[['061901130','75068','76227','HillES-ZoneMap_26-27.pdf'],['061901131','76227','75068','MartinezES-ZoneMap_26-27.pdf']];
 for(const [id,directoryZip,pdfZip,pdfName] of expected){
  const campus=audit.exceptions.find(x=>x.id===id);
  assert.ok(campus);
  assert.equal(campus.publicCampusAddress.zip,directoryZip);
  const conflicting=campus.currentYearOfficialPdfAddressDiscrepancy;
  assert.ok(conflicting);
  assert.equal(conflicting.officialLiveDirectoryZip,directoryZip);
  assert.equal(conflicting.pdfLegendZip,pdfZip);
  assert.ok(conflicting.officialZonePdfUrl.endsWith(pdfName));
  assert.equal(conflicting.status,'unresolved-no-coordinate-certification');
  assert.equal(campus.currentLocationCoordinateApproved,false);
 }
});
test('proposed future 2028–29 rezoning must never certify current 2026–27 polygons',()=>{
 assert.equal(gis.schoolYear,'2026-27');
 assert.deepEqual(gis.temporalProvenanceGuard,{currentYear:'2026-27',futureProposalYear:'2028-29',futureProposalMayCertifyCurrentYear:false,yearUnmatchedSourcesMustRemainQuarantined:true});
 const future=gis.sources.find(x=>x.kind==='future-2028-29-proposed-attendance-rezoning');
 assert.ok(future);
 assert.equal(future.status,'proposal-for-2028-29-not-current');
 assert.equal(future.usableAsCurrentCampusPolygon,false);
 assert.equal(gis.verifiedCurrentYearSchoolPolygonLayerCount,0);
 assert.equal(gis.releaseGate.status,'NO_GO');
});
test('Denton Nov 9 existing GIS records request is sent, but neither reply nor vector rights is certified',()=>{
 const q=gis.originalVectorRecordsRequest;
 assert.ok(q);
 assert.equal(q.status,'sent-awaiting-response');
 assert.equal(q.sentOn,'2026-11-09');
 assert.equal(q.channel,'email');
 assert.equal(q.sentEvidence,'confirmed-in-connected-Sent-mailbox-2026-11-12');
 assert.equal(q.publicReceiptAvailable,false);
 assert.equal(q.receivedResponseAsOf,'not-observed-in-connected-inbox-search-2026-11-12');
 assert.equal(q.districtOriginalVectorReceived,false);
 assert.equal(q.licensingConsentVerified,false);
 assert.match(q.feeAuthority,/No paid request/);
 assert(!JSON.stringify(q).includes('mail.google.com'));
 assert(!Object.hasOwn(q,'messageId'));
 assert(!Object.hasOwn(q,'threadId'));
 assert.equal(gis.verifiedCurrentYearSchoolPolygonLayerCount,0);
 assert.equal(gis.releaseGate.status,'NO_GO');
});
