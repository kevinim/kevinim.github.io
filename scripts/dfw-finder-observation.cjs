'use strict';
// QA parser for district-published WebAppBuilder visible popup text.
// An address selection alone is never a school assignment result.
function parseOfficialZonePopup(text,district){
 const s=String(text||'').replace(/\s+/g,' ').trim();
 const part=s.includes('Attendance Zones')?s.slice(s.indexOf('Attendance Zones')+'Attendance Zones'.length)
  .split(/Attachments:|Zoom to|Attachments\b/i)[0].trim():'';
 const pattern=district==='LISD'
  ? /^Elementary\s*(.*?)\s*Middle\s*(.*?)\s*9th Grade\s*(.*?)\s*HIGH_NAME\s*(.*?)$/i
  : /^Elementary\s*(.*?)\s*Middle\s*(.*?)\s*High\s*(.*?)$/i;
 const m=part.match(pattern);
 if(!m)return {valid:false,reason:'NO_COMPLETE_DISTRICT_ATTENDANCE_ZONE_POPUP'};
 const schools=district==='LISD'?{elementary:m[1],middle:m[2],grade9:m[3],high:m[4]}
  :{elementary:m[1],middle:m[2],high:m[3]};
 if(Object.values(schools).some(x=>!x||!x.trim()||x.length>125))
  return {valid:false,reason:'BLANK_OR_OVERSIZED_SCHOOL_NAME'};
 return {valid:true,schools:Object.fromEntries(Object.entries(schools).map(([k,v])=>[k,v.trim()]))};
}
function distanceMeters(a,b){
 if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return null;
 const rad=Math.PI/180,R=6371008.8;
 const dlat=(b.lat-a.lat)*rad,dlon=(b.lng-a.lng)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function canonical(s){return String(s||'').normalize('NFKD').toUpperCase()
 .replace(/\b(ELEMENTARY|MIDDLE|SCHOOL|HIGH|EL|HS|H S|MS)\b/g,'').replace(/[^A-Z0-9]/g,'');}
function compareIndependentOfficialUI(dashboard,official,{spatialToleranceMeters=75}={}){
 const result={id:dashboard?.id||official?.id||null,status:'UNVERIFIED'};
 if(!dashboard?.map||!official||!official.officialAddressSelected){
  result.reason='MISSING_ADDRESS_SELECTION';return result;
 }
 if(dashboard.map.district!==official.district){
  result.status='DISTRICT_MISMATCH';return result;
 }
 const pos=dashboard.map.selectedHomePoint;
 const center=official.mapAfterChoice?.geoCenter;
 const meters=distanceMeters(pos,center);
 result.geocodeToLocatorMapCenterMeters=meters==null?null:Math.round(meters*10)/10;
 if(meters===null||meters>spatialToleranceMeters){
  result.status='OFFICIAL_MAP_CENTER_NOT_ADDRESS_VALIDATED';return result;
 }
 const parsed=parseOfficialZonePopup((official.visiblePopupText||[]).find(x=>x.includes('Attendance Zones')),official.district);
 if(!parsed.valid){result.status=parsed.reason;return result;}
 const grades=dashboard.map.grades||{},schoolMatch={};
 const levels=['elementary','middle','high'];
 for(const grade of levels){
  if(!Array.isArray(grades[grade])||grades[grade].length!==1){
   result.status='DASHBOARD_GRADE_AMBIGUOUS';result.grade=grade;return result;
  }
  const a=canonical(grades[grade][0].school),b=canonical(parsed.schools[grade]);
  if(!a||!b){result.status='SCHOOL_NAME_MISSING';return result;}
  schoolMatch[grade]={official:parsed.schools[grade],dashboard:grades[grade][0].school,match:a===b};
 }
 if(official.district==='LISD'){
  // The official Finder includes a 9th-grade campus; preserve it as a
  // separately reviewed grade rather than incorrectly merging into high.
  result.grade9=parsed.schools.grade9;
 }
 result.schoolComparisons=schoolMatch;
 if(Object.values(schoolMatch).some(x=>!x.match)){
  result.status='OFFICIAL_FINDER_DASHBOARD_SCHOOL_MISMATCH';return result;
 }
 const expected=official.district==='PISD'?4:3;
 if(dashboard.map.renderedPolygonFeatures<expected || dashboard.map.matchedMarkers<expected){
  result.status='FINDER_SCHOOLS_MATCH_MAP_LINK_INCOMPLETE';return result;
 }
 const years=Object.values(grades).flat().map(x=>String(x.year||''));
 if(years.some(x=>/2025.?26|2019|2023|미확인|unknown/i.test(x))){
  result.status='SCHOOLS_MATCH_BUT_GIS_YEAR_NOT_CERTIFIED';return result;
 }
 result.status='OFFICIAL_UI_AND_DASHBOARD_CURRENT_GIS_CORROBORATED';
 return result;
}
module.exports={parseOfficialZonePopup,distanceMeters,canonical,compareIndependentOfficialUI};
