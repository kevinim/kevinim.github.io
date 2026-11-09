'use strict';
// Full in-scope DFW TEA district-denominator verification, not just 6 targets.
// Parent guidance URL availability != current school geometry != home assignment.
const fs=require('node:fs');
const path=require('node:path');
function audit(matrix){
 const blockers=[],warnings=[];
 if(matrix?.schemaVersion!==1||!Array.isArray(matrix.districts))return {
  status:'INVALID',blockers:['invalid_matrix'],warnings,summary:null};
 const rows=matrix.districts;
 const codes=new Set();
 let isds=0,others=0,linked=0,without=0,currentYearSource=0,claimedYear=0,withSchoolPolygons=0;
 for(const district of rows){
  if(!district||typeof district.code!=='string'||codes.has(district.code)){
   blockers.push('missing_or_duplicate_tea_code');continue;
  }
  codes.add(district.code);
  const isISD=district.category==='public-isd';
  if(isISD)isds++;else others++;
  if(!isISD)continue;
  const guidance=district.parentGuidance||{};
  if(guidance.status==='registered-official-source'&&/^https:\/\//.test(guidance.officialUrl||'')){
   linked++;
  }else{
   without++;
   if(district.missingReason!=='official-parent-lookup-not-yet-verified')
    blockers.push(district.code+':unregistered_guidance_without_reason');
  }
  const g=district.geometry||{};
  if(g.status==='reference-browser-minimum-only'&&Number.isFinite(g.referenceMatchedMinimum)&&g.referenceMatchedMinimum>0)
   withSchoolPolygons++;
  if(g.confirmedCurrentYear===true){
   currentYearSource++;
   if(!g.vintageMode||g.status!=='reference-browser-minimum-only')
    blockers.push(district.code+':claimed_current_geometry_without_source');
  }
  if(district.exactResidentialAssignmentsVerified===true)claimedYear++;
 }
 const sum=matrix.summary||{};
 for(const [key,value] of Object.entries({teaDistrictCodes:codes.size,publicISDs:isds,
  otherLEAs:others,publicISDsWithRegisteredParentRoute:linked,
  publicISDsMissingRegisteredParentRoute:without})){
  if(sum[key]!==value)blockers.push('summary_count_mismatch:'+key);
 }
 if(sum.exactAddressAssignmentCoveragePercent!==null||
  sum.campusPolygonCoverageAllDFWPercent!==null)
  blockers.push('unsupported_full_coverage_claim');
 if(claimedYear>0)blockers.push('self_attested_residential_assignment_without_independent_evidence');
 if(without>0)warnings.push('public_isds_missing_official_parent_lookup_links:'+without);
 if(currentYearSource<isds)warnings.push('current_year_campus_polygons_not_independently_verified_for_all_isds');
 warnings.push('school_geometry_registry_match_is_not_school_specific_residential_e2e_verification');
 return {status:blockers.length?'INVALID':'NO_GO_FULL_DFW_CERTIFICATION',
  blockers:[...new Set(blockers)],warnings,
  summary:{teaDistrictCodes:codes.size,publicISDs:isds,otherLEAs:others,
   registeredOfficialParentRoutes:linked,missingOfficialParentRoutes:without,
   registryCurrentYearGeometrySourceCount:currentYearSource,
   schoolSpecificPolygonLinkedReferenceDistricts:withSchoolPolygons,
   independentlyResidentialE2EVerifiedDistricts:0,
   verifiedFullDFWCoverage:false}};
}
function main(){
 const p=process.argv[2]||'data/dfw-school-coverage-matrix-2026.json';
 const d=JSON.parse(fs.readFileSync(path.resolve(p),'utf8'));
 const r=audit(d);
 const out=path.resolve('artifacts/dfw-school-qa/coverage-gate.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');
 console.log('DFW_WIDE_SCHOOL_QA_GATE '+JSON.stringify(r));
 if(r.blockers.length)process.exitCode=1;
}
if(require.main===module)try{main();}catch(e){
 console.error('DFW_WIDE_SCHOOL_QA_ERROR '+e.message);process.exitCode=1;
}
module.exports={audit};
