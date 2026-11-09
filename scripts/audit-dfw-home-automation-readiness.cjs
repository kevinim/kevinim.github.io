#!/usr/bin/env node
'use strict';
// Safe structural census, not successful Finder queries and not residential PII.
const fs=require('node:fs'),path=require('node:path');
const {DISTRICT_REGISTRY}=require('../district-registry.js');
const ROOT=path.resolve(__dirname,'..');
function audit(){
 const matrix=JSON.parse(fs.readFileSync(path.join(ROOT,'data/dfw-school-coverage-matrix-2026.json'),'utf8'));
 const rows=matrix.districts.filter(d=>d.category==='public-isd');
 const districts=rows.map(d=>{
  const r=DISTRICT_REGISTRY[d.parentGuidance?.registryKey]||null;
  const level=r?.address==='frisco'||r?.address==='polygon'
   ?'geometry-candidate':r?.address==='allen-table'?'address-table-only':'official-link-or-no-source';
  const year=r?.currency==='always'?'2026-27-source':
   r?.currency==='live'?'live-finder-required':
   r?.currency==='finder'?'finder-linked-year-check':'historical-or-unknown';
  return {teaCode:d.code,name:d.name,parentRoute:d.parentGuidance?.status||'not-verified',
   automationLevel:level,sourceYearStatus:year,zoneSourceKey:r?.zoneKey||null,
   exactAddressAssignmentValidated:false,verifiedPolygonForEveryCampus:false};
 });
 const count=level=>districts.filter(d=>d.automationLevel===level).length;
 const sourceDistricts=districts.filter(d=>d.zoneSourceKey);
 const summary={publicISDs:districts.length,configuredSchoolZoneSources:sourceDistricts.length,
  pointInPolygonCandidateDistricts:count('geometry-candidate'),
  addressTableOnlyDistricts:count('address-table-only'),
  noAutomaticSchoolZoneSourceDistricts:count('official-link-or-no-source'),
  sourceYearConfirmedDistricts:sourceDistricts.filter(d=>d.sourceYearStatus==='2026-27-source').length,
  exactResidentialAssignmentSuccessRate:null,currentYearCampusPolygonCompletenessRate:null};
 return {asOf:'2026-11-09',scope:'11-county TEA district administrative proxy (NOT legal all-DFW geographic coverage)',
  notes:['Link-only enrollment/registrar routes never qualify as automatic campus assignment.',
   'A configured GIS source is not proof it loaded, is current-year, or produced a confirmed address assignment.',
   'Not all campuses have standard attendance zones (choice, magnet, transfer exceptions).'],summary,districts};
}
if(require.main===module)console.log(JSON.stringify(audit(),null,2));
module.exports={audit};
