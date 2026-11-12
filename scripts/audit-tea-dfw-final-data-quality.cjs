'use strict';
/*
 * Independent, offline, current-main data quality synthesis.
 * Validates source-to-source semantics, NOT an online TEA refresh, actual
 * residential assignment, physical parcel geocoding or redistribution rights.
 * Never exports personal locations, suppressed counts or invented school IDs.
 */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const FILES=Object.freeze({
 ratings:'tea-ratings-2026.json',
 accountability:'data/tea-accountability-2026-verified-batch.json',
 staar:'data/tea-staar-meets-2026-verified-batch.json',
 peims:'data/tea-peims-2025-26-statewide-parity-audit-2282.json',
 progress:'data/tea-profile-progress-2026.json',
 legacy:'data/tea-2026-uat-progress.json',
 matrix:'data/dfw-school-coverage-matrix-2026.json',
 locality:'data/tea-texasworks-locality-2026.json',
 transitions:'data/dfw-noncfb-campus-transition-evidence-2026.json',
 exceptions:'data/tea-2026-staar-missing-row-qa-exceptions.json'
});
function load(){return {...Object.fromEntries(Object.entries(FILES).map(([k,v])=>[k,read(v)])),
 lifecycle:require('../school-lifecycle.js')};}
function inspect(x){
 const errors=[];
 const check=(yes,code)=>{if(!yes)errors.push(code)};
 const {ratings,accountability,staar,peims,progress,legacy,matrix,locality,transitions,exceptions,lifecycle}=x;
 const rows=Array.isArray(ratings?.data)?ratings.data:[];
 const ids=new Map(rows.map(r=>[r.id,r]));
 const a=accountability?.campuses||{},s=staar?.campuses||{},race=peims?.campuses||{};
 const idSet=new Set(ids.keys());
 check(rows.length===2282&&ids.size===2282&&[...ids.keys()].every(id=>/^\d{9}$/.test(id)),'inventory_identity');
 check(accountability?.accountabilityYear===2026&&accountability?.schoolYear==='2025-26'&&staar?.accountabilityYear===2026&&staar?.schoolYear==='2025-26','academic_year');
 check(Object.keys(a).length===ids.size&&Object.keys(s).length===ids.size,'academic_cardinality');
 check(Object.keys(race).length===ids.size,'peims_audit_cardinality');
 const domains=['studentAchievement','schoolProgress','closingTheGaps'];
 const subjects=['reading','math','science','socialStudies'];
 let domainsAll=0,staarAny=0,staarMissing=0,pairedOverall=0;
 for(const [id,row] of ids){
  const d=a[id],t=s[id];
  if(!d||!t||!race[id]||d.districtId!==id.slice(0,6)||
     d.overall?.rating!==row.rating||d.overall?.score!==row.score){
   check(false,'academic_id_or_rating_parity');continue;
  }
  const dn=domains.filter(k=>d[k]?.status==='reported').length;
  const sn=subjects.filter(k=>t[k]?.status==='reported').length;
  domainsAll+=Number(dn===3);staarAny+=Number(sn>0);
  if(t.reading?.status==='not-in-source'){
   staarMissing++;
   check(subjects.every(k=>t[k]?.status==='not-in-source'&&t[k]?.value===null),'staar_absent_not_zero');
  }
  if(row.rating!=='Not Rated'&&dn===0)pairedOverall++;
  for(const k of subjects){
   const v=t[k];
   if(!v||!['reported','unavailable','suppressed','not-in-source'].includes(v.status)||
     (v.status!=='reported'&&v.value!==null)||
     (v.status==='reported'&&(!Number.isFinite(v.value)||v.value<0||v.value>100)))
     check(false,'staar_status_semantics');
  }
 }
 check(domainsAll===2063&&staarAny===2105&&staarMissing===110&&pairedOverall===67,'academic_expected_coverage');
 check(progress?.official2026?.campuses===2282&&
       progress.official2026.domainAllReported===domainsAll&&
       progress.official2026.staarAnyReported===staarAny&&
       progress.official2026.staarSourceAbsent===staarMissing&&
       progress.productionMetricSemantics?.officialAcademicBatches?.state==='deployed'&&
       progress.productionMetricSemantics?.officialAcademicBatches?.integrationPullRequest===264&&
       progress.productionMetricSemantics?.historicalManualImportCountersAreNotOfficialBatchCoverage===true,
       'production_progress_parity');
 check(legacy?.schemaVersion===1&&legacy?.counts?.campuses===2282&&
       legacy.counts.domainAllReported===domainsAll&&legacy.counts.subjectAnyReported===staarAny&&
       legacy.counts.staarSourceRowAbsent===staarMissing&&
       legacy.productionIntegration?.status==='deployed'&&
       legacy.productionIntegration?.pullRequest===264&&
       /Production integrated/.test(legacy.stage||''),'legacy_aggregate_status_stale');
 const p=peims?.summary||{};
 check(peims?.schoolYear==='2025-26'&&p.totalInventoryCampuses===2282&&
       p.rawRaceCellMismatches===0&&p.missingRaceCampusRows===0&&
       p.duplicateOfficialGroupRows===0&&p.exactRawRaceCellMatches===15974&&
       p.raceSlots===15974&&p.exactPublishedRaceCells===8277&&
       p.suppressedRaceCells===5141&&p.notListedRaceCells===2556&&
       p.allSevenRaceGroupsPublished===6&&p.fullShareGenderReconciled===6&&
       p.genderTotalExact===2126&&p.genderTotalProtected===156&&
       p.knownPublishedRaceSumExceedsPublicGenderTotal===0,'peims_independent_parity_summary');
 check(peims?.auditAsOf==='2026-11-11'&&
       typeof peims?.reviewedUpstream?.headBlobSha==='string'&&
       peims.reviewedUpstream.headBlobSha.length===40,'peims_source_audit_provenance');
 const miss=exceptions?.positiveGradeNoSTAAR||[];
 const unclear=miss.filter(r=>['aea-registered','other-review'].includes(r.classification));
 check(exceptions?.totals?.staARowAbsent===110&&
       exceptions.totals.positiveGrade3to12ButNoRow===38&&
       miss.length===38&&unclear.length===14&&
       miss.filter(r=>r.classification==='jjaep').length===19&&
       miss.filter(r=>r.classification==='daep').length===5&&
       unclear.every(r=>r.specificMissingRowReasonConfirmed===null&&
         r.grades3to12>0&&s[r.campusId]?.reading?.status==='not-in-source'),
       'staar_14_unknown_reasons_not_safely_quarantined');
 const loc=locality?.campuses||[];
 const byKind=Object.groupBy(loc,r=>r.locationEvidence);
 const inRows=byKind['operator-address-in-11-county-msa']||[];
 const outRows=byKind['operator-address-outside-11-county-msa']||[];
 const pendRows=byKind['pending-exact-name-crosswalk']||[];
 check(loc.length===41&&new Set(loc.map(r=>r.campusId)).size===41&&
       [inRows.length,outRows.length,pendRows.length].join(',')==='6,34,1'&&
       loc.every(r=>ids.get(r.campusId)?.officialName===r.officialCampusName&&
          r.campusId.startsWith('061806'))&&
       pendRows[0]?.campusId==='061806029'&&
       locality.counts?.operatorAddressOutside11CountyMSA===34,
       'texasworks_operator_location_crosswalk');
 check(matrix?.summary?.sourceCampusRows===2182&&
       matrix?.summary?.publicISDs===108&&
       matrix?.summary?.publicISDsWithRegisteredParentRoute===107&&
       matrix?.summary?.campusPolygonCoverageAllDFWPercent===null&&
       matrix?.summary?.exactAddressAssignmentCoveragePercent===null,
       'district_county_proxy_misrepresented_as_gis');
 const entries=transitions?.entries||[];
 const known=entries.filter(e=>e.presentInTea2026Snapshot===true);
 const newCampuses=entries.filter(e=>e.presentInTea2026Snapshot===false);
 const inactive=known.filter(e=>e.regularAssignmentCampus2026_27===false);
 const future=known.find(e=>e.campusId==='220919106');
 const feeder=known.find(e=>e.campusId==='220919102');
 check(entries.length===7&&known.length===5&&newCampuses.length===2&&inactive.length===3&&
       known.every(e=>e.campusId&&ids.get(e.campusId)?.name===e.schoolNameFromTEA)&&
       inactive.every(e=>lifecycle?.isRetiredCampus({district:e.districtCode,id:e.campusId,name:e.schoolNameFromTEA})===true)&&
       newCampuses.every(e=>e.campusId===null&&e.status==='new-campus-absent-from-snapshot'&&
          e.effectiveAcademicYear==='2026-27')&&
       future?.regularAssignmentCampus2026_27===true&&future?.effectiveAcademicYear==='2027-28'&&
       feeder?.regularAssignmentCampus2026_27===true&&feeder?.effectiveAcademicYear==='2026-27'&&
       !lifecycle.isRetiredCampus({district:'220919',id:'220919106',name:'DON T DURHAM INT'})&&
       lifecycle.isRetiredCampus({district:'FISD',id:'043905041',name:'Staley Middle'}),
       'active_school_lifecycle_or_new_school_parity');
 const warnings=[
  'geo_2182_is_administrative_county_proxy_not_physical_dcfw_certification',
  'operator_location_41_records_source_addresses_not_independent_point_geocodes',
  'current_2026_27_residential_school_zone_certification_not_established',
  'peims_2276_campuses_do_not_have_fully_public_seven_group_whole_school_shares',
  'staar_14_campuses_individual_missing_source_row_reason_not_officially_resolved',
  'two_2026_27_new_campuses_do_not_have_TEa_2026_rating_ids',
  'source_parity_was_independently_checked_on_2026_11_11_not_re_downloaded_in_this_offline_check'
 ];
 return {
  schemaVersion:1,qaAsOf:'2026-11-12',
  sourceScope:'immutable-repository-snapshot-with-previous-independently-reviewed-TEA-CSV-parity',
  status:errors.length?'BLOCKED':'PASS_WITH_KNOWN_LIMITATIONS',
  permittedUse:'official_published_academic_metrics_and_published_only_ethnicity_context',
  prohibitedUse:['complete_whole_school_ethnicity_shares_from_masked_cells','certified_residential_school_assignment','administrative_county_as_physical_campus_location'],
  academic:{inventory:ids.size,matchedAcademicRows:Object.keys(a).length,domainAllReported:domainsAll,staarAnyReported:staarAny,
   staARowsAbsent:staarMissing,officialScoreYear:2026,assessedSchoolYear:'2025-26',pairedOverallRatingWithNoOwnDomains:pairedOverall},
  ethnicity:{raceSlots:p.raceSlots,exactOriginalCellsMatched:p.exactRawRaceCellMatches,mismatches:p.rawRaceCellMismatches,
   publishedCells:p.exactPublishedRaceCells,maskedCells:p.suppressedRaceCells,unlistedCells:p.notListedRaceCells,
   wholeSchoolSevenGroupSharesVerified:p.fullShareGenderReconciled,fullPublicEnrollmentDenominators:p.genderTotalExact,
   sourceAuditAsOf:peims?.auditAsOf},
  geographic:{sourceRowsByAdministrativeCounty:matrix?.summary?.sourceCampusRows,
   verifiedAllCampusPhysicalLocations:false,officialDistrictParentRoutes:matrix?.summary?.publicISDsWithRegisteredParentRoute,
   publicDistrictCount:matrix?.summary?.publicISDs,
   texasworksOperatorLocality:{local:inRows.length,nonLocal:outRows.length,pending:pendRows.length,pendingCampusIds:pendRows.map(r=>r.campusId)},
   certifiedAllDfwPolygons:false,certifiedHouseholdAssignments:false},
  operating2026_27:{transitionEntries:entries.length,archivedNotCurrentAssignments:inactive.length,
   existingYearOrFeederExceptions:known.length-inactive.length,
   newWithoutTEA2026Rating:newCampuses.length,
   futureClosureCurrentlyActive:future?.campusId||null},
  staARowInvestigation:{sourceAbsent:staarMissing,positiveGradeNoSourceRow:miss.length,
   evidenceClasses:{jjaep:19,daep:5,aea:3,other:11},exactReasonStillUnknown:unclear.length,
   affectedPublicCampusIds:unclear.map(r=>r.campusId).sort()},
  errors:[...new Set(errors)],warnings,
  releasePolicy:{officialScoresForComparison:errors.length===0,
   publishedOnlyRaceContext:errors.length===0,
   entireRaceCompositionForEveryCampus:false,allDFWGeolocationVerified:false,
   automaticResidentialSchoolAssignment:false}
 };
}
if(require.main===module){
 const report=inspect(load());
 process.stdout.write('TEA_DFW_FINAL_DATA_QUALITY '+JSON.stringify(report)+'\n');
 if(report.errors.length)process.exitCode=1;
}
module.exports={inspect,load,FILES};
