'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {summarizeEmergencyAccess,validFacility}=require('../features/healthcare/access-core.js');
const data=JSON.parse(readFileSync(join(__dirname,'../data/healthcare/cms-dfw-hospitals-2026.json'),'utf8'));
const counties=['COLLIN','DALLAS','DENTON','TARRANT','ROCKWALL','ELLIS','JOHNSON','KAUFMAN','PARKER','WISE','HOOD','HUNT'];
test('Official CMS 12-county facility inventory integrity',()=>{
 assert.deepEqual(data.metadata.counties,counties);
 assert.equal(data.metadata.recordCount,104);
 assert.equal(data.metadata.emergencyFlagYesCount,87);
 assert.equal(data.metadata.emergencyFlagNoCount,17);
 assert.equal(data.metadata.geocodedCount,0);
 assert.equal(data.metadata.traumaVerifiedCount,0);
 assert.equal(data.metadata.uiIntegration,false);
 assert.equal(new Set(data.records.map(x=>x.cmsFacilityId)).size,104);
 assert.ok(data.records.every(x=>validFacility(x)&&x.state==='TX'&&counties.includes(x.county)));
 assert.equal(data.records.filter(x=>x.emergencyServices===true).length,87);
 assert.equal(data.records.filter(x=>x.emergencyServices===false).length,17);
 assert.ok(data.records.every(x=>x.coordinates===null&&x.traumaLevel===null&&x.edOpen24Hours===null));
 assert.ok(data.records.some(x=>/[A-Z]/.test(x.cmsFacilityId)));
});
test('Missing routing data returns unknown nearest ED, not invented drive times',()=>{
 const result=summarizeEmergencyAccess(data.records,{});
 assert.equal(result.nearestKnown,null);
 assert.equal(result.completeTravelTimeCoverage,false);
 assert.equal(result.facilitiesMissingTravelTime,87);
 assert.deepEqual(result.accessCountsLowerBound,{'15':0,'30':0});
});
test('Only explicitly supplied routing times are counted',()=>{
 const ed=data.records.filter(x=>x.emergencyServices===true).slice(0,3);
 const times={};
 times[ed[0].cmsFacilityId]=12.5;
 times[ed[1].cmsFacilityId]=27;
 times[ed[2].cmsFacilityId]=40;
 const r=summarizeEmergencyAccess(ed,times);
 assert.equal(r.nearestKnown.cmsFacilityId,ed[0].cmsFacilityId);
 assert.deepEqual(r.accessCountsLowerBound,{'15':1,'30':2});
 assert.equal(r.completeTravelTimeCoverage,true);
});
test('Partial routing coverage is marked incomplete',()=>{
 const ed=data.records.filter(x=>x.emergencyServices===true).slice(0,2);
 const t={[ed[0].cmsFacilityId]:13};
 const result=summarizeEmergencyAccess(ed,t);
 assert.equal(result.completeTravelTimeCoverage,false);
 assert.equal(result.facilitiesMissingTravelTime,1);
 assert.equal(result.accessCountsLowerBound['15'],1);
});
test('Reject invalid times, duplicate IDs and non-CMS records',()=>{
 const ed=data.records.filter(x=>x.emergencyServices===true)[0];
 assert.throws(()=>summarizeEmergencyAccess([ed],{[ed.cmsFacilityId]:-1}));
 assert.throws(()=>summarizeEmergencyAccess([ed,ed],{[ed.cmsFacilityId]:10}));
 assert.throws(()=>summarizeEmergencyAccess([{...ed,cmsFacilityId:'X'}],{}));
 assert.throws(()=>summarizeEmergencyAccess([ed],{},[15,15]));
});