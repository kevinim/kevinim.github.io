'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {joinRuntime}=require('../scripts/merge-dfw-school-coverage-runtime.cjs');
const matrix={
 schemaVersion:1,generatedOn:'2026-11-09',
 geographicDefinition:{counties:['COLLIN','DALLAS']},
 districts:[
  {code:'043905',name:'FRISCO ISD',countyOfRecord:'COLLIN',teaCampusRecords:76,priority:'P2',
   sourceDistrictAliases:['FISD'],parentGuidance:{registryKey:'FISD'},geometry:{referenceMatchedMinimum:73}},
  {code:'057903',name:'CFB ISD',countyOfRecord:'DALLAS',teaCampusRecords:35,priority:'P1',
   sourceDistrictAliases:['CFB'],parentGuidance:{registryKey:'CFB'},geometry:{referenceMatchedMinimum:0}},
  {code:'220905',name:'FORT WORTH ISD',countyOfRecord:'TARRANT',teaCampusRecords:134,priority:'P0',
   sourceDistrictAliases:['220905'],parentGuidance:{registryKey:null},geometry:{referenceMatchedMinimum:null}},
 ]
};
const row=(district,school,category)=>({district,school,category,type:'elementary',
 severity:category==='matched'?'linked':'missing-dashboard-data',sourceMode:'unclassified'});
const run=(schools,status='PASS_WITH_SOURCE_LIMITATIONS')=>({
 schools,status,runMode:'isolated-pr',byDistrict:{},coverage:{totalLoadedDirectory:schools.length}
});
test('canonical aliases, per-school missing reasons and not-loaded districts are distinguished',()=>{
 const r=joinRuntime(matrix,run([
  row('FISD','A','matched'),
  row('CFB','B','no-source-configured'),
  row('CFB','C','special-campus-no-standard-zone'),
  row('UNKNOWN','D','no-source-configured')]));
 assert.equal(r.aggregate.measuredDirectoryCampuses,3);
 assert.equal(r.aggregate.matched,1);
 assert.equal(r.aggregate.unmatched,2);
 assert.equal(r.aggregate.districtsWithAnyLoadedSchool,2);
 assert.equal(r.campusMissing.length,2);
 assert.ok(r.campusMissing.every(s=>s.districtCode==='057903'));
 assert.deepEqual(r.unknownOutsideScopeDistrictAliases,['UNKNOWN']);
 assert.equal(r.districts.find(x=>x.code==='220905').session.status,'NOT_LOADED_IN_BROWSER');
 assert.equal(r.districts.find(x=>x.code==='220905').session.matchRateLoadedPercent,null);
 assert.equal(r.districts.find(x=>x.code==='057903').session.missingReasonCounts['special-campus-no-standard-zone'],1);
});
test('failed external GIS source is INCONCLUSIVE and never zero-percent verified',()=>{
 const r=joinRuntime(matrix,run([row('FISD','Source Timeout','source-fetch-failed')],'INCONCLUSIVE_SOURCE_AVAILABILITY'));
 const district=r.districts.find(d=>d.code==='043905');
 assert.equal(district.session.matchRateLoadedPercent,null);
 assert.equal(district.session.sourceOutage,true);
 assert.equal(district.session.status,'INCONCLUSIVE_SOURCE_FAILURE');
 assert.equal(r.aggregate.districtsWithSourceFetchFailure,1);
});
test('bad payloads and ambiguous county district aliases fail',()=>{
 assert.throws(()=>joinRuntime(matrix,{schools:[],coverage:{}}),/invalid_runtime_linkage_join/);
 assert.throws(()=>joinRuntime(matrix,run([{district:'CFB',school:42,category:'matched'}])),/invalid_school_reason_record/);
 const dup=structuredClone(matrix);
 dup.districts[2].sourceDistrictAliases=['CFB'];
 assert.throws(()=>joinRuntime(dup,run([])),/conflicting_tea_code_alias/);
});
