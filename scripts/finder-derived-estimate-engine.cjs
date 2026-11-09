'use strict';
// Candidate-only geometry inferred from independently checked official Finder
// outcomes. Never a substitute for district-issued school attendance polygons.
// No automated fetching, address collection, or GIS publication occurs here.
const LEVELS=Object.freeze(['elementary','middle','high']);
const SCHOOL_YEAR=/^20[0-9]{2}-20[0-9]{2}$/;
const ZIP=/^[0-9]{5}$/;
const SAMPLE_ID=/^[a-z0-9_-]{4,64}$/i;
const MAX_SAMPLES=500;
function check(condition,reason){if(!condition)throw Error(reason);}
function metersXY(lonLat,baseLat){
 return [lonLat[0]*111320*Math.cos(baseLat*Math.PI/180),lonLat[1]*111320];
}
function sqDist(a,b){return (a[0]-b[0])**2+(a[1]-b[1])**2;}
function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function insideStrict(p,a,b,c){
 const s=cross(a,b,c);
 if(Math.abs(s)<1e-8)return false;
 const v=[cross(a,b,p)/s,cross(b,c,p)/s,cross(c,a,p)/s];
 return v.every(n=>n>0.0001&&n<0.9999);
}
function strictSegmentsIntersect(a,b,c,d){
 const x1=cross(a,b,c),x2=cross(a,b,d),y1=cross(c,d,a),y2=cross(c,d,b);
 return x1*x2<0&&y1*y2<0;
}
function trianglesOverlap(a,b){
 const A=a.xy,B=b.xy;
 if(A.some(p=>insideStrict(p,...B))||B.some(p=>insideStrict(p,...A)))return true;
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)
  if(strictSegmentsIntersect(A[i],A[(i+1)%3],B[j],B[(j+1)%3]))return true;
 return false;
}
function validateInput(input){
 check(input&&input.schemaVersion===1,'invalid_schema_version');
 check(typeof input.districtCode==='string'&&/^[a-z0-9_-]{2,20}$/i.test(input.districtCode),'invalid_district_code');
 check(SCHOOL_YEAR.test(input.schoolYear)&&Number(input.schoolYear.slice(5))===Number(input.schoolYear.slice(0,4))+1,'invalid_school_year');
 check(input.source&&/^https:\/\//.test(input.source.finderUrl||''),'official_finder_url_missing');
 check(input.source.verifiedAt&&/^\d{4}-\d\d-\d\d$/.test(input.source.verifiedAt),'source_verification_date_missing');
 const demo=input.demoOnly===true;
 if(!demo)check(input.source.permission?.status==='approved'&&
   /^https:\/\//.test(input.source.permission?.evidenceUrl||''),
   'data_reuse_permission_not_verified');
 check(Array.isArray(input.campuses)&&input.campuses.length>=3,'campus_registry_missing');
 const campuses=new Map();
 for(const c of input.campuses){
  check(typeof c.id==='string'&&SAMPLE_ID.test(c.id)&&!campuses.has(c.id),'invalid_or_duplicate_campus_id');
  check(LEVELS.includes(c.level)&&typeof c.name==='string'&&c.name.trim().length>=3,'invalid_campus');
  campuses.set(c.id,c);
 }
 check(Array.isArray(input.observations)&&input.observations.length<=MAX_SAMPLES,'invalid_sample_count');
 const ids=new Set();
 for(const o of input.observations){
  check(o&&SAMPLE_ID.test(o.id)&&!ids.has(o.id),'invalid_or_duplicate_sample_id');
  ids.add(o.id);
  check(!('address' in o)&&!('unit' in o)&&!('residentName' in o),
   'raw_household_information_must_not_be_stored');
  check(['training','holdout'].includes(o.role),'sample_role_missing');
  check(Array.isArray(o.point)&&o.point.length===2&&
   Number.isFinite(o.point[0])&&Number.isFinite(o.point[1])&&
   Math.abs(o.point[0])<=180&&Math.abs(o.point[1])<=90,'invalid_point');
  check(ZIP.test(o.zip),'invalid_zip');
  check(o.residentialParcelVerified===true&&o.officialFinderVerified===true&&
   SAMPLE_ID.test(o.evidenceId||''),'unverified_residential_observation');
  check(o.schoolYear===input.schoolYear,'sample_year_mismatch');
  check(o.assignment&&LEVELS.every(level=>campuses.has(o.assignment[level])&&
    campuses.get(o.assignment[level]).level===level),'campus_level_assignment_mismatch');
 }
 return {demo,campuses};
}
function build(input,options={}){
 const {demo,campuses}=validateInput(input);
 const maxEdgeMeters=options.maxEdgeMeters===undefined?180:options.maxEdgeMeters;
 const minimumHoldouts=options.minimumHoldouts===undefined?3:options.minimumHoldouts;
 check(Number.isFinite(maxEdgeMeters)&&maxEdgeMeters>0&&maxEdgeMeters<=250,'unsafe_max_edge');
 check(Number.isInteger(minimumHoldouts)&&minimumHoldouts>=3,'insufficient_holdout_policy');
 const rows=input.observations;
 const baseLat=rows.length?rows.reduce((sum,x)=>sum+x.point[1],0)/rows.length:32.9;
 const projected=new Map(rows.map(r=>[r.id,metersXY(r.point,baseLat)]));
 const candidates=[],diagnostics={testedTriangles:0,tooWide:0,tooSmall:0,
  missingIndependentHoldout:0,assignmentConflict:0,overlapWithDifferentCampus:0};
 for(const level of LEVELS){
  for(const [id,campus] of campuses){
   if(campus.level!==level)continue;
   const training=rows.filter(r=>r.role==='training'&&r.assignment[level]===id)
    .sort((a,b)=>a.id.localeCompare(b.id));
   const holds=rows.filter(r=>r.role==='holdout');
   check(training.length<=32,'training_density_requires_tiling');
   for(let i=0;i<training.length;i++)for(let j=i+1;j<training.length;j++)
    for(let k=j+1;k<training.length;k++){
     diagnostics.testedTriangles++;
     const a=training[i],b=training[j],c=training[k];
     const ps=[a,b,c].map(r=>projected.get(r.id));
     const lengths=[sqDist(ps[0],ps[1]),sqDist(ps[1],ps[2]),sqDist(ps[2],ps[0])];
     if(Math.max(...lengths)>maxEdgeMeters**2){diagnostics.tooWide++;continue;}
     if(Math.abs(cross(...ps))/2<50){diagnostics.tooSmall++;continue;}
     const interior=rows.filter(r=>insideStrict(projected.get(r.id),...ps));
     const conflicts=interior.filter(r=>r.assignment[level]!==id);
     if(conflicts.length){diagnostics.assignmentConflict++;continue;}
     const evidence=holds.filter(r=>interior.includes(r)&&r.assignment[level]===id);
     if(evidence.length<minimumHoldouts){diagnostics.missingIndependentHoldout++;continue;}
     const positions=[a.point,b.point,c.point];
     if(cross(...ps)<0){positions.reverse();ps.reverse();}
     candidates.push({level,id,campus,xy:ps,feature:{
      type:'Feature',
      properties:{district:input.districtCode,school:campus.name,campusId:id,gradeLevel:level,
       schoolYear:input.schoolYear,sourceType:'official-finder-derived-estimate',
       provenance:'finder-derived-estimate',confidence:'limited-local-interpolation',
       independentHoldoutCount:evidence.length,independentHoldoutMismatches:0,
       trainingSupportCount:3,uncertaintyDocumented:true,sourceCheckedAt:input.source.verifiedAt,
       reviewed:false,publishable:false,displayMode:'finder-derived-unreviewed',
       disclaimer:'ESTIMATE ONLY — not an official attendance boundary; verify each address with the district Finder'},
      geometry:{type:'Polygon',coordinates:[[...positions,positions[0]]]}}});
    }
  }
 }
 const rejected=new Set();
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  if(candidates[i].level!==candidates[j].level||candidates[i].id===candidates[j].id)continue;
  if(trianglesOverlap(candidates[i],candidates[j])){
   rejected.add(i);rejected.add(j);diagnostics.overlapWithDifferentCampus++;
  }
 }
 const features=candidates.filter((c,i)=>!rejected.has(i)).map(c=>c.feature);
 check(features.length<=400,'candidate_geometry_too_large_for_review');
 return {type:'FeatureCollection',metadata:{
  schemaVersion:1,district:input.districtCode,schoolYear:input.schoolYear,
  sourceUrl:input.source.finderUrl,sourceCheckedAt:input.source.verifiedAt,
  method:'local-sampled-triangles-v1',demoOnly:demo,
  status:features.length?'CANDIDATE_REVIEW_REQUIRED':'INSUFFICIENT_EVIDENCE',
  publicationApproved:false,fullCoverageClaim:false,
  disclaimer:'Finder-derived local candidate geometry; not an official GIS attendance zone.',
  diagnostics},features};
}
module.exports={build,validateInput,insideStrict,trianglesOverlap,LEVELS};
