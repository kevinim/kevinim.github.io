'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const quality=require('../denton-campus-point-quality.js');
const ref=require('../denton-official-zone-references.js');
const bridge=require('../features/denton-campus-marker-info.js');
const points=require('../data/denton-campus-public-points-2026.json');
const exceptions=require('../data/denton-eight-campus-coordinate-exceptions-2026.json');
const nces=require('../nces-locations-2024.json');
test('Denton 39 distinct 2026–27 PDF campus IDs are covered exactly by 31 double-source and 8 exceptions',()=>{
 const valid=quality.validate(points,new Map(nces.data.map(x=>[x.id,x])),ref.ROWS);
 assert.equal(valid.size,31);assert.equal(ref.ROWS.length,39);
 assert.equal(exceptions.exceptions.length,8);
 const exIds=new Set(exceptions.exceptions.map(x=>x.id));
 assert.equal(exIds.size,8);
 assert.deepEqual(new Set([...valid.keys(),...exIds]),new Set(ref.ROWS.map(x=>x.id)));
 for(const row of ref.ROWS)assert.ok(ref.lookup({district:'061901',type:row.level},row.id)?.url.endsWith('.pdf'));
});
test('Denton eight conflict statuses never silently approve current school coords or district GIS',()=>{
 assert.equal(exceptions.eightCurrentCampusCoordinatesVerified,false);
 assert.equal(exceptions.schoolAttendanceZonePolygonVerified,false);
 for(const e of exceptions.exceptions){
  assert.equal(e.currentLocationCoordinateApproved,false,e.id);
  assert.equal(e.currentAttendanceZoneApproved,false,e.id);
  assert.match(e.publicCampusAddress.street,/^[A-Za-z0-9 ]+/);
 }
 for(const e of exceptions.exceptions.filter(x=>x.currentYearOfficialPdfAddressDiscrepancy))
  assert.equal(e.currentYearOfficialPdfAddressDiscrepancy.status,'unresolved-no-coordinate-certification');
});
test('marker click lookup requires exact campus TEA ID and district, never nearest geometry',()=>{
 assert.equal(bridge.rowForSelected({district:'061901',id:'061901127'},null,ref).id,'061901127');
 assert.equal(bridge.rowForSelected({district:'057905',id:'061901127'},null,ref),null);
 assert.equal(bridge.rowForSelected({district:'061901',id:'061901999'},null,ref),null);
 assert.equal(bridge.rowForSelected({district:'061901',id:'061901120'},null,ref),null);
 assert.equal(bridge.rowForSelected({district:'061901',id:'061901127'},null,ref).level,'elementary');
});
test('the main dashboard does not gain fake current Denton polys, auto-assignment or duplicate NCES markers',()=>{
 const main=fs.readFileSync('dashboard-main.js','utf8');
 const html=fs.readFileSync('index.html','utf8');
 const bridgeSource=fs.readFileSync('features/denton-campus-marker-info.js','utf8');
 assert.match(html,/denton-campus-point-quality\.js\?v=1/);
 assert.match(html,/denton-campus-marker-info\.js\?v=1/);
 assert.match(bridgeSource,/DentonZonePdfReference/);
 assert.doesNotMatch(bridgeSource,/L\.geoJSON|state\.zoneData\[|schoolAssignmentFor\(/);
 assert.doesNotMatch(main,/denton-polygon-estimate/);
 assert.equal(require('../features/conditional-school-release.js').releaseSummary().currentYearResidentialDistrictApprovals,0);
});
