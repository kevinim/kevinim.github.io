'use strict';
// READ-ONLY school-data release preflight. Offline and deterministic.
// Integrity check != official enrollment confirmation.
// Report paths, counts and classification only; never serialize student/home addresses.
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');

const DATA_KINDS=new Set(['provenance','points-schools','points-data','opaque-json','features','feeder','finder-audit']);
const ASSURANCES=new Set([
 'source-inventory','2022-reference','2026-campus-points','2024-25-reference',
 '2026-rating-snapshot','2026-27-current-confirmed','historical-only',
 'stored-finder-reference-not-current','partial-reference-year-unconfirmed',
 'feeder-not-address-assignment','finder-check-not-parcel-proof'
]);
const VALID_DISTRIC_CODES=['AISD','PISD','PROSPER','FISD','LISD','CFB','043907'];

function gitBlobSha(buffer){
 const h=crypto.createHash('sha1');
 h.update('blob '+buffer.length+'\0');
 h.update(buffer);
 return h.digest('hex');
}
function safeRelative(root,filename){
 if(typeof filename!=='string'||!filename||
    path.isAbsolute(filename)||filename.includes('\\')||
    filename.split('/').some(x=>!x||x==='.'||x==='..')||
    !/^[a-zA-Z0-9_.\/-]+$/.test(filename))
   throw Error('unsafe_manifest_path');
 const target=path.resolve(root,filename);
 if(!target.startsWith(path.resolve(root)+path.sep))throw Error('unsafe_manifest_path');
 const parent=path.dirname(target);
 // Symlinks are not allowed on the release path even if the resolved file is inside root.
 let probe=path.resolve(root);
 for(const bit of filename.split('/')){
  probe=path.join(probe,bit);
  if(fs.existsSync(probe)&&fs.lstatSync(probe).isSymbolicLink())throw Error('symlink_not_allowed');
 }
 return target;
}
function finitePair(pair){
 return Array.isArray(pair)&&pair.length>=2&&
   typeof pair[0]==='number'&&Number.isFinite(pair[0])&&pair[0]>=-180&&pair[0]<=180&&
   typeof pair[1]==='number'&&Number.isFinite(pair[1])&&pair[1]>=-90&&pair[1]<=90;
}
function pointLL(ll){
 // School point data uses [latitude, longitude], NOT GeoJSON order.
 return Array.isArray(ll)&&ll.length===2&&
  typeof ll[0]==='number'&&Number.isFinite(ll[0])&&ll[0]>=-90&&ll[0]<=90&&
  typeof ll[1]==='number'&&Number.isFinite(ll[1])&&ll[1]>=-180&&ll[1]<=180;
}
function polygonDiagnostic(geometry){
 let polygons=[];
 if(geometry?.type==='Polygon')polygons=[geometry.coordinates];
 else if(geometry?.type==='MultiPolygon')polygons=geometry.coordinates;
 else return {valid:false,unclosed:0};
 if(!Array.isArray(polygons)||polygons.length===0)return {valid:false,unclosed:0};
 let unclosed=0;
 for(const poly of polygons){
  if(!Array.isArray(poly)||!poly.length)return {valid:false,unclosed};
  for(const ring of poly){
   if(!Array.isArray(ring)||ring.length<4||ring.some(p=>!finitePair(p)))return {valid:false,unclosed};
   const first=ring[0],last=ring[ring.length-1];
   if(Math.abs(first[0]-last[0])>1e-7||Math.abs(first[1]-last[1])>1e-7)unclosed++;
  }
 }
 return {valid:true,unclosed};
}
function inspectAsset(buffer,spec){
 const errors=[],warnings=[],file=spec.path;
 let doc;
 try{doc=JSON.parse(buffer.toString('utf8'));}
 catch{errors.push('invalid_json');return {file,kind:spec.kind,count:null,errors,warnings};}
 if(!doc||typeof doc!=='object'||Array.isArray(doc)){
  errors.push('invalid_root_schema');return {file,kind:spec.kind,count:null,errors,warnings};
 }
 let count=null;
 if(spec.kind==='provenance'){
  const districts=doc.districts;
  if(!Array.isArray(districts)||districts.length<6)errors.push('district_inventory_missing');
  if(typeof doc.activeSchoolYear!=='string'||!doc.activeSchoolYear.includes('2026'))
   errors.push('year_not_declared');
  if(typeof doc.lastVerified!=='string'||!/^20\d\d-\d\d-\d\d$/.test(doc.lastVerified))
   errors.push('source_verification_date_missing');
  const keys=(districts||[]).map(d=>d?.code);
  if(keys.length!==new Set(keys).size)errors.push('duplicate_district_codes');
  count=districts?.length??null;
 }else if(spec.kind==='points-schools'||spec.kind==='points-data'){
  const points=doc[spec.kind==='points-schools'?'schools':'data'];
  if(!Array.isArray(points)||!points.length)errors.push('school_point_array_missing');
  else{
   count=points.length;
   const invalid=points.filter(s=>!s||typeof s!=='object'||!pointLL(s.ll)).length;
   if(invalid)errors.push('invalid_school_coordinates_count:'+invalid);
   if(spec.kind==='points-schools'){
    const noName=points.filter(s=>!s.name||!s.district).length;
    if(noName)errors.push('campus_name_or_district_missing_count:'+noName);
   }
  }
 }else if(spec.kind==='features'){
  if(doc.type!=='FeatureCollection'||!Array.isArray(doc.features)||!doc.features.length){
   errors.push('invalid_feature_collection');
  }else{
   count=doc.features.length;
   let malformed=0,unclosed=0,currentMismatch=0,unconfirmed=0;
   for(const f of doc.features){
    const diagnostic=polygonDiagnostic(f?.geometry);
    if(!diagnostic.valid)malformed++;
    unclosed+=diagnostic.unclosed;
    if(spec.assurance==='historical-only'&&f?.properties?.current===true)currentMismatch++;
    if(spec.assurance==='2026-27-current-confirmed'&&(
      f?.properties?.current!==true||f?.properties?.sourceYearConfirmed!==true||
      !/2026.{0,4}27/.test(String(f?.properties?.sourceVintage||f?.properties?.schoolYear||''))
    ))unconfirmed++;
    if(spec.assurance==='partial-reference-year-unconfirmed'&&f?.properties?.current===true)currentMismatch++;
   }
   if(malformed)errors.push('malformed_polygon_count:'+malformed);
   if(unclosed){
    if(spec.assurance==='2026-27-current-confirmed')errors.push('unclosed_ring_count:'+unclosed);
    else warnings.push('unclosed_ring_count:'+unclosed);
   }
   if(currentMismatch)errors.push('unsafe_current_flag_count:'+currentMismatch);
   if(unconfirmed)errors.push('current_year_unconfirmed_feature_count:'+unconfirmed);
   if(!doc.metadata||typeof doc.metadata!=='object')warnings.push('geometry_metadata_missing');
  }
 }else if(spec.kind==='feeder'){
  if(typeof doc.source!=='string'||!doc.source.startsWith('https://'))
   errors.push('feeder_source_missing');
  if(doc.notParcelGeometries!==true)
   errors.push('feeder_mislabeled_as_assignment_polygons');
  const rows=doc.rows||doc.feeders;
  if(!Array.isArray(rows)&&typeof rows!=='object')warnings.push('feeder_entries_unrecognized');
  count=Array.isArray(rows)?rows.length:null;
 }else if(spec.kind==='finder-audit'){
  if(!Array.isArray(doc.districts)||!doc.districts.length)errors.push('finder_audit_districts_missing');
  if(typeof doc.auditDate!=='string')errors.push('finder_audit_date_missing');
  count=doc.districts?.length||null;
 }else if(spec.kind==='opaque-json'){
  // Shape of the TEA rating snapshot is separately covered by existing app QA.
  count=null;
 }
 if(Number.isInteger(spec.expectedCount)&&count!==spec.expectedCount)
  errors.push('snapshot_record_count_changed');
 return {file,kind:spec.kind,district:spec.district,assurance:spec.assurance,count,
   expectedCount:spec.expectedCount??null,errors,warnings};
}
function audit(root,manifest){
 const errors=[],warnings=[],results=[];
 if(manifest?.schemaVersion!==1||!Array.isArray(manifest.assets)||manifest.assets.length<1)
  throw Error('invalid_manifest_schema');
 if(manifest.validationMode!=='local-files-only')throw Error('manifest_must_be_offline_only');
 if(!Array.isArray(manifest.knownLimitations)||manifest.knownLimitations.length<1)
  throw Error('known_source_limitations_required');
 const paths=new Set();
 for(const asset of manifest.assets){
  if(!asset||!DATA_KINDS.has(asset.kind)||!ASSURANCES.has(asset.assurance))
   throw Error('invalid_manifest_asset_type');
  if(typeof asset.district!=='string'||!asset.district||
     !/^[0-9a-f]{40}$/.test(asset.gitBlobSha))throw Error('invalid_manifest_asset');
  const target=safeRelative(root,asset.path);
  if(paths.has(asset.path))throw Error('duplicate_manifest_path');
  paths.add(asset.path);
  if(!/\.(?:json|geojson)$/i.test(asset.path))throw Error('unsupported_data_extension');
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){
   errors.push({file:asset.path,reason:'tracked_snapshot_missing'});
   results.push({file:asset.path,kind:asset.kind,assurance:asset.assurance,count:null,integrity:'missing'});
   continue;
  }
  const buffer=fs.readFileSync(target);
  const actual=gitBlobSha(buffer);
  const result=inspectAsset(buffer,asset);
  result.integrity=actual===asset.gitBlobSha?'pinned':'modified';
  results.push(result);
  if(actual!==asset.gitBlobSha)errors.push({file:asset.path,reason:'unreviewed_data_change'});
  for(const e of result.errors)errors.push({file:asset.path,reason:e});
  for(const w of result.warnings)warnings.push({file:asset.path,reason:w});
 }
 const historical=results.filter(x=>x.assurance==='historical-only');
 const current=results.filter(x=>x.assurance==='2026-27-current-confirmed');
 return {
  status:errors.length?'BLOCKED':'PASS_WITH_KNOWN_SOURCE_LIMITATIONS',
  purpose:'offline_integrity_and_shape_preflight_not_residence_assignment_audit',
  sourceYear:manifest.createdForSchoolYear,
  assetCount:results.length,
  pinnedCount:results.filter(x=>x.integrity==='pinned').length,
  currentYearConfirmedSnapshotCount:current.length,
  historicalSnapshotCount:historical.length,
  limitations:manifest.knownLimitations.map(x=>({district:x.district,code:x.code})),
  assets:results,
  errors,warnings,
  note:'File integrity and schema checks do not verify a specific home address, official finder availability, student eligibility, or current districtwide polygon coverage.'
 };
}
function main(){
 const root=process.cwd();
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/school-data-release-lock.json'),'utf8'));
 const report=audit(root,manifest);
 const folder=path.join(root,'artifacts/school-data');
 fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'school-data-preflight.json'),JSON.stringify(report,null,2)+'\n');
 process.stdout.write('School data QA: '+report.status+
  '; '+report.pinnedCount+'/'+report.assetCount+' integrity-pinned; '+
  report.errors.length+' errors, '+report.warnings.length+' warnings; '+
  report.limitations.length+' known source-coverage limitations.\n');
 for(const w of report.warnings)process.stdout.write('WARN '+w.file+': '+w.reason+'\n');
 if(report.errors.length){
  for(const e of report.errors)process.stderr.write('BLOCK '+e.file+': '+e.reason+'\n');
  process.exitCode=1;
 }
}
if(require.main===module)try{main();}catch(e){
 process.stderr.write('School data QA blocked: '+e.message+'\n');
 process.exitCode=1;
}
module.exports={gitBlobSha,safeRelative,polygonDiagnostic,inspectAsset,audit};
