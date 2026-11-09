#!/usr/bin/env node
'use strict';
// P1 technical QA bridge. These two PR #172 reports share correlated GIS/Infofinder
// lineage; their agreement NEVER constitutes a reviewed residential assignment.
const fs=require('node:fs');
const path=require('node:path');
const LEVELS=['elementary','middle','high'];
const WIDTHS=[390,1366];
function evaluate(source,browser,fixture){
 const issues=[],note=x=>{if(!issues.includes(x))issues.push(x)};
 const cases=Array.isArray(fixture?.cases)?fixture.cases:[];
 const expected=new Set(cases.map(x=>x.id));
 const sr=Array.isArray(source?.results)?source.results:[];
 const br=Array.isArray(browser?.checks)?browser.checks:[];
 if(fixture?.district!=='PROSPER'||cases.length!==5||expected.size!==5)note('INVALID_PUBLIC_FIXTURE');
 if(source?.schemaVersion!==1||source?.district!=='PROSPER'||
    source?.academicYear!=='2026–27'||source?.status!=='SOURCE_CORROBORATION_PASS_NOT_ENROLLMENT')
  note('OFFICIAL_GIS_SOURCE_REPORT_NOT_PASS');
 if(source?.geocodeUsedLive!==true||source?.districtPointResultsUsedLive!==true||
    source?.allSchoolsVerifiedByIndependentAuthority!==false||
    source?.householdEnrollmentVerified!==false||source?.productionReleaseApproved!==false)
  note('SOURCE_PROVENANCE_OR_RELEASE_FLAG_INVALID');
 if(browser?.schemaVersion!==1||browser?.status!=='PASS_BROWSER_MAP_ONLY'||
    browser?.genuineEsriGeocoderNotReplayed!==true||browser?.officialInfofinderPointSourceGenuine!==true||
    browser?.independentDistrictFinderUiVerified!==false||
    browser?.independentVendorSource!==false||
    browser?.independentEnrollmentOrUnitEligibility!==false||
    browser?.productionReleaseApproved!==false)
  note('BROWSER_PROVENANCE_OR_RELEASE_FLAG_INVALID');
 if(sr.length!==5||new Set(sr.map(x=>x.id)).size!==sr.length||
    sr.some(x=>!expected.has(x.id)))note('SOURCE_CASE_IDS_OR_COUNT_CHANGED');
 const passed=sr.filter(x=>x.status==='OFFICIAL_POINT_GIS_CORROBORATED');
 const excluded=sr.filter(x=>x.status!=='OFFICIAL_POINT_GIS_CORROBORATED');
 if(passed.length!==4||excluded.length!==1||source?.corroborated!==4)
  note('RESIDENTIAL_CROSSCHECK_COVERAGE_CHANGED');
 if(excluded.some(x=>x.status!=='INCONCLUSIVE'||x.reason!=='NO_EXACT_LIVE_POINT_ADDRESS'||
    (x.officialCodes||[]).length>0))note('UNVERIFIED_ADDRESS_NOT_QUARANTINED');
 if(!Array.isArray(source?.disagreements)||source.disagreements.length)
  note('OFFICIAL_GIS_DISAGREEMENTS_PRESENT');
 const keys=new Set();
 for(const row of passed){
  const geo=LEVELS.map(l=>row.GIS?.[l]);
  const actual=geo.map(arr=>Array.isArray(arr)&&arr.length===1?arr[0].code:null);
  const official=row.officialCodes;
  if(!Array.isArray(official)||official.length!==3||new Set(official).size!==3||
     actual.some(x=>typeof x!=='string'||!/^\d{3}$/.test(x))||
     JSON.stringify([...actual].sort())!==JSON.stringify([...official].sort())||
     geo.some(arr=>arr[0]?.year!=='2026-2027'&&arr[0]?.year!=='2026–27'))
   note('SOURCE_CODE_OR_GRADE_YEAR_MISMATCH');
 }
 if(br.length!==passed.length*WIDTHS.length||
    browser?.passes!==br.length)note('BROWSER_RUN_COUNT_CHANGED');
 for(const c of br){
  const key=c.id+'/'+c.viewport;
  if(keys.has(key)||!expected.has(c.id)||!passed.some(x=>x.id===c.id)||
      !WIDTHS.includes(c.viewport))note('BROWSER_UNKNOWN_OR_DUPLICATE_CASE');
  keys.add(key);
  if(c.status!=='PUBLIC_HOUSE_BROWSER_OFFICIAL_GIS_CORROBORATED'||
     c.district!=='PROSPER'||!['current','boundary-review'].includes(c.assignmentStatus)||
     c.geocodeUsable!==true||c.homeMapVisible!=='true'||
     c.homePolygonCount<3||c.homeLayerGroups<1||c.renderedPolygonCount<1||
     c.listMatchedSchoolButtons<1||!c.selectedSchool||c.clearHomeLeavesNoZone!==true||
     c.issue)note('BROWSER_INTERACTIVE_MAP_OR_CLEAR_FAILED');
 }
 for(const row of passed)for(const width of WIDTHS)
  if(!keys.has(row.id+'/'+width))note('BROWSER_EXPECTED_CASE_MISSING');
 // Never emit a synthetic reviewer approval, a derived GO, or a district-wide
 // assignment count. Only an independent review can satisfy PR #148.
 const releaseGate={
  status:'NO_GO',
  reviewerApproved:false,
  independentOfficialFinderUiVerified:false,
  independentResidentialAssignmentVerified:false,
  currentProductionCommitVerified:false,
  blockers:[
   'PR_148_SEVEN_DISTRICTS_NOT_INDEPENDENTLY_VERIFIED',
   'SOURCE_AND_INFOFINDER_VENDOR_LINEAGE_CORRELATED',
   'INDEPENDENT_OFFICIAL_FINDER_UI_REVIEW_MISSING',
   'RESIDENTIAL_POSTAL_MISMATCH_REMAINS_QUARANTINED',
   'SCHOOL_ENROLLMENT_AND_PROGRAM_EXCEPTIONS_UNVERIFIED',
   'CURRENT_PRODUCTION_COMMIT_AND_RELEASE_SIGNOFF_MISSING'
  ]
 };
 return {
  schemaVersion:1,sourcePr:172,mapPr:162,releaseGatePr:148,district:'PROSPER',year:'2026–27',
  technicalStatus:issues.length?'NO_GO_TECHNICAL_QA':'PASS_TECHNICAL_QA_ONLY',
  issues,totals:{sampled:sr.length,corroborated:passed.length,quarantined:excluded.length,
   browserChecks:br.length,browserPassed:br.filter(c=>c.status==='PUBLIC_HOUSE_BROWSER_OFFICIAL_GIS_CORROBORATED').length},
  releaseGate
 };
}
if(require.main===module){
 const root=path.resolve(__dirname,'..');
 const input=path.join(root,'artifacts/prosper-real-home');
 const evidenceFile=path.join(input,'p1-integrated-address-gis-evidence.json');
 try{
  const source=JSON.parse(fs.readFileSync(path.join(input,'official-lookup-vs-gis.json'),'utf8'));
  const browser=JSON.parse(fs.readFileSync(path.join(input,'dashboard-browser-map-e2e.json'),'utf8'));
  const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/prosper-public-listed-single-family-2026.json'),'utf8'));
  const result=evaluate(source,browser,fixture);
  fs.writeFileSync(evidenceFile,JSON.stringify(result,null,2)+'\n');
  console.log('PROSPER_P1_ADDRESS_GIS '+JSON.stringify(result));
  if(result.technicalStatus!=='PASS_TECHNICAL_QA_ONLY'||result.releaseGate.status!=='NO_GO')
   process.exitCode=1;
 }catch(e){
  const result={schemaVersion:1,technicalStatus:'NO_GO_TECHNICAL_QA',
    releaseGate:{status:'NO_GO',reviewerApproved:false},
    issues:['MISSING_OR_INVALID_INTEGRATION_EVIDENCE']};
  fs.mkdirSync(input,{recursive:true});
  fs.writeFileSync(evidenceFile,JSON.stringify(result,null,2)+'\n');
  console.error('PROSPER_P1_ADDRESS_GIS '+JSON.stringify(result));
  process.exitCode=1;
 }
}
module.exports={evaluate};
