'use strict';
// Prelim TEA directory join: reference IDs only. Does not authenticate source
// GIS ownership, school year, legal assignment or student eligibility.
const fs=require('node:fs');
function loadSources(dir=process.cwd()){
 const path=require('node:path');
 return {
  manifest:JSON.parse(fs.readFileSync(path.join(dir,'data/irving-provisional-tea-crosswalk-2026.json'),'utf8')),
  tea:JSON.parse(fs.readFileSync(path.join(dir,'tea-ratings-2026.json'),'utf8'))
 };
}
function attachReferenceIDs(features,manifest,tea){
 if(!Array.isArray(features)||!manifest||!tea)throw Error('missing_ref_sources');
 if(manifest.schoolYearOfPolygonsConfirmed!==false||manifest.currentYearReleaseReady!==false||tea.status!=='preliminary')throw Error('untrusted_provenance_or_tea_status');
 const byName=new Map(),byId=new Set();
 for(const z of manifest.records||[]){
  const key=z.grade+':'+z.sourceSchoolName;
  if(byName.has(key)||byId.has(z.teaCampusId)||!/^(057912)\d{3}$/.test(z.teaCampusId))throw Error('invalid_or_duplicate_campus_reference');
  byName.set(key,z);byId.add(z.teaCampusId);
 }
 const teaById=new Map(tea.data.filter(x=>String(x.id).startsWith('057912')).map(x=>[x.id,x]));
 for(const z of manifest.records){
  if(!teaById.has(z.teaCampusId))throw Error('tea_reference_not_in_preliminary_campus_snapshot');
 }
 const used=new Set(),joined=features.map(f=>{
  const p=f.properties||{},key=p.gradeLevel+':'+p.school;
  const src=byName.get(key);
  if(!src)throw Error('source_school_not_in_explicit_aliases_'+key);
  if(used.has(key))throw Error('duplicate_feature_name_'+key);
  used.add(key);
  if(p.campusId!==null||p.sourceYearVerified!==false||p.campusIdCrosswalkVerified!==false)
   throw Error('source_feature_misrepresented_as_certified');
  return {...f,properties:{...p,provisionalTEAReferenceId:src.teaCampusId,
   provisionalTEAReferenceName:teaById.get(src.teaCampusId).name,
   teaReferenceSnapshot:'2026 preliminary',campusId:null,campusIdCrosswalkVerified:false,
   independentFinderVerified:false}};
 });
 if(joined.length!==manifest.records.length||used.size!==byName.size)throw Error('school_source_alias_incomplete');
 return {features:joined,audit:{matchingPreliminaryTEAReferenceRows:used.size,unmatchedSourceFeatures:0,
  unobservedPreliminaryTeaMiddleCampus:'057912048',crosswalkIsEnrollmentProof:false,
  gisSourceNativeCampusIdVerified:false,currentYearZoneVerified:false,release:'NO_GO'}};
}
module.exports={loadSources,attachReferenceIDs};
