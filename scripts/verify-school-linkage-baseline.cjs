'use strict';
// Deterministic guardrails against regressions from a measured, reviewed browser baseline.
// Source outages are explicitly inconclusive rather than mislabeled missing polygons.
const fs=require('node:fs');
const path=require('node:path');
function compareBaseline(report,baseline){
 if(baseline?.schemaVersion!==1||!baseline.districts||!report?.byDistrict||
  !report.topSix||!report.coverage)throw Error('invalid_linkage_baseline_or_report');
 const blockers=[],warnings=[],checked=[];
 const failedSources=[];
 for(const [district,expected] of Object.entries(baseline.districts)){
  const actual=report.byDistrict[district];
  if(!actual||typeof actual.totalLoadedDirectory!=='number'||typeof actual.linked!=='number'){
   blockers.push({district,code:'district_not_audited'});continue;
  }
  if(actual.limitation!==expected.mode){
   blockers.push({district,code:'source_freshness_classification_changed'});continue;
  }
  if(actual.source?.sourceLoadError){
   failedSources.push(district);
   warnings.push({district,code:'source_fetch_failed_baseline_inconclusive'});
   continue;
  }
  if(actual.totalLoadedDirectory<expected.minimumLoaded)
   blockers.push({district,code:'school_directory_count_regressed',
    expectedAtLeast:expected.minimumLoaded,actual:actual.totalLoadedDirectory});
  if(actual.linked<expected.minimumLinked)
   blockers.push({district,code:'school_boundary_matches_regressed',
    expectedAtLeast:expected.minimumLinked,actual:actual.linked});
  checked.push(district);
 }
 if(failedSources.length===0){
  if(report.topSix.totalLoadedDirectory<baseline.targetSix.minimumLoaded)
   blockers.push({district:'target-six',code:'target_six_directory_regressed',
    expectedAtLeast:baseline.targetSix.minimumLoaded,actual:report.topSix.totalLoadedDirectory});
  if(report.topSix.matched<baseline.targetSix.minimumLinked)
   blockers.push({district:'target-six',code:'target_six_linkage_regressed',
    expectedAtLeast:baseline.targetSix.minimumLinked,actual:report.topSix.matched});
 }
 const render=report.coverage.sampledRenderChecks||0;
 if(render<baseline.requiredRenderSamples)
  blockers.push({district:'all',code:'insufficient_polygon_render_sample',
    expectedAtLeast:baseline.requiredRenderSamples,actual:render});
 if(report.coverage.sampledRenderFailures)
  blockers.push({district:'all',code:'polygon_render_failure',
    actual:report.coverage.sampledRenderFailures});
 const allen=(report.markerChecks||[]).find(c=>c.district==='AISD');
 if(!allen||allen.status!=='passed'||
  allen.expectedVisible<baseline.allenMarkerCheck.minimumVisible||
  allen.matchedMarkers<baseline.allenMarkerCheck.minimumVisible||
  allen.missingNames.length>baseline.allenMarkerCheck.maxMissing)
  blockers.push({district:'AISD',code:'allen_markers_missing_or_not_verified'});
 const status=blockers.length?'REVIEW_REQUIRED':
  failedSources.length?'INCONCLUSIVE_SOURCE_AVAILABILITY':'BASELINE_OK';
 return {status,referenceRun:baseline.referenceBrowserRun,
  verifiedDistricts:checked,sourceUnavailable:failedSources,blockers,warnings,
  summary:'Observed dashboard-directory minimum counts only; not current-year official residence assignment coverage.'};
}
function main(){
 const root=process.cwd();
 const reportFile=path.resolve(root,'artifacts/school-linkage/school-polygon-linkage-census.json');
 const baselineFile=path.resolve(root,'data/school-polygon-linkage-baseline.json');
 const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
 const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
 const result=compareBaseline(report,baseline);
 report.baselineComparison=result;
 fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 process.stdout.write('SCHOOL_LINKAGE_BASELINE '+JSON.stringify({
  status:result.status,sourceUnavailable:result.sourceUnavailable,
  blockers:result.blockers,verifiedDistricts:result.verifiedDistricts})+'\n');
 if(result.blockers.length)process.exitCode=1;
}
if(require.main===module)try{main();}catch(e){
 process.stderr.write('School linkage baseline check blocked: '+e.message+'\n');
 process.exitCode=1;
}
module.exports={compareBaseline};
