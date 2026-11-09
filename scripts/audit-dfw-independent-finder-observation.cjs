#!/usr/bin/env node
'use strict';
// Reconcile two independently exercised browser surfaces at the same public
// apartment-complex street address. Never promote this to family enrollment approval.
const fs=require('node:fs'),path=require('node:path');
const {compareIndependentOfficialUI}=require('./dfw-finder-observation.cjs');
const root=path.resolve(__dirname,'..');
const OUT=path.join(root,'artifacts/dfw-official-finder-ui-probe');
const read=name=>JSON.parse(fs.readFileSync(name,'utf8'));
const raw=read(path.join(root,'artifacts/dfw-public-leasing-address-qa/multidistrict-evidence.json'));
const official=read(path.join(OUT,'official-address-ui-attempts.json'));
const fixture=read(path.join(root,'tests/dfw-public-leasing-address-e2e-2026.json'));
const rows=[];
for(const sample of fixture.cases){
 const dashboard=raw.rows.find(x=>x.id===sample.id&&x.viewport===1366&&x.sequence===1)||
  raw.rows.find(x=>x.id===sample.id&&x.viewport===1366&&x.map);
 const found=official.checks.find(x=>x.id===sample.id);
 const comparison=compareIndependentOfficialUI(dashboard,found);
 rows.push({id:sample.id,district:sample.districtHint,complexName:sample.complexName,
  publiclyAdvertisedAddress:true,unitRequiredByDefault:false,
  mapTechnicalStatus:dashboard?.technicalStatus||'MISSING',
  officialBrowserStatus:found?.status||'MISSING',
  gradeComparison:comparison,sourceYearReview:dashboard?.sourceYearReview||null});
}
const summary={
 schemaVersion:1,asOf:fixture.asOf,headSha:process.env.GITHUB_SHA||'local',
 officialFinderUiCases:rows.length,
 currentYearFinderAndMapCorroborated:rows.filter(x=>x.gradeComparison.status==='OFFICIAL_UI_AND_DASHBOARD_CURRENT_GIS_CORROBORATED').length,
 schoolNamesMatchButMapVintageNeedsReview:rows.filter(x=>x.gradeComparison.status==='SCHOOLS_MATCH_BUT_GIS_YEAR_NOT_CERTIFIED').length,
 schoolNameMismatches:rows.filter(x=>x.gradeComparison.status==='OFFICIAL_FINDER_DASHBOARD_SCHOOL_MISMATCH').length,
 officialFinderUiUnverified:rows.filter(x=>!['OFFICIAL_UI_AND_DASHBOARD_CURRENT_GIS_CORROBORATED','SCHOOLS_MATCH_BUT_GIS_YEAR_NOT_CERTIFIED','OFFICIAL_FINDER_DASHBOARD_SCHOOL_MISMATCH'].includes(x.gradeComparison.status)).length,
 sevenIsdIndependentResidentialGateCompleted:false,
 productionApproved:false,releaseGate:'NO_GO',
 rows
};
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'official-finder-vs-dashboard-matrix.json'),JSON.stringify(summary,null,2)+'\n');
console.log('AGENT03_OFFICIAL_FINDER_MATRIX '+JSON.stringify({
 currentYearCorroborated:summary.currentYearFinderAndMapCorroborated,
 yearReview:summary.schoolNamesMatchButMapVintageNeedsReview,
 mismatch:summary.schoolNameMismatches,
 unverified:summary.officialFinderUiUnverified,releaseGate:summary.releaseGate,
 perAddress:rows.map(x=>({id:x.id,status:x.gradeComparison.status,distanceMeters:x.gradeComparison.geocodeToLocatorMapCenterMeters}))}));
if(rows.length!==6||rows.some(x=>x.mapTechnicalStatus==='MISSING'||x.officialBrowserStatus==='MISSING'))process.exitCode=1;
if(summary.releaseGate!=='NO_GO'||summary.productionApproved)process.exitCode=1;
