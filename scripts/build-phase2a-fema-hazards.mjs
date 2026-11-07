#!/usr/bin/env node
// Phase 2A static ETL: FEMA National Risk Index 2025 v1.20.0, census tracts.
// Public Esri-hosted mirror of FEMA dataset described in ArcGIS item
// 9da4eeb936544335a6db0cd7a8448a51. NOT a parcel floodplain map.
// No invented risk values, ZIP gradients, or address-level claims.
import {writeFileSync,mkdirSync} from 'node:fs';
const SERVICE='https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Census_Tracts/FeatureServer/0';
const COUNTIES={
 '48085':'Collin','48113':'Dallas','48121':'Denton','48439':'Tarrant',
 '48397':'Rockwall','48139':'Ellis','48257':'Kaufman','48231':'Hunt',
 '48181':'Grayson','48497':'Wise','48367':'Parker','48251':'Johnson'
};
const FIELDS=['NRI_ID','NRI_VER','COUNTY','STCOFIPS','TRACTFIPS',
 'IFLD_RISKS','IFLD_RISKR','IFLD_EALT',
 'WFIR_RISKS','WFIR_RISKR','WFIR_EALT',
 'HRCN_RISKS','HRCN_RISKR','HRCN_EALT'];
const HAZARDS=['IFLD','WFIR','HRCN'];
const SOURCE_YEAR='2025-12';
const TIMEOUT_MS=45000;
const features=[],counts={},versions=new Set();
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
async function requestCounty(fips,offset,attempt=1){
 const url=new URL(SERVICE+'/query');
 const query=new URLSearchParams({
  where:"STCOFIPS='"+fips+"'",outFields:FIELDS.join(','),orderByFields:'OBJECTID ASC',
  returnGeometry:'true',outSR:'4326',geometryPrecision:'4',maxAllowableOffset:'0.00045',
  f:'geojson',resultRecordCount:'600',resultOffset:String(offset)
 });
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:query.toString(),signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();
  if(json.error||json.type!=='FeatureCollection'||!Array.isArray(json.features))
   throw Error('Not GeoJSON FeatureCollection: '+JSON.stringify(json.error||Object.keys(json)).slice(0,220));
  return json.features;
 }catch(err){
  if(attempt>=3)throw Error(fips+' offset '+offset+' source unavailable: '+err.message);
  await sleep(800*attempt);
  return requestCounty(fips,offset,attempt+1);
 }
}
for(const [fips,name] of Object.entries(COUNTIES)){
 let offset=0;
 for(let page=0;page<20;page++){
  const pageFeatures=await requestCounty(fips,offset);
  for(const feat of pageFeatures){
   const p=feat.properties||{},id=String(p.TRACTFIPS||'').trim();
   if(!/^48\d{9}$/.test(id))throw Error(name+' invalid tract FIPS '+id);
   if(String(p.STCOFIPS||'').padStart(5,'0')!==fips)throw Error(name+' county mismatch for '+id);
   if(!feat.geometry||!['Polygon','MultiPolygon'].includes(feat.geometry.type))throw Error(id+' no polygon');
   for(const prefix of HAZARDS){
    for(const field of [prefix+'_RISKS',prefix+'_EALT']){
     const v=p[field];if(v!==null&&v!==undefined&&(!Number.isFinite(v)||v<0))throw Error(id+' invalid '+field);
    }
    const score=p[prefix+'_RISKS'];if(Number.isFinite(score)&&(score<0||score>100))throw Error(id+' out of range '+prefix);
   }
   if(p.NRI_VER)versions.add(String(p.NRI_VER));
   feat.id=id;
   feat.properties={tract:id,county:name,countyFips:fips,version:p.NRI_VER||null,
    ifld:{score:p.IFLD_RISKS??null,rating:p.IFLD_RISKR||null,eal:p.IFLD_EALT??null},
    wfir:{score:p.WFIR_RISKS??null,rating:p.WFIR_RISKR||null,eal:p.WFIR_EALT??null},
    hrcn:{score:p.HRCN_RISKS??null,rating:p.HRCN_RISKR||null,eal:p.HRCN_EALT??null}};
   features.push(feat);
  }
  offset+=pageFeatures.length;
  if(pageFeatures.length<600)break;
  if(page===19)throw Error(name+' pagination did not terminate within 12k records');
 }
 if(offset<10)throw Error(name+' implausibly few tracts: '+offset);
 counts[fips]=offset;
 console.log('FEMA NRI 2025 v1.20 tract source '+name+' '+fips+': '+offset);
}
const seen=new Set();
for(const f of features){if(seen.has(f.id))throw Error('duplicate tract '+f.id);seen.add(f.id)}
if(features.length<1000)throw Error('DFW tract coverage unexpectedly small: '+features.length);
if(features.length>8000)throw Error('DFW tract coverage unexpectedly large: '+features.length);
const coverage=Object.fromEntries(HAZARDS.map(prefix=>{
 const key=prefix.toLowerCase(),valid=features.filter(x=>Number.isFinite(x.properties[key]?.score)).length;
 if(valid<0.55*features.length)throw Error(prefix+' hazard scores not broadly available: '+valid+'/'+features.length);
 return [key,{tractsWithNumericScore:valid,tractsWithoutScore:features.length-valid}];
}));
if(versions.size!==1)throw Error('Multiple unknown NRI vintages: '+[...versions].join(','));
const publishedVersion=[...versions][0];
if(!/1\.20(\.|$)/.test(publishedVersion))throw Error('Expected FEMA 2025 NRI version 1.20, source reports '+publishedVersion);
const out={type:'FeatureCollection',
 metadata:{sourcePublisher:'FEMA National Risk Index',sourceDataset:'2025 NRI v1.20.0',
  sourceService:SERVICE,sourceItem:'https://www.arcgis.com/home/item.html?id=9da4eeb936544335a6db0cd7a8448a51',
  technicalReference:'https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf',
  snapshotSourceVersion:publishedVersion,modelReleased:SOURCE_YEAR,
  geography:'2020 Census tract',scale:'census-tract',notParcelFloodplain:true,
  hazardType:'relative risk (not recorded events, probability, insurance, or address prediction)',
  coverageCounties:COUNTIES,countyTractCounts:counts,scoreAvailability:coverage,
  fields:['IFLD_RISKS','WFIR_RISKS','HRCN_RISKS'],
  transform:'official public source, simplified source polygon geometry <= ~50 m for fast map display',
  dataRefresh:'manual versioned regeneration; do not auto-promote source version'},
 features};
const text=JSON.stringify(out);
if(Buffer.byteLength(text,'utf8')>16_000_000)throw Error('Generated dataset exceeds 16MB (need coarser geometry simplification)');
mkdirSync('data',{recursive:true});
writeFileSync('data/phase2a-fema-nri-dfw-2025.geojson',text+'\n');
console.log('FEMA phase2 2025 '+publishedVersion+' output '+features.length+' tracts, '+(Buffer.byteLength(text)/1e6).toFixed(2)+'MB, 12 county, hazards '+JSON.stringify(coverage));
