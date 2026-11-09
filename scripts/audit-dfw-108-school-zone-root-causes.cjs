'use strict';
// Read-only source-connection audit of all TEA DFW 11-county-of-record public ISDs.
// "Not ingested" is NOT evidence that public campus GIS doesn't exist.
const fs=require('node:fs'),path=require('node:path');
const CATEGORIES={
 'official-parent-lookup-not-yet-verified':{reason:'parent-route-unverified',next:'Locate/check district-controlled family assignment source; Chico may be a manual inquiry/choice-only route.',confidence:'source-unconfirmed'},
 'official-parent-route-linked-but-campus-gis-not-ingested':{reason:'parent-route-present-campus-gis-not-onboarded',next:'Check official 2026-27 campus polygons/PDF and license first, then TEA campus ID/year crosswalk and independent sample.',confidence:'dashboard-noningestion-confirmed-source-availability-unknown'},
 'historical-campus-polygons-not-current-assignment':{reason:'historical-polygons-only',next:'Do not certify old GIS as current. Obtain district current-year school assignments; verify street/unit exceptions.',confidence:'historical-source-dated'},
 'finder-linked-polygons-year-not-confirmed':{reason:'finder-layer-vintage-unverified',next:'Confirm campus-specific official layer school year, split grades and independent Finder address result.',confidence:'source-present-year-unknown'},
 'live-finder-source-can-change-since-reference-run':{reason:'live-finder-drift-uncertain',next:'Check actual current official GIS response and per-level campus names against stored shapes and dated reference.',confidence:'point-in-time-reference'},
 'current-year-source-reference-still-needs-live-recheck':{reason:'source-current-recheck-pending',next:'Refresh current-year district source and compare held-out property-specific official Finder results.',confidence:'vintage-provenance-reported-but-not-certified-residential'},
 'choice-not-address-zoning':{reason:'choice-based-assignment',next:'Do not invent neighborhood campus zones; link official choice enrollment/program policy.',confidence:'official-choice-structure'}
};
const KNOWN_PARALLEL={
 '057905':{pr:164,scope:'Dallas school-level GIS polygons (187 pilot); independently check campus IDs and 2026-27 vintage before marking accepted'},
 '057903':{pr:154,scope:'CFB GIS source/rights and synthetic-only derived geometry; no approved current campus polygons'},
 '061911':{pr:167,scope:'Northwest historical 2022 services quarantined; 2026-27 boundary maps require source reconciliation'}
};
function audit(matrix){
 const faults=[],rows=[],categoryTotals={};
 const ds=matrix?.districts?.filter(r=>r.category==='public-isd')||[];
 if(matrix?.schemaVersion!==1||ds.length!==108)faults.push('unexpected_school_district_denominator');
 const seen=new Set();
 for(const d of ds){
  if(seen.has(d.code)||!/^\d{6}$/.test(d.code||''))faults.push('duplicate_or_invalid_tea_code');
  seen.add(d.code);
  const spec=CATEGORIES[d.missingReason];
  if(!spec){faults.push('unclassified_reason:'+d.code);continue;}
  if(d.parentGuidance?.status==='registered-official-source'&&!/^https:\/\//.test(d.parentGuidance?.officialUrl||'')){
   faults.push('registered_parent_route_without_https:'+d.code);
  }
  if(d.missingReason==='official-parent-lookup-not-yet-verified'&&d.parentGuidance?.status==='registered-official-source'){
   faults.push('unverified_reason_conflicts_with_registered_route:'+d.code);
  }
  if(d.geometry?.confirmedCurrentYear===true&&d.geometry?.status!=='reference-browser-minimum-only')faults.push('unsupported_current_gis:'+d.code);
  const rate=d.geometry?.referenceLoadedMinimum>0&&Number.isFinite(d.geometry.referenceMatchedMinimum)
   ?Math.round(1000*d.geometry.referenceMatchedMinimum/d.geometry.referenceLoadedMinimum)/10:null;
  const type=spec.reason;
  categoryTotals[type]??={districts:0,teaCampusRows:0};
  categoryTotals[type].districts++;
  categoryTotals[type].teaCampusRows+=d.teaCampusRecords;
  rows.push({code:d.code,name:d.name,teaCampusRows:d.teaCampusRecords,
   knownParentRouteStatus:d.parentGuidance.status==='registered-official-source'?'registered':'unverified',
   officialParentSource:d.parentGuidance.officialUrl||null,
   rootCauseClass:type,
   rootCauseConfidence:spec.confidence,
   nextAction:spec.next,
   dashboardSchoolPolygonStatus:d.geometry?.status||'not-classified',
   geometryVintage:d.geometry?.vintageMode||null,
   referenceMatchPercent:rate,
   currentYearCampusGISIndependentlyCertified:false,
   addressToThreeGradeSchoolE2EIndependentlyCertified:false,
   parallelWork:KNOWN_PARALLEL[d.code]||null
  });
 }
 const sum=matrix?.summary||{};
 const linked=rows.filter(x=>x.knownParentRouteStatus==='registered').length;
 if(sum.publicISDsWithRegisteredParentRoute!==linked||sum.publicISDsMissingRegisteredParentRoute!==108-linked)
  faults.push('parent_route_source_counter_mismatch');
 if(rows.reduce((t,r)=>t+r.teaCampusRows,0)!==sum.publicISDCampusRows)faults.push('tea_campus_denominator_mismatch');
 if(sum.exactAddressAssignmentCoveragePercent!==null||sum.campusPolygonCoverageAllDFWPercent!==null)
  faults.push('unsubstantiated_global_gis_or_residential_percentage');
 // Prioritize by actual campus footprint, but suppress duplicative research where other PRs have assigned work.
 const queue=rows.filter(r=>r.rootCauseClass==='parent-route-present-campus-gis-not-onboarded')
  .sort((a,b)=>Number(!!a.parallelWork)-Number(!!b.parallelWork)||
   b.teaCampusRows-a.teaCampusRows||a.name.localeCompare(b.name))
  .slice(0,20).map(x=>({code:x.code,name:x.name,teaCampusRows:x.teaCampusRows,
   nextAction:x.nextAction,parallelWork:x.parallelWork}));
 const report={schemaVersion:1,reviewedOn:'2026-11-09',
  matrixBranchDependency:'feature/dfw-parent-guidance-remaining22-20261109 (#160)',
  geoScope:'TEA school district-of-record in 11 DFW counties; not address-parcel completeness',
  totalPublicISDs:rows.length,registeredOfficialParentRoutes:linked,
  missingOfficialParentRoutes:108-linked,
  totalTEASchoolRows:rows.reduce((t,r)=>t+r.teaCampusRows,0),
  categoryTotals,queue,rows,errors:faults,
  verifiedCurrentYearResidentialAssignments:0,
  claimOfAllSchoolGISCoverage:false,
  releaseApproved:false,
  notes:[
   'This report describes dashboard connection and source vintage blockers, not proof that GIS does not exist at a district.',
   'Only 107/108 parent links are registered on unmerged PR #160, not on main or PR #166.',
   'Dallas 187 polygons in draft PR #164 are separate and unmerged; do not overwrite this baseline or duplicate work.',
   'Historical polygons, current locator links, school pins, and student enrollment confirmation are distinct evidence classes.',
   'Existing official Finder user terms/permission and GIS reuse licensing still require separate review.'
  ]};
 return report;
}
if(require.main===module)try{
 const src=path.resolve(process.argv[2]||'data/dfw-school-coverage-matrix-2026.json');
 const result=audit(JSON.parse(fs.readFileSync(src,'utf8')));
 const file=path.resolve('artifacts/dfw-cause-audit/full-108-district-root-causes.json');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 console.log('DFW_108_MISSING_SCHOOL_ZONE_CAUSES '+JSON.stringify({districts:result.totalPublicISDs,
  parentRoutes:result.registeredOfficialParentRoutes,
  missingParentRoutes:result.missingOfficialParentRoutes,
  campusRecords:result.totalTEASchoolRows,categoryTotals:result.categoryTotals,
  samplePriority:result.queue.slice(0,5).map(x=>x.name),
  errors:result.errors,releaseApproved:result.releaseApproved}));
 if(result.errors.length)process.exitCode=1;
}catch(e){console.error('DFW_CAUSES_FAILED '+e.message);process.exitCode=1}
module.exports={audit,CATEGORIES};
