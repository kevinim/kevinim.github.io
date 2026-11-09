#!/usr/bin/env node
'use strict';
// Reproducible district/parent-route inventory for the BLS 11-county DFW MSA.
// Not parcel/attendance assignment and not a live campus polygon audit.
const fs=require('node:fs');
const path=require('node:path');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const {official:validateOfficial}=require('../trusted-link-policy.js');

const COUNTIES=Object.freeze(['COLLIN','DALLAS','DENTON','ELLIS','HUNT','JOHNSON',
 'KAUFMAN','PARKER','ROCKWALL','TARRANT','WISE']);
const SCOPE_URL='https://www.bls.gov/regions/southwest/news-release/areaemployment_dallasfortworth.htm';
const round=n=>Math.round(n*10)/10;
const isPublicISD=name=>/\bISD\b|INDEPENDENT SCHOOL DISTRICT/i.test(name);
const sorted=(a,b)=>b.teaCampusRecords-a.teaCampusRecords||a.name.localeCompare(b.name)||a.code.localeCompare(b.code);
function requireValid(condition,message){if(!condition)throw Error(message);}
function buildCoverage(tea,registry,baseline){
 requireValid(Array.isArray(tea?.data)&&tea.data.length>1000,'invalid_tea_campus_source');
 requireValid(registry&&typeof registry==='object','missing_registry');
 requireValid(baseline?.schemaVersion===1&&baseline.districts,'invalid_reference_baseline');
 const countySet=new Set(COUNTIES),groups=new Map(),campusIDs=new Set();
 let sourceCampuses=0;
 for(const row of tea.data){
  requireValid(row&&/^\d{9}$/.test(row.id)&&typeof row.district==='string'&&
   typeof row.districtName==='string'&&typeof row.districtCounty==='string','invalid_tea_record');
  if(!countySet.has(row.districtCounty))continue;
  requireValid(!campusIDs.has(row.id),'duplicate_tea_campus_id_'+row.id);
  campusIDs.add(row.id);sourceCampuses++;
  const code=row.id.slice(0,6);
  if(!groups.has(code))groups.set(code,{code,name:row.districtName,countyCounts:{},aliases:new Set(),teaCampusRecords:0});
  const g=groups.get(code);
  requireValid(g.name===row.districtName,'conflicting_tea_district_names_'+code);
  g.teaCampusRecords++;
  g.countyCounts[row.districtCounty]=(g.countyCounts[row.districtCounty]||0)+1;
  g.aliases.add(row.district);
 }
 const districts=[];
 for(const g of groups.values()){
  const aliases=[...g.aliases].sort();
  const registryKeys=[g.code,...aliases].filter(k=>Object.prototype.hasOwnProperty.call(registry,k));
  requireValid(new Set(registryKeys).size<=1,'ambiguous_district_registry_'+g.code);
  const key=registryKeys[0]||null;
  const d=key?registry[key]:null;
  const publicISD=isPublicISD(g.name);
  const parentRoute=!!d?.official&&validateOfficial(d.official)===d.official;
  if(d?.official&&!parentRoute)throw Error('district_official_link_not_approved_'+g.code);
  const baselineRecord=key?baseline.districts[key]||null:null;
  const geometry=baselineRecord?{
   status:'reference-browser-minimum-only',
   referenceLoadedMinimum:baselineRecord.minimumLoaded,
   referenceMatchedMinimum:baselineRecord.minimumLinked,
   matchedLoadedPercent:baselineRecord.minimumLoaded?
    round(100*baselineRecord.minimumLinked/baselineRecord.minimumLoaded):null,
   vintageMode:baselineRecord.mode,
   confirmedCurrentYear:baselineRecord.mode==='official-2026-27-live-feed'||
    baselineRecord.mode==='official-2026-27-pinned-local',
   referenceRun:baseline.referenceBrowserRun
  }:{
   status:d?.zoneKey?'configured-but-no-reviewed-reference':'no-dashboard-school-polygons-configured',
   referenceLoadedMinimum:null,referenceMatchedMinimum:null,matchedLoadedPercent:null,
   vintageMode:null,confirmedCurrentYear:false,referenceRun:null
  };
  const guide=d?.lookupKind||((d?.official&&d?.zoneKey)?'registered-official-link':d?.official?'registered-official-link':null);
  let issue,parentPriority;
  if(!publicISD){
   issue='other-lea-admissions-model-needs-classification';parentPriority='P2';
   if(g.teaCampusRecords>=15)parentPriority='P1';
  }else if(!parentRoute){
   issue='official-parent-lookup-not-yet-verified';parentPriority='P0';
  }else if(!d?.zoneKey){
   issue=guide==='choice-process'?'choice-not-address-zoning':
    'official-parent-route-linked-but-campus-gis-not-ingested';
   parentPriority='P1';
  }else if(geometry.vintageMode==='historical-2019-2023-reference'){
   issue='historical-campus-polygons-not-current-assignment';parentPriority='P1';
  }else if(geometry.vintageMode==='official-finder-linked-layer-year-not-confirmed'||
           geometry.vintageMode==='official-finder-linked-mixed-vintages'){
   issue='finder-linked-polygons-year-not-confirmed';parentPriority='P1';
  }else if(geometry.vintageMode==='live-official-finder-only'){
   issue='live-finder-source-can-change-since-reference-run';parentPriority='P1';
  }else if(geometry.confirmedCurrentYear){
   issue='current-year-source-reference-still-needs-live-recheck';parentPriority='P2';
  }else{issue='campus-polygon-evidence-unreviewed';parentPriority='P1';}
  districts.push({
   code:g.code,name:g.name,countyOfRecord:Object.entries(g.countyCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0],
   sourceCountyRecords:g.countyCounts,teaCampusRecords:g.teaCampusRecords,
   sourceDistrictAliases:aliases,
   category:publicISD?'public-isd':'other-tea-lea-structure-unverified',
   parentGuidance:{status:parentRoute?'registered-official-source':'not-verified',
    lookupType:parentRoute?guide:null,officialUrl:parentRoute?d.official:null,
    yearCaution:d?.officialNote||null,registryKey:key},
   geometry,
   missingReason:issue,priority:parentPriority,
   specificCampusZoneReasonsAudited:!!baselineRecord,
   limitation:baselineRecord?'Reference browser minimum from selected dataset; individual school current assignment is unverified.':
    'No campus-by-campus polygon measurement in current source. Missing official GIS vs missing enrollment process must be investigated separately.'
  });
 }
 const isds=districts.filter(d=>d.category==='public-isd'),other=districts.filter(d=>d.category!=='public-isd');
 const guided=isds.filter(d=>d.parentGuidance.status==='registered-official-source');
 const missing=isds.filter(d=>d.parentGuidance.status==='not-verified');
 const sum=a=>a.reduce((n,d)=>n+d.teaCampusRecords,0);
 const byCounty=COUNTIES.map(county=>{
  const records=districts.filter(d=>Object.keys(d.sourceCountyRecords).includes(county));
  const isd=records.filter(d=>d.category==='public-isd');
  return {county,teaCampusRecords:records.reduce((n,d)=>n+(d.sourceCountyRecords[county]||0),0),
   districtCodesWithSchoolRecords:records.length,publicISDs:isd.length,
   publicISDsWithRegisteredParentRoute:isd.filter(d=>d.parentGuidance.status==='registered-official-source').length};
 });
 const reasonCounts={};
 for(const d of districts){
  const key=d.missingReason;
  if(!reasonCounts[key])reasonCounts[key]={districts:0,teaCampusRecords:0};
  reasonCounts[key].districts++;reasonCounts[key].teaCampusRecords+=d.teaCampusRecords;
 }
 const summary={
  sourceCampusRows:sourceCampuses,teaDistrictCodes:districts.length,
  publicISDs:isds.length,otherLEAs:other.length,
  publicISDsWithRegisteredParentRoute:guided.length,publicISDsMissingRegisteredParentRoute:missing.length,
  registeredParentRouteRatePublicISDPercent:isds.length?round(100*guided.length/isds.length):null,
  publicISDCampusRows:sum(isds),publicISDCampusRowsWithRegisteredParentRoute:sum(guided),
  publicISDCampusRowsWithUnverifiedParentRoute:sum(missing),otherLEACampusRows:sum(other),
  campusPolygonCoverageAllDFWPercent:null,exactAddressAssignmentCoveragePercent:null
 };
 requireValid(summary.sourceCampusRows===byCounty.reduce((n,r)=>n+r.teaCampusRecords,0),'county_counts_do_not_reconcile');
 requireValid(summary.publicISDs===summary.publicISDsWithRegisteredParentRoute+
 summary.publicISDsMissingRegisteredParentRoute,'isd_counts_do_not_reconcile');
 const queue=districts.slice().sort((a,b)=>{
  const rank={P0:0,P1:1,P2:2};
  return rank[a.priority]-rank[b.priority]||sorted(a,b);
 });
 return {
  schemaVersion:1,generatedOn:'2026-11-09',dataYear:'2026 preliminary TEA snapshot',
  sourceFiles:['tea-ratings-2026.json','district-registry.js','data/school-polygon-linkage-baseline.json'],
  geographicDefinition:{name:'Dallas–Fort Worth–Arlington metropolitan statistical area',
   sourceUrl:SCOPE_URL,counties:COUNTIES,
   method:'TEA districtCounty is administrative district county-of-record proxy, not parcel or campus coordinate.',
   caveat:'This is a full census of district IDs present in the current TEA snapshot for the 11 named counties, NOT a certified list of every school district serving parcels across county lines. Unobserved ISDs, cross-county attendance and omitted campuses require source reconciliation.',
   extendedRegion:'NCTCOG 12-county region additionally includes Hood. Hood is absent from the present TEA snapshot and cannot be counted as zero districts.'},
  definitions:{
   parentGuidanceRate:'ISDs with already recorded, allowlisted official parent entry page; not a tested live address-grade lookup success rate.',
   campusPolygonCoverage:'Unknown DFW-wide: reference minima exist only for seven previously audited district mappings. Do not use 0% for unreviewed districts.',
   specificCampusMissingReason:'A district-level data gap is not proof a particular campus lacks a zone; per-campus root causes require browser/source audit.',
   otherLEAs:'Non-ISD names may be charter, alternative, multi-campus LEA or special authority; classify enrollment rules independently.'
  },
  summary,countySummaries:byCounty,missingReasonTotals:reasonCounts,
  priorityQueue:queue.map(d=>d.code),
  districts:districts.sort((a,b)=>a.countyOfRecord.localeCompare(b.countyOfRecord)||
    a.name.localeCompare(b.name)||a.code.localeCompare(b.code))
 };
}
function buildFromRepo(root=path.resolve(__dirname,'..')){
 const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 return buildCoverage(load('tea-ratings-2026.json'),DISTRICT_REGISTRY,load('data/school-polygon-linkage-baseline.json'));
}
function main(){
 const out=path.resolve(__dirname,'../data/dfw-school-coverage-matrix-2026.json');
 const serialized=JSON.stringify(buildFromRepo(),null,2)+'\n';
 if(process.argv.includes('--check')){
  if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==serialized)throw Error('dfw_coverage_snapshot_stale_run_builder');
  console.log('DFW_COVERAGE_SNAPSHOT current');
 }else{
  fs.writeFileSync(out,serialized);
  console.log('DFW_COVERAGE_SNAPSHOT '+out);
 }
}
if(require.main===module)try{main();}catch(e){console.error('DFW_COVERAGE_ERROR '+String(e.message||e));process.exitCode=1}
module.exports={COUNTIES,isPublicISD,buildCoverage,buildFromRepo};
