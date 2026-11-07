'use strict';
// Current Plano ISD 2026-27 SchoolFinder points at layers still named "2526".
// A district-operated Finder is a practical boundary source, not proof that a
// 2026-27 schema refresh occurred. A school may have multiple polygons.
const PLANO_LAYERS=[{id:0,level:'senior',field:'SR2526',min:2},{id:1,level:'high',field:'HIGH2526',min:4},{id:2,level:'middle',field:'MID2526',min:8},{id:3,level:'elementary',field:'ELEM2526',min:35}];
const PLANO_SERVICE='https://services4.arcgis.com/uBV8NRVfoRJv7qWn/arcgis/rest/services/Plano_ISD_School_Districts/FeatureServer';
function planoLiveUrl(id){
 if(!Number.isInteger(id)||id<0||id>3)throw Error('invalid layer');
 return PLANO_SERVICE+'/'+id+'/query?'+new URLSearchParams({f:'geojson',where:'1=1',outFields:'*',outSR:'4326',returnGeometry:'true',resultRecordCount:'2000'});
}
function convertPlanoLive(f,layer){
 const p=f?.properties||{},g=f?.geometry;
 if(!['Polygon','MultiPolygon'].includes(g?.type)||!Array.isArray(g.coordinates)||!g.coordinates.length)throw Error('invalid polygon');
 const name=String(p.EntityName||p[layer.field]||'').trim();if(!name)throw Error('missing school');
 return {type:'Feature',geometry:g,properties:{district:'PISD',school:name,gradeLevel:layer.level,grades:String(p.Grade||'').trim(),sourceDistrict:'PISD',sourceVintage:'Current district Finder (source layer 2025–26)',currentFinderSource:true,yearVerified2627:false}};
}
async function loadPlanoLiveFinder(fetchFn=fetch){
 const layers=await Promise.all(PLANO_LAYERS.map(async layer=>{
  const r=await fetchFn(planoLiveUrl(layer.id),{cache:'no-store'});if(!r.ok)throw Error('Plano GIS HTTP '+r.status);
  const j=await r.json();if(j?.type!=='FeatureCollection'||!Array.isArray(j.features)||j.features.length<layer.min||j.features.length>=2000)throw Error('Plano incomplete level '+layer.id);
  const mapped=j.features.map(x=>convertPlanoLive(x,layer));
  if(new Set(mapped.map(x=>x.properties.school.toUpperCase())).size<layer.min-2)throw Error('Plano missing campuses');
  return mapped;
 }));
 return layers.flat();
}
if(typeof module!=='undefined')module.exports={PLANO_LAYERS,PLANO_SERVICE,planoLiveUrl,convertPlanoLive,loadPlanoLiveFinder};
