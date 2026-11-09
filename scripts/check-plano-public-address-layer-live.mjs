#!/usr/bin/env node
// Current Plano ISD Finder-linked ArcGIS FeatureServer point query for one PUBLIC
// nonresidential address. Does not replace independent Finder UI evidence,
// certify 2026–27 polygon vintage or a student's enrollment eligibility.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {isTransientOfficialSourceFailure as transient} from './official-source-network-errors.mjs';
const require=createRequire(import.meta.url);
const {PLANO_LAYERS,PLANO_SERVICE}=require('../plano-finder-live.js');
const {inGeometry,schoolKey}=require('./attendance-geo-audit.cjs');
const {evaluatePlanoFeederAssignment}=require('../plano-feeder-guard.js');
const read=name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const reference=read('plano-locator-reference.geojson');
const feeders=read('plano-official-feeder-reference-2026.json');
const sample={
 address:'5400 Legacy Dr, Plano, TX 75024',
 zip:'75024',
 expectedCachedGIS:{elementary:'Haun',middle:'Robinson',high:'Jasper',senior:'Plano West Senior High'}
};
const report={checkedAt:new Date().toISOString(),sourceType:'current-Plano-ISD-Finder-linked-ArcGIS-FeatureServer',academicYearOfPublishedLayers:'2025–26',districtFinderOperatesIn2026_27:true,addressKind:'public-commercial',address:sample.address,independentFinderUiCampusResultVerified:false,homeEnrollmentVerified:false,campusResults:{},status:'not-checked'};
async function json(url){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const j=await r.json();
   if(j?.error)throw Error('Source response error: '+JSON.stringify(j.error));
   return j;
  }catch(e){
   if(!transient(e)||attempt===2)throw e;
   await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1200));
  }
 }
}
try{
 const g=new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
 for(const [k,v] of Object.entries({SingleLine:sample.address,f:'json',outFields:'Match_addr,Addr_type,Region,Postal',maxLocations:'3',countryCode:'USA',forStorage:'false'}))g.searchParams.set(k,v);
 const response=await json(g);
 const candidates=(response.candidates||[]).filter(x=>x?.score>=95&&['PointAddress','Subaddress'].includes(x?.attributes?.Addr_type)&&String(x.attributes?.Postal||'').startsWith(sample.zip)&&['TX','Texas'].includes(String(x.attributes?.Region||'')));
 if(candidates.length!==1)throw Error('Expected one precise Texas address geocoder match; found '+candidates.length);
 const geocoded=candidates[0],point=[geocoded.location.x,geocoded.location.y];
 report.geocode={address:geocoded.address,score:geocoded.score,type:geocoded.attributes.Addr_type,zip:geocoded.attributes.Postal,point};
 const raw=[];
 for(const layer of PLANO_LAYERS){
  const u=new URL(PLANO_SERVICE+'/'+layer.id+'/query');
  for(const [k,v] of Object.entries({f:'json',where:'1=1',geometry:point.join(','),geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'EntityName,Grade',returnGeometry:'false',resultRecordCount:'20'}))u.searchParams.set(k,v);
  const data=await json(u);
  const names=(data.features||[]).map(f=>String(f.attributes?.EntityName||'').trim()).filter(Boolean);
  if(names.length!==1)throw Error(layer.level+' expected 1 official service polygon at geocoded point; got '+JSON.stringify(names));
  report.campusResults[layer.level]=names[0];
  raw.push({properties:{district:'PISD',gradeLevel:layer.level,school:names[0]}});
 }
 const cached={};
 for(const level of PLANO_LAYERS){
  // The 2025–26 cached fallback groups Senior High and 9–10 High as
  // gradeLevel=high (nine records). The live Finder service separates them.
  // Match the SAME CAMPUS name first, then require exactly one containing
  // polygon; this does not allow any alternate campus to stand in for a gap.
  const hits=reference.features.filter(f=>
    (f.properties?.gradeLevel===level.level||
      (level.level==='senior'&&f.properties?.gradeLevel==='high'))&&
    schoolKey(f.properties?.school)===schoolKey(report.campusResults[level.level])&&
    inGeometry(point,f.geometry));
  if(hits.length!==1)throw Error('Cached geographic '+level.level+' same-campus check found '+hits.length+' polygon hits for '+report.campusResults[level.level]);
  cached[level.level]=String(hits[0].properties.school);
  if(schoolKey(cached[level.level])!==schoolKey(report.campusResults[level.level]))throw Error(level.level+' district live point endpoint differs from cached geometry');
  if(schoolKey(report.campusResults[level.level])!==schoolKey(sample.expectedCachedGIS[level.level]))throw Error(level.level+' does not match prior public-address dashboard reference: '+report.campusResults[level.level]);
 }
 const feeder=evaluatePlanoFeederAssignment(raw,feeders);
 if(feeder.status!=='consistent')throw Error('Live point campuses conflict with separately published official feeder paths: '+feeder.status);
 report.crosscheck={cachedGIS:cached,officialFeederStatus:feeder.status,independentFinderUiCampusResultVerified:false};
 report.status='four-level-official-ArcGIS-point-query-matches-cached-and-feeder';
 console.log('PLANO PUBLIC POINT VERIFIED (current Finder-linked source, vintage 2025–26): '+sample.address);
 for(const level of PLANO_LAYERS)console.log('  '+level.level+': '+report.campusResults[level.level]);
 console.log('PLANO GIS ↔ source-layer point query ↔ official feeder consistency: 4/4; this is NOT independent UI or 2026–27 vintage certification.');
}catch(error){
 if(transient(error)){
  report.status='SOURCE_UNAVAILABLE';
  report.error='Official GIS/geocoder transport unavailable after retries';
  report.campusResults={};
  report.independentFinderUiCampusResultVerified=false;
  report.homeEnrollmentVerified=false;
  console.warn('PLANO_PUBLIC_POINT_SOURCE_UNAVAILABLE: no live point match established; check remains unverified and release NO_GO.');
 }else{
  report.status='DATA_OR_SOURCE_CONTRACT_FAILURE';
  report.error=String(error?.stack||error).slice(0,1500);
  console.error('PLANO public point NOT verified: '+report.error);
  process.exitCode=1;
 }
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/plano-public-address-arcgis-check.json',JSON.stringify(report,null,2)+'\n');
