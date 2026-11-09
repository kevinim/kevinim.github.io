'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const fixture=require('./fixtures/finder-derived-synthetic.json');
const {build}=require('../scripts/finder-derived-estimate-engine.cjs');
const {classify}=require('../school-zone-ui.js');
const {validate}=require('../scripts/validate-cfb-finder-derived-boundaries.cjs');
const registry=require('../district-registry.js');
const rights=require('../data/finder-derived-source-rights-2026.json');
const {inspect:triage}=require('../scripts/verify-cfb-geometry-source-triage.cjs');
const sourceAudit=require('../data/cfb-geometry-source-triage-2026.json');
const repoRoot=path.resolve(__dirname,'..');
function gate(evidenceFile){
 const args=['scripts/verify-residential-school-release.cjs'];
 if(evidenceFile)args.push(evidenceFile);
 return spawnSync(process.execPath,args,{cwd:repoRoot,encoding:'utf8',env:{
  ...process.env,GITHUB_SHA:'integration-synthetic-test-commit'
 }});
}
test('CFB remains official-Finder only until campus polygons and consent are independently established',()=>{
 assert.equal(registry.DISTRICT_REGISTRY.CFB.zoneKey,null);
 assert.equal(registry.DISTRICT_REGISTRY.CFB.address,null);
 assert.equal(rights.districts.CFB.status,'not-cleared');
 assert.equal(triage(sourceAudit).status,'NO_VERIFIED_CAMPUS_GIS');
 assert.equal(classify({matchStatus:'no-district-polygon-source',
  sourceReady:true,officialUrl:registry.DISTRICT_REGISTRY.CFB.official,
  schoolType:'elementary'}).kind,'finder-only');
});
test('synthetic generator output cannot pass CFB publication gate by direct renaming',()=>{
 const generated=build(fixture);
 assert.equal(generated.metadata.demoOnly,true);
 assert.equal(generated.features.length,6);
 assert.equal(validate(generated).status,'NO_GO');
 assert.equal(generated.metadata.publicationApproved,false);
 assert.ok(generated.features.every(f=>!f.properties.publishable&&!f.properties.reviewed));
});
test('release approval cannot be substituted with passing data-engine or UI tests',()=>{
 const result=gate();
 assert.notEqual(result.status,0);
 assert.match(result.stdout,/SCHOOL_RESIDENTIAL_RELEASE_GATE/);
 assert.match(result.stdout,/"status":"NO_GO"/);
 assert.match(result.stdout,/missing_reviewed_residential_e2e_evidence/);
});
test('UI uses distinct labels for historical, estimated and official source types',()=>{
 const base={matchStatus:'matched',sourceReady:true,schoolType:'elementary'};
 assert.equal(classify({...base,displayMode:'official'}).kind,'current');
 assert.equal(classify({...base,displayMode:'historical'}).kind,'historical');
 assert.equal(classify({...base,displayMode:'finder-derived-reviewed'}).kind,'estimated');
 assert.equal(classify({...base,displayMode:'finder-derived-unreviewed'}).kind,'unverified');
});
test('other-isds do not silently inherit CFB school polygons or permissions',()=>{
 const x=JSON.parse(JSON.stringify(fixture));
 x.districtCode='OTHER_ISD';
 const generated=build(x);
 assert.equal(generated.metadata.district,'OTHER_ISD');
 assert.ok(generated.features.every(f=>f.properties.district==='OTHER_ISD'));
 assert.equal(rights.districts.OTHER_ISD,undefined);
});
