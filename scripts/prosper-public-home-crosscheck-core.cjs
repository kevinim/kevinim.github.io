'use strict';
// Compare genuinely live district Infofinder point results with previously
// approved 2026-27 zone geometry for public property address QA only.
// The locator and GIS share a vendor/source; not independent enrollment proof.
const {inGeometry}=require('./attendance-geo-audit.cjs');
const LEVELS=['elementary','middle','high'];
const code=s=>String(s??'').trim().padStart(3,'0');
function precise(address,c){
 const a=c?.attributes||{},g=c?.location||{};
 const expected=String(address).match(/^\s*(\d+)\s+(.+),\s*[^,]+,\s*(?:TX|Texas)\s+(\d{5})/i);
 const result=String(c?.address||'').match(/^\s*(\d+)\s+([^,]+),/);
 if(!expected||!result||expected[1]!==result[1])return false;
 const street=s=>s.toLowerCase().replace(/\b(road|rd|street|st|drive|dr|lane|ln|court|ct|trail|trl|boulevard|blvd)\b/g,'')
  .replace(/[^a-z0-9]/g,'');
 if(street(expected[2])!==street(result[2]))return false;
 return c.score>=95&&['PointAddress','Subaddress'].includes(a.Addr_type)&&
  ['TX','TEXAS'].includes(String(a.Region||'').trim().toUpperCase())&&String(a.Postal||'').slice(0,5)===expected[3]&&
  Number.isFinite(g.x)&&Number.isFinite(g.y)&&g.x>=-107&&g.x<=-93&&g.y>=25&&g.y<=37;
}
function compare({address,candidate,locator,geojson}){
 const reasons=[];
 if(!precise(address,candidate))reasons.push('GEOCODE_NOT_PRECISE');
 const source=geojson?.metadata||{};
 if(source.district!=='PROSPER'||source.sourceYear!=='2026–27'||
    source.currentYearConfirmed!==true||source.recordCount!==31||
    !Array.isArray(source.sourceGroupNames)||
    !LEVELS.every(level=>source.sourceGroupNames.some(g=>g==='2026-2027 '+level.toUpperCase()+' SCHOOL')))
  reasons.push('GIS_SOURCE_YEAR_OR_PROVENANCE_UNVERIFIED');
 if(!Array.isArray(geojson?.features)||geojson.features.length!==31)
  reasons.push('GIS_REFERENCE_COUNT_CHANGED');
 if(locator?.resultCode!==200||!Array.isArray(locator.schools))
  reasons.push('OFFICIAL_LOCATOR_RESPONSE_INVALID');
 const point=[candidate?.location?.x,candidate?.location?.y];
 const found={};
 for(const level of LEVELS){
  const hits=(geojson?.features||[]).filter(f=>f.properties?.gradeLevel===level&&inGeometry(point,f.geometry));
  found[level]=hits.map(f=>({school:f.properties.school,code:code(f.properties.schoolCode),
   vintage:f.properties.sourceVintage||null,campusId:f.properties.campusId||null}));
  if(hits.length!==1)reasons.push('GIS_'+level.toUpperCase()+'_NOT_UNIQUE');
  else if(hits[0].properties?.schoolYear!=='2026–27'||hits[0].properties?.sourceYearConfirmed!==true)
   reasons.push('GIS_'+level.toUpperCase()+'_YEAR_UNVERIFIED');
 }
 const official=(locator?.schools||[]).map(x=>({school:String(x.name||x.schoolName||'').slice(0,100),
  code:code(x.schoolCode)}));
 if(official.length!==3||new Set(official.map(x=>x.code)).size!==3)
  reasons.push('OFFICIAL_THREE_GRADES_NOT_UNIQUE');
 if(!reasons.includes('OFFICIAL_THREE_GRADES_NOT_UNIQUE')&&
    LEVELS.every(level=>found[level].length===1)){
  const want=LEVELS.map(level=>found[level][0].code).sort();
  const got=official.map(x=>x.code).sort();
  if(JSON.stringify(want)!==JSON.stringify(got))reasons.push('OFFICIAL_GIS_SCHOOL_CODE_MISMATCH');
 }
 return {status:reasons.length?'NOT_VERIFIED_OR_MISMATCH':'OFFICIAL_POINT_GIS_CORROBORATED',
  reasons,official,geometryByGrade:found,
  sourceYear:'2026–27',authority:'Prosper ISD official locator (Infofinder)',
  independentVendorSource:false,independentFinderUiVerified:false,
  realResidentialEnrollmentVerified:false,mapRenderingVerified:false,
  releaseApproved:false};
}
module.exports={compare,precise,LEVELS};
