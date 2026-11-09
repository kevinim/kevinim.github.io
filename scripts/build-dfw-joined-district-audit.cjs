#!/usr/bin/env node
'use strict';
// Agent04: unified QA-only 108-district view. This does NOT populate production.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
function join(integrity,mainHTTP,candidateHTTP){
 if(!Array.isArray(integrity?.districts)||integrity.districts.length!==108||
  !Array.isArray(mainHTTP?.records)||mainHTTP.records.length!==108||
  !Array.isArray(candidateHTTP?.records)||candidateHTTP.records.length!==107||
  candidateHTTP.sourceIsUnmergedQAOnly!==true||
  candidateHTTP.verifiedResidentialAssignments!==0)
  throw Error('MISSING_OR_UNSAFE_AUDIT_INPUT');
 const index=(rows,label)=>{
  const m=new Map();
  for(const row of rows){
   if(m.has(row.code))throw Error('DUPLICATE_'+label+'_'+row.code);
   m.set(row.code,row);
  }
  return m;
 };
 const main=index(mainHTTP.records,'MAIN'),staged=index(candidateHTTP.records,'STAGED');
 const joined=integrity.districts.map(d=>{
  const current=main.get(d.code),candidate=staged.get(d.code);
  if(!current||(!candidate&&d.code!=='249904'))
   throw Error('DISTRICT_NOT_RECONCILED_'+d.code);
  const reasons=[];
  if(!candidate)reasons.push('P0_MISSING_OFFICIAL_PARENT_SOURCE');
  else if(['HTTP_NOT_FOUND_REVIEW','HTTP_ERROR_INCONCLUSIVE'].includes(candidate.status))
   reasons.push('P1_REGISTERED_LINK_HTTP_FAILURE');
  else if(candidate.status!=='HTTP_RESPONDED_FINDER_NOT_TESTED')
   reasons.push('P2_REGISTERED_LINK_HTTP_REVIEW');
  if(d.campusCoordinateVerification.historicalMissing)
   reasons.push('P1_CAMPUS_HISTORICAL_COORDINATE_GAP');
  if(d.gisAvailability.status==='NOT_CONFIGURED_IN_DASHBOARD')
   reasons.push('P1_NO_CAMPUS_POLYGON_CONFIGURED');
  reasons.push('P0_CURRENT_RESIDENTIAL_ASSIGNMENT_UNVERIFIED');
  return {...d,
   officialFinderAvailability:{...d.officialFinderAvailability,
    mainHTTP:{url:current.url||null,status:current.status,httpStatus:current.httpStatus,
     actualAddressSearchCertified:false},
    unmergedPr173Candidate:candidate?
     {url:candidate.url,status:candidate.status,httpStatus:candidate.httpStatus,
      sourceHeadSha:candidateHTTP.sourceHeadSha,actualAddressSearchCertified:false}:null},
   independentQAReasons:reasons,goNoGo:'NO_GO'
  };
 });
 if(staged.has('249904')||new Set(joined.map(x=>x.code)).size!==108)
  throw Error('INCORRECT_108_DISTRICT_JOIN');
 return {schemaVersion:1,
  sourceMain:'artifacts/agent04-dfw-district-integrity.json',
  sourceMainHTTP:'artifacts/agent04-dfw-finder-link-http.json',
  sourceCandidateHTTP:'artifacts/agent04-pr173-107-official-http.json',
  candidatePr173SourceSha:candidateHTTP.sourceHeadSha,
  sourceCandidateIsUnmerged:true,
  summary:{...integrity.summary,
   registeredInMain:mainHTTP.records.filter(x=>x.url).length,
   registeredInUnmergedPr173:candidateHTTP.records.length,
   stagedHttpResults:candidateHTTP.resultCounts,
   districtRows:joined.length,
   campusPolygonCoverageAllDFW:null,
   independentAddressAssignmentRate:null,releaseStatus:'NO_GO'},
  districts:joined};
}
if(require.main===module){
 try{
  const joined=join(read('artifacts/agent04-dfw-district-integrity.json'),
   read('artifacts/agent04-dfw-finder-link-http.json'),
   read('artifacts/agent04-pr173-107-official-http.json'));
  const out=path.join(ROOT,'artifacts','agent04-dfw-joined-108-district-status.json');
  fs.writeFileSync(out,JSON.stringify(joined,null,2)+'\n');
  console.log('AGENT04_UNIFIED108 '+JSON.stringify({districtRows:joined.districts.length,
   stagedHttpResults:joined.summary.stagedHttpResults,
   releaseStatus:joined.summary.releaseStatus,output:out}));
 }catch(e){console.error('AGENT04_UNIFIED_ERROR '+(e.stack||e));process.exitCode=1;}
}
module.exports={join};
