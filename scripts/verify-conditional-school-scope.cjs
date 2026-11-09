#!/usr/bin/env node
'use strict';
// Non-deploy release-scope audit. Success means INFORMATIONAL-ONLY QA is
// enforceable; it does NOT authorize a Production deployment or enrollment.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const policy=require('../features/conditional-school-release.js');
const {spawnSync}=require('node:child_process');
const scopes=[
 'district-demographics-and-public-statistics',
 'school-campus-points-as-reference-only',
 'official-district-finder-outbound-links',
 'flood-weather-and-informational-risk-overlays'
];
function run(){
 const state=policy.releaseSummary();
 assert.equal(state.scope,'INFORMATIONAL_ONLY');
 assert.equal(state.automaticSchoolAssignment,'NO_GO');
 assert.equal(state.currentYearResidentialDistrictApprovals,0);
 assert.equal(state.externalPublicDeployment,'NOT_AUTHORIZED');
 const html=fs.readFileSync('index.html','utf8');
 const handler=fs.readFileSync('home-lookup-v2.js','utf8');
 const policyRef='./features/conditional-school-release.js?v=1';
 assert.ok(html.indexOf(policyRef)>=0,'page must load policy');
 assert.ok(html.indexOf(policyRef)<html.indexOf('./home-lookup-v2.js?v='),
   'policy must load before any home result rendering');
 assert.ok(handler.includes('home.assignment=window.ConditionalSchoolRelease?.apply(rawSchoolCandidate)'),
   'every rendered address assignment must be downgraded by conditional policy');
 assert.ok(handler.includes("status:'conditional-finder-only'"),
   'missing runtime policy must fail closed, not show unchecked GIS');
 const hardBlocker=['CFB','AISD','PISD','LISD','FISD','PROSPER','043907'].filter(d=>
   policy.decide({status:'current',district:d}).allowed);
 assert.deepEqual(hardBlocker,[],'Cannot allow address-derived automatic school assignment');
 const report={schemaVersion:1,mode:'CONDITIONAL_SCOPE_QA',
  scope:'INFORMATIONAL_ONLY',scopeQa:'PASS',schoolAutomaticAssignment:'NO_GO',
  broadPublicProduction:'NO_GO',allowlistedInformationTopics:scopes,
  districtAutoEnrollmentApprovals:0,
  evidence:'synthetic-and-static-source-only',realResidentialFinderConfirmed:false,
  productionDeployed:false,ownerMergeAuthorized:false};
 fs.mkdirSync('artifacts/release',{recursive:true});
 fs.writeFileSync('artifacts/release/conditional-scope.json',JSON.stringify(report,null,2)+'\n');
 console.log('CONDITIONAL_RELEASE_SCOPE '+JSON.stringify(report));
}
try{run();}catch(err){
 console.error('CONDITIONAL_RELEASE_SCOPE_FAIL '+(err.code||err.name||'Error'));
 process.exitCode=1;
}
