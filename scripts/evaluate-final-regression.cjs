#!/usr/bin/env node
'use strict';
// Cross-workflow, read-only release QA verdict. Evidence is collected by existing
// browser and privacy tests against the PR merge commit. Never sets release flags,
// talks to a hosting service, creates credentials, or grants public release.
const fs=require('node:fs');
const path=require('node:path');

const VIEWPORTS=[320,375,390,430,480,720,1280];
const PUBLIC_BLOCKERS=[
  'private-source-separation-not-verified',
  'external-provider-terms-not-approved',
  'data-redistribution-licenses-not-approved',
  'live-browser-qa-not-approved',
  'owner-publication-approval-missing',
];

function verdict(evidence) {
  const errors=[],warnings=[];
  const school=evidence?.school, mobile=evidence?.mobile,
    area=evidence?.area, security=evidence?.security;
  const bad=(code)=>errors.push(code);
  if(!school||!school.coverage||!school.topSix||!school.byDistrict)bad('school_browser_evidence_missing');
  else{
    if(school.baselineComparison?.status!=='BASELINE_OK')bad('school_source_missing_or_baseline_unverified');
    if(school.blocked===true)bad('school_polygon_render_blocked');
    if(!Number.isInteger(school.coverage.sampledRenderChecks)||
       school.coverage.sampledRenderChecks<12)bad('school_render_sample_insufficient');
    if(school.coverage.sampledRenderFailures!==0)bad('school_polygon_render_failed');
    if(school.topSix.totalLoadedDirectory<273||
       school.topSix.matched<240)bad('school_six_district_linkage_regressed');
    for(const district of ['FISD','PISD','AISD','LISD','PROSPER','CFB']){
      if(!school.byDistrict[district])bad('school_district_missing_'+district);
    }
    const allen=school.markerChecks?.find(x=>x.district==='AISD');
    if(!allen||allen.status!=='passed'||allen.expectedVisible<20||
       allen.matchedMarkers<20||allen.missingNames?.length!==0)
      bad('allen_visible_markers_missing');
    const cfb=school.byDistrict.CFB;
    if(cfb?.linked===0){
      if(cfb.limitation!=='resident-finder-only-no-dashboard-polygons')
        bad('cfb_no_polygon_source_unlabeled');
      else warnings.push('cfb_official_address_finder_only_no_campus_gis');
    }
    if(school.byDistrict.AISD?.limitation!=='historical-2019-2023-reference')
      bad('allen_boundary_vintage_disclaimer_missing');
    else warnings.push('allen_polygon_is_historical_reference_not_current_assignment');
  }
  if(!mobile||!Array.isArray(mobile.views)||!mobile.addressClear)bad('mobile_browser_evidence_missing');
  else{
    if(mobile.views.length!==VIEWPORTS.length||
       VIEWPORTS.some(w=>!mobile.views.some(x=>x.width===w)))
       bad('mobile_viewports_not_all_checked');
    if(mobile.issues?.length||mobile.views.some(x=>x.issues?.length))
       bad('mobile_overlap_or_horizontal_overflow');
    if(mobile.views.some(x=>x.clearButton!=='pass'||x.groupedSchoolControls!==true))
       bad('address_clear_or_grouped_school_toggle_failed');
    if(mobile.addressClear.result!=='pass')
       bad('address_clear_post_selection_unverified');
  }
  if(!area||!Array.isArray(area.scenarios))bad('area_assessment_browser_evidence_missing');
  else{
    for(const width of [390,1280]){
      const e=area.scenarios.find(x=>x.width===width);
      if(!e||e.selectedZip!=='75013'||!Number.isFinite(e.overflow)||e.overflow>2)
        bad('regional_assessment_or_zip_interaction_failed_'+width);
    }
  }
  if(!security||security.mode!=='release'||security.status!=='BLOCKED')
    bad('public_release_gate_not_explicitly_blocked');
  else{
    const denied=new Set((security.blockers||[]).map(x=>x.kind));
    for(const kind of PUBLIC_BLOCKERS)if(!denied.has(kind))
      bad('public_release_manual_gate_missing_'+kind);
    if(security.credentials?.length||security.personalization?.length||
       security.newSensitive?.length||security.nonPublishable?.length)
      bad('sanitized_public_artifact_contains_sensitive_or_unapproved_asset');
  }
  // All individual QA paths can pass, but these local source checks can NEVER
  // certify access-protected UAT nor authorize a public production deployment.
  return {
    schemaVersion:1,
    codeQa:errors.length?'REVIEW_REQUIRED':'PASS',
    publicProduction:'NO_GO_EXTERNAL_APPROVALS_AND_PRIVATE_SOURCE_NOT_VERIFIED',
    familyUat:'NOT_PROVISIONED_OR_NOT_LIVE_AUTHENTICATION_VERIFIED',
    checks:{
      coreSchools:school?.topSix?.totalLoadedDirectory??null,
      linkedSchoolPolygons:school?.topSix?.matched??null,
      sampledSchoolPolygons:school?.coverage?.sampledRenderChecks??null,
      allenVisibleMarkers:school?.markerChecks?.find(x=>x.district==='AISD')?.matchedMarkers??null,
      responsiveViewports:mobile?.views?.length??null,
      assessmentViewports:area?.scenarios?.length??null,
      publicSanitizedPreviewGate:security?.status??null
    },
    errors,warnings,
    limitations:[
      'Source QA pass is not verification of household school assignment or current-year Allen GIS.',
      'CFB school campus boundaries remain unavailable; use official resident address Finder.',
      'Real authenticated family UAT, third-party terms, DNS, publishing and owner go-live are not assessed.'
    ]
  };
}
function readJson(dir,name){
  const file=path.join(dir,name+'.json');
  if(!fs.existsSync(file))return null;
  try{return JSON.parse(fs.readFileSync(file,'utf8'))}
  catch{return null}
}
function main(){
  const dir=path.resolve(process.argv[2]||'artifacts/final-qa');
  const result=verdict({
    school:readJson(dir,'school'),mobile:readJson(dir,'mobile'),
    area:readJson(dir,'area'),security:readJson(dir,'security')
  });
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'final-verdict.json'),JSON.stringify(result,null,2)+'\n');
  console.log('FINAL_DFW_CODE_QA '+JSON.stringify({
    codeQa:result.codeQa,publicProduction:result.publicProduction,
    familyUat:result.familyUat,checks:result.checks,
    errors:result.errors,warnings:result.warnings
  }));
  if(result.codeQa!=='PASS')process.exitCode=1;
}
if(require.main===module)main();
module.exports={VIEWPORTS,PUBLIC_BLOCKERS,verdict};
