'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {DATA_EXT, REVIEW_LANES, classifyReviewLane, validateRegistry, walkFiles, audit} =
  require('../scripts/audit-public-data-rights.cjs');

const base = () => ({schemaVersion:1, defaultDecision:'pending', assets:{}});
const approved = () => ({
  decision:'approved', publisher:'Synthetic publisher',
  licenseScope:'Synthetic redistribution of this fake test only',
  attribution:'Synthetic source',
  reviewer:'Synthetic reviewer',
  reviewedAt:'2026-11-21', retrievedAt:'2026-11-20',
  sourceUrl:'https://example.invalid/fake-synthetic-dataset',
  termsUrl:'https://example.invalid/fake-synthetic-license',
  dataVintage:'synthetic-2026', geographicScope:'synthetic region',
  permissionBasis:'publisher-license',
  permissions:{publicDisplay:true,redistribution:true,browserCaching:true,modification:false}
});
function fixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tx-rights-test-'));
  fs.mkdirSync(path.join(dir,'data'));
  fs.writeFileSync(path.join(dir,'index.html'),'<title>demo</title>');
  fs.writeFileSync(path.join(dir,'data','schools.json'),'{"schools":[]}');
  fs.writeFileSync(path.join(dir,'schools.json'),'{"records":[]}');
  try { return fn(dir); }
  finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
test('public JSON and GeoJSON and image assets are within review scope',()=>{
  for(const f of ['data/zones.geojson','schools.json','maps/map.svg','tiles/base.png','data/data.csv'])
    assert.equal(DATA_EXT.test(f),true,f);
  for(const f of ['index.html','dashboard-main.js','docs/internal.md'])
    assert.equal(DATA_EXT.test(f),false,f);
});
test('unknown assets default to pending, never implicit approval',()=>fixture(dir=>{
  const r=audit(dir,base());
  assert.equal(r.summary.status,'BLOCKED_RIGHTS_REVIEW_REQUIRED');
  assert.equal(r.summary.dataAndMediaAssetCount,2);
  assert.equal(r.summary.rightsDecisions.pending,2);
  assert.equal(r.summary.publicProductionApproved,false);
  assert.ok(!JSON.stringify(r.summary).includes('schools.json'));
  assert.ok(r.local.itemizedPaths.some(x=>x.path==='schools.json'));
}));
test('positive synthetic evidence may pass rights audit, still not authorize publishing',()=>fixture(dir=>{
  const rights=base();
  rights.assets['schools.json']=approved();
  rights.assets['data/schools.json']=approved();
  const r=audit(dir,rights);
  assert.equal(r.summary.status,'READY_FOR_ADDITIONAL_RELEASE_GATES');
  assert.equal(r.summary.rightsDecisions.approved,2);
  assert.equal(r.summary.publicProductionApproved,false);
}));
test('restricted or explicitly excluded assets block if physically present',()=>fixture(dir=>{
  const rights=base();
  rights.assets['schools.json']={decision:'excluded'};
  rights.assets['data/schools.json']={decision:'restricted'};
  const r=audit(dir,rights);
  assert.equal(r.summary.status,'BLOCKED_RIGHTS_REVIEW_REQUIRED');
  assert.equal(r.summary.rightsDecisions.excluded,1);
  assert.equal(r.summary.rightsDecisions.restricted,1);
}));
test('stale registry records cannot silently authorize unrelated files',()=>fixture(dir=>{
  const rights=base();
  rights.assets['data/not-shipped.json']=approved();
  const r=audit(dir,rights);
  assert.equal(r.summary.staleRegistryEntries,1);
  assert.equal(r.summary.status,'BLOCKED_RIGHTS_REVIEW_REQUIRED');
}));
test('approved decisions without source, reviewer or terms fail closed',()=>{
  for(const removed of ['publisher','licenseScope','attribution','reviewer','reviewedAt','retrievedAt',
                       'sourceUrl','termsUrl','dataVintage','geographicScope','permissionBasis','permissions']) {
    const rights=base(), rec=approved();
    delete rec[removed];
    rights.assets['schools.json']=rec;
    assert.throws(()=>validateRegistry(rights),/approved_asset_missing_review_evidence/);
  }
});
test('claimed approval without explicit public reuse rights fails closed',()=>{
  const invalid = [
    {permissions:{...approved().permissions,publicDisplay:false}},
    {permissions:{...approved().permissions,redistribution:false}},
    {permissions:{...approved().permissions,browserCaching:false}},
    {permissions:{...approved().permissions,modification:'unknown'}},
    {permissionBasis:'assumed-public-source'},
    {sourceUrl:'http://example.invalid/source'},
    {retrievedAt:'unknown'},
  ];
  for(const patch of invalid) {
    const rights=base();
    rights.assets['schools.json']={...approved(),...patch};
    assert.throws(()=>validateRegistry(rights),/approved_asset_missing_review_evidence/);
  }
});
test('rights approval rejects invalid calendar dates and reversed evidence chronology',()=>{
  const bad = [
    {reviewedAt:'2026-02-30'},
    {retrievedAt:'2026-13-01'},
    {reviewedAt:'2999-01-01'},
    {retrievedAt:'2026-11-22'}, // retrieved after the reviewed date
  ];
  for(const patch of bad) {
    const rights=base();
    rights.assets['schools.json']={...approved(),...patch};
    assert.throws(()=>validateRegistry(rights),/approved_asset_missing_review_evidence/);
  }
});
test('rights approval rejects malformed, credentialed or fragment-based source links',()=>{
  const bad = [
    {sourceUrl:'https:///'},
    {termsUrl:'https://user:token@example.invalid/terms'},
    {sourceUrl:'https://example.invalid/data#unverifiable-section'},
    {termsUrl:'https://bad host.invalid/terms'},
  ];
  for(const patch of bad) {
    const rights=base();
    rights.assets['schools.json']={...approved(),...patch};
    assert.throws(()=>validateRegistry(rights),/approved_asset_missing_review_evidence/);
  }
});
test('unsafe registry paths and invalid declarations are rejected',()=>{
  for(const name of ['../not-contained.json','data/../../outside.csv','data\\bad.json','docs/readme.md']) {
    const rights=base();
    rights.assets[name]={decision:'approved',...approved()};
    assert.throws(()=>validateRegistry(rights),/invalid_rights_registry_entry/);
  }
  assert.throws(()=>validateRegistry({schemaVersion:1,defaultDecision:'approved',assets:{}}),/invalid_rights_registry_schema/);
});
test('symlink in bundle fails rather than being followed',()=>fixture(dir=>{
  const target=path.join(dir,'schools.json');
  const alias=path.join(dir,'data','linked.json');
  fs.symlinkSync(target,alias);
  assert.throws(()=>walkFiles(dir),/unsafe_bundle_entry/);
}));
test('missing entry HTML fails, avoiding empty fake passing bundles',()=>fixture(dir=>{
  fs.rmSync(path.join(dir,'index.html'));
  assert.throws(()=>audit(dir,base()),/distribution_index_missing/);
}));

test('candidate review lanes are deterministic routing hints, not legal approval',()=>{
 const cases=[
  ['data/tea-campus-enrichment-2026.json','tea_education_candidate'],
  ['data/healthcare/cms-dfw-hospitals-2026.json','healthcare_candidate'],
  ['data/noaa-storm-events-dfw-2024-2025.json','climate_disaster_candidate'],
  ['data/cfb-approved-zone-raster-reference-2026.json','school_gis_candidate'],
  ['data/dfw-school-coverage-matrix-2026.json','school_gis_candidate'],
  ['data/zip-census-2024.json','area_demographics_candidate'],
  ['data/redfin-rental-results.json','housing_parcel_candidate'],
  ['data/unknown-asset.json','unclassified_needs_source_evidence']
 ];
 for(const [file,lane] of cases)assert.equal(classifyReviewLane(file),lane,file);
 assert.equal(new Set(cases.map(x=>x[1])).size,REVIEW_LANES.length);
});
test('review lanes partition all assets with no per-file paths in uploaded summary',()=>fixture(dir=>{
 const extra=[
  'data/tea-campus-enrichment-2026.json',
  'data/noaa-storm-events-dfw-2024-2025.json',
  'data/cfb-school-zones.geojson',
  'data/healthcare-cms-hospitals.json',
  'data/zip-census.json',
  'data/redfin-rental.json'
 ];
 for(const name of extra)fs.writeFileSync(path.join(dir,name),'{}');
 const report=audit(dir,base());
 const totals=Object.values(report.summary.reviewLaneCounts).reduce((a,b)=>a+b,0);
 const extensions=Object.values(report.summary.extensionCounts).reduce((a,b)=>a+b,0);
 assert.equal(totals,report.summary.dataAndMediaAssetCount);
 assert.equal(extensions,report.summary.dataAndMediaAssetCount);
 assert.equal(report.summary.status,'BLOCKED_RIGHTS_REVIEW_REQUIRED');
 assert.equal(report.summary.rightsDecisions.pending,report.summary.dataAndMediaAssetCount);
 assert.equal(report.summary.publicProductionApproved,false);
 assert.equal(report.summary.reviewLaneClassification,'FILENAME_HEURISTIC_ONLY_NOT_PUBLISHER_OR_LICENSE_EVIDENCE');
 for(const name of extra)assert.ok(!JSON.stringify(report.summary).includes(name),'CI summary must omit paths');
 assert.ok(report.local.itemizedPaths.every(item=>item.reviewLane&&item.extension&&
  item.publisherAndReuseRightsIndependentlyVerified===false));
}));
