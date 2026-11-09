'use strict';
// Produces an address-free report for feature integration. Never grants release.
// The strict residential release gate remains the independent blocking job.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const rights=require('../data/finder-derived-source-rights-2026.json');
const sources=require('../data/cfb-geometry-source-triage-2026.json');
const {inspect}=require('./verify-cfb-geometry-source-triage.cjs');
function audit(){
 const sourceAudit=inspect(sources);
 const checker=spawnSync(process.execPath,['scripts/verify-residential-school-release.cjs'],{
  cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:process.env
 });
 const line=checker.stdout.split(/\r?\n/).find(s=>s.startsWith('SCHOOL_RESIDENTIAL_RELEASE_GATE '));
 if(!line)throw Error('strict_residential_release_gate_failed_to_report');
 const gate=JSON.parse(line.slice('SCHOOL_RESIDENTIAL_RELEASE_GATE '.length));
 if(checker.status===0||gate.status!=='NO_GO')throw Error('unexpected_school_release_pass_without_reviewed_evidence');
 return {schemaVersion:1,
  reportScope:'cross-pr-static-integration-no-personal-data',
  releaseDecision:'NO_GO',
  isDeploymentApproval:false,
  cfbStatus:sourceAudit.status,
  cfbCurrentPolygonVerified:sourceAudit.currentCampusGISValidated,
  cfbSourceRightsApproved:rights.districts.CFB.status==='approved',
  residentialEvidenceGate:gate.status,
  releaseBlockers:gate.blockers,
  note:'CI code compatibility passing never means residential assignment or current-year campus polygons have been independently validated.'};
}
if(require.main===module){
 try{
  const report=audit();
  const out=path.resolve('artifacts/school-integration/school-release-readiness.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log('SCHOOL_INTEGRATION_READINESS '+JSON.stringify(report));
 }catch(e){console.error('SCHOOL_INTEGRATION_AUDIT_FAILED '+e.message);process.exitCode=1;}
}
module.exports={audit};
