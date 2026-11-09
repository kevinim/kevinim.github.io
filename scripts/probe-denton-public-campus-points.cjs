#!/usr/bin/env node
'use strict';
// Read-only public school campus coordinate scouting. This does not write data,
// infer zones, touch home addresses or record a residential coordinate.
const pdf=require('../denton-official-zone-references.js');
const ratings=require('../tea-ratings-2026.json').data;
const TEA='https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/EXTERNAL_schools/FeatureServer/0/query';
const NCES='https://services1.arcgis.com/Ua5sjt3LWTPigjyD/ArcGIS/rest/services/Public_School_Locations_Current/FeatureServer/0/query';
function url(base,params){const u=new URL(base);for(const[k,v]of Object.entries(params))u.searchParams.set(k,String(v));return u.toString()}
async function query(base,where,fields='*'){
 const u=url(base,{where,outFields:fields,returnGeometry:'true',outSR:'4326',f:'json',resultRecordCount:'1500'});
 const res=await fetch(u,{signal:AbortSignal.timeout(45000),headers:{Accept:'application/json'}});
 if(!res.ok)throw new Error('Public GIS request HTTP '+res.status+' from '+new URL(base).hostname);
 const j=await res.json();if(j.error||!Array.isArray(j.features))throw Error('Public GIS query error '+JSON.stringify(j.error||j).slice(0,400));
 if(j.exceededTransferLimit)throw Error('Public GIS returned truncated result: stop rather than accepting incomplete campuses');
 return j.features;
}
function cleanId(raw){
 const s=String(raw??'').replace(/[^\d]/g,'');
 return s.length===9?s:null;
}
function point(f){
 const g=f.geometry||{},a=f.attributes||{};
 const lat=Number(g.y??a.LAT),lon=Number(g.x??a.LON);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 // Bounding box around documented Denton ISD campuses, not address assignments.
 if(lat<32.65||lat>33.65||lon< -98||lon> -96.35)return null;
 return [Number(lat.toFixed(6)),Number(lon.toFixed(6))];
}
function distanceMeters(a,b){
 const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b[0]-a[0]),dLon=rad(b[1]-a[1]);
 const v=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(v)));
}
function normalized(v){return String(v||'').toUpperCase().replace(/\b(ELEMENTARY|ELEM|EL|MIDDLE|HIGH|SCHOOL|SCH|ISD|ACADEMY|H\s*S)\b/g,'').replace(/[^A-Z0-9]/g,'')}
async function main(){
 const candidates=await Promise.all([
  query(TEA,"USER_DISTR='061901'").catch(e=>{console.error('TEA_FILTER_CODE_ERROR',String(e));return []}),
  query(TEA,"USER_DIS_1='DENTON ISD'").catch(e=>{console.error('TEA_FILTER_NAME_ERROR',String(e));return []})
 ]);
 const merged=[...new Map(candidates.flat().map(f=>[f.attributes?.OBJECTID_1||f.attributes?.OBJECTID||JSON.stringify(f),f])).values()];
 console.log('TEA_2024_25_PUBLIC_ROWS',JSON.stringify({districtCodeMatches:candidates[0].length,districtNameMatches:candidates[1].length,unique:merged.length,
    firstFields:Object.keys(merged[0]?.attributes||{}).slice(0,40)}));
 const pdfIds=new Set(pdf.ROWS.map(x=>x.id)),valid2026=new Map(ratings.filter(x=>x.district==='061901').map(x=>[x.id,x]));
 const schoolMap=new Map(),missingIds=[],badPoint=[],yearNames=[],duplicates=[];
 for(const f of merged){
  const a=f.attributes||{},id=cleanId(a.USER_SCHOO),ll=point(f);
  if(!id||!pdfIds.has(id))continue;
  if(!valid2026.has(id)){missingIds.push(id);continue}
  if(!ll){badPoint.push({id,name:a.USER_SCH_1,geo:f.geometry||null,sourceAddress:a.USER_SCH_6||null,sourceCity:a.USER_SCH_7||null,ncesId:String(a.USER_NCE_1||'').replace(/[^0-9]/g,'')});continue}
  if(schoolMap.has(id)){duplicates.push(id);continue}
  const name=a.USER_SCH_1||a.USER_SCH_6||a.LONGLABEL||'',current=valid2026.get(id);
  const loose=normalized(name),teaName=normalized(current.officialName||current.name);
  const same=loose===teaName||loose.includes(teaName)||teaName.includes(loose);
  if(!same)yearNames.push({id,sourceName:name,teaName:current.officialName||current.name});
  schoolMap.set(id,{id,name,lat:ll[0],lon:ll[1],ncesId:String(a.USER_NCE_1||'').replace(/[^0-9]/g,''),
   matchType:a.MATCH_TYPE,matchScore:a.SCORE,schoolYear:'2024-25',sourceStatus:a.USER_SCH16||null,
   currentName:current.officialName||current.name,has2026Pdf:pdfIds.has(id),nameLooseMatch:same,
   publicCampusOnly:true});
 }
 const ncesIds=[...new Set([...schoolMap.values()].map(x=>x.ncesId).concat(badPoint.map(x=>x.ncesId)).filter(x=>/^\d{10,13}$/.test(x)))];
 let nces=[];
 if(ncesIds.length){
  const where='NCESSCH IN ('+ncesIds.map(id=>"'"+id+"'").join(',')+')';
  try{nces=await query(NCES,where,'NCESSCH,NAME,LAT,LON,SCHOOLYEAR,STATE');}
  catch(e){console.error('NCES_CROSSCHECK_ERROR',String(e))}
 }
 const ncesBy=new Map(nces.map(f=>[String(f.attributes?.NCESSCH||''),f]));
 const audits=[...schoolMap.values()].map(x=>{
  const match=ncesBy.get(x.ncesId),ll=match&&point(match),
   meters=ll?Math.round(distanceMeters([x.lat,x.lon],ll)):null;
  return {...x,ncesYear:match?.attributes?.SCHOOLYEAR||null,
   ncesName:match?.attributes?.NAME||null,ncesDistanceMeters:meters,
   ncesAgrees:meters!==null&&meters<=250,
   qaStatus:!x.nameLooseMatch?'name-review':meters===null?'single-source-review':meters>250?'coordinate-disagreement':'two-source-campus-point'};
 });
 const count={sourceRows:merged.length,pdfCampusCount:pdfIds.size,matchedIds:schoolMap.size,
  uniqueNcesIds:ncesIds.length,ncesMatched:ncesBy.size,
  doubleSourceAgree:audits.filter(x=>x.qaStatus==='two-source-campus-point').length,
  nameReview:audits.filter(x=>x.qaStatus==='name-review').length,
  missingSource:pdf.ROWS.filter(x=>!schoolMap.has(x.id)).map(x=>({id:x.id,name:x.name})),
  sourceYear:'2024-25',currentYearCampusPointCertified:false,currentAttendanceZoneCertified:false,
  duplicates,missingIds,badPoint,yearNames};
 console.log('DENTON_PUBLIC_CAMPUS_POINT_AUDIT',JSON.stringify(count));
 for(const miss of badPoint){
  const matched=ncesBy.get(miss.ncesId);
  console.log('MISSING_TEAPOINT_NCES_FALLBACK='+JSON.stringify({id:miss.id,name:miss.name,
   ncesId:miss.ncesId,ncesName:matched?.attributes?.NAME||null,ncesYear:matched?.attributes?.SCHOOLYEAR||null,
   ncesPoint:matched?point(matched):null,sourceAddress:miss.sourceAddress,sourceCity:miss.sourceCity,
   teaGeometry:miss.geo}));
 }
 // Public school identities, approximate campus coords only. Not residential observations.
 for(const x of audits)console.log('CAMPUS_POINT_ROW='+JSON.stringify(x));
}
if(require.main===module)main().catch(e=>{console.error('POINT_SCOUT_FATAL',String(e));process.exitCode=1});
module.exports={cleanId,point,distanceMeters,normalized};
