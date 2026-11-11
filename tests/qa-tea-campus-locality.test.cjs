'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const inventory=require('../tea-ratings-2026.json').data;
const ledger=require('../qa/evidence/tea-dfw-locality-exceptions-20261111.json');
const {assessedLocality}=require('../qa/tea-campus-locality-evidence.cjs');
const byId=new Map(inventory.map(x=>[x.id,x]));
test('TEA inventory district-county must NOT be used as physical campus location',()=>{
  const network=inventory.filter(x=>x.id.startsWith('061806'));
  assert.equal(network.length,41);
  assert.equal(network.every(x=>x.districtCounty==='DENTON'),true);
  const sanJuan=byId.get('061806015');
  assert.equal(sanJuan.officialName,'TEXASWORKS - SAN JUAN');
  assert.equal(sanJuan.address,'');
  const d=assessedLocality(sanJuan);
  assert.deepEqual([d.status,d.locationDisplayEligible,d.homeAssignmentVerified],['out-of-dfw',false,false]);
  assert.match(ledger.campuses['061806015'].operatorAddress,/San Juan, TX 78589/);
});
test('local Mesquite campus is geographically distinct from same district San Juan; neither is a household assignment',()=>{
  const mesquite=assessedLocality(byId.get('061806021'));
  assert.deepEqual([mesquite.status,mesquite.locationDisplayEligible,mesquite.homeAssignmentVerified],['verified-dfw-location',true,false]);
  assert.match(ledger.campuses['061806021'].operatorAddress,/Mesquite, TX 75150/);
});
test('unreviewed statewide same-district campus is unknown, not assumed DFW or assigned',()=>{
  const unreviewed=assessedLocality(byId.get('061806001'));
  assert.deepEqual([unreviewed.status,unreviewed.locationDisplayEligible,unreviewed.homeAssignmentVerified],['not-assessed',false,false]);
  const otherDistrict=assessedLocality(byId.get('043901001'));
  assert.equal(otherDistrict.status,'not-assessed');
  assert.equal(otherDistrict.homeAssignmentVerified,false);
  assert.equal(assessedLocality({id:'not-a-campus'}).locationDisplayEligible,false);
});
test('malicious or identity-drifted evidence cannot create a verified DFW locality',()=>{
  const nameTamper={...byId.get('061806021'),officialName:'WRONG CAMPUS'};
  assert.equal(assessedLocality(nameTamper).locationDisplayEligible,false);
  const countyTamper={...byId.get('061806021'),districtCounty:'DALLAS'};
  assert.equal(assessedLocality(countyTamper).locationDisplayEligible,false);
  const evil=structuredClone(ledger);
  evil.campuses['061806021'].sourceURLs[1]='https://texasworks.com.bad.example/campuses';
  assert.equal(assessedLocality(byId.get('061806021'),evil).locationDisplayEligible,false);
  const forged=structuredClone(ledger);
  forged.campuses['061806021'].notEvidenceOfAssignedSchool=false;
  assert.equal(assessedLocality(byId.get('061806021'),forged).locationDisplayEligible,false);
});
