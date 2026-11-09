#!/usr/bin/env node
'use strict';
// Redacted source lineage synthesis for Agent07, never enrollment approval.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
function campusRow(row){
 if(!Array.isArray(row.officialCodes)||row.officialCodes.length!==3)return false;
 const grades=['elementary','middle','high'];
 const gis=grades.map(g=>row.GIS?.[g]??row.GISSchoolCodesByGrade?.[g]);
 if(gis.some(v=>!Array.isArray(v)||v.length!==1))return false;
 const cross=gis.map(x=>x[0]);
 if(cross.some(x=>!/^043912\d{3}$/.test(String(x.campusId||''))||
  String(x.code||'')!==String(x.campusId).slice(-3)))return false;
 const expected=[...row.officialCodes].sort().join(',');
 const fromGIS=cross.map(x=>x.code).sort().join(',');
 return expected===fromGIS;
}
function assess(original,otherZip,officialUi){
 const errors=[];
 const check=(v,s)=>{if(!v)errors.push(s)};
 check(original?.district==='PROSPER'&&original?.academicYear==='2026–27'&&
  original?.productionReleaseApproved===false,'ORIGINAL_SOURCE_INVALID');
 check(otherZip?.district==='PROSPER'&&otherZip?.academicYear==='2026-27'&&
  otherZip?.release==='NO_GO'&&otherZip?.schoolEnrollmentCertified===false,
  'SECOND_ZIP_SOURCE_INVALID');
 check(officialUi?.schemaVersion===1&&officialUi?.officialUrl==='https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1'&&
  officialUi?.schoolAssignmentIndependentlyCertified===false&&
  officialUi?.productionAuthorized===false,'FINDER_UI_SOURCE_INVALID');
 const a=(original?.results||[]).filter(r=>r.status==='OFFICIAL_POINT_GIS_CORROBORATED');
 const b=(otherZip?.cases||[]).filter(r=>r.status==='OFFICIAL_POINT_GIS_CORROBORATED');
 check(a.length>=3&&a.every(campusRow),'ORIGINAL_POINT_CROSSWALK_INCOMPLETE');
 check(b.length>=1&&b.every(campusRow),'SECOND_ZIP_POINT_CROSSWALK_INCOMPLETE');
 check(original?.results?.filter(r=>r.status!=='OFFICIAL_POINT_GIS_CORROBORATED')
   .every(r=>!r.officialCodes?.length),'QUARANTINE_NOT_RETAINED');
 check(new Set([...a.map(r=>r.id),...b.map(r=>r.sampleId)]).size===a.length+b.length,
  'DUPLICATED_PUBLIC_RESIDENTIAL_SAMPLES');
 const ids=[
  ...a.map(r=>({sampleId:r.id,zip:'75078',technicalCorroboration:true})),
  ...b.map(r=>({sampleId:r.sampleId,zip:'75035',technicalCorroboration:true}))
 ];
 const zips=[...new Set(ids.map(r=>r.zip))].sort();
 const u=(officialUi?.cases||[]);
 const uiObserved=u.filter(x=>x.status==='UI_VISIBLE_SCHOOL_RESULT'&&x.hasVisibleGradeResult===true);
 const valid=errors.length===0;
 return {schemaVersion:1,sourcePRs:[172,175,188],district:'PROSPER',academicYear:'2026-27',
  technicalStatus:valid?'TWO_ZIP_CORRELATED_CAMPUS_SOURCE_READY_FOR_REVIEW':'INCOMPLETE_OR_INVALID_SOURCE',
  sourceErrors:errors,
  summary:{originalPublicHomeCorroboration:a.length,additionalSecondZipHomes:b.length,
   technicalTotal:ids.length,zipCodes:zips,
   currentlyRedactedIndependentUiGradeResultCandidates:uiObserved.length,
   independentHumanReviewedSamples:0,quarantinedOriginalAddresses:(original?.results||[]).length-a.length},
  redactedPublicCaseIds:ids,
  candidacy:{independentOfficialFinderReviewStillNeeded:true,sourceLineageCorrelated:true,
   schoolAssignmentLevel2Approved:false,currentGISLevel1Approved:false,
   sourceEvidenceDoesNotCertifyStudentEligibility:true},
  production:{status:'NO_GO',ownerSignoffMissing:true}};
}
if(require.main===module){
 try{
  const r=assess(read('artifacts/prosper-real-home/official-lookup-vs-gis.json'),
   read('artifacts/prosper-real-home/second-zip-source-crosscheck.json'),
   read('artifacts/prosper-real-home/finder-ui-browser-observation.json'));
  const out=path.join(ROOT,'artifacts/prosper-real-home/prosper-two-zip-staged-evidence.json');
  fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');
  console.log('PROSPER_TWO_ZIP_STAGED_EVIDENCE '+JSON.stringify({technicalStatus:r.technicalStatus,
   errors:r.sourceErrors,summary:r.summary,level2Approved:false,production:'NO_GO'}));
  if(r.sourceErrors.length)process.exitCode=1;
 }catch(e){console.error('PROSPER_STAGE_BRIDGE_MISSING_EVIDENCE');process.exitCode=1;}
}
module.exports={assess,campusRow};
