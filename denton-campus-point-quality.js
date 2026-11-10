'use strict';
// Provenance crosscheck for SCHOOL CAMPUS POINTS; these are not attendance zones.
// Historical 2024-25 locations must NEVER mean current 2026-27 school assignment.
(function(root){
 const DISTRICT='061901',YEAR='2024-25',MAX_METERS=250;
 const rad=v=>v*Math.PI/180;
 function distance(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2||
     !a.every(Number.isFinite)||!b.every(Number.isFinite))return Infinity;
  const A=rad(a[0]),B=rad(b[0]),dLat=B-A,dLon=rad(b[1]-a[1]);
  const h=Math.sin(dLat/2)**2+Math.cos(A)*Math.cos(B)*Math.sin(dLon/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
 }
 function schoolPoint(ll){
  return Array.isArray(ll)&&ll.length===2&&ll.every(Number.isFinite)&&
   ll[0]>32.65&&ll[0]<33.65&&ll[1]>-98&&ll[1]<-96.35;
 }
 function validate(data,nces,schoolPDFs){
  if(data?.schemaVersion!==1||data.district!==DISTRICT||data.schoolLocationVintage!==YEAR||
   data.currentYearLocationVerified!==false||data.attendanceZoneCertified!==false||
   data.readyForProduction!==false||!Array.isArray(data.points)||!Array.isArray(data.excludedIds)||
   !nces||typeof nces.get!=='function'||!Array.isArray(schoolPDFs))
   throw Error('Invalid Denton 2024 point source metadata: fail closed');
  const schoolPDFIds=new Map(schoolPDFs.map(x=>[x.id,x]));
  if(schoolPDFIds.size!==39||data.points.length!==31||data.excludedIds.length!==8)
   throw Error('Unexpected Denton school ID coverage: require revalidation');
  const included=new Set(),verified=new Map();
  for(const p of data.points){
   if(!/^061901\d{3}$/.test(p?.id)||included.has(p.id))throw Error('Invalid or duplicate school ID');
   included.add(p.id);
   const school=schoolPDFIds.get(p.id),other=nces.get(p.id);
   if(!school||school.level!==p.type||!other||!schoolPoint(p.ll)||!schoolPoint(other.ll)||
    p.district!==DISTRICT||p.sourceYear!==YEAR||p.ncesYear!=='2024-2025'||
    p.gradeYearPdfReference!=='2026-27'||p.sourceConfidence!=='two-source-public-campus-point'||
    p.approximate!==true||p.isZoneBoundary!==false||p.publicCampusOnly!==true||
    !(p.geocoderScore>=95)||!Number.isFinite(p.ncesDistanceMeters)||
    p.ncesDistanceMeters>MAX_METERS||distance(p.ll,other.ll)>MAX_METERS+3)
     throw Error('Denton campus GIS point not corroborated: '+p.id);
   verified.set(p.id,Object.freeze({campusId:p.id,status:'historical-campus-point-crosschecked',
    sourceYears:'2024-25 TEA/NCES',independentMaxDistanceMeters:MAX_METERS,
    notSchoolAssignment:true,notCurrentZone:true,notCurrentSiteCertified:true}));
  }
  const excluded=new Set(data.excludedIds);
  if(excluded.size!==8||[...excluded].some(id=>!schoolPDFIds.has(id)||included.has(id))||
   [...schoolPDFIds.keys()].some(id=>!included.has(id)&&!excluded.has(id)))
    throw Error('Unreviewed Denton campus school IDs omitted or duplicated');
  return verified;
 }
 const api=Object.freeze({DISTRICT,YEAR,MAX_METERS,schoolPoint,distance,validate});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DentonCampusPointQuality=api;
})(typeof window!=='undefined'?window:null);
