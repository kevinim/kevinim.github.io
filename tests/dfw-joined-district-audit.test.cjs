'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {join}=require('../scripts/build-dfw-joined-district-audit.cjs');
const {audit,load}=require('../scripts/audit-dfw-district-integrity.cjs');
const {run:runCurrent}=require('../scripts/probe-dfw-official-links.cjs');
const {run:runStaged}=require('../scripts/probe-dfw-107-candidate-routes.cjs');
async function fixture(){
 const integrity=audit(load());
 return {integrity,current:await runCurrent(integrity),
  staged:await runStaged()};
}
test('joined 108 district statuses retain true main/staged source separation',async()=>{
 const x=await fixture();
 const r=join(x.integrity,x.current,x.staged);
 assert.equal(r.districts.length,108);
 assert.equal(r.summary.publicISDCampusRecords,1941);
 assert.equal(r.summary.registeredInMain,29);
 assert.equal(r.summary.registeredInUnmergedPr173,107);
 assert.equal(r.summary.independentAddressAssignmentRate,null);
 assert.equal(r.summary.releaseStatus,'NO_GO');
 assert.ok(r.districts.every(d=>d.goNoGo==='NO_GO'));
 assert.ok(r.districts.every(d=>d.officialFinderAvailability.mainHTTP));
 assert.equal(r.districts.filter(d=>d.officialFinderAvailability.unmergedPr173Candidate).length,107);
 assert.equal(r.districts.find(d=>d.code==='249904').officialFinderAvailability.unmergedPr173Candidate,null);
});
test('unmerged PR173 Finder 2xx cannot become enrollment certification',async()=>{
 const x=await fixture();
 x.staged.records.find(d=>d.code==='043901').status='HTTP_RESPONDED_FINDER_NOT_TESTED';
 const r=join(x.integrity,x.current,x.staged);
 const allen=r.districts.find(d=>d.code==='043901');
 assert.equal(allen.officialFinderAvailability.unmergedPr173Candidate.actualAddressSearchCertified,false);
 assert.equal(allen.assignmentVerification.certifiedRealResidentialSamples,0);
 assert.ok(allen.independentQAReasons.includes('P0_CURRENT_RESIDENTIAL_ASSIGNMENT_UNVERIFIED'));
});
test('broken and redirected URLs have distinct priority reasons in joined QA rows',async()=>{
 const x=await fixture();
 x.staged.records.find(d=>d.code==='070908').status='HTTP_NOT_FOUND_REVIEW';
 x.staged.records.find(d=>d.code==='043904').status='REDIRECT_REQUIRES_REVIEW';
 const r=join(x.integrity,x.current,x.staged);
 assert.ok(r.districts.find(d=>d.code==='070908').independentQAReasons.includes('P1_REGISTERED_LINK_HTTP_FAILURE'));
 assert.ok(r.districts.find(d=>d.code==='043904').independentQAReasons.includes('P2_REGISTERED_LINK_HTTP_REVIEW'));
});
test('missing or duplicate district rows fail before any integrated output is constructed',async()=>{
 const x=await fixture();
 x.current.records.pop();
 assert.throws(()=>join(x.integrity,x.current,x.staged),/MISSING_OR_UNSAFE_AUDIT_INPUT/);
 const y=await fixture();y.staged.records[0].code=y.staged.records[1].code;
 assert.throws(()=>join(y.integrity,y.current,y.staged),/DUPLICATE_STAGED/);
});
