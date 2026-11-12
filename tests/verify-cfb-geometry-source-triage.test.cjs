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
 assert.equal(result.officialRequestStatus,'sent-awaiting-response',
  'Nov 9 Sent mailbox evidence must not be downgraded to an unsent draft');
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

test('a sent email is not the same thing as receiving an acknowledgement or a licensed GIS file',()=>{
 const x=copy(data);
 assert.equal(x.officialRequest.sentOn,'2026-11-09');
 assert.equal(x.officialRequest.publicReceiptAvailable,false);
 assert.equal(x.officialRequest.receivedResponseAsOf,'not-observed-in-connected-inbox-search-2026-11-12');
 assert.ok(!Object.hasOwn(x.officialRequest,'receiptUrl'));
 assert.ok(!Object.hasOwn(x.officialRequest,'threadId'));
 assert.ok(!Object.hasOwn(x.officialRequest,'messageId'));
 assert.equal(inspect(x).status,'NO_VERIFIED_CAMPUS_GIS');
 const forged=copy(x);
 forged.officialRequest.publicReceiptAvailable=true;
 assert.ok(inspect(forged).errors.includes('request_status_missing_or_unsubstantiated'));
 const fakeSent=copy(x);
 fakeSent.officialRequest.sentEvidence='not-reviewed';
 assert.ok(inspect(fakeSent).errors.includes('request_status_missing_or_unsubstantiated'));
 const personal=copy(x);
 personal.officialRequest.threadId='private-id-must-not-be-public';
 assert.ok(inspect(personal).errors.includes('private_mail_identifiers_must_not_enter_public_repo'));
 const falseSubmitted=copy(x);
 falseSubmitted.officialRequest.status='submitted';
 assert.ok(inspect(falseSubmitted).errors.includes('request_status_missing_or_unsubstantiated'));
 const spoof=copy(x);
 spoof.officialRequest.status='submitted';
 spoof.officialRequest.receiptUrl='https://www.cfbisd.edu.attacker.invalid/request-confirmed';
 assert.ok(inspect(spoof).errors.includes('request_status_missing_or_unsubstantiated'));
 const credentials=copy(x);
 credentials.officialRequest.status='submitted';
 credentials.officialRequest.receiptUrl='https://somebody@www.cfbisd.edu/receipt';
 assert.ok(inspect(credentials).errors.includes('request_status_missing_or_unsubstantiated'));
});
