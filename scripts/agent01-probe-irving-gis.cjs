'use strict';
// Agent01: official-publisher GIS staging only. NEVER a dashboard runtime zone loader.
// All staged polygons remain unapproved until school-year, campus-ID, terms, and Finder gates pass.
const fs=require('node:fs'),path=require('node:path');
const {extractEmbeddedHigh}=require('./agent01-irving-embedded-high.cjs');
const {loadSources,attachReferenceIDs}=require('./agent01-irving-tea-crosswalk.cjs');
const MAPS=Object.freeze([
 {level:'elementary',id:'a9ea586919d64c7e9aaa7193572f46d3',match:/^New_EL_Zones_24_25$|^Elementary.*Boundar/i},
 {level:'middle',id:'64c8ba47e77346de9d6812736693debc',match:/middle|rebound_ms_zones|midaa|mid.*boundar/i},
 {level:'high',id:'94e441e70e5049daa74c0cc2bb5a7cad',match:/^HighAA$|^High.*Boundar/i}
]);
function requireOK(x,msg){if(!x)throw Error(msg);}
function flattenLayers(obj){
 if(!obj||typeof obj!=='object')return [];
 const out=[];
 for(const k of ['operationalLayers','layers'])for(const l of Array.isArray(obj[k])?obj[k]:[]){
  if(l.url||l.featureCollection)out.push(l);
  out.push(...flattenLayers(l));
 }
 return out;
}
function acceptLayerUrl(s){
 const u=new URL(s);
 requireOK(u.protocol==='https:'&&/^services\d*\.arcgis\.com$/.test(u.hostname),'not an allowlisted ArcGIS FeatureServer host');
 requireOK(/\/(FeatureServer|MapServer)\/\d+$/.test(u.pathname),'expected exact ArcGIS layer');
 return u.origin+u.pathname;
}
function selectLayer(map,spec){
 const matching=flattenLayers(map).filter(l=>spec.match.test(String(l.title||l.name||l.layerDefinition?.name||'')));
 const urls=[...new Set(matching.map(l=>l.url).filter(Boolean).map(acceptLayerUrl))];
 requireOK(urls.length===1,'unverified or ambiguous '+spec.level+' source: '+urls.length+'; available titles: '+flattenLayers(map).map(l=>String(l.title||l.name||l.layerDefinition?.name||'(untitled)')).slice(0,12).join(' | '));
 return urls[0];
}
function validPolygon(g){
 if(!g||!['Polygon','MultiPolygon'].includes(g.type))return false;
 const ps=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 return Array.isArray(ps)&&ps.length>0&&ps.every(poly=>Array.isArray(poly)&&poly.length>0&&poly.every(r=>
 Array.isArray(r)&&r.length>=4&&r.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&
 p[0]>-97.6&&p[0]<-96.5&&p[1]>32.3&&p[1]<33.4)&&
 r[0][0]===r[r.length-1][0]&&r[0][1]===r[r.length-1][1]));
}
function normalize(f,grade,src){
 requireOK(f?.type==='Feature'&&validPolygon(f.geometry),'not a closed WGS84 DFW polygon');
 const p=f.properties||{};
 const key=Object.keys(p).find(k=>/^(school_?name|school|name|elem_?name|mid_?name|high_?name|campus|elemaa|midaa|highaa)$/i.test(k)&&typeof p[k]==='string'&&p[k].trim());
 requireOK(key,'missing published school-name field');
 return {type:'Feature',geometry:f.geometry,properties:{school:p[key].trim(),gradeLevel:grade,sourceDistrict:'057912',
  sourceLayerTitleYear:grade==='elementary'?'2024-25':null,
  sourceLayer:src,sourceCrs:'EPSG:4326',schoolYear:null,campusId:null,sourceYearVerified:false,
  campusIdCrosswalkVerified:false,independentFinderVerified:false,status:'QUARANTINED_YEAR_UNKNOWN'}};
}
async function json(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{accept:'application/json'}});
 if(!r.ok)throw Error('ArcGIS HTTP '+r.status);
 const j=await r.json();if(j.error)throw Error('ArcGIS error '+j.error.code);
 return j;
}
async function probe(spec){
 const root='https://www.arcgis.com/sharing/rest/content/items/'+spec.id;
 const item=await json(root+'?f=json');
 requireOK(item.type==='Web Map'&&MAPS.some(row=>row.id===spec.id)&&typeof item.owner==='string'&&item.owner.length>0,'not a public Web Map linked from the district page');
 const map=await json(root+'/data?f=json');
 // Official district high-school WebMap stores polygon shapes directly as
 // embedded WebMercator FeatureCollection, NOT a remote FeatureServer.
 if(spec.level==='high')return extractEmbeddedHigh(map,item);
 const source=selectLayer(map,spec),meta=await json(source+'?f=json');
 requireOK(meta.type==='Feature Layer'&&meta.geometryType==='esriGeometryPolygon'&&meta.capabilities?.includes('Query'),'not a queryable school polygon');
 const q=new URL(source+'/query');
 for(const [k,v] of Object.entries({where:'1=1',outFields:'*',returnGeometry:'true',outSR:'4326',resultRecordCount:'2000',f:'geojson'}))q.searchParams.set(k,v);
 const geo=await json(q.toString());
 requireOK(geo.type==='FeatureCollection'&&Array.isArray(geo.features)&&geo.features.length>0&&geo.features.length<2000&&!geo.exceededTransferLimit,'missing or truncated GIS features');
 const features=geo.features.map(f=>normalize(f,spec.level,source));
 return {features,audit:{grade:spec.level,webMap:spec.id,sourceLayer:source,originalCrs:meta.extent?.spatialReference||null,
  normalizedCrs:'EPSG:4326',arcgisItemOwner:item.owner,ownershipIndependentlyVerified:false,polygonCount:features.length,
  schoolCount:new Set(features.map(f=>f.properties.school)).size,
  publisherLastEdit:meta.editingInfo?.lastEditDate?new Date(meta.editingInfo.lastEditDate).toISOString():null,
  confirmedSchoolYear:null,TEAIdCrosswalk:false,finalAddressAssignment:false,release:'NO_GO'}};
}
async function main(){
 const dir=path.join('artifacts','agent01-irving-gis-stage');fs.mkdirSync(dir,{recursive:true});
 const audit={dateUTC:new Date().toISOString(),reviewState:'NO_GO',sourceYearConfirmed:false,results:[],errors:[],currentAssignmentApproved:false},all=[];
 for(const spec of MAPS)try{
  const result=await probe(spec);audit.results.push(result.audit);all.push(...result.features);
 }catch(e){audit.errors.push({grade:spec.level,reason:String(e.message).slice(0,650)});}
 let staged=all;
 if(!audit.errors.length)try{
  const refs=loadSources(),joined=attachReferenceIDs(all,refs.manifest,refs.tea);
  staged=joined.features;audit.preliminaryTEACrosswalk=joined.audit;
 }catch(e){audit.errors.push({grade:'tea-provisional-directory',reason:String(e.message).slice(0,600)});}
 fs.writeFileSync(path.join(dir,'source-audit.json'),JSON.stringify(audit,null,2)+'\n');
 // Retain successful grade-specific source work in CI-local quarantine even if another grade fails.
 // Only metadata JSON is uploaded, never the source geometry or private addresses.
 if(staged.length)fs.writeFileSync(path.join(dir,'QUARANTINED-source-year-unknown.geojson'),JSON.stringify({type:'FeatureCollection',features:staged})+'\n');
 if(audit.errors.length||audit.results.length!==3){console.error('GIS source extraction NO_GO',audit.errors);console.log('Quarantined grade successes:',audit.results.map(x=>x.grade+':'+x.polygonCount+' polygons/'+x.schoolCount+' distinct names').join(','));process.exitCode=1;return;}
 console.log('GIS STAGED, NOT RELEASED:',staged.length,'polygons across',audit.results.length,'grades; 2026-27 validity unverified');
}
if(require.main===module){
 if(process.argv.includes('--live'))main().catch(e=>{console.error(e.message);process.exitCode=1;});
 else console.log('Use --live for read-only official ArcGIS staging; no production connection');
}
module.exports={MAPS,flattenLayers,acceptLayerUrl,selectLayer,validPolygon,normalize};
