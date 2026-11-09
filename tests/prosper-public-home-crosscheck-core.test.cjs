'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compare,precise}=require('../scripts/prosper-public-home-crosscheck-core.cjs');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const geo=JSON.parse(readFileSync(resolve(__dirname,'../prosper-attendance-2026.geojson'),'utf8'));
const archive=require('./public-address-finder-crosscheck-2026.json');
const home=archive.records.find(x=>x.district==='PROSPER'&&x.kind==='district-headquarters');
const candidate=()=>({address:home.address,score:100,location:{x:home.point[0],y:home.point[1]},
  attributes:{Addr_type:'PointAddress',Region:'TX',Postal:'75078'}});
const locator=()=>({resultCode:200,schools:Object.values(home.officialCodes).map(s=>({schoolCode:s}))});
const clone=o=>JSON.parse(JSON.stringify(o));
test('public district sample baseline: 2026-27 GIS 3 grade polygons corroborates official Infofinder codes',()=>{
 const v=compare({address:home.address,candidate:candidate(),locator:locator(),geojson:geo});
 assert.equal(v.status,'OFFICIAL_POINT_GIS_CORROBORATED',JSON.stringify(v.reasons));
 assert.deepEqual(v.reasons,[]);
 assert.deepEqual(Object.keys(v.geometryByGrade),['elementary','middle','high']);
 assert.equal(v.realResidentialEnrollmentVerified,false);
 assert.equal(v.independentVendorSource,false);
 assert.equal(v.releaseApproved,false);
});
test('geocode is not verified based on name or zip alone',()=>{
 for(const change of [
  {score:91},{attributes:{Region:'TX',Postal:'75078',Addr_type:'StreetAddress'}},
  {attributes:{Region:'OK',Postal:'75078',Addr_type:'PointAddress'}},
  {attributes:{Region:'TX',Postal:'75001',Addr_type:'PointAddress'}},
  {address:'606 E 7th St, Prosper, TX 75078'},
  {location:{x:0,y:0}}
 ]){
  const c={...candidate(),...change};
  assert.equal(precise(home.address,c),false,JSON.stringify(change));
 }
});
test('single school code drift from actual official Finder is hard mismatch',()=>{
 const l=locator();l.schools[0].schoolCode='999';
 const v=compare({address:home.address,candidate:candidate(),locator:l,geojson:geo});
 assert.ok(v.reasons.includes('OFFICIAL_GIS_SCHOOL_CODE_MISMATCH'));
});
test('not enough official grade-band assignments never passes',()=>{
 const l=locator();l.schools.pop();
 const v=compare({address:home.address,candidate:candidate(),locator:l,geojson:geo});
 assert.ok(v.reasons.includes('OFFICIAL_THREE_GRADES_NOT_UNIQUE'));
});
test('a changed GIS source year blocks current-year certification',()=>{
 const g=clone(geo);g.metadata.sourceYear='2025–26';
 const v=compare({address:home.address,candidate:candidate(),locator:locator(),geojson:g});
 assert.ok(v.reasons.includes('GIS_SOURCE_YEAR_OR_PROVENANCE_UNVERIFIED'));
});
test('one duplicate polygon produces a school-level overlap blocker',()=>{
 const g=clone(geo);g.features.push(clone(g.features.find(f=>f.properties.schoolCode===home.gisCodes.elementary)));
 g.metadata.recordCount=32;
 const v=compare({address:home.address,candidate:candidate(),locator:locator(),geojson:g});
 assert.ok(v.reasons.includes('GIS_ELEMENTARY_NOT_UNIQUE'));
 assert.notEqual(v.status,'OFFICIAL_POINT_GIS_CORROBORATED');
});
test('wrong year on a single school polygon requires review even when codes match',()=>{
 const g=clone(geo);
 const v0=compare({address:home.address,candidate:candidate(),locator:locator(),geojson:g});
 assert.equal(v0.reasons.length,0);
 const elementary=g.features.find(f=>f.properties.gradeLevel==='elementary'&&f.properties.schoolCode===home.gisCodes.elementary);
 elementary.properties.schoolYear='2025–26';
 const v=compare({address:home.address,candidate:candidate(),locator:locator(),geojson:g});
 assert.ok(v.reasons.includes('GIS_ELEMENTARY_YEAR_UNVERIFIED'));
});
test('a residential-looking city/ZIP with no actual district polygons is never assigned automatically',()=>{
 const c=candidate();c.location={x:-98.4,y:32.5};
 const v=compare({address:home.address,candidate:c,locator:locator(),geojson:geo});
 assert.notEqual(v.status,'OFFICIAL_POINT_GIS_CORROBORATED');
 assert.ok(v.reasons.includes('GIS_ELEMENTARY_NOT_UNIQUE'));
});
test('no external response is not proof of no school',()=>{
 const v=compare({address:home.address,candidate:candidate(),locator:null,geojson:geo});
 assert.ok(v.reasons.includes('OFFICIAL_LOCATOR_RESPONSE_INVALID'));
 assert.equal(v.realResidentialEnrollmentVerified,false);
});
