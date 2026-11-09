#!/usr/bin/env node
'use strict';
// Independent, offline, fail-closed census: TEA campus rows + registered parent routes
// + exact-host policy + provenance + year caveats. NOT a live address/GIS certification.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official}=require('../trusted-link-policy.js');
const {checkOfficialUrl}=require('./audit-gis-upload-links.cjs');
const COUNTIES=['COLLIN','DALLAS','DENTON','ELLIS','HUNT','JOHNSON','KAUFMAN','PARKER','ROCKWALL','TARRANT','WISE'];
function load(rootPath=root){
 const read=p=>JSON.parse(fs.readFileSync(path.join(rootPath,p),'utf8'));
 return {
  tea:read('tea-ratings-2026.json'),
  matrix:read('data/dfw-school-coverage-matrix-2026.json'),
  base:read('school-data-provenance.json'),
  mck:read('data/mckinney-2026-27-provenance.json'),
  west:read('data/west-dfw-zone-source-audit-2026.json'),
  neighbor:read('data/dfw-neighbor-official-school-links-2026.json'),
  batches:[3,4,5,6].map(n=>read('data/dfw-parent-source-evidence-batch'+n+'-2026.json')),
  grade:read('data/dfw-noncfb-grade-year-source-evidence-2026.json'),
  registry:DISTRICT_REGISTRY
 };
}
const total=rows=>rows.reduce((n,x)=>n+x.teaCampusRecords,0);
function audit(d){
 const errors=[],warnings=[];
 const requireCheck=(ok,id)=>{if(!ok)errors.push(id)};
 const {tea,matrix:m,registry,base,mck,west,neighbor,batches,grade}=d;
 const scope=new Set(COUNTIES);
 const observed=new Map(),ids=new Set();
 requireCheck(tea.status==='preliminary'&&tea.year===2026,'source_tea_vintage_changed');
 requireCheck(Array.isArray(m.districts)&&m.districts.length===152,'district_census_changed');
 for(const r of tea.data){
  if(!scope.has(r.districtCounty))continue;
  if(ids.has(r.id))errors.push('duplicate_tea_campus_'+r.id);
  ids.add(r.id);
  const code=r.id.slice(0,6);
  if(!observed.has(code))observed.set(code,{count:0,name:r.districtName,counties:{}});
  const a=observed.get(code);
  a.count++;
  a.counties[r.districtCounty]=(a.counties[r.districtCounty]||0)+1;
  if(a.name!==r.districtName)errors.push('tea_name_disagrees_'+code);
 }
 const districtIndex=new Map();
 for(const row of m.districts){
  if(districtIndex.has(row.code))errors.push('duplicate_matrix_district_'+row.code);
  districtIndex.set(row.code,row);
  const actual=observed.get(row.code);
  requireCheck(!!actual&&actual.name===row.name&&actual.count===row.teaCampusRecords,'tea_district_count_'+row.code);
  for(const [county,count] of Object.entries(row.sourceCountyRecords))
   requireCheck(actual?.counties[county]===count,'county_crosswalk_'+row.code+'_'+county);
  requireCheck(Object.values(row.sourceCountyRecords).reduce((a,b)=>a+b,0)===row.teaCampusRecords,
   'district_row_sum_'+row.code);
 }
 requireCheck(observed.size===m.districts.length,'missing_or_extra_tea_district');
 requireCheck(ids.size===2182&&tea.data.length===2282,'tea_campus_denominator_changed');
 const isds=m.districts.filter(x=>x.category==='public-isd');
 const others=m.districts.filter(x=>x.category!=='public-isd');
 const linked=isds.filter(x=>x.parentGuidance.status==='registered-official-source');
 const missing=isds.filter(x=>x.parentGuidance.status==='not-verified');
 requireCheck(isds.length===108&&others.length===44,'isd_vs_other_lea_denominator_changed');
 requireCheck(linked.length===85&&missing.length===23,'linked_district_denominator_changed');
 requireCheck(total(linked)===1880&&total(missing)===61&&total(others)===241,'linked_campus_denominator_changed');
 requireCheck(m.summary.publicISDsWithRegisteredParentRoute===85&&
  m.summary.publicISDsMissingRegisteredParentRoute===23&&
  m.summary.registeredParentRouteRatePublicISDPercent===78.7,'snapshot_link_coverage_inconsistent');
 requireCheck(m.summary.campusPolygonCoverageAllDFWPercent===null&&
  m.summary.exactAddressAssignmentCoveragePercent===null,'invented_dfw_gis_or_address_coverage');
 const reasonCounts={};
 for(const x of m.districts){
  const t=reasonCounts[x.missingReason]||{districts:0,teaCampusRecords:0};
  t.districts++;t.teaCampusRecords+=x.teaCampusRecords;reasonCounts[x.missingReason]=t;
 }
 for(const code of new Set([...Object.keys(reasonCounts),...Object.keys(m.missingReasonTotals)])){
  const a=reasonCounts[code],b=m.missingReasonTotals[code];
  requireCheck(a&&b&&a.districts===b.districts&&a.teaCampusRecords===b.teaCampusRecords,'reason_totals_'+code);
 }
 requireCheck(m.priorityQueue.length===m.districts.length&&new Set(m.priorityQueue).size===m.districts.length,
  'priority_queue_duplicate_or_incomplete');
 requireCheck(m.countySummaries.reduce((s,x)=>s+x.teaCampusRecords,0)===ids.size,'county_totals_do_not_reconcile');

 const sources=[];
 for(const r of base.districts){
  const map=m.districts.find(x=>x.parentGuidance.registryKey===r.code);
  requireCheck(!!map,'original_provenance_code_'+r.code);
  if(map)sources.push({code:map.code,url:r.officialLookup,kind:'base'});
 }
 sources.push({code:mck.code,url:mck.officialLookup,kind:'mckinney-district-landing'});
 for(const r of west.districts)sources.push({code:r.code,url:r.officialSource,kind:'west'});
 for(const r of neighbor.districts)sources.push({code:r.code,url:r.url,kind:r.kind});
 for(const [idx,batch] of batches.entries()){
  requireCheck(batch.evidence.length===[8,8,8,12][idx],'supplemental_batch_length_'+(idx+3));
  for(const r of batch.evidence){
   requireCheck(r.verifiedCurrentYearAttendanceGIS===false&&
    r.verifiedIndividualAddressAssignment===false&&
    (idx===0?r.personalAddressSubmitted!==true:r.personalAddressSubmitted===false),
    'supplemental_false_certification_'+r.teaCode);
   if(idx===0&&r.personalAddressSubmitted===undefined)
    warnings.push('Batch 3 '+r.teaCode+' has no explicit private-address submission field; address proof NOT claimed');
   for(const field of ['address','street','unit','resident','email','phone','rawFinderResponse'])
    requireCheck(!Object.hasOwn(r,field),'private_field_in_evidence_'+r.teaCode+'_'+field);
   sources.push({code:r.teaCode,url:r.officialLandingUrl,kind:r.routeKind});
  }
 }
 const seen=new Set(),urls=new Set(),typeCounts={};
 requireCheck(sources.length===85,'provenance_source_count');
 for(const src of sources){
  if(seen.has(src.code))errors.push('duplicate_registered_provenance_'+src.code);
  seen.add(src.code);
  const row=districtIndex.get(src.code);
  requireCheck(!!row&&row.category==='public-isd','non_ISD_source_or_unknown_'+src.code);
  if(!row)continue;
  requireCheck(row.parentGuidance.status==='registered-official-source','unregistered_provenance_'+src.code);
  if(src.kind==='mckinney-district-landing'){
   const locator=row.parentGuidance.officialUrl||'';
   requireCheck(src.code==='043907'&&
    src.url.startsWith('https://www.mckinneyisd.net/')&&
    locator.startsWith('https://portal.metrostudygis.com/')&&
    mck.status==='live-finder-year-gated',
    'mckinney_official_landing_provider_chain_unreviewed');
   warnings.push('McKinney district landing and third-party locator differ; no live household address proof');
  }else requireCheck(src.url===row.parentGuidance.officialUrl,'provenance_url_mismatch_'+src.code);
 }
 requireCheck(seen.size===85,'registered_provenance_missing_or_duplicate');
 for(const r of linked){
  requireCheck(seen.has(r.code),'registered_route_lacks_source_'+r.code);
  const d=registry[r.parentGuidance.registryKey||r.code];
  requireCheck(!!d&&d.official===r.parentGuidance.officialUrl,'registry_url_crosswalk_'+r.code);
  requireCheck(official(r.parentGuidance.officialUrl)===r.parentGuidance.officialUrl&&
   checkOfficialUrl(r.parentGuidance.officialUrl),'exact_host_https_mismatch_'+r.code);
  requireCheck(d.lookupKind===r.parentGuidance.lookupType||
   (!d.lookupKind&&r.parentGuidance.lookupType==='registered-official-link'),
   'lookup_class_mismatch_'+r.code);
  requireCheck(!urls.has(r.parentGuidance.officialUrl),'duplicate_parent_destination_'+r.code);
  urls.add(r.parentGuidance.officialUrl);
  const type=r.parentGuidance.lookupType;
  typeCounts[type]=(typeCounts[type]||0)+1;
  if(r.geometry.status==='no-dashboard-school-polygons-configured')
   requireCheck(!r.geometry.confirmedCurrentYear&&r.geometry.matchedLoadedPercent===null,
    'unverified_geometry_claim_'+r.code);
 }
 for(const r of missing){
  requireCheck(r.parentGuidance.officialUrl===null&&r.priority==='P0'&&r.parentGuidance.lookupType===null,
   'missing_route_claimed_verified_'+r.code);
 }
 requireCheck(grade.districts.length===10,'non_cfb_year_grade_evidence_count');
 for(const g of grade.districts){
  const r=districtIndex.get(g.code),d=registry[r?.parentGuidance.registryKey||g.code];
  requireCheck(!!r&&!!d&&r.parentGuidance.yearCaution===g.sourceFootnote&&
   d.officialNote===g.sourceFootnote,'grade_year_caveat_mismatch_'+g.code);
  requireCheck(g.currentYearSchoolSpecificGeometryInDashboard===false&&
   g.verifiedIndividualResidentialAssignment===false&&
   g.sourceRedistributionRightsVerified===false,'false_year_grade_certification_'+g.code);
 }
 const reference=m.districts.filter(x=>x.geometry.status==='reference-browser-minimum-only');
 requireCheck(reference.length===7,'seven_original_polygon_reference_census_changed');
 requireCheck(reference.filter(x=>x.geometry.confirmedCurrentYear).length===2,
  'geometry_year_claim_changed_without_review');
 warnings.push('All-DFW campus polygons and residential address-to-school success remain UNKNOWN');
 warnings.push('11-county TEA districtCounty is an administrative proxy, not parcel-level district membership');
 warnings.push('44 other LEAs have a separate admissions and charter model, not included in 108 public ISD rate');
 warnings.push('Link existence and source consistency DO NOT prove third-party school Finder can assign a real address');
 return {status:errors.length?'FAIL':'PASS',errors,warnings,summary:{
  teaSnapshotRows:tea.data.length,dfwRows:ids.size,publicISDs:isds.length,nonISDLEAs:others.length,
  registeredParentRoutes:linked.length,unregisteredPublicISDs:missing.length,
  registeredCampusRecords:total(linked),unregisteredCampusRecords:total(missing),
  currentYearDashboardPolygonReferenceDistricts:reference.filter(x=>x.geometry.confirmedCurrentYear).length,
  registeredRouteTypes:typeCounts,
  polygonCoveragePercent:null,addressAssignmentCoveragePercent:null,
  missing:isds.filter(x=>x.parentGuidance.status==='not-verified')
   .map(x=>({code:x.code,name:x.name,campusRecords:x.teaCampusRecords}))
 }};
}
if(require.main===module){
 const report=audit(load());
 const folder=path.join(root,'artifacts');
 fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'dfw-integrated-source-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log('DFW_INTEGRITY '+JSON.stringify({status:report.status,summary:report.summary,
  errors:report.errors,warnings:report.warnings}));
 if(report.errors.length)process.exitCode=1;
}
module.exports={load,audit};