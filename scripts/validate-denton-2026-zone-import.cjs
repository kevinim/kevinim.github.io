#!/usr/bin/env node
'use strict';
// Offline staging check only. It NEVER certifies residential enrollment/Production.
const fs=require('node:fs');
const district='061901', year='2026-27';
const districtHost=/^(?:[a-z0-9-]+\.)?dentonisd\.org$/i;
function httpsUrl(value, official=false){
 try {const u=new URL(value);return u.protocol==='https:' && (!official||districtHost.test(u.hostname));}
 catch{return false;}
}
function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function sharesSegmentIntersection(a,b,c,d){
 const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
 const eps=1e-12;
 // Collinear overlaps and touches at non-adjacent corners are invalid here.
 const on=(x,y,z)=>Math.abs(cross(x,y,z))<eps && z[0]>=Math.min(x[0],y[0])-eps && z[0]<=Math.max(x[0],y[0])+eps && z[1]>=Math.min(x[1],y[1])-eps && z[1]<=Math.max(x[1],y[1])+eps;
 return (ab1*ab2<0&&cd1*cd2<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
}
function ringErrors(ring,label,errors){
 if(!Array.isArray(ring)||ring.length<4){errors.push(label+': fewer than four ring positions');return;}
 const vertices=[];
 for(const xy of ring){
  if(!Array.isArray(xy)||xy.length!==2||!xy.every(Number.isFinite)){
   errors.push(label+': invalid lon/lat point');return;
  }
  const [lon,lat]=xy;
  if(lon< -98.5||lon> -96.0||lat<32.0||lat>34.0)errors.push(label+': outside wide Denton region bounds');
  vertices.push(lon+','+lat);
 }
 if(vertices[0]!==vertices.at(-1))errors.push(label+': unclosed ring');
 if(new Set(vertices.slice(0,-1)).size<3)errors.push(label+': fewer than three distinct vertices');
 let area=0;
 for(let i=0;i<ring.length-1;i++)area+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
 if(Math.abs(area)<1e-12)errors.push(label+': zero-area/degenerate ring');
 for(let i=0;i<ring.length-1;i++)for(let j=i+2;j<ring.length-1;j++){
  if(i===0&&j===ring.length-2)continue;
  if(sharesSegmentIntersection(ring[i],ring[i+1],ring[j],ring[j+1])){
   errors.push(label+': self-intersecting ring');return;
  }
 }
}
function geometryErrors(geometry,label,errors){
 if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type)){
  errors.push(label+': geometry must be Polygon or MultiPolygon');return;
 }
 const groups=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 if(!Array.isArray(groups)||groups.length===0){errors.push(label+': empty polygon');return;}
 groups.forEach((poly,i)=>{
  if(!Array.isArray(poly)||poly.length===0){errors.push(label+': empty polygon ring set');return;}
  poly.forEach((ring,j)=>ringErrors(ring,label+' polygon '+i+' ring '+j,errors));
 });
}
function validate(dataset,meta,officialRows){
 const errors=[];
 if(meta?.district!==district)errors.push('incorrect district TEA ID');
 if(meta?.schoolYear!==year)errors.push('incorrect academic year');
 if(meta?.crs!=='EPSG:4326')errors.push('GeoJSON must use WGS84 lon/lat EPSG:4326');
 if(!httpsUrl(meta?.sourceUrl))errors.push('source URL must be HTTPS');
 if(!httpsUrl(meta?.districtConfirmationUrl,true))errors.push('district confirmation URL must be an official Denton ISD HTTPS page');
 if(meta?.releaseApproved===true || meta?.residentialAssignmentCertified===true)errors.push('staging manifest must not claim Production or residency certification');
 if(dataset?.type!=='FeatureCollection'||!Array.isArray(dataset.features))errors.push('not a GeoJSON FeatureCollection');
 const rows=Array.isArray(officialRows)?officialRows:[];
 const expected=new Map(rows.map(r=>[r.id,r.level]));
 if(expected.size!==rows.length||!expected.size)errors.push('invalid official PDF campus roster');
 const features=Array.isArray(dataset?.features)?dataset.features:[];
 const seen=new Set();
 for(const f of features){
  const id=f?.properties?.campusId;
  const label='campus '+String(id);
  if(f?.type!=='Feature')errors.push(label+': not a GeoJSON Feature');
  if(typeof id!=='string'||!/^061901\d{3}$/.test(id)||!expected.has(id))errors.push(label+': unknown or invalid Denton TEA ID');
  if(seen.has(id))errors.push(label+': duplicate TEA campus ID');
  seen.add(id);
  if(f?.properties?.district!==district)errors.push(label+': wrong district');
  if(f?.properties?.schoolYear!==year)errors.push(label+': wrong school year');
  if(f?.properties?.level!==expected.get(id))errors.push(label+': wrong campus grade level');
  geometryErrors(f?.geometry,label,errors);
 }
 if(features.length!==expected.size)errors.push('campus count differs from official PDF roster: '+features.length+'/'+expected.size);
 for(const id of expected.keys())if(!seen.has(id))errors.push('missing campus '+id);
 return {
  status:errors.length?'NO_GO':'STAGING_GEOMETRY_PASS_NOT_ASSIGNMENT_CERTIFIED',
  productionStatus:'NO_GO',
  residenceFinderHoldoutsVerified:false,
  currentYearEnrollmentCertified:false,
  reviewedCampusCount:features.length,
  expectedCampusCount:expected.size,
  errors
 };
}
if(require.main===module){
 try{
  const [geoPath,metaPath]=process.argv.slice(2);
  if(!geoPath||!metaPath)throw Error('Usage: node scripts/validate-denton-2026-zone-import.cjs <official-geojson-file> <provenance-json-file>');
  const read=x=>JSON.parse(fs.readFileSync(x,'utf8'));
  const result=validate(read(geoPath),read(metaPath),require('../denton-official-zone-references.js').ROWS);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.errors.length)process.exitCode=1;
 }catch(e){console.error('DENTON_IMPORT_NO_GO: '+e.message);process.exitCode=1;}
}
module.exports={validate};
