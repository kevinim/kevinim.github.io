#!/usr/bin/env node
'use strict';
// Fail-closed production/family UAT school verification gate.
// No address data is stored here; only aggregate, independently reviewed evidence.
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const file=process.argv[2]||'artifacts/school-qa/residential-e2e-evidence.json';
const required=['FISD','PISD','AISD','LISD','PROSPER','CFB','043907'];
const blockers=[];
let evidence;
try{evidence=JSON.parse(fs.readFileSync(path.resolve(root,file),'utf8'));}
catch{blockers.push('missing_reviewed_residential_e2e_evidence');}
if(evidence){
 if(evidence.schemaVersion!==1)blockers.push('invalid_schema_version');
 if(evidence.productionCommit!==process.env.GITHUB_SHA && process.env.GITHUB_SHA)
  blockers.push('evidence_not_for_current_commit');
 if(evidence.reviewerApproved!==true)blockers.push('independent_review_missing');
 for(const district of required){
  const cases=evidence.districts?.[district];
  if(!Array.isArray(cases)||cases.length<3){
   blockers.push(district+':insufficient_independent_residential_samples');continue;
  }
  const zipCount=new Set(cases.map(c=>c.zip).filter(z=>/^\\d{5}$/.test(String(z)))).size;
  if(zipCount<2)blockers.push(district+':insufficient_zip_diversity');
  for(const c of cases){
   if(!c.officialFinderVerified||!c.dashboardAddressResolved||
      !c.elementaryMatch||!c.middleMatch||!c.highMatch||
      !c.schoolClickVerified||!c.polygonRendered||
      !c.polygonCurrentYearVerified)
    blockers.push(district+':unverified_residential_flow');
  }
 }
}
const status=blockers.length?'NO_GO':'GO';
console.log('SCHOOL_RESIDENTIAL_RELEASE_GATE '+JSON.stringify({status,blockers:[...new Set(blockers)]}));
if(blockers.length)process.exitCode=1;
