'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../data/denton-independent-finder-evidence-20261109.json');
const input=require('../data/denton-public-residential-finder-holdouts-2026.json');
const official=require('../denton-official-zone-references.js');
const held=require('../data/denton-eight-campus-coordinate-exceptions-2026.json');
const gis=require('../data/denton-2026-27-gis-source-disposition.json');

const byAddress=new Map(input.samples.map(x=>[x.id,x]));
const byCampus=new Map(official.ROWS.map(x=>[x.id,x]));
const holds=new Set(held.exceptions.map(x=>x.id));
const actual=data.rows.map(r=>[r.addressId,r.grade,r.campusId]);
const expected=[
 ['DENTON_CRESCENT',2,'061901107'],
 ['DENTON_CRESCENT',7,'061901045'],
 ['DENTON_CRESCENT',10,'061901003'],
 ['DENTON_BUENAVISTA',2,'061901106'],
 ['DENTON_BUENAVISTA',7,'061901041'],
 ['DENTON_BUENAVISTA',10,'061901007'],
 ['DENTON_WINDSOR',2,'061901132'],
 ['DENTON_WINDSOR',7,'061901045'],
 ['DENTON_WINDSOR',10,'061901003']
];

test('source-backed real browser evidence tracks nine explicit grade/address pairs',()=>{
 assert.equal(data.schemaVersion,1);assert.equal(data.district,'061901');
 assert.equal(data.source,input.officialLocator);assert.match(data.githubActionsEvidence,/\/actions\/runs\/42680389571$/);
 assert.deepEqual(actual,expected);
 assert.equal(data.observedRowCount,9);
 assert.equal(new Set(data.rows.map(x=>x.addressId)).size,3);
 assert.equal(new Set(data.rows.map(x=>x.campusId)).size,7);
 assert.equal(data.uniqueObservedCampusCount,7);
 for(const x of data.rows)assert.ok(byAddress.has(x.addressId));
});

test('grade 2/7/10 and default program results match 2026–27 official PDF school IDs',()=>{
 for(const row of data.rows){
  const entry=byCampus.get(row.campusId);
  assert.ok(entry,'missing campus '+row.campusId);
  assert.equal(entry.level,row.level);
  assert.equal(row.level,row.grade===2?'elementary':row.grade===7?'middle':'high');
  assert.equal(row.program,'DFLT');assert.equal(row.status,'OFFICIAL_FINDER_RESULT_OBSERVED');
  assert.equal(row.officialPdfRosterMatched,true);
  assert.equal(official.validPdf(entry.url),true);
  assert.match(row.campusId,/^061901\d{3}$/);
 }
});

test('current-year campus location exceptions stay held even for three matching official Finder schools',()=>{
 const used=new Set(data.rows.filter(r=>r.historicCampusCoordinateHold).map(r=>r.campusId));
 assert.deepEqual([...used].sort(),['061901003','061901045','061901132']);
 for(const row of data.rows)assert.equal(row.historicCampusCoordinateHold,holds.has(row.campusId));
 assert.equal(data.certifiedCurrentYearCampusCoordinatesForEightHeld,0);
 assert.equal(held.eightCurrentCampusCoordinatesVerified,false);
});

test('live Finder lookup must NOT automatically certify geometry, assignment eligibility or effective-year',()=>{
 assert.equal(data.officialFinderEffectiveYearIndependentlyConfirmed,false);
 assert.equal(data.knownCurrentYearSchoolPolygonsImported,0);
 for(const row of data.rows){
  assert.equal(row.currentYearPolygonVerified,false);
  assert.equal(row.residentialAssignmentReleaseCertified,false);
  assert.equal('ll' in row,false);
  assert.equal('geometry' in row,false);
  assert.equal('polygon' in row,false);
 }
 assert.equal(data.schoolAssignmentReleaseGate.status,'NO_GO');
 assert.equal(gis.releaseGate.status,'NO_GO');
 assert.equal(gis.verifiedCurrentYearSchoolPolygonLayerCount,0);
 assert.equal(gis.currentYearSchoolPolygonsAcquired,false);
 assert.equal(gis.publishCurrentYearGeometry,false);
 assert.equal(gis.officialAddressAssignmentCertified,false);
});

test('mutating a grade school ID, program or enrollment certification would be detected',()=>{
 const altered=structuredClone(data);
 altered.rows[1].campusId='061901003';
 assert.notDeepEqual(altered.rows.map(r=>[r.addressId,r.grade,r.campusId]),expected);
 const gradeLevelMismatch=data.rows.some(r=>byCampus.get(r.campusId)?.level!==r.level);
 assert.equal(gradeLevelMismatch,false);
 const falseEnrollment=data.rows.some(r=>r.residentialAssignmentReleaseCertified===true);
 assert.equal(falseEnrollment,false);
});

test('live official Finder runner must fail CI on any missing or mismatched grade result',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.resolve(__dirname,'../scripts/denton-independent-grade-finder-qa.cjs'),'utf8');
 assert.match(source,/if\(passed!==9\)process\.exitCode=1/);
 assert.match(source,/for\(const grade of \[2,7,10\]\)/);
 assert.match(source,/waitForFunction\(target=>/,'wait for asynchronously loaded exact grade option');
 assert.match(source,/if\(active!=='DFLT'\)/);
 assert.match(source,/NO_GO_NO_SINGLE_OFFICIAL_SCHOOL_RESULT/);
});
