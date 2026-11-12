'use strict';
// Public source suitability triage only. No network requests, scraping or publication.
const fs=require('node:fs');
const path=require('node:path');
function inspect(manifest){
 const errors=[],acceptable=[],pending=[],rejected=[];
 if(manifest?.schemaVersion!==1||manifest?.district!=='CFB')errors.push('invalid_district');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(manifest?.reviewedAt||''))errors.push('review_date_missing');
 const req=manifest?.officialRequest;
 // A public GitHub manifest must NOT contain the owner's private Gmail IDs or message links.
 // The sent evidence was privately crosschecked in the connected Sent mailbox;
 // no district receipt or affirmative response may be inferred from that alone.
 const draft=req?.status==='draft-prepared-not-sent';
 const sent=req?.status==='sent-awaiting-response'&&req?.sentOn==='2026-11-09'&&
   req?.channel==='email'&&req?.sentEvidence==='confirmed-in-connected-Sent-mailbox-2026-11-12'&&
   req?.publicReceiptAvailable===false&&
   req?.receivedResponseAsOf==='not-observed-in-connected-inbox-search-2026-11-12'&&
   typeof req?.evidenceDisclaimer==='string'&&req.evidenceDisclaimer.includes('intentionally excluded');
 const receipt=req?.status==='submitted'&&/^https:\/\//.test(req?.receiptUrl||'');
 if(!draft&&!sent&&!receipt)errors.push('request_status_missing_or_unsubstantiated');
 if(sent&&('receiptUrl' in req||'messageId' in req||'senderEmail' in req||
    'threadId' in req||'privateGmailLink' in req))
  errors.push('private_mail_identifiers_must_not_enter_public_repo');
 if(req?.submitTo!=='publicinformation@cfbisd.edu'||
   !String(req?.subjectIncludes||'').includes('Public Information Request')||
   !String(req?.requestPolicy||'').includes('no paid work without express approval'))
  errors.push('official_records_channel_or_fee_control_missing');
 if(!Array.isArray(manifest?.candidateSources)||manifest.candidateSources.length<5)
  errors.push('candidate_source_inventory_incomplete');
 const ids=new Set();
 for(const c of manifest?.candidateSources||[]){
  if(!c||!c.id||ids.has(c.id)||!/^https:\/\//.test(c.url||'')){
   errors.push('duplicate_or_invalid_source');continue;
  }
  ids.add(c.id);
  if(c.disposition==='verified-current-gis'){
   if(c.schoolSpecificGeometry!==true||
      c.sourceReusePermission!=='approved'||
      c.yearEvidence!=='2026–27'||
      c.owner!=='CFBISD'||
      !/^https:\/\//.test(c.permissionEvidenceUrl||'')||
      c.type!=='district-authorized-current-campus-gis')
    errors.push(c.id+':unsubstantiated_current_geometry_claim');
   else acceptable.push(c.id);
  }else if(c.disposition==='records-request'||c.disposition==='finder-only'||c.disposition==='research-target-only'){
   pending.push(c.id);
  }else if(/^reject-/.test(c.disposition||'')){
   rejected.push(c.id);
  }else errors.push(c.id+':unknown_disposition');
 }
 if(manifest?.district==='CFB'){
  for(const [id,required] of [
   ['cypress-fairbanks-district','reject-district-mismatch'],
   ['arcgis-school-points','reject-unverified-provenance'],
   ['tea-district-geometry','reject-for-campus-polygons']
  ]){
   const c=manifest.candidateSources?.find(s=>s.id===id);
   if(!c||c.disposition!==required)errors.push(id+':mandatory_rejection_missing');
  }
  if(!ids.has('dunaway-cfb-gis-project'))errors.push('gis_contract_source_missing');
 }
 return {status:errors.length?'INVALID':acceptable.length?'CURRENT_GIS_REVIEW_REQUIRED':'NO_VERIFIED_CAMPUS_GIS',
  currentCampusGISValidated:false,schoolAssignmentVerified:false,errors,
  sourceCount:ids.size,pending,rejected,candidateCurrentGeometry:acceptable,
  officialRequestStatus:req?.status||'unknown'};
}
function main(){
 const file=process.argv[2]||'data/cfb-geometry-source-triage-2026.json';
 const m=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
 const audit=inspect(m);
 const dir=path.resolve('artifacts/finder-derived');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'cfb-source-suitability.json'),JSON.stringify(audit,null,2)+'\n');
 console.log('CFB_GIS_SOURCE_TRIAGE '+JSON.stringify(audit));
 if(audit.errors.length)process.exitCode=1;
}
if(require.main===module)try{main();}catch(e){console.error('CFB_GIS_AUDIT_BLOCKED '+e.message);process.exitCode=1;}
module.exports={inspect};
