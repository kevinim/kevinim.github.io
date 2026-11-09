'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {classify}=require('../school-zone-ui.js');
const {validate}=require('../scripts/validate-cfb-finder-derived-boundaries.cjs');
const RIGHTS=require('../data/finder-derived-source-rights-2026.json');
const base={matchStatus:'matched',sourceReady:true,schoolType:'elementary',
 officialUrl:'https://www.cfbisd.edu/students/school-maps-locator-system'};
const rights=JSON.parse(JSON.stringify(RIGHTS));
const candidate=()=>({schemaVersion:1,district:'CFB',schoolYear:'2026-2027',
 sourceType:'official-finder-derived-estimate',demoOnly:false,publicationApproved:false,
 sourceUrl:RIGHTS.districts.CFB.finderUrl,
 permissionEvidenceUrl:'https://example.org/synthetic-authorization',
 finderTermsReviewed:true,reviewerApproved:true,
 reviewEvidenceUrl:'https://example.org/synthetic-review',
 features:[{type:'Feature',
  properties:{district:'CFB',schoolYear:'2026-2027',
   gradeLevel:'elementary',school:'Synthetic Elementary',campusId:'demo_campus_001',
   provenance:'finder-derived-estimate',reviewed:true,publishable:false,
   independentHoldoutCount:3,independentHoldoutMismatches:0,
   uncertaintyDocumented:true,sourceCheckedAt:'2026-11-09'},
  geometry:{type:'Polygon',coordinates:[[[-96.93,32.94],[-96.929,32.94],[-96.929,32.941],[-96.93,32.94]]]}}
 ]});
test('reviewed estimate is labeled nonofficial, not an authoritative attendance zone',()=>{
 const x=classify({...base,displayMode:'finder-derived-reviewed'});
 assert.equal(x.kind,'estimated');
 assert.match(x.label,/추정/);
 assert.match(x.explanation,/공식 GIS가 아니며/);
});
test('unreviewed estimate is withheld from the map UI',()=>{
 const x=classify({...base,displayMode:'finder-derived-unreviewed'});
 assert.equal(x.kind,'unverified');
 assert.match(x.label,/표시 보류/);
});
test('missing campus polygon cannot be represented as a validated estimate',()=>{
 const x=classify({...base,matchStatus:'no-district-polygon-source',displayMode:'finder-derived-reviewed'});
 assert.equal(x.kind,'finder-only');
});
test('self-asserted Finder permission and reviewer flags do not bypass current CFB source-rights policy',()=>{
 const out=validate(candidate());
 assert.equal(out.status,'NO_GO');
 assert.ok(out.errors.includes('district_derivative_rights_not_approved'));
 assert.equal(out.publicReleaseApproved,false);
});
test('reference-year mismatch and review without holdouts are disallowed',()=>{
 const x=candidate();x.schoolYear='2025';x.features[0].properties.independentHoldoutCount=0;
 const out=validate(x);
 assert.equal(out.status,'NO_GO');
 assert.ok(out.errors.includes('year_missing_or_invalid'));
 assert.ok(out.errors.includes('0:independent_holdout_failed'));
});
test('even hypothetical permission review never automatically approves map publication',()=>{
 const fake=JSON.parse(JSON.stringify(rights));
 fake.districts.CFB.status='approved';
 fake.districts.CFB.approvedUses.derivativeGeometry=true;
 fake.districts.CFB.approvedUses.publicRedistribution=true;
 fake.districts.CFB.consentEvidenceUrl=candidate().permissionEvidenceUrl;
 const out=validate(candidate(),fake);
 assert.equal(out.status,'CANDIDATE_REVIEW_ONLY');
 assert.equal(out.publicReleaseApproved,false);
 assert.equal(out.verifiedCurrentYear,false);
});
test('synthetic generation artifacts remain ineligible for publication even with hypothetical permissions',()=>{
 const data=candidate();data.demoOnly=true;data.features[0].properties.reviewed=false;
 const fake=JSON.parse(JSON.stringify(rights));
 fake.districts.CFB.status='approved';fake.districts.CFB.approvedUses.derivativeGeometry=true;
 fake.districts.CFB.approvedUses.publicRedistribution=true;
 fake.districts.CFB.consentEvidenceUrl=data.permissionEvidenceUrl;
 const out=validate(data,fake);
 assert.equal(out.status,'NO_GO');
 assert.ok(out.errors.includes('demo_or_preapproved_publication_prohibited'));
});
