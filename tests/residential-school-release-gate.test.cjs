'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const script=path.resolve(__dirname,'../scripts/verify-residential-school-release.cjs');
const districts=['FISD','PISD','AISD','LISD','PROSPER','CFB','043907'];
const verified=()=>({
 zip:'75001',officialFinderVerified:true,dashboardAddressResolved:true,
 elementaryMatch:true,middleMatch:true,highMatch:true,
 schoolClickVerified:true,polygonRendered:true,polygonCurrentYearVerified:true
});
const good=()=>{
 const districtsEvidence={};
 for(const code of districts){
  const a=verified(),b={...verified(),zip:'75002'},c={...verified(),zip:'75001'};
  districtsEvidence[code]=[a,b,c];
 }
 return {schemaVersion:1,productionCommit:'synthetic-reviewed-sha',reviewerApproved:true,districts:districtsEvidence};
};
function run(evidence){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'tx-school-release-'));
 const file=path.join(folder,'evidence.json');
 try{
  if(evidence!==undefined)fs.writeFileSync(file,JSON.stringify(evidence));
  const r=spawnSync(process.execPath,[script,file],{
   encoding:'utf8',env:{...process.env,GITHUB_SHA:'synthetic-reviewed-sha'}
  });
  assert.ok(r.stdout.includes('SCHOOL_RESIDENTIAL_RELEASE_GATE'),r.stderr);
  const line=r.stdout.split(/\r?\n/).find(x=>x.startsWith('SCHOOL_RESIDENTIAL_RELEASE_GATE '));
  return {status:r.status,report:JSON.parse(line.slice('SCHOOL_RESIDENTIAL_RELEASE_GATE '.length))};
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
}
test('a separately reviewed complete 7-district fixture can GO (only in this synthetic unit test)',()=>{
 const q=run(good());assert.equal(q.status,0);assert.equal(q.report.status,'GO');
});
test('no evidence is NO-GO for any real release',()=>{
 const q=run(undefined);assert.notEqual(q.status,0);
 assert.ok(q.report.blockers.includes('missing_reviewed_residential_e2e_evidence'));
});
test('stale review and same-ZIP samples are rejected',()=>{
 const data=good();data.districts.CFB[1].zip='75001';data.reviewerApproved=false;
 const q=run(data);assert.notEqual(q.status,0);
 assert.ok(q.report.blockers.includes('independent_review_missing'));
 assert.ok(q.report.blockers.includes('CFB:insufficient_zip_diversity'));
});
test('a single failed school-click or historical boundary blocks release',()=>{
 const data=good();data.districts.AISD[1].polygonCurrentYearVerified=false;
 data.districts.FISD[0].schoolClickVerified=false;
 const q=run(data);assert.notEqual(q.status,0);
 assert.ok(q.report.blockers.includes('AISD:unverified_residential_flow'));
 assert.ok(q.report.blockers.includes('FISD:unverified_residential_flow'));
});
test('evidence for another production commit is rejected',()=>{
 const data=good();data.productionCommit='old-release-sha';
 const q=run(data);assert.notEqual(q.status,0);
 assert.ok(q.report.blockers.includes('evidence_not_for_current_commit'));
});
