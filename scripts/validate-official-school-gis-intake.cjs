'use strict';
// Offline intake for a normalized, district-issued attendance GeoJSON.
// Never enables a map layer or publishes GIS geometry.
const fs=require('node:fs');
const LEVELS=new Set(['elementary','middle','high']);
const SCHEMA=1;
function run(manifest, geojson,rights){
 const blockers=[],warnings=[],byGrade={elementary:0,middle:0,high:0};
 const error=x=>blockers.push(x);
 if(manifest?.schemaVersion!==SCHEMA||!manifest.districtCode||
  !/^20\d{2}-20\d{2}$/.test(manifest.schoolYear||'')||
  !/^https:\/\//.test(manifest.sourceUrl||''))
  error('manifest_source_year_or_district_invalid');
 if(manifest?.mapPublishable!==false)error('map_publication_not_authorized');
 const demo=manifest?.demoOnly===true;
 if(!demo){
  const right=rights?.districts?.[manifest?.districtCode];
  if(!right||right.status!=='approved'||right.approvedUses?.publicRedistribution!==true||
    !/^https:\/\//.test(right.consentEvidenceUrl||'')||
    manifest.permissionEvidenceUrl!==right.consentEvidenceUrl||
    !Array.isArray(right.approvedOfficialGisUrls)||
    !right.approvedOfficialGisUrls.includes(manifest.sourceUrl))
   error('real_gis_rights_or_source_not_cleared');
  if(manifest?.independentReviewerApproved!==true||
    !/^https:\/\//.test(manifest?.reviewEvidenceUrl||''))
   error('independent_review_missing');
 }
 if(geojson?.type!=='FeatureCollection'||!Array.isArray(geojson.features)||
    geojson.features.length===0||geojson.features.length>5000){
  error('invalid_feature_collection');
 }
 const maxPoints=30000;
 const seenNames=new Map();
 const feats=Array.isArray(geojson?.features)?geojson.features:[];
 for(let i=0;i<feats.length;i++){
  const f=feats[i],p=f?.properties,g=f?.geometry;
  const label='feature_'+i+':';
  if(f?.type!=='Feature'||!p){error(label+'properties_missing');continue;}
  if(p.district!==manifest.districtCode||p.schoolYear!==manifest.schoolYear||
     !LEVELS.has(p.gradeLevel)||typeof p.school!=='string'||p.school.length<2||
     typeof p.campusId!=='string'||p.campusId.length<2)
   error(label+'campus_year_or_grade_unverified');
  if(LEVELS.has(p.gradeLevel))byGrade[p.gradeLevel]++;
  const key=p.gradeLevel+':'+p.campusId;
  const value=p.school?.toLowerCase().trim();
  if(seenNames.has(key)&&seenNames.get(key)!==value)error(label+'campus_identity_conflict');
  seenNames.set(key,value);
  if(!['Polygon','MultiPolygon'].includes(g?.type)||!Array.isArray(g.coordinates)){
   error(label+'not_polygon_geometry');continue;
  }
  const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  if(!polys.length){error(label+'empty_geometry');continue;}
  let points=0;
  for(const poly of polys){
   if(!Array.isArray(poly)||!poly.length){error(label+'empty_polygon');continue;}
   for(const ring of poly){
    if(!Array.isArray(ring)||ring.length<4){error(label+'short_ring');continue;}
    points+=ring.length;
    if(points>maxPoints){error(label+'too_many_points_for_intake');break;}
    if(!ring.every(pt=>Array.isArray(pt)&&pt.length>=2&&Number.isFinite(pt[0])&&
       Number.isFinite(pt[1])&&Math.abs(pt[0])<=180&&Math.abs(pt[1])<=90)){
      error(label+'invalid_lon_lat');continue;
    }
    const first=ring[0],last=ring[ring.length-1];
    if(first[0]!==last[0]||first[1]!==last[1])error(label+'open_ring');
    const area=Math.abs(ring.slice(1).reduce((sum,v,j)=>{
      const u=ring[j];return sum+u[0]*v[1]-v[0]*u[1];
    },0));
    if(area<1e-11)error(label+'degenerate_ring');
   }
  }
 }
 if(!demo&&Object.values(byGrade).some(n=>n<1))error('three_grade_polygon_coverage_missing');
 warnings.push('geometry_topology_and_school_specific_residential_assignments_require_independent_checks');
 warnings.push('a_pass_does_not_enable_dashboard_or_claim_districtwide_coverage');
 const status=blockers.length?'NO_GO':'SCHEMA_REVIEW_ONLY';
 return {status,district:manifest?.districtCode||null,demoOnly:demo,schoolYear:manifest?.schoolYear||null,
  features:feats.length,byGrade,blockers:[...new Set(blockers)],warnings,
  mapPublishable:false,individualAddressAssignmentVerified:false};
}
if(require.main===module){
 try{
  const [manifestPath,geojsonPath]=process.argv.slice(2);
  if(!manifestPath||!geojsonPath)throw Error('usage: node scripts/validate-official-school-gis-intake.cjs MANIFEST.json NORMALIZED_GEOJSON');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const geo=JSON.parse(fs.readFileSync(geojsonPath,'utf8'));
  const rights=require('../data/finder-derived-source-rights-2026.json');
  const result=run(manifest,geo,rights);
  console.log('OFFICIAL_GIS_INTAKE '+JSON.stringify(result));
  if(result.blockers.length)process.exitCode=1;
 }catch(e){
  console.error('OFFICIAL_GIS_INTAKE_BLOCKED '+e.message);
  process.exitCode=1;
 }
}
module.exports={run};
