#!/usr/bin/env node
'use strict';
// Real publicly advertised residential buildings only, across distinct ZIPs.
// This gate is never a seven-district enrollment or public-deployment approval.
const fs=require('node:fs'),path=require('node:path');
const DIR='artifacts/public-residential-e2e';
const cases=[
 ['gaulding-prosper-public-lease','75078'],
 ['gilmer-mckinney-public-lease','75071'],
 ['prairiedog-mckinney-public-lease','75071'],
 ['lathrop-frisco-public-lease','75033']
];
const summary={checkedAt:new Date().toISOString(),district:'PROSPER',
 officialFinder:'https://www.prosper-isd.net/page/attendance-boundaries',
 officialLocatorService:'https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation',
 publicListingSampleCount:cases.length,cases:[],zipCodesPassed:[],
 currentYearZoneSourceReviewed:true,individualEnrollmentEligibilityConfirmed:false,
 allSevenDistrictResidentialRelease:'NO_GO'};
for(const [id,zip] of cases){
 const file=path.join(DIR,'report-'+id+'.json');
 if(!fs.existsSync(file)){summary.cases.push({id,zip,status:'MISSING_TEST_REPORT'});continue;}
 const j=JSON.parse(fs.readFileSync(file,'utf8'));
 const pass=j.localUIFlowVerified===true&&j.publicAddressFinderAgreement===true&&
   (j.mobileDesktopResults||[]).length===2&&j.mobileDesktopResults.every(w=>
     w.officialProsper?.sameThreeCodes&&w.homeFeatureShapeCount>=3&&w.clickedSchoolZonePolygons>0&&
     w.district==='PROSPER');
 summary.cases.push({id,zip,status:pass?'PASS_CURRENT_FINDER_CODE_AND_REAL_LEAFLET':'BLOCKED',
  widths:(j.mobileDesktopResults||[]).map(w=>w.width),
  sources:(j.mobileDesktopResults||[]).map(w=>({
    gisCodes:w.officialProsper?.gisCodes,officialCodes:w.officialProsper?.officialCodes,
    officialMatch:w.officialProsper?.sameThreeCodes,renderedPolygons:w.homeFeatureShapeCount,
    addressStatus:w.assignmentStatus,issues:w.issues,consoleErrors:w.consoleErrors
  }))});
}
const verified=summary.cases.filter(x=>x.status==='PASS_CURRENT_FINDER_CODE_AND_REAL_LEAFLET');
summary.verifiedPublicResidences=verified.length;
summary.zipCodesPassed=[...new Set(verified.map(x=>x.zip))].sort();
summary.sampleGate=verified.length>=3&&summary.zipCodesPassed.length>=2?'PASS':'NO_GO';
fs.mkdirSync(DIR,{recursive:true});
fs.writeFileSync(path.join(DIR,'prosper-live-finder-vs-gis-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('PROSPER_PUBLIC_RESIDENCE_FINDERVERIFY '+JSON.stringify(summary).slice(0,12000));
if(summary.sampleGate!=='PASS')process.exitCode=1;
