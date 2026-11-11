#!/usr/bin/env node
'use strict';
// Work-in-progress affine pixel→ground anchor measurement only.
// No publisher geometry is represented by school-building control points.
// Running this file NEVER grants residence-based school assignments.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const PIXEL=path.join(ROOT,'data/cfb-elementary-raster-calibration-draft.json');
const find=fs.readFileSync(PIXEL,'utf8');
const controls=JSON.parse(find);
function solve3(a,b){
 const m=a.map((r,i)=>[...r,b[i]]);
 for(let k=0;k<3;k++){
  let pivot=k;
  for(let r=k+1;r<3;r++)if(Math.abs(m[r][k])>Math.abs(m[pivot][k]))pivot=r;
  [m[k],m[pivot]]=[m[pivot],m[k]];
  if(Math.abs(m[k][k])<1e-8)throw Error('SINGULAR_CONTROL_POINTS');
  const div=m[k][k];for(let j=k;j<4;j++)m[k][j]/=div;
  for(let r=0;r<3;r++)if(r!==k){const f=m[r][k];for(let j=k;j<4;j++)m[r][j]-=f*m[k][j]}
 }
 return m.map(r=>r[3]);
}
function fit(points){
 if(!Array.isArray(points)||points.length<6)throw Error('INSUFFICIENT_ANCHORS');
 const lat0=points.reduce((s,p)=>s+p.latlon[0],0)/points.length;
 const lon0=points.reduce((s,p)=>s+p.latlon[1],0)/points.length;
 const scaleE=111320*Math.cos(lat0*Math.PI/180),scaleN=111320;
 const a=[[0,0,0],[0,0,0],[0,0,0]],eb=[0,0,0],nb=[0,0,0];
 for(const point of points){
  if(!Array.isArray(point.pixel)||!Array.isArray(point.latlon)||!point.pixel.every(Number.isFinite)||!point.latlon.every(Number.isFinite))throw Error('INVALID_ANCHOR');
  const xyz=[1,point.pixel[0],point.pixel[1]];
  const e=(point.latlon[1]-lon0)*scaleE,n=(point.latlon[0]-lat0)*scaleN;
  for(let i=0;i<3;i++){
   eb[i]+=xyz[i]*e;nb[i]+=xyz[i]*n;
   for(let j=0;j<3;j++)a[i][j]+=xyz[i]*xyz[j];
  }
 }
 const east=solve3(a,eb),north=solve3(a,nb);
 function project(x,y){
  const vec=[1,x,y];
  const e=vec.reduce((s,v,i)=>s+v*east[i],0);
  const n=vec.reduce((s,v,i)=>s+v*north[i],0);
  return [lat0+n/scaleN,lon0+e/scaleE];
 }
 const residuals=points.map(p=>{
  const estimate=project(...p.pixel);
  const dLat=(estimate[0]-p.latlon[0])*scaleN,dLon=(estimate[1]-p.latlon[1])*scaleE;
  return {campusId:p.campusId,school:p.school,errorMeters:Math.hypot(dLat,dLon)};
 });
 const sorted=residuals.map(x=>x.errorMeters).sort((a,b)=>a-b);
 const sumSq=sorted.reduce((a,b)=>a+b*b,0);
 return {coefficients:{east,north},origin:[lat0,lon0],controlPointCount:points.length,
  rmsMeters:Math.sqrt(sumSq/points.length),p95Meters:sorted[Math.ceil(sorted.length*.95)-1],
  maxMeters:sorted.at(-1),residuals,project};
}
function evaluate(controls){
 if(controls?.district!=='CFB'||controls?.level!=='elementary'||controls?.status!=='draft-calibration-only'||controls?.publishable!==false)throw Error('INVALID_DRAFT_STATUS');
 const result=fit(controls.controlPoints);
 const acceptableImagePreview=result.rmsMeters<=150&&controls.verifiedPixelAnchors>=8;
 const knownFinderAddressHoldouts=0; // Cannot score until independently geocoded & matched to traced polygons.
 return {
  district:controls.district,level:controls.level,sourceYear:controls.sourceSchoolYear,
  sourceType:'publisher-approved-raster-with-rough-NCES-point-anchors',
  groundRmsMeters:Number(result.rmsMeters.toFixed(1)),
  p95Meters:Number(result.p95Meters.toFixed(1)),
  maxMeters:Number(result.maxMeters.toFixed(1)),
  pixelAnchorsVisuallyVerified:controls.verifiedPixelAnchors,
  controlPoints:result.controlPointCount,
  autoResidenceAssignmentAllowed:false,
  schoolZonePolygonsPublished:0,
  actualReconstructedFinderHoldoutMatches:knownFinderAddressHoldouts,
  imagePreviewAllowed:acceptableImagePreview,
  verdict:'DRAFT_NO_GO',
  reasons:[
   ...(result.rmsMeters>150?['rough_affine_fit_error_over_150m']:[]),
   ...(controls.verifiedPixelAnchors<8?['fewer_than_8_visually_confirmed_pixel_anchors']:[]),
   'no_digitized_and_independently_checked_school_polygons',
   'no_same_address_reconstructed_geometry_vs_live_finder_holds',
   'no_verified_current_year_zone_vintage'
  ],
  residuals:result.residuals.map(x=>({...x,errorMeters:Number(x.errorMeters.toFixed(1))}))
 };
}
if(require.main===module){
 const report=evaluate(controls);
 fs.mkdirSync(path.join(ROOT,'artifacts/cfb-reconstruction'),{recursive:true});
 fs.writeFileSync(path.join(ROOT,'artifacts/cfb-reconstruction/elementary-affine-draft.json'),JSON.stringify(report,null,2)+'\n');
 console.log('CFB_RECONSTRUCTION '+JSON.stringify({verdict:report.verdict,controls:report.controlPoints,rmseMeters:report.groundRmsMeters,p95Meters:report.p95Meters,imagePreviewAllowed:report.imagePreviewAllowed,autoResidenceAssignmentAllowed:false}));
}
module.exports={fit,evaluate};
