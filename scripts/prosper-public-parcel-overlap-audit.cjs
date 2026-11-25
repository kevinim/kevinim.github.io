'use strict';
// Copyright-conscious, read-only crosscheck of synthetic Prosper GIS audit cells.
// Never request, serialize, or print parcel IDs, owners, situs addresses, or geometry.
const fs=require('node:fs');
const path=require('node:path');
const {contains}=require('./school-polygon-linkage-topology.cjs');
const GRADES=['elementary','middle','high'];
const AXIS=120,CHUNK=12;
const ENDPOINTS=Object.freeze({
 collin:Object.freeze({
  url:'https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4/query',
  fields:'propType,propSubType,propYear,entitySchoolCode'
 }),
 denton:Object.freeze({
  url:'https://geo.dentoncad.com/arcgis/rest/services/LandRecords/Parcels_Appraisal/FeatureServer/1/query',
  fields:'propType,pYear,schoolTaxingUnitName'
 })
});
function polygonParts(g){
 if(!g)return [];
 if(g.type==='Polygon')return [g.coordinates];
 if(g.type==='MultiPolygon')return g.coordinates;
 return [];
}
function makeSyntheticCells(features,axis=AXIS){
 if(!Array.isArray(features)||!features.length||axis!==AXIS)throw Error('invalid audited grid');
 const bounds=[Infinity,Infinity,-Infinity,-Infinity];
 for(const feature of features)for(const poly of polygonParts(feature.geometry))
  for(const ring of poly)for(const p of ring){
   bounds[0]=Math.min(bounds[0],p[0]);bounds[1]=Math.min(bounds[1],p[1]);
   bounds[2]=Math.max(bounds[2],p[0]);bounds[3]=Math.max(bounds[3],p[1]);
  }
 const groups=Object.fromEntries(GRADES.map(g=>[g,features.filter(f=>f.properties.gradeLevel===g)]));
 if(GRADES.some(g=>groups[g].length===0))throw Error('source-grade-layer-missing');
 const cells=[];
 for(let xi=0;xi<axis;xi++)for(let yi=0;yi<axis;yi++){
  const q=[bounds[0]+(bounds[2]-bounds[0])*(xi+0.379)/axis,
   bounds[1]+(bounds[3]-bounds[1])*(yi+0.381)/axis];
  const present=GRADES.filter(g=>groups[g].some(f=>contains(f.geometry,q)));
  if(present.length===0||present.length===3)continue;
  cells.push({point:q,missing:GRADES.filter(g=>!present.includes(g)).join('+')});
 }
 return cells;
}
// Parcel land-use category alone does not establish occupancy, household,
 // year-specific school assignment, or even exact CAD jurisdiction.
function landCategory(value){
 const s=String(value||'').trim().toLowerCase();
 if(s==='r'||s==='residential'||s==='residence')return 'residential-property-category';
 if(['commercial','industrial','business','business personal property'].includes(s))
  return 'other-property-category';
 return 'unknown-property-category';
}
// Taxing-unit evidence is administrative; it is NOT student attendance or enrollment.
function taxUnitEvidence(value){
 const code=String(value||'').trim().toUpperCase().replace(/\\s+/g,' ');
 if(!code)return 'taxing-unit-unmapped';
 if(code==='SPR'||code==='PROSPER ISD'||code==='PROSPER INDEPENDENT SCHOOL DISTRICT')
  return 'prosper-isd-taxing-code-reference';
 // Nonmatching code is not independently proven to be a different school
 // attendance zone; it is only a separate taxing-unit attribute.
 return 'nonmatching-or-unmapped-tax-code';
}
function classifyTaxEvidence(results){
 const available=results.filter(x=>x.status==='ok');
 if(!available.length)return 'source-unavailable';
 const hits=available.flatMap(x=>x.matches);
 if(!hits.length)return results.some(x=>x.status!=='ok')?'source-partially-unavailable':'no-parcel-at-grid-point';
 const statuses=new Set(hits.map(x=>taxUnitEvidence(x.taxUnit)));
 return statuses.size===1?[...statuses][0]:'mixed-taxing-unit-evidence';
}
function classifyPoint(results){
 const available=results.filter(x=>x.status==='ok');
 if(!available.length)return 'source-unavailable';
 const hits=available.flatMap(x=>x.matches);
 if(!hits.length)return results.some(x=>x.status!=='ok')?'source-partially-unavailable':'no-parcel-at-grid-point';
 const types=new Set(hits.map(x=>landCategory(x.propType)));
 if(types.size>1)return 'parcel-category-conflict';
 return [...types][0];
}
function readFeatureResponse(body){
 if(!body||body.type!=='FeatureCollection'||!Array.isArray(body.features)||
    body.error||body.exceededTransferLimit===true||body.features.length>2000)
  throw Error('provider-feature-response-invalid-or-truncated');
 return body.features.map(f=>{
  if(!f||!f.geometry||!['Polygon','MultiPolygon'].includes(f.geometry.type)||!f.properties||
     !Array.isArray(f.geometry.coordinates))
   throw Error('provider-feature-geometry-invalid');
  // Discard raw provider attributes before any output and do not retrieve owner fields.
  return {geometry:f.geometry,propType:f.properties.propType??null,
   taxUnit:f.properties.entitySchoolCode??f.properties.schoolTaxingUnitName??null};
 });
}
function buildForm(points,fields){
 if(!points.length||points.length>CHUNK||points.some(q=>!Array.isArray(q)||q.length!==2||
   q[0]<-97.5||q[0]>-96||q[1]<32.8||q[1]>33.8))
  throw Error('only bounded synthetic Texas grid points supported');
 return new URLSearchParams({
  where:'1=1',f:'geojson',
  geometry:JSON.stringify({points,spatialReference:{wkid:4326}}),
  geometryType:'esriGeometryMultipoint',inSR:'4326',
  spatialRel:'esriSpatialRelIntersects',
  outFields:fields,returnGeometry:'true',outSR:'4326',
  resultRecordCount:'2000'
 });
}
async function fetchChunk(fetchFn,source,points){
 const url=new URL(source.url);
 if(url.protocol!=='https:'||!['services2.arcgis.com','geo.dentoncad.com'].includes(url.hostname)||
    url.search)throw Error('unapproved-public-CAD-source');
 const fields=source.fields;
 if(!['propType,propSubType,propYear,entitySchoolCode','propType,pYear,schoolTaxingUnitName'].includes(fields))
  throw Error('nonminimal-CAD-field-request');
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const r=await fetchFn(url.toString(),{method:'POST',
   headers:{'content-type':'application/x-www-form-urlencoded'},
   body:buildForm(points,fields),signal:controller.signal});
  if(!r.ok)throw Error('provider-HTTP-'+r.status);
  const raw=await r.json();
  return readFeatureResponse(raw);
 }finally{clearTimeout(timeout);}
}
async function auditCells(cells,fetchFn=fetch,onQualified){
 if(!Array.isArray(cells)||cells.length>293||cells.some(c=>!Array.isArray(c.point)))
  throw Error('synthetic-sample-count-invalid');
 const byStatus={},byTaxStatus={},byLandAndTax={},byMissing={},sourceFailures={collin:0,denton:0};
 const sources=Object.entries(ENDPOINTS);
 // Preserve unknown source coverage after repeated failure, rather than
 // repeatedly waiting for each of 25 synthetic grid batches to time out.
 const consecutiveFailures={collin:0,denton:0},sourceCircuitOpen={collin:false,denton:false};
 for(let offset=0;offset<cells.length;offset+=CHUNK){
  const rows=cells.slice(offset,offset+CHUNK),points=rows.map(r=>r.point);
  // Independent public cadastral providers. A 2-provider failure never becomes
  // evidence of unoccupied or ineligible residential property.
  const datasets=await Promise.all(sources.map(async([name,source])=>{
   if(sourceCircuitOpen[name]){
    sourceFailures[name]++;return {name,status:'unavailable',features:[]};
   }
   // One bounded transient retry handles public-CAD 429/5xx/network hiccups;
   // persistent failures remain unavailable, never classified as unoccupied.
   for(let attempt=0;attempt<2;attempt++){
    try{
     const features=await fetchChunk(fetchFn,source,points);
     consecutiveFailures[name]=0;
     return {name,status:'ok',features};
    }catch{if(attempt===0)await new Promise(resolve=>setTimeout(resolve,250));}
   }
   sourceFailures[name]++;consecutiveFailures[name]++;
   if(consecutiveFailures[name]>=2)sourceCircuitOpen[name]=true;
   return {name,status:'unavailable',features:[]};
  }));
  for(const c of rows){
   const outcomes=datasets.map(d=>({status:d.status,matches:d.features.filter(f=>contains(f.geometry,c.point))}));
   const status=classifyPoint(outcomes);
   byStatus[status]=(byStatus[status]||0)+1;
   const tax=classifyTaxEvidence(outcomes);
   byTaxStatus[tax]=(byTaxStatus[tax]||0)+1;
   const intersection=status+' | '+tax;
   byLandAndTax[intersection]=(byLandAndTax[intersection]||0)+1;
   // Callback receives only an existing deterministic synthetic grid point;
   // never pass source parcel geometry/addresses or emit grid coordinates.
   if(typeof onQualified==='function'&&status==='residential-property-category'&&
      tax==='prosper-isd-taxing-code-reference')onQualified(c);
   const g=byMissing[c.missing]||(byMissing[c.missing]={});
   g[status]=(g[status]||0)+1;
  }
 }
 return {schemaVersion:1,sourceScope:'official public Collin CAD and Denton CAD source map, synthetic points only',
  sourceURLs:Object.fromEntries(sources.map(([k,v])=>[k,v.url.replace(/\/query$/,'')])),
  inputSyntheticCells:cells.length,categories:byStatus,taxingUnitEvidence:byTaxStatus,
  landUseTaxCrossTab:byLandAndTax,byMissingGradePattern:byMissing,
  chunksPerSource:Math.ceil(cells.length/CHUNK),sourceFailureChunks:sourceFailures,
  providerCircuitOpen:sourceCircuitOpen,
  conclusions:'CAD property classification cannot certify occupancy, attendance boundary, school enrollment, district tax-unit code equivalence or individual address.'};
}
async function main(){
 const root=path.resolve(__dirname,'..');
 const f=JSON.parse(fs.readFileSync(path.join(root,'prosper-attendance-2026.geojson'),'utf8'));
 if(f.features.length!==31)throw Error('Prosper 2026-27 31-campus source changed');
 const cells=makeSyntheticCells(f.features);
 if(cells.length!==293)throw Error('Prosper 120² sampled mismatch baseline drift: '+cells.length);
 const live=process.argv.includes('--live');
 const report=live?await auditCells(cells):{
  schemaVersion:1,stage:'offline-source-only',
  inputSyntheticCells:cells.length,sourceURLs:Object.fromEntries(Object.entries(ENDPOINTS).map(([k,v])=>[k,v.url])),
  qualification:'Use --live only in isolated read-only QA; no parcel result has been obtained.'};
 const out=path.join(root,'artifacts/school-linkage/prosper-synthetic-parcel-sourcecheck.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('PROSPER_PUBLIC_CAD_SYNTHETIC '+JSON.stringify({
  stage:live?'live-public-data-query':'offline',total:report.inputSyntheticCells,
  counts:report.categories||null,taxCodeEvidence:report.taxingUnitEvidence||null,
  landAndTax:report.landUseTaxCrossTab||null,
  sourceFailureChunks:report.sourceFailureChunks||null
 }));
}
if(require.main===module)main().catch(e=>{
 console.error('PROSPER_PUBLIC_CAD_AUDIT_UNAVAILABLE '+String(e.message).slice(0,180));
 process.exitCode=1;
});
module.exports={ENDPOINTS,landCategory,taxUnitEvidence,classifyTaxEvidence,buildForm,
 readFeatureResponse,classifyPoint,makeSyntheticCells,auditCells,fetchChunk};
