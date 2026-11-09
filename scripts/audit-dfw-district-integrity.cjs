#!/usr/bin/env node
'use strict';
// Agent 04: reproducible 108-ISD identity, point and source audit. No enrollment claim.
// No network access, no GIS mutation, no home addresses or application UI changes.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const {DISTRICT_REGISTRY} = require('../district-registry.js');
const {RETIRED_CAMPUSES_2026, lifecycleNameKey} = require('../school-lifecycle.js');
const {official} = require('../trusted-link-policy.js');
const {COUNTIES} = require('./build-dfw-school-coverage-matrix.cjs');
const read = (root, p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const validPoint = p => Array.isArray(p?.ll) && p.ll.length === 2 &&
 Number.isFinite(p.ll[0]) && Number.isFinite(p.ll[1]) &&
 p.ll[0] > 31 && p.ll[0] < 35 && p.ll[1] > -100 && p.ll[1] < -94;
const normalize = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
function load(root = ROOT) {
 return {
  tea: read(root, 'tea-ratings-2026.json'),
  nces: read(root, 'nces-locations-2024.json'),
  local: read(root, 'schools.json'),
  matrix: read(root, 'data/dfw-school-coverage-matrix-2026.json'),
  polygonBaseline: read(root, 'data/school-polygon-linkage-baseline.json'),
  identityBaseline: read(root, 'data/dfw-campus-identity-baseline-2026.json'),
  pointExceptionEvidence: read(root, 'data/dfw-public-isd-missing-point-evidence-2026.json'),
  provenance: read(root, 'school-data-provenance.json'),
  registry: DISTRICT_REGISTRY,
  retired: RETIRED_CAMPUSES_2026
 };
}
function audit(input) {
 const {tea, nces, local, matrix, polygonBaseline, identityBaseline, pointExceptionEvidence, provenance, registry, retired} = input;
 const errors = [], notes = [];
 const check = (ok, code) => { if (!ok) errors.push(code); };
 const counties = new Set(COUNTIES);
 const rows = tea.data.filter(c => counties.has(c.districtCounty));
 const teaIDs = new Set();
 const byDistrict = new Map();
 for (const c of rows) {
  check(/^\d{9}$/.test(c.id), 'INVALID_TEA_ID_' + String(c.id));
  check(c.id.slice(0,6) === (c.district.match(/^\d{6}$/) ? c.district : c.id.slice(0,6)),
   'TEA_DISTRICT_ID_CONFLICT_' + c.id);
  check(!teaIDs.has(c.id), 'DUPLICATE_TEA_ID_' + c.id);
  teaIDs.add(c.id);
  const key = c.id.slice(0,6);
  if (!byDistrict.has(key)) byDistrict.set(key, []);
  byDistrict.get(key).push(c);
 }
 check(matrix.summary.sourceCampusRows === rows.length, 'MATRIX_TEA_CENSUS_MISMATCH');
 check(matrix.summary.publicISDs === 108, 'PUBLIC_ISD_DENOMINATOR_CHANGED');
 check(matrix.summary.teaDistrictCodes === byDistrict.size, 'TEA_DISTRICT_DENOMINATOR_MISMATCH');
 check(matrix.summary.campusPolygonCoverageAllDFWPercent === null &&
       matrix.summary.exactAddressAssignmentCoveragePercent === null,
       'UNVERIFIED_COVERAGE_MUST_BE_NULL');
 const ncesIndex = new Map(), ncesDuplicates = new Set();
 for (const p of nces.data) {
  if (ncesIndex.has(p.id)) ncesDuplicates.add(p.id);
  ncesIndex.set(p.id, p);
 }
 for (const id of teaIDs) check(!ncesDuplicates.has(id), 'DUPLICATE_NCES_POINT_' + id);
 const localSchools = new Map();
 for (const s of local.schools || []) {
  const k = s.district + '|' + normalize(s.name);
  if (!localSchools.has(k)) localSchools.set(k, []);
  localSchools.get(k).push(s);
 }
 const exceptions=new Map();
 check(Array.isArray(pointExceptionEvidence.records) &&
  pointExceptionEvidence.records.length === identityBaseline.pointExceptionCount,
  'POINT_EXCEPTION_CENSUS_CHANGED');
 for (const e of pointExceptionEvidence.records || []) {
  check(!exceptions.has(e.id),'DUPLICATE_POINT_EXCEPTION_'+e.id);
  check(/^\d{9}$/.test(e.id) && typeof e.classification === 'string' &&
   e.verifiedCurrentCoordinates === false && e.standardAttendancePolygonVerified === false &&
   Array.isArray(e.officialSources) && e.officialSources.length > 0 &&
   e.officialSources.every(u => typeof u === 'string' && u.startsWith('https://')),
   'UNSAFE_POINT_EXCEPTION_EVIDENCE_'+e.id);
  exceptions.set(e.id,e);
 }
 const registryRows = new Map();
 for (const r of matrix.districts) {
  check(!registryRows.has(r.code), 'DUPLICATE_DISTRICT_' + r.code);
  registryRows.set(r.code, r);
  check((byDistrict.get(r.code) || []).length === r.teaCampusRecords,
   'MISSING_OR_EXTRA_CAMPUS_' + r.code);
  check((byDistrict.get(r.code) || []).every(c => c.districtName === r.name),
   'DISTRICT_NAME_DRIFT_' + r.code);
 }
 for (const id of byDistrict.keys()) check(registryRows.has(id), 'UNREGISTERED_TEA_DISTRICT_' + id);
 const publicISDs = matrix.districts.filter(r => r.category === 'public-isd');
 check(publicISDs.length === 108, 'ISD_ROW_COUNT_CHANGED');
 const campusResults = [], districts = [];
 const provenanceByKey = new Map(provenance.districts.map(d => [d.code, d]));
 const mismatchNames = [];
 for (const d of publicISDs) {
  const key = d.parentGuidance.registryKey || d.code, r = registry[key] || null;
  const src = provenanceByKey.get(key) || null;
  const baselineSource = polygonBaseline.districts[key] || null;
  const schoolRows = byDistrict.get(d.code) || [];
  const hasRoute = d.parentGuidance.status === 'registered-official-source';
  const officialUrl = hasRoute ? d.parentGuidance.officialUrl : null;
  check(!hasRoute || (!!r && r.official === officialUrl && official(officialUrl) === officialUrl),
   'UNTRUSTED_OR_UNMAPPED_OFFICIAL_URL_' + d.code);
  check(hasRoute || officialUrl === null, 'UNVERIFIED_ROUTE_HAS_URL_' + d.code);
  const gisConfigured = !!r?.zoneKey;
  const refSource = !!baselineSource;
  check(!refSource || !!r, 'REFERENCE_WITHOUT_DISTRICT_REGISTRY_' + d.code);
  check(!gisConfigured || !!r?.zoneKey, 'INVALID_ZONE_KEY_' + d.code);
  const expectedGeometryStatus = refSource ? 'reference-browser-minimum-only' :
   gisConfigured ? 'configured-but-no-reviewed-reference' : 'no-dashboard-school-polygons-configured';
  check(d.geometry.status === expectedGeometryStatus, 'GIS_MATRIX_SOURCE_STATUS_DRIFT_' + d.code);
  if (refSource) check(d.geometry.referenceLoadedMinimum === baselineSource.minimumLoaded &&
    d.geometry.referenceMatchedMinimum === baselineSource.minimumLinked,
    'GIS_REFERENCE_DENOMINATOR_DRIFT_' + d.code);
  else check(d.geometry.referenceMatchedMinimum === null &&
    d.geometry.matchedLoadedPercent === null &&
    d.geometry.confirmedCurrentYear === false,
    'INVENTED_CAMPUS_GIS_COVERAGE_' + d.code);
  let pointRecords = 0, missingPoints = 0, invalidPoints = 0, knownRetired = 0, futureChanges=0;
  let directoryTypeHints = 0;
  const missingID = [], pointAnomaly = [], campusNoPolygon = [];
  const schoolNames = new Set();
  for (const c of schoolRows) {
   const n = normalize(c.name);
   if (schoolNames.has(n)) mismatchNames.push({districtCode:d.code,id:c.id,name:c.name,reason:'DUPLICATE_NORMALIZED_NAME_REVIEW'});
   schoolNames.add(n);
   const p = ncesIndex.get(c.id);
   const pointState = !p ? 'NO_HISTORICAL_NCES_POINT' :
    validPoint(p) ? 'HISTORICAL_NCES_POINT_NOT_CURRENT_CERTIFIED' : 'INVALID_HISTORICAL_POINT';
   if (!p) { missingPoints++; missingID.push(c.id);
    check(exceptions.has(c.id),'UNEXPLAINED_MISSING_PUBLIC_POINT_'+c.id);
   } else if (!validPoint(p)) { invalidPoints++; pointAnomaly.push(c.id); }
   else pointRecords++;
   if (p) check(!exceptions.has(c.id),'STALE_MISSING_POINT_EVIDENCE_'+c.id);
   const lifecycle = retired.find(x => (x.district === key || x.district === d.code) &&
     ((x.id && x.id === c.id) || (!x.id && lifecycleNameKey(x.name) === lifecycleNameKey(c.name)))) || null;
   const lifecycleStart=lifecycle ? Number(String(lifecycle.retiredFrom).slice(0,4)) : null;
   const futureLifecycle=!!lifecycle && Number.isFinite(lifecycleStart) && lifecycleStart>2026;
   if (lifecycle && !futureLifecycle) knownRetired++;
   if (futureLifecycle) futureChanges++;
   const hints = localSchools.get(key + '|' + n) || [];
   if (hints.length) directoryTypeHints++;
   const missingReason = lifecycle ? 'CAMPUS_LIFECYCLE_EXCEPTION_REVIEW' :
    !gisConfigured ? 'SCHOOL_POLYGON_SOURCE_NOT_CONFIGURED' :
    !refSource ? 'NO_REVIEWED_CAMPUS_LINKAGE_REFERENCE' :
    'SCHOOL_ID_TO_POLYGON_NOT_INDEPENDENTLY_CERTIFIED';
   if (missingReason !== 'SCHOOL_ID_TO_POLYGON_NOT_INDEPENDENTLY_CERTIFIED') campusNoPolygon.push(c.id);
   campusResults.push({
    id:c.id, school:c.name, districtCode:d.code, districtName:d.name,
    lifecycle:lifecycle ? {status:futureLifecycle?'FUTURE_CHANGE_NOT_EFFECTIVE_IN_2026_27':
      'HISTORICAL_RECORD_RETIRED_OR_CHANGED',source:lifecycle.source,effective:lifecycle.retiredFrom}
      : {status:'NOT_REVIEWED'},
    gradeRange:{min:null,max:null,source:'TEA ratings snapshot has no grade-range columns; local type hint is not a verified grade range',
      directoryTypeHint:hints.length===1 ? hints[0].type : null},
    coordinate:{status:pointState,exceptionEvidence:exceptions.has(c.id) ?
     {classification:exceptions.get(c.id).classification,reason:exceptions.get(c.id).reason,
      publishedAddressOnly:exceptions.get(c.id).publishedAddress,
      officialSources:exceptions.get(c.id).officialSources,
      currentPointOrZoneCertified:false} : null,
     sourceYear:nces.schoolYear || '2024–25',
      lat:p && validPoint(p) ? p.ll[0] : null, lon:p && validPoint(p) ? p.ll[1] : null,
      independentlyVerifiedCurrent:false},
    schoolBoundaryLinkage:{status:missingReason,exactSchoolPolygonMatched:null,
      referenceLoadedDirectoryMinimum:baselineSource?.minimumLoaded ?? null,
      referenceLinkedDirectoryMinimum:baselineSource?.minimumLinked ?? null},
    actualAddressAssignment:{verified:false,schoolYear:null,reason:'NO_INDEPENDENT_RESIDENTIAL_FINDER_CERTIFICATION'},
    disposition:'NO_GO'
   });
  }
  if (d.code === identityBaseline.allenDistrict) {
   check(pointRecords >= identityBaseline.allenMinimumMatchedHistoricalPoints,
    'ALLEN_CAMPUS_POINT_DISAPPEARANCE');
  }
  const reason = !hasRoute ? 'P0_OFFICIAL_PARENT_ROUTE_NOT_REGISTERED' :
   missingPoints > 0 ? 'P1_HISTORICAL_CAMPUS_COORDINATES_MISSING' :
   !gisConfigured ? 'P1_CAMPUS_ATTENDANCE_GIS_NOT_CONFIGURED' :
   !src || !String(src.geometryYear).includes('2026') || !String(src.geometryYear).includes('27')
    ? 'P1_GIS_VINTAGE_OR_FINDER_YEAR_UNCERTAIN' : 'P1_EXACT_CAMPUS_BOUNDARY_LINKAGE_NOT_CERTIFIED';
  const priority = reason.startsWith('P0') ? 'P0' : 'P1';
  districts.push({
   code:d.code, name:d.name, campusCount:schoolRows.length,
   officialFinderAvailability:{status:hasRoute?'REGISTERED_URL_NOT_LIVE_TESTED':'NO_VERIFIED_URL',
    url:officialUrl, kind:d.parentGuidance.lookupType || null, liveHttpStatus:null,
    liveAddressSearchVerified:false},
   gisAvailability:{status:gisConfigured?'CONFIGURED_IN_DASHBOARD':'NOT_CONFIGURED_IN_DASHBOARD',
    districtReferenceMeasured:refSource, referenceMode:baselineSource?.mode || null,
    geometryYear:src?.geometryYear || null, yearCaution:d.parentGuidance.yearCaution || null},
   gisSchoolCoverage:{status:refSource?'BROWSER_DIRECTORY_REFERENCE_MINIMUM_ONLY':'NOT_MEASURED',
    referenceLoadedMinimum:baselineSource?.minimumLoaded ?? null,
    referenceLinkedMinimum:baselineSource?.minimumLinked ?? null,
    exactTEACampusMatched:null, exactTEACampusCoveragePercent:null},
   campusCoordinateVerification:{historicalMatched:pointRecords,historicalMissing:missingPoints,
    invalidPointRecords:invalidPoints,currentYearIndependentlyVerified:0,coordinateCoverageIsNotCertification:true},
   schoolToBoundaryLinkage:{exactSchoolVerified:0,exactSchoolUnverified:schoolRows.length,
    status:'NO_PER_CAMPUS_2026_27_LINKAGE_CERTIFICATION'},
   assignmentVerification:{certifiedRealResidentialSamples:0,status:'NO_INDEPENDENT_FINDER_GRADE_YEAR_HOLDOUT'},
   dataYear:{tea:tea.year,teaStatus:tea.status,nces:nces.schoolYear,geometry:src?.geometryYear || null},
   gradeRangeVerification:{verifiedCampusCount:0,unknownCampusCount:schoolRows.length,localTypeHints:directoryTypeHints},
   lifecycle:{historicalRetiredOrChanged:knownRetired,futureChangesNotEffective:futureChanges,
    notIndependentlyReconciled:schoolRows.length-knownRetired-futureChanges},
   missingReason:reason,priority,disposition:'NO_GO',
   exceptionIds:{missingHistoricalPoints:missingID,invalidHistoricalPoints:pointAnomaly,
    perCampusPolygonEvidenceAbsent:campusNoPolygon}
  });
 }
 const matched = districts.reduce((s,d)=>s+d.campusCoordinateVerification.historicalMatched,0);
 const absent = districts.reduce((s,d)=>s+d.campusCoordinateVerification.historicalMissing,0);
 const invalid = districts.reduce((s,d)=>s+d.campusCoordinateVerification.invalidPointRecords,0);
 check(matched >= identityBaseline.dfwMinimumMatchedHistoricalPoints, 'DFW_CAMPUS_POINT_REGRESSION');
 check(matched+absent+invalid === matrix.summary.publicISDCampusRows, 'CAMPUS_POINT_RECONCILIATION_FAILED');
 const registered = districts.filter(d=>d.officialFinderAvailability.url).length;
 check(registered === matrix.summary.publicISDsWithRegisteredParentRoute, 'OFFICIAL_ROUTE_CENSUS_DRIFT');
 check(campusResults.length === matrix.summary.publicISDCampusRows, 'CAMPUS_AUDIT_LOST_ROWS');
 check(new Set(campusResults.map(c=>c.id)).size === campusResults.length, 'CAMPUS_AUDIT_DUPLICATE');
 const otherRows = rows.filter(c => !publicISDs.some(d => d.code === c.id.slice(0,6)));
 const otherMatched=otherRows.filter(c=>validPoint(ncesIndex.get(c.id))).length;
 const otherMissing=otherRows.length-otherMatched;
 check(otherRows.length === matrix.summary.otherLEACampusRows,'OTHER_LEA_CAMPUS_DENOMINATOR_DRIFT');
 check(matched+otherMatched === identityBaseline.allInScopeHistoricalPoints,
  'ALL_DFW_HISTORICAL_POINTS_REGRESSION');
 const missing = districts.filter(x=>x.officialFinderAvailability.url === null);
 const summary = {
  teaSourceRows:tea.data.length,dfwTeaRows:rows.length,publicISDs:districts.length,
  otherTEALeas:matrix.districts.length-districts.length,otherTEACampusRecords:otherRows.length,
  otherLEAHistoricalPointMatches:otherMatched,otherLEAHistoricalPointsMissing:otherMissing,
  allDFWMatchedHistoricalPoints:matched+otherMatched,allDFWMissingHistoricalPoints:absent+invalid+otherMissing,
  auditedPublicPointExceptionRecords:exceptions.size,
  publicISDCampusRecords:campusResults.length,
  registeredOfficialGuidance:registered,unregisteredOfficialGuidance:missing.length,
  configuredGISDistricts:districts.filter(d=>d.gisAvailability.status==='CONFIGURED_IN_DASHBOARD').length,
  referenceBrowserGISDistricts:districts.filter(d=>d.gisAvailability.districtReferenceMeasured).length,
  matchedHistoricalPoints:matched,missingHistoricalPoints:absent,invalidHistoricalPoints:invalid,
  currentYearIndependentlyVerifiedCampusPoints:0,
  perCampusCurrentYearGISMatchRate:null,actualResidentialSchoolAssignmentRate:null,
  releaseStatus:'NO_GO'
 };
 notes.push('Offline source audits do not execute district Finder URLs; use optional live probe artifact.');
 notes.push('All 2024–25 NCES points require additional current-campus corroboration and browser visibility tests.');
 notes.push('Campus-by-campus attendance polygons and exact residential assignment are not proven by browser directory minima.');
 notes.push('2026 preliminary TEA ratings are not a complete current enrollment or campus lifecycle roster.');
 return {schemaVersion:1,asOf:matrix.generatedOn,sourceFiles:[
  'tea-ratings-2026.json','nces-locations-2024.json','schools.json',
  'data/dfw-school-coverage-matrix-2026.json','data/school-polygon-linkage-baseline.json',
  'school-data-provenance.json','school-lifecycle.js',
  'data/dfw-public-isd-missing-point-evidence-2026.json'],
  technicalAudit:errors.length?'FAIL':'PASS_WITH_UNVERIFIED_SOURCES',
  errors,notes,summary,duplicateNameCandidates:mismatchNames,
  districts:districts.sort((a,b)=>a.code.localeCompare(b.code)),
  campusRecords:campusResults.sort((a,b)=>a.id.localeCompare(b.id))};
}
if (require.main===module) {
 try {
  const report=audit(load());
  const out=path.join(ROOT,'artifacts','agent04-dfw-district-integrity.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log('AGENT04_DFW '+JSON.stringify({technicalAudit:report.technicalAudit,summary:report.summary,
   errors:report.errors,output:out}));
  if (report.errors.length) process.exitCode=1;
 } catch (e) { console.error('AGENT04_AUDIT_EXCEPTION '+(e.stack||e)); process.exitCode=1; }
}
module.exports={audit,load,validPoint};
