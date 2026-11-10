#!/usr/bin/env node
'use strict';
/**
 * Conservative OFFLINE pilot: convert independently checked, licensed public
 * residential Finder samples into tiny, SAMPLE-SUPPORTED local rectangles.
 * Never infer a district-wide attendance boundary or live school assignment.
 * Input and output belong in gitignored artifacts/, not the public repository.
 * No network requests, credentials, address submission, or browser automation.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const FINDER='https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/';
const LEVELS=Object.freeze(['elementary','middle','high']);
const SLOTS=Object.freeze(['SW','NW','NE','SE','CENTER']);
const fail=reason=>{throw Error('CFB_ESTIMATE_'+reason)};
const validDate=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s))&&/^20\d\d-\d\d-\d\dT/.test(s);
function recent(s,now){return validDate(s)&&Date.parse(s)<=now+300000&&now-Date.parse(s)<=90*86400000}
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const isObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
const common=(a,b)=>Math.abs(a-b)<1e-9;
function pointZone(sample,box){
 const [w,s,e,n]=box;
 if(!finite(sample.lon)||!finite(sample.lat)||sample.lon<=w||sample.lon>=e||sample.lat<=s||sample.lat>=n)return null;
 const x=(sample.lon-w)/(e-w),y=(sample.lat-s)/(n-s);
 if(x<=.30&&y<=.30)return 'SW';
 if(x<=.30&&y>=.70)return 'NW';
 if(x>=.70&&y>=.70)return 'NE';
 if(x>=.70&&y<=.30)return 'SE';
 if(x>=.35&&x<=.65&&y>=.35&&y<=.65)return 'CENTER';
 return 'INTERIOR';
}
function validateBox(box){
 if(!Array.isArray(box)||box.length!==4||!box.every(finite))fail('INVALID_BBOX');
 const [w,s,e,n]=box;
 if(!(w>=-97.25&&e<=-96.60&&s>=32.70&&n<=33.20&&w<e&&s<n))fail('OUTSIDE_CFB_REGION');
 const width=(e-w)*111320*Math.cos((s+n)/2*Math.PI/180),height=(n-s)*111132;
 if(width<20||height<20||width>125||height>125)fail('CELL_OUTSIDE_20_TO_125_METERS');
 return {widthMeters:width,heightMeters:height,areaKm2:width*height/1e6};
}
function rectanglesOverlap(a,b){
 return a[0]<b[2]-1e-9&&a[2]>b[0]+1e-9&&a[1]<b[3]-1e-9&&a[3]>b[1]+1e-9;
}
function validateSample(p,now){
 if(!isObject(p)||!/^[a-zA-Z0-9_-]{8,80}$/.test(p.id||''))fail('INVALID_SAMPLE_ID');
 if(!['training','holdout'].includes(p.partition)||!['source-analyst','independent-qa'].includes(p.verifiedBy))fail('REVIEW_PARTITION_MISSING');
 if(p.verifiedBy!==(p.partition==='training'?'source-analyst':'independent-qa'))fail('HOLDOUT_NOT_INDEPENDENT');
 if(p.addressKind!=='public-listed-residential-base'||p.unitAddressRecorded!==false)fail('PRIVATE_OR_UNIT_ADDRESS_REJECTED');
 if(p.lookupMethod!=='native-official-autocomplete-assigned-schools')fail('NOT_OFFICIAL_ASSIGNMENT');
 if(p.finder!==FINDER||!recent(p.checkedAt,now))fail('SAMPLE_SOURCE_STALE_OR_UNVERIFIED');
 if(!/^EV-[A-Z0-9-]{6,50}$/.test(p.evidenceId||''))fail('UNTRACEABLE_EVIDENCE');
 if(!isObject(p.assignments)||!finite(p.lat)||!finite(p.lon))fail('INCOMPLETE_ASSIGNMENT');
 for(const level of LEVELS){
  const a=p.assignments[level];
  if(!isObject(a)||!/^\d{9}$/.test(a.campusId||'')||typeof a.campusName!=='string'||a.campusName.length<3||a.campusName.length>120)
   fail('CAMPUS_IDENTITY_MISSING_'+level);
 }
 // Defensive input lint; neither addresses nor names/units belong in a public artifact.
 for(const forbidden of ['address','street','unit','resident','person','email','phone','rawFinderResponse'])
  if(Object.prototype.hasOwnProperty.call(p,forbidden))fail('SENSITIVE_FIELD_'+forbidden);
}
function buildCandidate(data,{now=Date.now()}={}){
 if(!isObject(data)||data.schemaVersion!==1||data.district!=='CFB'||data.finder!==FINDER)
  fail('INVALID_DATASET_SOURCE');
 if(!/^20\d{2}-20\d{2}$/.test(data.schoolYear||''))fail('ACADEMIC_YEAR_REQUIRED');
 const permission=data.permission;
 if(!isObject(permission)||permission.status!=='written-scope-approved'||
    permission.scope!=='offline-public-residential-sampling-and-derived-map'||!/^https:\/\//.test(permission.evidenceUrl||'')||
    !recent(permission.reviewedAt,now))fail('WRITTEN_PERMISSION_REQUIRED');
 if(!Array.isArray(data.samples)||!Array.isArray(data.cells)||!data.cells.length||data.cells.length>500)
  fail('NO_VALIDATED_CELLS');
 if(data.samples.length>20000)fail('EXCESS_SAMPLE_COUNT');
 const ids=new Set(),evidenceIds=new Set();
 for(const p of data.samples){
  validateSample(p,now);
  if(ids.has(p.id)||evidenceIds.has(p.evidenceId))fail('DUPLICATE_SAMPLE_OR_EVIDENCE');
  ids.add(p.id);evidenceIds.add(p.evidenceId);
 }
 const cellIds=new Set(),cells=[],features=[];
 const scoreBand=level=>LEVELS.includes(level);
 for(const cell of data.cells){
  if(!isObject(cell)||!/^[a-z0-9-]{4,64}$/.test(cell.id||'')||cellIds.has(cell.id))
   fail('INVALID_CELL_ID');
  cellIds.add(cell.id);
  const bounds=validateBox(cell.bbox);
  if(cells.some(c=>rectanglesOverlap(c.bbox,cell.bbox)))fail('OVERLAPPING_UNVERIFIED_CELLS');
  cells.push(cell);
  const train=data.samples.filter(p=>p.cellId===cell.id&&p.partition==='training');
  const holdout=data.samples.filter(p=>p.cellId===cell.id&&p.partition==='holdout');
  if(train.length<5||holdout.length<3)fail('INSUFFICIENT_SAMPLE_DENSITY_'+cell.id);
  const trainSlots=new Set();
  for(const p of train){
   const slot=pointZone(p,cell.bbox);
   if(!SLOTS.includes(slot))fail('MISSING_CORNER_OR_CENTER_PROOF');
   trainSlots.add(slot);
  }
  if(SLOTS.some(x=>!trainSlots.has(x)))fail('MISSING_5_WAY_GEOGRAPHIC_COVERAGE');
  const holdoutZones=new Set();
  for(const p of holdout){
   const slot=pointZone(p,cell.bbox);
   if(!slot)fail('HOLDOUT_OUTSIDE_CELL');
   holdoutZones.add(slot);
  }
  if(holdoutZones.size<3)fail('HOLDOUT_NOT_SPATIALLY_DIVERSE');
  // All samples inside a candidate box must agree, not only a selected subset.
  const allInside=data.samples.filter(p=>pointZone(p,cell.bbox)!==null);
  if(allInside.some(p=>p.cellId!==cell.id))fail('CROSS_CELL_SAMPLE_CONFLICT');
  const first=train[0].assignments;
  for(const p of [...train,...holdout]){
   if(!pointZone(p,cell.bbox))fail('SAMPLE_OUTSIDE_CELL');
   for(const level of LEVELS){
    if(p.assignments[level].campusId!==first[level].campusId||
       p.assignments[level].campusName!==first[level].campusName)
     fail('CAMPUS_ASSIGNMENT_MISMATCH_'+level);
   }
  }
  const coords=new Set([...train,...holdout].map(p=>p.lon.toFixed(7)+','+p.lat.toFixed(7)));
  if(coords.size!==train.length+holdout.length)fail('REUSED_ADDRESS_POINT');
  const [w,s,e,n]=cell.bbox;
  for(const level of LEVELS){
   if(!scoreBand(level))fail('UNSUPPORTED_LEVEL');
   const school=first[level];
   const footprint=crypto.createHash('sha256')
     .update(data.schoolYear+'|'+cell.id+'|'+level+'|'+[...train,...holdout].map(p=>p.evidenceId).sort().join('|'))
     .digest('hex').slice(0,24);
   features.push({
    type:'Feature',
    geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]},
    properties:{
     district:'CFB',level,campusId:school.campusId,campusName:school.campusName,
     provenance:'finder-derived-estimate',current:false,officialGIS:false,reviewed:false,
     uncertaintyDocumented:true,sourceCheckedAt:new Date(now).toISOString(),
     independentHoldoutCount:holdout.length,independentHoldoutMismatches:0,
     trainingPublicResidentialCount:train.length,areaKm2:Number(bounds.areaKm2.toFixed(6)),
     maxCellWidthMeters:Number(bounds.widthMeters.toFixed(2)),
     maxCellHeightMeters:Number(bounds.heightMeters.toFixed(2)),
     evidenceFingerprint:footprint,
     confidence:'uncertainty-unquantified; supported-local-cell-only',
     footnote:'공식 CFB Finder의 공개 주거건물 주소 결과 '+(train.length+holdout.length)+
      '건으로 검사한 소구역 참고 추정선입니다. 공식 배정 경계·2026–27 법적 배정선이 아니며, 미검사 지역과 예외 주소는 확인할 수 없습니다. 최종 학교 배정은 공식 Finder에서 직접 확인하세요.'
    }
   });
  }
 }
 const assigned=new Set(data.samples.map(p=>p.cellId));
 if([...assigned].some(id=>!cellIds.has(id)))fail('ORPHANED_SAMPLES');
 return {
  schemaVersion:1,district:'CFB',schoolYear:data.schoolYear,
  sourceType:'official-finder-derived-estimate',
  finder:FINDER,
  finderTermsReviewed:true,reviewerApproved:false,
  publishable:false,manualIndependentApprovalRequired:true,
  policy:'No full attendance zones; small bounded sample-supported estimated cells only',
  generatedAt:new Date(now).toISOString(),
  coverage:{referenceCells:cells.length,schoolLevelPatches:features.length,
   districtWideCampusCoveragePercent:null,certifiedResidentialAssignmentPercent:null},
  features
 };
}
function cli(){
 const input=process.argv[2],out=process.argv[3];
 if(!input||!out){console.error('Usage: node scripts/build-cfb-finder-derived-cells.cjs artifacts/<approved-samples>.json artifacts/<review-only-output>.json');process.exitCode=2;return;}
 const root=path.resolve('artifacts')+path.sep,absIn=path.resolve(input),absOut=path.resolve(out);
 if(!absIn.startsWith(root)||!absOut.startsWith(root))fail('INPUT_OUTPUT_MUST_STAY_GITIGNORED');
 const built=buildCandidate(JSON.parse(fs.readFileSync(absIn,'utf8')));
 fs.mkdirSync(path.dirname(absOut),{recursive:true});
 fs.writeFileSync(absOut,JSON.stringify(built,null,2)+'\n',{mode:0o600});
 console.log('CFB_ESTIMATE_REVIEW_ONLY '+JSON.stringify({
  published:false,featureCount:built.features.length,referenceCells:built.coverage.referenceCells,
  output:out
 }));
}
if(require.main===module){try{cli()}catch(e){console.error(String(e.message||e));process.exitCode=1}}
module.exports={buildCandidate,pointZone,validateBox};
