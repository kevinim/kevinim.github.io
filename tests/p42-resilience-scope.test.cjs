'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {validateStateSnapshot,reliabilityContext}=require('../features/resilience/metric-scope.js');
const data=JSON.parse(readFileSync(join(__dirname,'../data/resilience/eia-texas-grid-reliability-2024-2025.json'),'utf8'));
const event=JSON.parse(readFileSync(join(__dirname,'../data/resilience/ercot-2021-regional-event.json'),'utf8'));
const sources=JSON.parse(readFileSync(join(__dirname,'../data/resilience/source-status-2026.json'),'utf8'));
test('EIA 2025/2024 Texas snapshot accurate and source-scoped',()=>{
 assert.ok(validateStateSnapshot(data));
 assert.deepEqual(data.records.map(r=>r.year),[2024,2025]);
 assert.equal(data.records[0].allEvents.saidi,1270.6);
 assert.equal(data.records[0].excludingMajorEvents.saidi,129.4);
 assert.equal(data.records[1].allEvents.saidi,223.5);
 assert.equal(data.records[1].excludingMajorEvents.saifi,1.287);
 assert.equal(data.metadata.geography,'TX_STATE_ONLY');
});
test('statewide data only shown at state scope, never local scores',()=>{
 const tx=reliabilityContext(data,{kind:'STATE',id:'TX'});
 assert.equal(tx.status,'STATEWIDE_CONTEXT_ONLY');
 assert.equal(tx.observations.length,2);
 assert.equal(tx.neighborhoodRiskScore,null);
 for(const scope of [{kind:'ZIP',id:'75013'},{kind:'ADDRESS',id:'unavailable'},{kind:'UTILITY',id:'UNKNOWN'},{kind:'CITY',id:'Allen'}]){
  const local=reliabilityContext(data,scope);
  assert.equal(local.status,'LOCAL_EVIDENCE_NOT_AVAILABLE');
  assert.deepEqual(local.observations,[]);
  assert.equal(local.neighborhoodRiskScore,null);
  assert.equal(local.localOutageDurationMinutes,null);
 }
});
test('2021 ERCOT history cannot be assigned to an address',()=>{
 assert.equal(event.metadata.scope,'ERCOT_REGIONAL_SYSTEM');
 assert.equal(event.metadata.canBeMappedToAddress,false);
 assert.equal(event.events[0].maxReportedLoadShedMW,10500);
 assert.equal(event.events[0].neighborhoodOutageMinutes,null);
 assert.equal(event.events[0].affectedDFWNeighborhoods,null);
});
test('FEMA winter tract hazards acquired while utility outage metrics remain unavailable',()=>{
 assert.equal(sources.noNeighborhoodScore,true);
 assert.equal(sources.noUnverifiedMap,true);
 assert.equal(sources.noUnverifiedAddressUtility,true);
 assert.equal(sources.dimensions.filter(x=>['cold_wave','ice_storm','winter_weather'].includes(x.key)&&x.state==='ACQUIRED_FEMA_TRACT_RISK_LAYER').length,3);
 assert.ok(sources.dimensions.filter(x=>['cold_wave','ice_storm','winter_weather'].includes(x.key)).every(x=>x.dataValue==='data/resilience/fema-nri-dfw-winter-2025.json'));
 assert.equal(sources.noUnverifiedAddressUtility,true);
 assert.ok(sources.dimensions.some(x=>x.key==='utility_reliability'&&x.dataValue===null));
});
test('incorrect geography and invalid metrics fail closed',()=>{
 assert.equal(validateStateSnapshot({...data,metadata:{...data.metadata,geography:'CENSUS_TRACT'}}),false);
 assert.equal(validateStateSnapshot({...data,records:[{...data.records[0],allEvents:{...data.records[0].allEvents,saidi:-20}},data.records[1]]}),false);
 assert.throws(()=>reliabilityContext(data,null));
});