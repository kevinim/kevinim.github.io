'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('../features/prosper-official-address-response.js');
const original=JSON.parse(fs.readFileSync('prosper-attendance-2026.geojson','utf8'));
const input={street:'605 E 7th St',zip:'75078'}; // Public Prosper ISD headquarters; no residence/student records.
const payload=()=>({resultCode:200,exactAddressMatch:true,
 addresses:[{addressStreet:'605 E 7th St',addressZip:'75078',addressExact:true}],
 schools:[{schoolCode:'1',schoolName:'PROSPER HIGH'},
  {schoolCode:'42',schoolName:'REYNOLDS MIDDLE'},
  {schoolCode:'102',schoolName:'RUCKER ELEMENTARY'}]});
const copyZones=()=>structuredClone(original);
test('exact public official SearchAddress evidence joins three 2026–27 campus IDs without enrollment grant',()=>{
 const r=api.verify(input,payload(),original);
 assert.equal(r.status,'official-address-source-match');
 assert.equal(r.enrollmentCertified,false);
 assert.equal(r.independentResidentialHoldoutsCertified,false);
 assert.equal(r.schoolCount,3);
 assert.deepEqual(r.schools.map(s=>s.level),['elementary','middle','high']);
 assert.deepEqual(r.schools.map(s=>s.campusId),['043912102','043912042','043912001']);
});
test('only the official anonymous address endpoint and parameters are constructed',()=>{
 const u=new URL(api.requestUrl(input));
 assert.equal(u.origin,'https://www.infofinderi.com');
 assert.equal(u.pathname,'/ifi/ws/SearchRequest.asmx/SearchAddress');
 assert.deepEqual(Object.fromEntries(u.searchParams),
  {clientId:'PI5FFG7RYZ1',streetAddress:'605 E 7th St',zipCode:'75078',schoolId:'-1',gradeId:'-1'});
 assert.throws(()=>api.requestUrl({street:'<script>',zip:'75078'}));
 assert.throws(()=>api.requestUrl({street:'605 E 7th St',zip:'invalid'}));
});
test('provider must confirm ONE exact matching street and ZIP; suggestions are never approved',()=>{
 for(const [kind,change] of [
  ['not-exact',d=>{d.exactAddressMatch=false}],
  ['address-not-exact',d=>{d.addresses[0].addressExact=false}],
  ['multiple-exact',d=>{d.addresses.push({...d.addresses[0]})}],
  ['wrong-address',d=>{d.addresses[0].addressStreet='606 E 7th St'}],
  ['wrong-zip',d=>{d.addresses[0].addressZip='75009'}],
  ['missing-rows',d=>{d.addresses=[]}]
 ]){
  const p=payload();change(p);
  assert.equal(api.verify(input,p,original).status,'not-verified',kind);
 }
 assert.equal(api.verify({street:'605 E 7th St Apt 101',zip:'75078'},payload(),original).status,
  'not-verified','provider main-building match cannot certify a unit-specific request');
});
test('official response must return three distinct current-year code-resolved E/M/H campuses',()=>{
 for(const [kind,change] of [
  ['missing-middle',d=>{d.schools.splice(1,1)}],
  ['duplicate-middle',d=>{d.schools[1]=d.schools[0]}],
  ['unknown-code',d=>{d.schools[1].schoolCode='999'}],
  ['extra-choice-program',d=>{d.schools.push({schoolCode:'100',schoolName:'OPTIONAL PROGRAM'})}],
  ['empty-name',d=>{d.schools[0].schoolName=''}],
  ['source-error',d=>{d.resultCode=500}]
 ]){
  const p=payload();change(p);
  assert.equal(api.verify(input,p,original).status,'not-verified',kind);
 }
});
test('source-vintage, campus-ID and duplicated GIS identifiers cannot be silently upgraded',()=>{
 const changes=[
  j=>{j.metadata.currentYearConfirmed=false},
  j=>{j.metadata.sourceYear='2025–26'},
  j=>{j.features[0].properties.sourceYearConfirmed=false},
  j=>{j.features[0].properties.campusId='043911101'},
  j=>{j.features[0].properties.campusId='043912999'},
  j=>{j.features[1].properties.schoolCode=j.features[0].properties.schoolCode},
  j=>{j.features.pop()},
  j=>{j.metadata.sourceGroupNames[0]='2025-2026 ELEMENTARY SCHOOL'}
 ];
 for(const change of changes){const j=copyZones();change(j);
  assert.equal(api.verify(input,payload(),j).status,'not-verified');
 }
});
test('untrusted response HTML is data only and never creates an enrollment grant',()=>{
 const p=payload();p.schools[0].schoolName='<img src=x onerror=alert(1)>';
 const r=api.verify(input,p,original);
 assert.equal(r.status,'not-verified','active HTML markup is rejected by official-result adapter');
 assert.equal(r.enrollmentCertified,false);
});

test('published code cannot be paired with the name of another Prosper campus',()=>{
 const p=payload();
 p.schools[0].schoolName='ROCK HILL HIGH';
 assert.equal(api.verify(input,p,original).reason,'official-school-name-code-disagreement');
 const p2=payload();
 p2.schools[2].schoolName='LIGHT FARMS ELEMENTARY';
 assert.equal(api.verify(input,p2,original).reason,'official-school-name-code-disagreement');
});
test('source-compatible short names remain valid only if unique within a grade',()=>{
 const p=payload();
 p.schools[0].schoolName='PROSPER HS';
 p.schools[1].schoolName='REYNOLDS MIDDLE SCHOOL';
 p.schools[2].schoolName='RUCKER EL';
 assert.equal(api.verify(input,p,original).status,'official-address-source-match');
 p.schools[2].schoolName='ELEMENTARY SCHOOL';
 assert.equal(api.verify(input,p,original).reason,'official-school-name-code-disagreement');
});
