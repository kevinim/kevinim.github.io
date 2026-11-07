'use strict';
// Official source responses and a user-entered transcription are distinct evidence types.
// This module never upgrades a 2025–26 GIS polygon to a verified 2026–27 polygon.
const PLANO_2026_27_EXPERIENCE='https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4b48af4';
const PROSPER_OFFICIAL_POINT_URL='https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchLocation';
const OFFICIAL_REVIEW_DISTRICTS=['FISD','PROSPER','PISD','AISD','LISD','CFB'];
const OFFICIAL_REVIEW_LEVELS=['elementary','middle','freshman','high','senior'];
function officialReviewName(name){
 return String(name||'').toLowerCase().replace(/\b(h\s*\.?\s*s\s*\.?|high school)\b/g,'high')
   .replace(/\b(m\s*\.?\s*s\s*\.?|middle school)\b/g,'middle')
   .replace(/\b(el|elem|elementary school)\b/g,'elementary')
   .replace(/\b(school|campus|elementary|middle|high)\b/g,'')
   .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function officialReviewCandidates(assignment,level){
 if(!assignment||!['current','reference','unverified-year','boundary-review'].includes(assignment.status))return [];
 if(assignment.district==='AISD'&&assignment.allen){
  const fields={elementary:2,middle:3,freshman:4,high:5};
  return Number.isInteger(fields[level])?[assignment.allen[fields[level]]].filter(Boolean):[];
 }
 if(!Array.isArray(assignment.features))return [];
 return [...new Set(assignment.features.filter(x=>x.properties?.gradeLevel===level).map(x=>String(x.properties.school||'').trim()).filter(Boolean))];
}
function compareManualSchoolResult(assignment,{district,gradeLevel,schoolName,schoolYear}){
 if(!OFFICIAL_REVIEW_DISTRICTS.includes(district)||!OFFICIAL_REVIEW_LEVELS.includes(gradeLevel)||!schoolName?.trim())return {status:'missing-input'};
 if(schoolYear!=='2026–27')return {status:'year-not-confirmed'};
 if(!assignment||!['current','reference','unverified-year','boundary-review'].includes(assignment.status))return {status:'no-candidate'};
 if(district!==assignment.district)return {status:'district-disagrees',predictedDistrict:assignment.district};
 const options=officialReviewCandidates(assignment,gradeLevel);
 if(options.length!==1)return {status:'no-unique-candidate',options};
 const a=officialReviewName(options[0]),b=officialReviewName(schoolName);
 if(!a||!b)return {status:'name-unrecognized',options};
 return {status:a===b?'manually-reported-match':'manually-reported-mismatch',options,sourceKind:'user-transcribed-not-independently-verified',geometryCurrent:assignment.status==='current'||assignment.status==='boundary-review'};
}
function buildProsperOfficialPointUrl(ll){
 if(!Array.isArray(ll)||ll.length!==2||!Number.isFinite(ll[0])||!Number.isFinite(ll[1])||ll[0]<32.8||ll[0]>33.6||ll[1]<-97.5||ll[1]>-96.2)throw Error('outside Prosper region');
 const p=new URLSearchParams({clientId:'PI5FFG7RYZ1',x:ll[1].toFixed(8),y:ll[0].toFixed(8),schoolId:'-1',gradeId:'-1'});
 return PROSPER_OFFICIAL_POINT_URL+'?'+p;
}
function compareProsperOfficialPoint(assignment,payload){
 if(!assignment||assignment.district!=='PROSPER'||!['current','boundary-review'].includes(assignment.status))return {status:'not-prosper-current'};
 if(payload?.resultCode!==200||!Array.isArray(payload.schools))return {status:'invalid-official-response'};
 const expected=new Set((assignment.features||[]).map(x=>String(x.properties?.schoolCode||'').padStart(3,'0')).filter(x=>/^\d{3}$/.test(x)));
 if(expected.size!==3)return {status:'incomplete-geometry',expected:[...expected]};
 const actual=new Set(payload.schools.map(x=>String(x.schoolCode||'').padStart(3,'0')).filter(x=>/^\d{3}$/.test(x)));
 const missing=[...expected].filter(x=>!actual.has(x));
 return {status:missing.length?'official-code-disagreement':'official-point-codes-match',expected:[...expected],actual:[...actual],missing,pointOnly:true,addressExact:payload.exactAddressMatch===true,sourceKind:'direct-public-official-point-lookup'};
}
if(typeof module!=='undefined')module.exports={officialReviewName,officialReviewCandidates,compareManualSchoolResult,buildProsperOfficialPointUrl,compareProsperOfficialPoint,PLANO_2026_27_EXPERIENCE};
