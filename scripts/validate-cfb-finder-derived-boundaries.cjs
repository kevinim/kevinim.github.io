'use strict';
// Publication candidate validation; source rights must be independently reviewed.
// This does NOT publish or approve any map boundary.
const fs=require('node:fs');
const path=require('node:path');
const RIGHTS=require('../data/finder-derived-source-rights-2026.json');
const LEVELS=new Set(['elementary','middle','high']);
function validate(data,rights=RIGHTS){
 const errors=[];
 if(data?.schemaVersion!==1||data?.district!=='CFB')errors.push('invalid_dataset');
 if(data?.sourceType!=='official-finder-derived-estimate')errors.push('provenance_missing');
 if(!/^20\d{2}-20\d{2}$/.test(data?.schoolYear||'')||
  Number((data?.schoolYear||'').slice(5))!==Number((data?.schoolYear||'').slice(0,4))+1)
  errors.push('year_missing_or_invalid');
 if(data?.demoOnly!==false||data?.publicationApproved===true)
  errors.push('demo_or_preapproved_publication_prohibited');
 const allowed=rights?.districts?.CFB;
 if(!allowed||allowed.status!=='approved'||
  allowed.approvedUses?.derivativeGeometry!==true||
  allowed.approvedUses?.publicRedistribution!==true||
  !/^https:\/\//.test(allowed.consentEvidenceUrl||'')||
  data?.sourceUrl!==allowed.finderUrl||
  data?.permissionEvidenceUrl!==allowed.consentEvidenceUrl)
  errors.push('district_derivative_rights_not_approved');
 if(data?.finderTermsReviewed!==true||data?.reviewerApproved!==true||
  !/^https:\/\//.test(data?.reviewEvidenceUrl||''))
  errors.push('independent_source_review_missing');
 if(!Array.isArray(data?.features)||!data.features.length)errors.push('no_features');
 const seen=new Set();
 for(const [i,f] of (data?.features||[]).entries()){
  const p=f?.properties||{},g=f?.geometry||{};
  const key=i+':';
  if(f?.type!=='Feature'||!LEVELS.has(p.gradeLevel)||!p.campusId||
    !p.school||p.schoolYear!==data.schoolYear||p.district!=='CFB')
   errors.push(key+'school_identity_year_mismatch');
  if(p.provenance!=='finder-derived-estimate'||p.reviewed!==true||
    p.publishable!==false)
   errors.push(key+'provenance_or_review_status_invalid');
  if(!Number.isInteger(p.independentHoldoutCount)||p.independentHoldoutCount<3||
    p.independentHoldoutMismatches!==0)
   errors.push(key+'independent_holdout_failed');
  if(p.uncertaintyDocumented!==true||!/^\d{4}-\d\d-\d\d/.test(p.sourceCheckedAt||''))
   errors.push(key+'uncertainty_or_source_missing');
  if(!['Polygon','MultiPolygon'].includes(g.type)||!Array.isArray(g.coordinates)||
    !g.coordinates.length)errors.push(key+'invalid_geometry');
  const id=p.gradeLevel+':'+p.campusId;
  if(seen.has(id))errors.push(key+'duplicate_campus_requires_topology_review');
  seen.add(id);
 }
 return {status:errors.length?'NO_GO':'CANDIDATE_REVIEW_ONLY',
  district:'CFB',verifiedCurrentYear:false,publicReleaseApproved:false,
  errors:[...new Set(errors)]};
}
function main(){
 let data;
 try{data=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]||'data/cfb-finder-derived-boundaries.json'),'utf8'))}
 catch{data=null}
 const result=validate(data);
 if(!data)result.errors.push('reviewed_dataset_missing');
 console.log('CFB_ESTIMATE_GATE '+JSON.stringify(result));
 if(result.errors.length)process.exitCode=1;
}
if(require.main===module)main();
module.exports={validate};
