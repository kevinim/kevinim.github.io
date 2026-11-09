'use strict';
// Convert ONLY the Irving ISD district-linked August-2020 ArcGIS High Schools embedded
// WebMap feature collection to WGS84. Historical reference, never an enrollment map.
const EXPECTED=Object.freeze(['Irving HS','Macarthur HS','Nimitz HS']);
const WEBMAP='94e441e70e5049daa74c0cc2bb5a7cad';
const R=6378137;
function requireOK(condition,reason){if(!condition)throw Error(reason)}
function webMercatorPoint(point){
 requireOK(Array.isArray(point)&&point.length===2&&point.every(Number.isFinite),'invalid WebMercator coordinate');
 const [x,y]=point;
 requireOK(x>-10850000&&x<-10750000&&y>3800000&&y<4000000,'WebMercator outside Irving ISD');
 const lon=x/R*180/Math.PI,lat=(2*Math.atan(Math.exp(y/R))-Math.PI/2)*180/Math.PI;
 requireOK(lon>-97.6&&lon<-96.5&&lat>32.3&&lat<33.4,'WGS84 outside DFW');
 return [lon,lat];
}
function toWGS84Polygon(geometry){
 // No multi-ring/hole inference: explicit fail-closed until independently
 // tested topology rules are developed. Official high map has one ring/campus.
 requireOK(geometry&&Array.isArray(geometry.rings)&&geometry.rings.length===1,'unexpected embedded multi-ring topology');
 const ring=geometry.rings[0];
 requireOK(Array.isArray(ring)&&ring.length>=4&&ring.length<20000,'invalid embedded high polygon');
 requireOK(ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1],'unclosed embedded ring');
 return {type:'Polygon',coordinates:[ring.map(webMercatorPoint)]};
}
function extractEmbeddedHigh(map,item){
 requireOK(item?.id===WEBMAP&&item.type==='Web Map','untrusted high school web map ID');
 const matching=(map?.operationalLayers||[]).filter(layer=>layer.title==='High Schools'&&layer.featureCollection);
 requireOK(matching.length===1,'missing or ambiguous embedded high-school polygon layer');
 const layers=matching[0].featureCollection.layers;
 requireOK(Array.isArray(layers)&&layers.length===1,'unexpected embedded layer count');
 const layer=layers[0];
 const meta=layer.layerDefinition||{}, features=layer.featureSet?.features;
 requireOK(meta.geometryType==='esriGeometryPolygon'&&[102100,3857].includes(meta.extent?.spatialReference?.wkid),'invalid high school source CRS or geometry');
 requireOK(Array.isArray(features)&&features.length===3,'unexpected Irving high polygon count');
 const out=features.map(f=>{
  const school=String(f.attributes?.HIGH_DESC||'').trim();
  requireOK(EXPECTED.includes(school),'unmatched school name in high polygon');
  return {type:'Feature',geometry:toWGS84Polygon(f.geometry),properties:{
   school,gradeLevel:'high',sourceDistrict:'057912',sourceLayer:'arcgis-webmap:'+WEBMAP+':High Schools',
   originalCrs:'EPSG:3857',sourceCrs:'EPSG:4326',
   arcgisItemModifiedUTC:new Date(item.modified).toISOString(),
   schoolYear:null,campusId:null,sourceYearVerified:false,campusIdCrosswalkVerified:false,
   independentFinderVerified:false,status:'QUARANTINED_HISTORICAL_UNVERIFIED'}};
 });
 requireOK(new Set(out.map(f=>f.properties.school)).size===3,'duplicate Irving high school zone');
 return {features:out,audit:{
  grade:'high',webMap:WEBMAP,sourceLayer:'embedded FeatureCollection: High Schools / high',
  originalCrs:'EPSG:3857',normalizedCrs:'EPSG:4326',
  arcgisItemOwner:item.owner||null,ownershipIndependentlyVerified:false,
  webMapLastModifiedUTC:new Date(item.modified).toISOString(),
  schoolCount:3,polygonCount:3,confirmedSchoolYear:null,TEAIdCrosswalk:false,
  finalAddressAssignment:false,publisherFeatureServiceUrl:null,
  sourceNote:'District-hosted 2020 Web Map; embedded, not live FeatureServer. Current academic year NOT proven.',
  release:'NO_GO'}};
}
module.exports={EXPECTED,WEBMAP,webMercatorPoint,toWGS84Polygon,extractEmbeddedHigh};
