'use strict';
// Read-only, deterministic sampling audit of pinned school-zone geometries.
// A point-in-polygon match is NOT an actual residence/enrollment determination.
// Never infer missing schools from neighboring zone polygons.
const fs=require('node:fs');
const path=require('node:path');
const GRADES=Object.freeze(['elementary','middle','high']);
const INPUTS=Object.freeze([
 {district:'AISD',path:'allen-attendance-historical.geojson',vintage:'2019 high / 2023 elementary-middle',crossGrade:false},
 {district:'PROSPER',path:'prosper-attendance-2026.geojson',vintage:'2026-27',crossGrade:true}
]);

function polygonParts(geom){
 if(!geom||!Array.isArray(geom.coordinates))return [];
 if(geom.type==='Polygon')return [geom.coordinates];
 if(geom.type==='MultiPolygon')return geom.coordinates;
 return [];
}
function invalidGeometry(geom){
 const errors=[];
 const parts=polygonParts(geom);
 if(!parts.length)return ['missing-or-unsupported-geometry'];
 for(const part of parts){
  if(!Array.isArray(part)||!part.length){errors.push('empty-polygon');continue;}
  for(const ring of part){
   if(!Array.isArray(ring)||ring.length<4){errors.push('short-ring');continue;}
   if(ring.some(p=>!Array.isArray(p)||p.length<2||
     !Number.isFinite(p[0])||!Number.isFinite(p[1])||
     p[0]<-180||p[0]>180||p[1]<-90||p[1]>90)){errors.push('non-wgs84-coordinate');continue;}
   const a=ring[0],b=ring[ring.length-1];
   if(a[0]!==b[0]||a[1]!==b[1])errors.push('open-ring');
   let doubleArea=0;
   for(let i=0;i<ring.length-1;i++)
    doubleArea+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
   if(Math.abs(doubleArea)<1e-12)errors.push('degenerate-ring');
  }
 }
 return [...new Set(errors)];
}
function pointInRing(q,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>q[1])!==(b[1]>q[1])&&
    q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function contains(geom,q){
 return polygonParts(geom).some(part=>part.length>0&&pointInRing(q,part[0])&&
  !part.slice(1).some(hole=>pointInRing(q,hole)));
}
function bounds(features){
 const out=[Infinity,Infinity,-Infinity,-Infinity];
 for(const f of features)for(const part of polygonParts(f.geometry))
  for(const ring of part)for(const p of ring){
   out[0]=Math.min(out[0],p[0]);out[1]=Math.min(out[1],p[1]);
   out[2]=Math.max(out[2],p[0]);out[3]=Math.max(out[3],p[1]);
  }
 return out;
}
function segmentDistanceMeters(q,a,b){
 const dx=111195*Math.cos(q[1]*Math.PI/180),dy=111195;
 const ax=(a[0]-q[0])*dx,ay=(a[1]-q[1])*dy;
 const vx=(b[0]-a[0])*dx,vy=(b[1]-a[1])*dy;
 const len=vx*vx+vy*vy;
 const t=len?Math.max(0,Math.min(1,-(ax*vx+ay*vy)/len)):0;
 return Math.hypot(ax+t*vx,ay+t*vy);
}
function nearestGradeBoundaryMeters(q,features){
 let nearest=Infinity;
 for(const f of features)for(const poly of polygonParts(f.geometry))
  for(const ring of poly)for(let j=0;j<ring.length-1;j++)
   nearest=Math.min(nearest,segmentDistanceMeters(q,ring[j],ring[j+1]));
 return nearest;
}
function roundPoint(q){return q.map(n=>Number(n.toFixed(6)));}
function audit(features,options={}){
 if(!Array.isArray(features))throw Error('features must be an array');
 const sampleAxis=options.sampleAxis||120;
 if(!Number.isInteger(sampleAxis)||sampleAxis<4||sampleAxis>250)throw Error('invalid sampleAxis');
 const invalid=[];
 const usable=[];
 for(let i=0;i<features.length;i++){
  const f=features[i],errors=invalidGeometry(f?.geometry);
  if(!GRADES.includes(f?.properties?.gradeLevel))errors.push('unknown-grade');
  if(!String(f?.properties?.school||'').trim())errors.push('missing-school');
  if(errors.length)invalid.push({featureIndex:i,codes:[...new Set(errors)]});
  else usable.push(f);
 }
 const gradeFeatures=Object.fromEntries(GRADES.map(g=>[g,usable.filter(f=>f.properties.gradeLevel===g)]));
 const absentGradeLayers=options.crossGrade===true?GRADES.filter(g=>gradeFeatures[g].length===0):[];
 const bbox=bounds(usable);
 if(!usable.length)return {schemaVersion:1,district:options.district||'unknown',
  sourceVintage:options.sourceVintage||'unknown',status:'INVALID_DATA',
  features:features.length,validFeatures:0,invalidFeatures:invalid,gradeCounts:{},sampleAxis,checkedGridPoints:0};
 const overlaps=Object.fromEntries(GRADES.map(g=>[g,0]));
 const overlapExamples=[];
 // A strictly deep mismatch is >200 m from EVERY missing grade boundary.
 // The old max-distance count measured ANY missing grade far away and was
 // mistakenly described as deep (133 vs 121 on Prosper's 2026–27 grid).
 let coveredAny=0,completeEHM=0,crossGradeMismatch=0,deepMismatchOver200m=0;
 let anyMissingGradeFarOver200m=0,mixedDepthOver200m=0,unmeasurableDepthSamples=0;
 const missingGrades=Object.fromEntries(GRADES.map(g=>[g,0]));
 const missingGradePatterns={};
 const gapExamples=[];
 for(let xi=0;xi<sampleAxis;xi++)for(let yi=0;yi<sampleAxis;yi++){
  // Offsets avoid treating a grid point on a polygon edge as an interior point.
  const q=[bbox[0]+(bbox[2]-bbox[0])*(xi+0.379)/sampleAxis,
   bbox[1]+(bbox[3]-bbox[1])*(yi+0.381)/sampleAxis];
  const hits=Object.fromEntries(GRADES.map(g=>[g,gradeFeatures[g].filter(f=>contains(f.geometry,q))]));
  for(const g of GRADES){
   const names=[...new Set(hits[g].map(f=>f.properties.school))];
   if(names.length>1){
    overlaps[g]++;
    if(overlapExamples.length<6)overlapExamples.push({grade:g,coordinate:roundPoint(q),schools:names});
   }
  }
  const present=GRADES.filter(g=>hits[g].length);
  if(!present.length)continue;
  coveredAny++;
  if(present.length===3)completeEHM++;
  if(options.crossGrade!==true||present.length===3)continue;
  crossGradeMismatch++;
  const missing=GRADES.filter(g=>!hits[g].length);
  missing.forEach(g=>missingGrades[g]++);
  const pattern=missing.join('+');
  missingGradePatterns[pattern]=(missingGradePatterns[pattern]||0)+1;
  // A globally absent grade layer has no measurable boundary: fail closed.
  // Never render Infinity as an observed large gap or JSON null by accident.
  const gradeDistances=missing.map(g=>({grade:g,
   distanceMeters:gradeFeatures[g].length?nearestGradeBoundaryMeters(q,gradeFeatures[g]):null}));
  const comparable=gradeDistances.every(x=>Number.isFinite(x.distanceMeters));
  const nearestMissingBoundary=comparable?Math.min(...gradeDistances.map(x=>x.distanceMeters)):null;
  const farthestMissingBoundary=comparable?Math.max(...gradeDistances.map(x=>x.distanceMeters)):null;
  if(!comparable)unmeasurableDepthSamples++;
  else{
   if(farthestMissingBoundary>200)anyMissingGradeFarOver200m++;
   if(nearestMissingBoundary>200)deepMismatchOver200m++;
   if(farthestMissingBoundary>200&&nearestMissingBoundary<=200)mixedDepthOver200m++;
  }
  if(gapExamples.length<8&&(!comparable||nearestMissingBoundary>200||gapExamples.length<2))
   gapExamples.push({coordinate:roundPoint(q),present,missing,
    distanceToMissingGradeBoundaryMeters:comparable?Math.round(nearestMissingBoundary):null,
    distancesToEachMissingGradeMeters:gradeDistances.map(x=>({grade:x.grade,
     meters:x.distanceMeters===null?null:Math.round(x.distanceMeters)}))});
 }
 const overlapSampleCount=Object.values(overlaps).reduce((a,b)=>a+b,0);
 return {schemaVersion:1,district:options.district||'unknown',
  sourceVintage:options.sourceVintage||'unknown',
  status:invalid.length||overlapSampleCount||(options.crossGrade&&crossGradeMismatch)?'REVIEW_REQUIRED':'NO_SAMPLED_ANOMALIES',
  qualification:'Sampling and local polygon structure only; neither exact geometry proof nor independent residential school assignment.',
  features:features.length,validFeatures:usable.length,invalidFeatures:invalid,
  gradeCounts:Object.fromEntries(GRADES.map(g=>[g,gradeFeatures[g].length])),
  sampleAxis,checkedGridPoints:sampleAxis*sampleAxis,coveredByAtLeastOneGrade:coveredAny,
  coveredByAllThreeGrades:completeEHM,sameGradeOverlapSampleCounts:overlaps,
  sameGradeOverlapExamples:overlapExamples,crossGradeChecked:options.crossGrade===true,
  crossGradeMismatchSamples:options.crossGrade===true?crossGradeMismatch:null,
  missingGradeSampleCounts:options.crossGrade===true?missingGrades:null,
  absentGradeLayersFromSource:options.crossGrade===true?absentGradeLayers:null,
  unmeasurableDepthSamples:options.crossGrade===true?unmeasurableDepthSamples:null,
  // "deep" means ALL missing grades' nearest zone boundaries exceed 200 m.
  deepMismatchOver200m:options.crossGrade===true?deepMismatchOver200m:null,
  anyMissingGradeFarOver200m:options.crossGrade===true?anyMissingGradeFarOver200m:null,
  mixedDepthOver200m:options.crossGrade===true?mixedDepthOver200m:null,
  missingGradePatternSamples:options.crossGrade===true?missingGradePatterns:null,
  crossGradeExamples:gapExamples};
}
function main(){
 const root=path.resolve(__dirname,'..');
 const results=INPUTS.map(config=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,config.path),'utf8'));
  return audit(data.features,{district:config.district,sourceVintage:config.vintage,crossGrade:config.crossGrade});
 });
 const report={generatedBy:'scripts/school-polygon-linkage-topology.cjs',
  meaning:'Bounded local GeoJSON QA, never a residence assignment/2026-27 approval.',results};
 const out=path.join(root,'artifacts/school-linkage/school-geometry-topology-audit.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 for(const result of results)process.stdout.write('SCHOOL_GIS_TOPOLOGY '+JSON.stringify(result)+'\n');
 // Existing documented anomalies are audit findings, not build failures.
 // Any malformed geometry/metadata is a new hard failure.
 if(results.some(x=>x.invalidFeatures.length>0))process.exitCode=1;
}
if(require.main===module)try{main();}catch(e){
 process.stderr.write('school geometry audit could not run: '+e.message+'\n');process.exitCode=1;
}
module.exports={invalidGeometry,pointInRing,contains,segmentDistanceMeters,audit};
