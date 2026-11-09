'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const f=JSON.parse(fs.readFileSync(path.join(ROOT,'tests/dfw-public-leasing-address-e2e-2026.json'),'utf8'));
const e2e=fs.readFileSync(path.join(ROOT,'scripts/test-dfw-public-leasing-multidistrict-browser.cjs'),'utf8');
test('six publicly sourced leasing-office addresses cover three new ISDs twice',()=>{
 assert.equal(f.schemaVersion,1);
 assert.equal(f.cases.length,6);
 const counts={};
 const ids=new Set(),addresses=new Set();
 for(const x of f.cases){
  assert.match(x.id,/^[a-z0-9-]+$/);
  assert.match(x.address,/^\d+ .+,\s*(McKinney|Plano|Lewisville),\s*TX\s*\d{5}$/);
  assert.match(x.source,/^https:\/\//);
  assert.match(x.finder,/^https:\/\//);
  assert.ok(x.note.length>=20);
  assert.equal(ids.has(x.id),false);ids.add(x.id);
  assert.equal(addresses.has(x.address.toLowerCase()),false);
  addresses.add(x.address.toLowerCase());
  counts[x.districtHint]=(counts[x.districtHint]||0)+1;
  assert.equal('schools' in x,false,'cannot seed an unreviewed school match');
  assert.equal('coordinates' in x,false,'no cached residential geocoder coordinates');
 }
 assert.deepEqual(counts,{'043907':2,PISD:2,LISD:2});
});
test('source lineage and 2026-27 Finder review is not falsely certified',()=>{
 assert.equal(f.releaseGate,'NO_GO');
 assert.equal(f.independentDistrictFinderUiVerified,false);
 assert.equal(f.officialGradeAssignmentsVerified,0);
 assert.match(f.scope,/NOT a validated apartment unit/);
 assert.match(e2e,/independentDistrictFinderUiVerified:false/);
 assert.match(e2e,/officialGradeMatchCount:0/);
 assert.match(e2e,/releaseGate:\{status:'NO_GO'/);
 assert.match(e2e,/geocoderMocked:false/);
 assert.match(e2e,/polygonOrSchoolMocked:false/);
});
test('real UI test verifies important lifecycle and fail-closed safeguards',()=>{
 for(const marker of ['#homeAddress','#homeSuggestions','#homeSearch','#homeClear',
  'getLayers().length','renderedPolygonFeatures','state.selectedSchool',
  'page.screenshot','inFlightCancelSafe','NO_PUBLIC_LEASING_OFFICE_EXACT_CANDIDATE',
  'unverified provenance must never paint polygons',
  'ESRI_GEOCODER_PUBLIC_STREET_NOT_EQUAL','ESRI_GEOCODER_POSTAL_MISMATCH'])
  assert.ok(e2e.includes(marker),'missing QA assertion '+marker);
 assert.ok(!/route\.fulfill\(|page\.route\(/.test(e2e),'network geocode/GIS must be real');
});
