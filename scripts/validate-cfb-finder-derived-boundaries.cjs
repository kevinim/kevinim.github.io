'use strict';
const fs=require('node:fs');
const path=require('node:path');
const file=process.argv[2]||'data/cfb-finder-derived-boundaries.json';
const errors=[];
let data;
try{data=JSON.parse(fs.readFileSync(path.resolve(file),'utf8')))}
catch{console.log('CFB_ESTIMATE_GATE '+JSON.stringify({status:'NO_GO',errors:['reviewed_dataset_missing']}));process.exit(1)}
if(data.schemaVersion!==1||data.district!=='CFB')errors.push('invalid_dataset');
if(data.sourceType!=='official-finder-derived-estimate')errors.push('provenance_missing');
if(!data.finderTermsReviewed||!data.reviewerApproved)errors.push('permission_or_review_missing');
if(!/^20\\d{2}-20\\d{2}$/.test(data.schoolYear||''))errors.push('year_missing');
if(!Array.isArray(data.features)||!data.features.length)errors.push('no_features');
for(const [i,f] of (data.features||[]).entries()){
 const p=f.properties||{},g=f.geometry||{};
 if(!['elementary','middle','high'].includes(p.level)||!p.campusId||!p.campusName)errors.push(i+':school_identity');
 if(p.provenance!=='finder-derived-estimate'||p.reviewed!==true)errors.push(i+':estimate_unreviewed');
 if(!Number.isInteger(p.independentHoldoutCount)||p.independentHoldoutCount<3||p.independentHoldoutMismatches!==0)errors.push(i+':independent_holdout_failed');
 if(!p.uncertaintyDocumented||!p.sourceCheckedAt)errors.push(i+':uncertainty_or_source_missing');
 if(!['Polygon','MultiPolygon'].includes(g.type)||!Array.isArray(g.coordinates)||!g.coordinates.length)errors.push(i+':invalid_geometry');
}
console.log('CFB_ESTIMATE_GATE '+JSON.stringify({status:errors.length?'NO_GO':'REVIEW_READY',errors}));
if(errors.length)process.exitCode=1;
