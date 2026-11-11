'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.join(__dirname,'..'),fixture=JSON.parse(fs.readFileSync(path.join(ROOT,'data/carrollton-three-isd-boundaries-2025.geojson'),'utf8'));
const mod=require('../features/cfb-district-jurisdiction.js');
test('Texas Legislative Council official CFB/LISD/Dallas school DISTRICT polygons have exact provenance, never campus zones',()=>{
 assert.ok(mod.validate(fixture));
 assert.equal(fixture.features.length,3);
 assert.deepEqual(fixture.features.map(f=>f.properties.districtCode).sort(),['057903','057905','061902']);
 assert.equal(fixture.metadata.sourceYear,'2025-26');
 assert.equal(fixture.metadata.notSchoolAttendanceZones,true);
 assert.equal(fixture.metadata.maxAllowableOffsetDegrees,0.0001);
 for(const f of fixture.features){
  assert.equal(f.properties.isSchoolAttendanceZone,false);
  assert.equal(f.properties.level,'school_district_jurisdiction');
  assert.equal(f.properties.sourceSchoolYear,'2025-26');
  assert.ok(!('assignedElementary' in f.properties));
  assert.ok(!('school' in f.properties));
 }
});
test('same-city samples resolve three actual SCHOOL DISTRICTS rather than city or ZIP guess',()=>{
 const cases=[
  [[32.956574,-96.89425],'CFB'], // Carrollton Elementary public school campus NCES
  [[32.945606,-96.874612],'CFB'], // McLaughlin Strickland campus
  [[33.06,-96.91],'LISD'],        // northern Carrollton geographic reference
  [[33.052,-96.855],'LISD'],      // northern Carrollton geographic reference
  [[32.7801,-96.8002],'057905']  // central Dallas geographic reference
 ];
 for(const [ll,expected] of cases){
  const r=mod.pointLookup(fixture,ll);
  assert.equal(r.district,expected,JSON.stringify({ll,r}));
  assert.equal(r.isSchoolAttendanceZone,false);
  assert.equal(r.isResidentialAssignment,false);
  assert.equal(r.sourceYear,'2025-26');
 }
});
test('fake or malformed data cannot enable apartment or school assignments',()=>{
 assert.equal(mod.validate({...fixture,metadata:{sourceYear:'2026-27',notSchoolAttendanceZones:false}}),null);
 assert.equal(mod.validate({...fixture,features:fixture.features.slice(1)}),null);
 assert.equal(mod.validate({...fixture,features:fixture.features.map((f,i)=>i?f:{...f,properties:{...f.properties,isSchoolAttendanceZone:true}})}),null);
 assert.equal(mod.pointLookup(null,[33.06,-96.91]).status,'unavailable');
 assert.equal(mod.pointLookup(fixture,[40,-74]).status,'outside-scope');
 assert.equal(mod.pointLookup(fixture,[-1,-1]).status,'outside-scope');
 assert.equal(mod.pointLookup(fixture,['33',-96.9]).status,'unavailable');
});
test('near publisher-simplified zone border is an ambiguous candidate, not an ISD guarantee',()=>{
 const f=fixture.features.find(f=>f.properties.districtCode==='057903');
 const vertex=f.geometry.coordinates[0][0];
 const r=mod.pointLookup(fixture,[vertex[1],vertex[0]]);
 assert.notEqual(r.status,'district-reference');
 assert.ok(['outside-three-isd','boundary-review','conflict'].includes(r.status),r.status);
 assert.equal(mod.MIN_SAFE_BOUNDARY_METERS,250);
});
test('source-only atlas does not alter residential or campus release flags or store searched home addresses',()=>{
 const src=fs.readFileSync(path.join(ROOT,'features/cfb-district-jurisdiction.js'),'utf8');
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 assert.match(html,/features\/cfb-district-jurisdiction\.js\?v=1/);
 assert.doesNotMatch(src,/localStorage|sessionStorage|cookie|APPROVED_AUTO_DISTRICTS|schoolAssignmentFor\(/);
 assert.equal(require('../features/conditional-school-release.js').releaseSummary().currentYearResidentialDistrictApprovals,0);
});
