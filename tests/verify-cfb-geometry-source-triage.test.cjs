'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const data=require('../data/cfb-geometry-source-triage-2026.json');
const {inspect}=require('../scripts/verify-cfb-geometry-source-triage.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
test('confirmed CFB contractor mapping is not a public current campus GIS download',()=>{
 const result=inspect(data);
 assert.equal(result.status,'NO_VERIFIED_CAMPUS_GIS');
 assert.equal(result.currentCampusGISValidated,false);
 assert.equal(result.schoolAssignmentVerified,false);
 assert.equal(result.sourceCount,6);
 assert.deepEqual(result.errors,[]);
 assert.ok(result.pending.includes('dunaway-cfb-gis-project'));
});
test('do not confuse Houston Cypress-Fairbanks CFISD with Carrollton-Farmers Branch CFBISD',()=>{
 const x=copy(data);
 const bad=x.candidateSources.find(c=>c.id==='cypress-fairbanks-district');
 bad.disposition='verified-current-gis';
 assert.ok(inspect(x).errors.some(s=>s.includes('mandatory_rejection_missing')));
 assert.ok(inspect(x).errors.some(s=>s.includes('unsubstantiated_current_geometry_claim')));
});
test('ArcGIS esriGeometryPoint layer is not a campus zone polygon even if attribute mentions boundary',()=>{
 const x=copy(data);
 const item=x.candidateSources.find(c=>c.id==='arcgis-school-points');
 item.disposition='verified-current-gis';
 assert.ok(inspect(x).errors.some(s=>s.includes('mandatory_rejection_missing')));
});
test('cannot pretend draft public-record request has been submitted',()=>{
 const x=copy(data);x.officialRequest.status='submitted';
 assert.ok(inspect(x).errors.includes('request_status_missing_or_unsubstantiated'));
});
test('fee control and proper TPIA routing are mandatory',()=>{
 const x=copy(data);x.officialRequest.requestPolicy='pay anything';
 assert.ok(inspect(x).errors.includes('official_records_channel_or_fee_control_missing'));
});
test('GIS source must have present-year evidence and redistribution approval before proposed acceptance',()=>{
 const x=copy(data);
 const candidate=x.candidateSources.find(c=>c.id==='dunaway-cfb-gis-project');
 candidate.disposition='verified-current-gis';
 assert.ok(inspect(x).errors.some(s=>s.includes('unsubstantiated_current_geometry_claim')));
});
