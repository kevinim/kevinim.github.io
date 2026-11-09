'use strict';
// Fail-closed, offline, non-deploying West DFW attendance-GIS provenance audit.
// Public GIS endpoint existence is NOT evidence of current student zoning.
const fs=require('node:fs');
const path=require('node:path');
const REGISTRY=require('../district-registry.js');

const IDS=['220919','220907','061911','220906'];
const MAP_MODES=new Set([
 'official-finder-only',
 'stale-city-gis-reference-no-current-polygon',
 'current-official-finder-but-no-licensed-geojson',
 'official-printable-maps-year-unconfirmed'
]);
const HOSTS={
 '220919':'www.southlakecarroll.edu',
 '220907':'www.kellerisd.net',
 '061911':'www.nisdtx.org',
 '220906':'www.gcisd.net'
};
const KELLER_SERVICE='https://arcgis.cityofkeller.com/arcgis/rest/services/Kellermaps/KEL_KISD_AGO/MapServer';
const KELLER_LAYERS=[
 [2,'elementary','ELEM_NAME',23],
 [3,'high','HIGH_NAME',4],
 [4,'intermediate','INT_NAME',7],
 [5,'middle','MID_NAME',7]
];
function requireHttps(value,hostname){
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&u.hostname===hostname&&
   !u.username&&!u.password&&!u.port&&!u.hash&&
   u.pathname.length>1;
 }catch{return false;}
}
function validateManifest(manifest,ui,registry=REGISTRY.DISTRICT_REGISTRY){
 if(!manifest||manifest.schemaVersion!==1||manifest.targetSchoolYear!=='2026-27'||
    !/^\d{4}-\d\d-\d\d$/.test(manifest.auditedAtUtc||'')||
    !Array.isArray(manifest.districts)||manifest.districts.length!==4||
    !Array.isArray(manifest.evidence)||manifest.evidence.length<4)
   throw Error('west_boundary_source_manifest_invalid');
 const rel=manifest.globalReleaseState;
 if(!rel||rel.automaticPolygonIngestionEnabled!==false||
   rel.polygonDisplayEnabled!==false||rel.exactAddressAssignmentEnabled!==false||
   rel.redistributionRightsVerified!==false||rel.permittedSourceUsage!=='link-only')
  throw Error('west_boundary_source_release_block_violation');
 if(!ui||!Array.isArray(ui.districts)||ui.districts.length!==4)
  throw Error('west_ui_config_invalid');
 const byId=new Map(manifest.districts.map(d=>[d?.code,d]));
 const uis=new Map(ui.districts.map(d=>[d?.code,d]));
 if(byId.size!==4||uis.size!==4||IDS.some(id=>!byId.has(id)||!uis.has(id)))
  throw Error('west_boundary_source_district_id_drift');
 for(const code of IDS){
  const d=byId.get(code), v=uis.get(code), registered=registry[code];
  if(!registered||registered.zoneKey!==null||
     registered.address!==null||registered.currency!==null)
   throw Error('west_boundary_unsafe_polygon_registration:'+code);
  if(!d||!MAP_MODES.has(d.mapStatus)||
     !requireHttps(d.officialSource,HOSTS[code])||
     !requireHttps(d.addressLookupEvidence,HOSTS[code])||
     d.reuseRights!=='not-reviewed'||d.currentLocatorExists===undefined||
     typeof d.sourceNotes!=='string'||d.sourceNotes.length<30)
   throw Error('west_boundary_source_evidence_invalid:'+code);
  if(v.localSchoolPolygonCount!==0||
     !/^external-official-(finder|maps)-only$/.test(v.boundaryStatus)||
     registered.official!==d.officialSource||
     v.officialUrl!==d.officialSource)
   throw Error('west_boundary_ui_zone_integrity_violation:'+code);
  if(d.verifiedRawPolygonEndpoint!==null&&d.verifiedRawPolygonEndpoint!==KELLER_SERVICE)
   throw Error('west_boundary_unapproved_raw_gis_endpoint:'+code);
  if(code!=='220907'&&d.verifiedRawPolygonEndpoint!==null)
   throw Error('west_boundary_unreviewed_raw_polygon_source:'+code);
  if(d.verifiedPolygonAcademicYear==='2026-27'&&
     (d.verifiedRawPolygonEndpoint!==null||d.reuseRights!=='not-reviewed'))
   throw Error('current_finder_year_does_not_authorize_geojson:'+code);
 }
 const keller=byId.get('220907');
 if(keller.verifiedPolygonAcademicYear!=='2018-19'||
    keller.mapStatus!=='stale-city-gis-reference-no-current-polygon'||
    keller.verifiedRawPolygonEndpoint!==KELLER_SERVICE||
    !Array.isArray(keller.observedLayers)||keller.observedLayers.length!==4)
  throw Error('keller_stale_gis_classification_must_remain_locked');
 const observed=new Map(keller.observedLayers.map(x=>[x?.id,x]));
 if(observed.size!==4)throw Error('keller_layer_ids_duplicate');
 for(const [id,level,name,count] of KELLER_LAYERS){
  const r=observed.get(id);
  if(!r||r.level!==level||r.nameField!==name||
     r.schoolYearField!=='SCHL_YEAR'||r.campusIdField!=='CAMPUS_ID'||
     !Array.isArray(r.observedSchoolYears)||
     r.observedSchoolYears.join(',')!=='2018-19'||
     r.observedFeatureCount!==count)
   throw Error('keller_2018_19_layer_vintage_incorrect:'+id);
 }
 const nw=byId.get('061911');
 if(nw.verifiedPolygonAcademicYear!=='2026-27'||
    nw.mapStatus!=='current-official-finder-but-no-licensed-geojson')
   throw Error('northwest_year_or_license_unverified');
 const carroll=byId.get('220919'),gcisd=byId.get('220906');
 if(carroll.verifiedPolygonAcademicYear!==null||
   gcisd.verifiedPolygonAcademicYear!==null||
   gcisd.mapStatus!=='official-printable-maps-year-unconfirmed')
   throw Error('unverified_source_year_was_promoted_to_current');
 // CORS or unauthenticated read access is not a reproduction license.
 const sourceHosts=new Set([...Object.values(HOSTS),'arcgis.cityofkeller.com']);
 for(const ev of manifest.evidence){
  if(typeof ev?.district!=='string'||!IDS.includes(ev.district)||
     typeof ev.status!=='string'||ev.status.length<10)
   throw Error('west_boundary_evidence_invalid');
  let u;try{u=new URL(ev.url);}catch{throw Error('west_boundary_evidence_url_invalid');}
  if(!requireHttps(ev.url,u.hostname)||!sourceHosts.has(u.hostname)||
     u.username||u.password)
   throw Error('west_boundary_evidence_domain_not_approved');
  if(u.hostname==='arcgis.cityofkeller.com'&&!ev.url.startsWith(KELLER_SERVICE+'/'))
   throw Error('west_boundary_evidence_arcgis_path_not_approved');
 }
 return {status:'REUSE_BLOCKED_OFFICIAL_FINDER_ONLY',
  check:'static_provenance_not_live_school_enrollment',
  districts:IDS.map(id=>{
   const d=byId.get(id);
   return {code:id,name:d.name,sourceStatus:d.mapStatus,
    polygonYear:d.verifiedPolygonAcademicYear,
    rawPolygonAutoPublish:false,licenseVerified:false};
  }),
  keller:{layerCount:4,layerFeatureCountTotal:KELLER_LAYERS.reduce((sum,x)=>sum+x[3],0),
   verifiedVintage:'2018-19'},
  approvalRequired:[
   'current school-year campus polygons verified against district Finder',
   'source-specific reuse and redistribution rights',
   'student address samples crosschecked with official district locator',
   'human owner approval and UAT browser regression'
  ],
  publicDeploymentPerformed:false
 };
}
function main(){
 const root=process.cwd();
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/west-dfw-zone-source-audit-2026.json'),'utf8'));
 const ui=JSON.parse(fs.readFileSync(path.join(root,'data/west-dfw-districts-2026.json'),'utf8'));
 const result=validateManifest(manifest,ui);
 const dir=path.join(root,'artifacts/west-dfw');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'west-dfw-zone-provenance-report.json'),
   JSON.stringify(result,null,2)+'\n');
 process.stdout.write('West GIS evidence: '+result.status+
   '; Keller 2018-19 GIS layers '+result.keller.layerCount+
   '; total features '+result.keller.layerFeatureCountTotal+
   '; no downloads, no release.\n');
}
if(require.main===module)try{main()}catch(err){
 process.stderr.write('West GIS evidence BLOCKED: '+err.message+'\n');
 process.exitCode=1;
}
module.exports={IDS,HOSTS,KELLER_SERVICE,KELLER_LAYERS,requireHttps,validateManifest};
