'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildCandidate,validateBox}=require('../scripts/build-cfb-finder-derived-cells.cjs');
const now=Date.now(),iso=new Date(now).toISOString();
const finder='https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/';
const bbox=[-96.9300,32.9400,-96.9290,32.9408];
const sourceSchool={
 elementary:{campusId:'057903001',campusName:'Example Elementary'},
 middle:{campusId:'057903002',campusName:'Example Middle'},
 high:{campusId:'057903003',campusName:'Example High'}
};
function dataset(){
 const locations=[
  ['SW',.10,.10,'training'],['NW',.10,.90,'training'],
  ['NE',.90,.90,'training'],['SE',.90,.10,'training'],
  ['CENTER',.50,.50,'training'],
  ['HO1',.16,.16,'holdout'],['HO2',.84,.84,'holdout'],
  ['HO3',.55,.55,'holdout']
 ];
 const samples=locations.map(([name,x,y,partition],i)=>({
  id:'public-sample-'+(i+1),cellId:'cfb-cell1',partition,
  verifiedBy:partition==='training'?'source-analyst':'independent-qa',
  lon:bbox[0]+(bbox[2]-bbox[0])*x,lat:bbox[1]+(bbox[3]-bbox[1])*y,
  addressKind:'public-listed-residential-base',unitAddressRecorded:false,
  lookupMethod:'native-official-autocomplete-assigned-schools',
  finder,checkedAt:iso,evidenceId:'EV-PUBLICSAMPLE'+(i+1),
  assignments:structuredClone(sourceSchool)
 }));
 return {schemaVersion:1,district:'CFB',schoolYear:'2026-2027',finder,
  permission:{status:'written-scope-approved',scope:'offline-public-residential-sampling-and-derived-map',
   evidenceUrl:'https://example.org/approved-permission-for-SYNTHETIC-test',reviewedAt:iso},
  cells:[{id:'cfb-cell1',bbox:[...bbox]}],samples};
}
test('8 independent, geographically distributed public-residential sample proofs make only 3 local NOT-official candidate patches',()=>{
 const out=buildCandidate(dataset(),{now});
 assert.equal(out.coverage.referenceCells,1);
 assert.equal(out.coverage.schoolLevelPatches,3);
 assert.equal(out.coverage.districtWideCampusCoveragePercent,null);
 assert.equal(out.coverage.certifiedResidentialAssignmentPercent,null);
 assert.equal(out.publishable,false);
 assert.equal(out.reviewerApproved,false);
 assert.equal(out.manualIndependentApprovalRequired,true);
 const levels=new Set(out.features.map(f=>f.properties.level));
 assert.deepEqual(levels,new Set(['elementary','middle','high']));
 for(const f of out.features){
  assert.equal(f.geometry.type,'Polygon');
  assert.equal(f.geometry.coordinates[0].length,5);
  assert.deepEqual(f.geometry.coordinates[0][0],f.geometry.coordinates[0][4]);
  assert.equal(f.properties.provenance,'finder-derived-estimate');
  assert.equal(f.properties.current,false);
  assert.equal(f.properties.officialGIS,false);
  assert.equal(f.properties.reviewed,false);
  assert.equal(f.properties.trainingPublicResidentialCount,5);
  assert.equal(f.properties.independentHoldoutCount,3);
  assert.equal(f.properties.independentHoldoutMismatches,0);
  assert.match(f.properties.footnote,/추정선/);
 }
 const serialized=JSON.stringify(out);
 assert.ok(!serialized.includes('public-sample'));
 assert.ok(!serialized.includes('EV-PUBLICSAMPLE'));
 assert.ok(!serialized.includes('example.org'));
});
test('never generate polygons without independently reviewed written permission',()=>{
 const d=dataset();delete d.permission;assert.throws(()=>buildCandidate(d,{now}),/WRITTEN_PERMISSION_REQUIRED/);
});
test('any held-out campus mismatch blocks entire proposed cell',()=>{
 const d=dataset();d.samples[6].assignments.high.campusId='057903999';
 assert.throws(()=>buildCandidate(d,{now}),/CAMPUS_ASSIGNMENT_MISMATCH_high/);
});
test('five spatial training sectors and three independent holdouts are mandatory',()=>{
 const d=dataset();d.samples.splice(4,1);
 assert.throws(()=>buildCandidate(d,{now}),/INSUFFICIENT_SAMPLE_DENSITY|MISSING_5_WAY/);
 const other=dataset();other.samples[5].verifiedBy='source-analyst';
 assert.throws(()=>buildCandidate(other,{now}),/HOLDOUT_NOT_INDEPENDENT/);
});
test('school assignment is not accepted from nearby school, ZIP centroid or fake source',()=>{
 const d=dataset();d.samples[1].lookupMethod='nearest-school';
 assert.throws(()=>buildCandidate(d,{now}),/NOT_OFFICIAL_ASSIGNMENT/);
 const e=dataset();e.samples[0].finder='https://untrusted.invalid';
 assert.throws(()=>buildCandidate(e,{now}),/SAMPLE_SOURCE_STALE_OR_UNVERIFIED/);
});
test('private residences and address strings are disallowed in candidate evidence',()=>{
 const d=dataset();d.samples[0].address='123 Actual St';assert.throws(()=>buildCandidate(d,{now}),/SENSITIVE_FIELD_address/);
 const e=dataset();e.samples[0].unitAddressRecorded=true;
 assert.throws(()=>buildCandidate(e,{now}),/PRIVATE_OR_UNIT_ADDRESS/);
});
test('cells over 125 m, out-of-region cells and overlapping cells are rejected',()=>{
 assert.throws(()=>validateBox([-96.94,32.94,-96.90,32.945]),/CELL_OUTSIDE_20_TO_125/);
 assert.throws(()=>validateBox([-99,30,-98,31]),/OUTSIDE_CFB_REGION/);
 const d=dataset();d.cells.push({id:'cfb-cell2',bbox:[-96.9298,32.9402,-96.9289,32.9407]});
 assert.throws(()=>buildCandidate(d,{now}),/OVERLAPPING_UNVERIFIED_CELLS/);
});
test('stale source lookups fail rather than being counted as current assignment',()=>{
 const d=dataset();d.samples[2].checkedAt='2025-01-01T00:00:00.000Z';
 assert.throws(()=>buildCandidate(d,{now}),/SAMPLE_SOURCE_STALE_OR_UNVERIFIED/);
});

test('existing reviewer gate still rejects a geometrically supported but unapproved polygon',()=>{
 const fs=require('node:fs');
 const os=require('node:os');
 const path=require('node:path');
 const {spawnSync}=require('node:child_process');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cfb-review-'));
 try{
  const file=path.join(temp,'candidate.json');
  const out=buildCandidate(dataset(),{now});
  fs.writeFileSync(file,JSON.stringify(out));
  const cli=spawnSync(process.execPath,['scripts/validate-cfb-finder-derived-boundaries.cjs',file],
   {cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
  assert.notEqual(cli.status,0);
  assert.match(cli.stdout,/NO_GO/,'stderr: '+cli.stderr+' status: '+cli.status);
  assert.match(cli.stdout,/permission_or_review_missing|estimate_unreviewed/);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});
