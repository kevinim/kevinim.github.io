'use strict';
// District-neutral review of *textual* official rezoning research targets.
// Not an address lookup, a source grant, or a way to publish boundaries.
const fs=require('node:fs');
const path=require('node:path');
const LEVELS=new Set(['elementary','middle','high']);
function inspect(plan,rights){
 const errors=[],byLevel={elementary:0,middle:0,high:0},pending=[];
 if(plan?.schemaVersion!==1||!/^[A-Za-z0-9_-]{2,20}$/.test(plan?.districtCode||''))errors.push('invalid_district');
 if(!/^20\d{2}-20\d{2}$/.test(plan?.sourceSchoolYear||'')||
  !/^20\d{2}-20\d{2}$/.test(plan?.requestedVerificationYear||''))errors.push('invalid_source_or_target_year');
 if(!/^https:\/\//.test(plan?.officialSource||''))errors.push('missing_official_source');
 if(plan?.sourceNature!=='district-approved-rezoning-narrative-not-a-geocoded-campus-polygon')errors.push('narrative_must_not_claim_geometry');
 if(plan?.displayMapGeometry!==false)errors.push('map_display_must_be_disabled');
 if(!Array.isArray(plan?.targets)||!plan.targets.length)errors.push('no_review_targets');
 const registered=rights?.districts?.[plan?.districtCode];
 const cleared=registered?.status==='approved'&&registered.approvedUses?.derivativeGeometry===true
  &&registered.approvedUses?.publicRedistribution===true;
 const seen=new Set();
 for(const t of plan?.targets||[]){
  if(!t||typeof t.id!=='string'||!/^[a-z0-9_-]{6,90}$/.test(t.id)||seen.has(t.id)){errors.push('invalid_or_duplicate_target');continue;}
  seen.add(t.id);
  if(!LEVELS.has(t.level)){errors.push(t.id+':invalid_grade');continue;}
  byLevel[t.level]++;
  if(!t.approvedCampus2025||!t.areaLabel||t.sourceUrl!==plan.officialSource)
   errors.push(t.id+':source_or_area_missing');
  if('address' in t||'unit' in t||'coordinates' in t||'lat' in t||'lon' in t)
   errors.push(t.id+':raw_address_or_coordinate_not_allowed');
  if(t.mapPublishable!==false)errors.push(t.id+':map_publish_prohibited');
  // Narrative never becomes live current-year proof, even if flags are edited.
  if(t.finder2026Verified===true||Number(t.independentHoldoutsVerified)>0)
   errors.push(t.id+':unsupported_current_year_or_holdout_claim');
  pending.push({id:t.id,grade:t.level,
   approved2025:t.approvedCampus2025,
   area:t.areaLabel,kind:t.reason,edgeOrUnitException:!!t.needsSideOfRoadOrUnitCheck,
   next:'Obtain licensed/current-year official Finder result and independent residential checks'});
 }
 return {status:errors.length?'INVALID':cleared?'TARGETS_READY_FOR_APPROVED_SAMPLING':'SOURCE_RIGHTS_PENDING',
  district:plan?.districtCode||null,referenceYear:plan?.sourceSchoolYear||null,
  targetYear:plan?.requestedVerificationYear||null,permissionCleared:cleared,
  mapPublishable:false,counts:byLevel,targetCount:pending.length,
  errors,pending};
}
function main(){
 const file=process.argv[2]||'data/cfb-rezoning-boundary-review-targets-2026.json';
 const root=process.cwd();
 const plan=JSON.parse(fs.readFileSync(path.resolve(root,file),'utf8'));
 const rights=require('../data/finder-derived-source-rights-2026.json');
 const audit=inspect(plan,rights);
 const dir=path.resolve(root,'artifacts/finder-derived');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'cfb-rezoning-review-plan.json'),JSON.stringify(audit,null,2)+'\n');
 console.log('FINDER_BOUNDARY_REVIEW '+JSON.stringify({status:audit.status,
  district:audit.district,targetCount:audit.targetCount,counts:audit.counts,
  errors:audit.errors,permissionCleared:audit.permissionCleared,published:false}));
 if(audit.errors.length)process.exitCode=1;
}
if(require.main===module)try{main();}catch(e){
 console.error('FINDER_REVIEW_BLOCKED '+String(e.message).replace(/[\r\n]/g,' '));
 process.exitCode=1;
}
module.exports={inspect};
