'use strict';
// Explicit opt-in metadata-only public ArcGIS probe. No house coordinates,
// no personal addresses, no geometry download and no scheduled execution.
const fs=require('node:fs');
const path=require('node:path');
const {KELLER_SERVICE,KELLER_LAYERS}=require('./audit-west-dfw-zone-sources.cjs');
const EXPECTED='2018-19';
function yearQueryUrl(id){
 const ids=new Set(KELLER_LAYERS.map(l=>l[0]));
 if(!ids.has(id))throw Error('keller_layer_not_allowed');
 const q=new URLSearchParams({
  where:'1=1',outFields:'SCHL_YEAR',returnGeometry:'false',
  returnDistinctValues:'true',f:'json'
 });
 return KELLER_SERVICE+'/'+id+'/query?'+q;
}
function readYearResponse(json){
 if(!json||json.error||!Array.isArray(json.features)||
   json.features.length<1||json.features.length>20)
  throw Error('arcgis_year_query_response_invalid');
 const values=[...new Set(json.features.map(f=>f?.attributes?.SCHL_YEAR))];
 if(values.some(y=>typeof y!=='string'||!/^\d{4}-\d{2}$/.test(y)))
  throw Error('arcgis_year_value_invalid');
 return values.sort();
}
function classifyObservedYears(values){
 if(!Array.isArray(values)||values.length===0)return 'INCONCLUSIVE';
 return values.length===1&&values[0]===EXPECTED?
  'HISTORICAL_2018_19_CONFIRMED':'REVIEW_REQUIRED_SOURCE_CHANGED';
}
async function fetchYears(id,fetchFn=fetch){
 const url=yearQueryUrl(id);
 const response=await fetchFn(url,{
  headers:{Accept:'application/json'},
  method:'GET',redirect:'error',
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error('arcgis_http_'+response.status);
 const size=Number(response.headers.get('content-length')||0);
 if(size>64000)throw Error('arcgis_response_size_exceeded');
 const text=await response.text();
 if(text.length>64000)throw Error('arcgis_response_size_exceeded');
 return readYearResponse(JSON.parse(text));
}
async function run(){
 const layers=[];
 for(const [id,level] of KELLER_LAYERS){
  try{
   const years=await fetchYears(id);
   layers.push({id,level,years,status:classifyObservedYears(years)});
  }catch{
   layers.push({id,level,years:null,status:'INCONCLUSIVE_REMOTE_UNAVAILABLE'});
  }
 }
 const changed=layers.some(l=>l.status==='REVIEW_REQUIRED_SOURCE_CHANGED');
 const unavailable=layers.some(l=>l.status==='INCONCLUSIVE_REMOTE_UNAVAILABLE');
 const status=changed?'REVIEW_REQUIRED':
   unavailable?'INCONCLUSIVE_REMOTE_UNAVAILABLE':'HISTORICAL_2018_19_CONFIRMED';
 const report={status,checkedAtUtc:new Date().toISOString(),layers,
  note:'Never automatically promote GIS snapshots to current attendance boundaries. No geometry fetched or deployed.',
  deployPerformed:false,requests:['SCHL_YEAR distinct values, no geometry']};
 const file=path.join('artifacts','west-dfw','keller-gis-year-probe.json');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 process.stdout.write('KELLER_GIS_YEAR_PROBE '+JSON.stringify({
  status,years:layers.map(l=>({id:l.id,years:l.years,status:l.status}))
 })+'\n');
 if(changed)process.exitCode=1;
 return report;
}
if(require.main===module){
 if(process.argv[2]!=='--live'){
  process.stderr.write('Metadata-only remote GIS query disabled by default. Explicitly pass --live; no deploy.\n');
  process.exitCode=2;
 }else run().catch(err=>{
  process.stderr.write('GIS metadata probe unavailable: '+err.message+'\n');process.exitCode=2;
 });
}
module.exports={yearQueryUrl,readYearResponse,classifyObservedYears,fetchYears};
