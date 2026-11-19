'use strict';
// A fail-closed provenance contract. No PDF, GIS or address fetches here.
// Staging reports distinguish 39 candidate shapes from zero published polygons.
const fs=require('node:fs'),path=require('node:path');
const api=require('../denton-official-zone-references.js');
const EXACT_SOURCE='https://www.dentonisd.org/families/attendance-zones';
const LEVELS=[['elementary',26],['middle',9],['high',4]];
const FLOWER_MOUND='https://gismaps.flower-mound.com/wafmp/rest/services/Basemap/SchoolAttendance_MS/MapServer/0';
function inspect(m){
 const errors=[];
 const requireCheck=(value,label)=>{if(!value)errors.push(label)};
 requireCheck(m?.schemaVersion===1&&m?.district==='061901'&&m?.schoolYear==='2026-27','wrong_district_or_year');
 requireCheck(m?.officialCurrentYearPdfCount===39,'official_pdf_count');
 requireCheck(m?.verifiedCurrentYearSchoolPolygonLayerCount===0&&m?.currentYearSchoolPolygonsAcquired===false&&
  m?.publishCurrentYearGeometry===false&&m?.officialAddressAssignmentCertified===false,'unlicensed_geography_must_remain_closed');
 const s=m?.geoPdfDerivedStaging;
 requireCheck(s?.status==='DERIVED_FROM_OFFICIAL_2026_27_GEOPDF_QA_ONLY'&&
  s?.source===EXACT_SOURCE&&s?.currentOfficialSchoolYear==='2026-27'&&
  s?.schoolPdfRosterCount===39&&s?.previousStagingCandidateCount===39&&
  s?.previousStagingValidCampusIdMatches===39&&
  s?.previousStagingCandidates===undefined&&s?.currentDashboardPolygonCount===0&&
  s?.derivativeRedistributionLicenseVerified===false&&
  s?.independentAddressBoundaryCertified===false&&
  s?.automaticAddressSchoolAssignmentAllowed===false&&
  s?.publicationApproved===false&&
  s?.schoolYearProvenanceNotOriginalDistrictGIS===true,'staging_not_product_gis');
 requireCheck(s?.historicalPublicStreetFinderGradeMatches===9&&s?.historicalPublicStreetFinderGradeQueries===9&&
  s?.previousNearBoundaryPointMeters===73.2&&s?.previousNearBoundaryParcelMeters===20.6&&
  s?.nearBoundaryParcelIsNoGo===true,'near_boundary_evidence_not_satisfied');
 requireCheck(s?.priorQualityEvidenceUrl==='https://github.com/kevinim/kevinim.github.io/actions/runs/42691734933'&&
  s?.priorQualityEvidenceDate==='2026-11-09','historic_not_current_ci_result');
 const groups=s?.aggregatePdfReferences;
 requireCheck(Array.isArray(groups)&&groups.length===3,'missing_geo_pdf_sources');
 if(Array.isArray(groups)){
  const levels=new Set(groups.map(x=>x.level));
  requireCheck(levels.size===3,'duplicate_grade_band');
  for(const [level,count] of LEVELS){
   const row=groups.find(x=>x.level===level);
   requireCheck(row?.expectedCandidatePolygons===count&&row?.url===api.ALL[level]&&
    api.validPdf(row.url),'invalid_aggregate_pdf_'+level);
  }
 }
 const rows=api.ROWS;
 requireCheck(rows.length===39&&api.YEAR==='2026-27','app_roster_count');
 for(const [level,count] of LEVELS)
  requireCheck(rows.filter(x=>x.level===level).length===count,'app_roster_grade_'+level);
 requireCheck(api.GEOPDF_STATUS?.previousStagingCandidates===39&&
  api.GEOPDF_STATUS?.publiclyRenderedPolygons===0&&
  api.GEOPDF_STATUS?.exactResidentialAssignmentCertified===false&&
  api.GEOPDF_STATUS?.derivativeRedistributionApproved===false,'ui_evidence_promotion');
 const source=m?.sources?.find(x=>x.kind==='town-of-flower-mound-partial-municipal-school-assignment-attribute-gis');
 requireCheck(!!source&&source.url===FLOWER_MOUND&&source.usableAsCurrentCampusPolygon===false&&
  source.status==='municipal-polygon-attributes-local-town-extent-year-unverified','town_gis_not_whole_denton');
 const future=m?.sources?.find(x=>x.kind==='future-2028-29-proposed-attendance-rezoning');
 requireCheck(future?.usableAsCurrentCampusPolygon===false&&
  future?.status==='proposal-for-2028-29-not-current'&&
  m?.temporalProvenanceGuard?.futureProposalMayCertifyCurrentYear===false,'future_year_contamination');
 const request=m?.originalVectorRecordsRequest;
 requireCheck(request?.status==='sent-awaiting-response'&&request?.sentOn==='2026-11-09'&&
  request?.receivedResponseAsOf==='not-observed-in-connected-inbox-search-2026-11-18'&&
  request?.licensingConsentVerified===false&&request?.districtOriginalVectorReceived===false&&
  request?.publicReceiptAvailable===false,'unverified_records_response');
 return {status:errors.length?'FAIL':'SOURCE_QA_PASS_GIS_PUBLICATION_NO_GO',errors,
  officialPdfRoster:39,stagingCandidates:39,currentDashboardPolygons:0,
  independentlyCertifiedCurrentHouseAssignments:0,
  sourceOwnerRightsVerified:false};
}
if(require.main===module){
 const file=path.resolve(__dirname,'..','data/denton-2026-27-gis-source-disposition.json');
 const report=inspect(JSON.parse(fs.readFileSync(file,'utf8')));
 console.log('DENTON_GEOPDF_PROVENANCE '+JSON.stringify(report));
 if(report.errors.length)process.exitCode=1;
}
module.exports={inspect};
