'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {audit,load,validPoint} = require('../scripts/audit-dfw-district-integrity.cjs');
const fresh = () => load();

test('108 public ISDs and every TEA campus are reconciled without a false GO', () => {
 const r = audit(fresh()), s = r.summary;
 assert.equal(r.technicalAudit,'PASS_WITH_UNVERIFIED_SOURCES',r.errors.join('\n'));
 assert.equal(s.teaSourceRows,2282);
 assert.equal(s.dfwTeaRows,2182);
 assert.equal(s.publicISDs,108);
 assert.equal(s.otherTEALeas,44);
 assert.equal(s.publicISDCampusRecords,1941);
 assert.equal(s.matchedHistoricalPoints,1935);
 assert.equal(s.missingHistoricalPoints,6);
 assert.equal(s.invalidHistoricalPoints,0);
 assert.equal(s.releaseStatus,'NO_GO');
 assert.equal(r.districts.length,108);
 assert.equal(r.campusRecords.length,1941);
 assert.ok(r.districts.every(d=>d.disposition==='NO_GO'));
 assert.ok(r.campusRecords.every(s=>s.disposition==='NO_GO'));
 assert.equal(s.perCampusCurrentYearGISMatchRate,null);
 assert.equal(s.actualResidentialSchoolAssignmentRate,null);
});

test('no campus disappears, no TEA-ID duplicates, and district-school census agrees', () => {
 const d = fresh();
 const initial = audit(d);
 assert.equal(new Set(initial.campusRecords.map(s=>s.id)).size,1941);
 d.tea.data.push({...d.tea.data.find(x=>x.id==='043901001')});
 const r = audit(d);
 assert.equal(r.technicalAudit,'FAIL');
 assert.match(r.errors.join('|'),/DUPLICATE_TEA_ID_043901001/);
 assert.match(r.errors.join('|'),/MATRIX_TEA_CENSUS_MISMATCH|MISSING_OR_EXTRA_CAMPUS/);
});

test('removing one TEA school without updating source census fails closed', () => {
 const d = fresh();
 d.tea.data=d.tea.data.filter(x=>x.id!=='043901001');
 assert.match(audit(d).errors.join('|'),/MATRIX_TEA_CENSUS_MISMATCH|MISSING_OR_EXTRA_CAMPUS_043901/);
});

test('Allen campus point disappearance and source-wide point loss fail regression', () => {
 const d = fresh();
 d.nces.data=d.nces.data.filter(x=>!x.id.startsWith('043901'));
 const r=audit(d);
 assert.equal(r.technicalAudit,'FAIL');
 assert.match(r.errors.join('|'),/ALLEN_CAMPUS_POINT_DISAPPEARANCE/);
 assert.match(r.errors.join('|'),/DFW_CAMPUS_POINT_REGRESSION/);
});

test('coordinate bounds and malformed historical points cannot be counted as verified',()=>{
 const d=fresh();
 const p=d.nces.data.find(x=>x.id==='043901001');
 p.ll=[-96.7,33.1]; // reversed lat/lon
 assert.equal(validPoint(p),false);
 const r=audit(d);
 const school=r.campusRecords.find(x=>x.id==='043901001');
 assert.equal(school.coordinate.status,'INVALID_HISTORICAL_POINT');
 assert.equal(school.coordinate.independentlyVerifiedCurrent,false);
 assert.ok(r.errors.some(x=>x.includes('DFW_CAMPUS_POINT_REGRESSION')));
});

test('missing GIS source and registered Finder must never certify a residential assignment',()=>{
 const r=audit(fresh());
 const cfb=r.districts.find(x=>x.code==='057903');
 assert.equal(cfb.gisAvailability.status,'NOT_CONFIGURED_IN_DASHBOARD');
 assert.equal(cfb.schoolToBoundaryLinkage.exactSchoolVerified,0);
 assert.equal(cfb.assignmentVerification.certifiedRealResidentialSamples,0);
 assert.equal(cfb.gisSchoolCoverage.exactTEACampusMatched,null);
 const frisco=r.districts.find(x=>x.code==='043905');
 assert.equal(frisco.gisAvailability.status,'CONFIGURED_IN_DASHBOARD');
 assert.equal(frisco.assignmentVerification.status,'NO_INDEPENDENT_FINDER_GRADE_YEAR_HOLDOUT');
 assert.equal(frisco.disposition,'NO_GO');
});

test('formal grade range remains unknown when only a local type hint is present',()=>{
 const r=audit(fresh());
 for (const c of r.campusRecords.slice(0,100)){
  assert.equal(c.gradeRange.min,null);
  assert.equal(c.gradeRange.max,null);
 }
 assert.equal(r.districts.reduce((n,d)=>n+d.gradeRangeVerification.verifiedCampusCount,0),0);
});

test('source URL mismatch and unverified denominator promotion fail',()=>{
 const d=fresh();
 const x=d.matrix.districts.find(v=>v.code==='043901');
 x.parentGuidance.officialUrl='https://example.invalid/';
 assert.match(audit(d).errors.join('|'),/UNTRUSTED_OR_UNMAPPED_OFFICIAL_URL_043901/);
 const e=fresh();
 e.matrix.summary.exactAddressAssignmentCoveragePercent=100;
 assert.match(audit(e).errors.join('|'),/UNVERIFIED_COVERAGE_MUST_BE_NULL/);
});

test('lifecycle exceptions cannot be silently called current year assignments',()=>{
 const r=audit(fresh());
 assert.ok(r.campusRecords.some(c=>c.lifecycle.status==='HISTORICAL_RECORD_RETIRED_OR_CHANGED'));
 assert.ok(r.campusRecords.filter(c=>c.lifecycle.status==='HISTORICAL_RECORD_RETIRED_OR_CHANGED')
   .every(c=>c.actualAddressAssignment.verified===false&&c.disposition==='NO_GO'));
});

test('all missing historical public ISD points are explicit named campus exceptions',()=>{
 const r=audit(fresh());
 const missing=r.campusRecords.filter(c=>c.coordinate.status==='NO_HISTORICAL_NCES_POINT');
 assert.equal(missing.length,6);
 assert.deepEqual(missing.map(c=>c.id).sort(),
  ['057907114','184908002','184909103','220902014','220905258','249902104'].sort());
 assert.equal(r.districts.reduce((n,d)=>n+d.exceptionIds.missingHistoricalPoints.length,0),6);
});
