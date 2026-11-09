'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../irving-official-spatial.js');
const [lon,lat]=[-96.986394877074,32.822898576419];
const square=[[-97.0,32.81],[-96.97,32.81],[-96.97,32.84],[-97,32.84],[-97,32.81]];
const esriRing=square.map(M.wmPoint);
function fixtureMap(){
 return {operationalLayers:[
  {id:M.SOURCES.elementary.id,title:M.SOURCES.elementary.title,url:M.SOURCES.elementary.url},
  {id:M.SOURCES.middle.id,title:M.SOURCES.middle.title,url:M.SOURCES.middle.url},
  {id:M.SOURCES.high.id,title:M.SOURCES.high.title,featureCollection:{layers:[{
   layerDefinition:{geometryType:'esriGeometryPolygon',extent:{spatialReference:{wkid:102100}}},
   featureSet:{features:['Irving HS','Macarthur HS','Nimitz HS'].map((NAME,i)=>({
    attributes:{NAME},geometry:{rings:[i===0?esriRing:[
     M.wmPoint([-97.06,32.86]),M.wmPoint([-97.05,32.86]),M.wmPoint([-97.05,32.87]),M.wmPoint([-97.06,32.87]),M.wmPoint([-97.06,32.86])
    ]:esriRing]}}))}
  }]}}
 ]};
}
test('live reference lookup returns three source-based historical-only schools, never certified assignment',async()=>{
 const map=fixtureMap();
 const collected=[];
 const old=global.fetch;
 global.fetch=async(url)=>{
  collected.push(String(url));
  const u=new URL(url);
  const data=u.pathname.endsWith('/data');
  const middle=u.pathname.includes('ReBound_MS_Zones_v5');
  const response=data?map:{type:'FeatureCollection',features:[{
   type:'Feature',properties:{NAME:middle?'Crockett MS':'Barton ES'},geometry:{type:'Polygon',coordinates:[square]}
  }]};
  return {ok:true,json:async()=>response};
 };
 try{
  const result=await M.lookup([lon,lat]);
  assert.equal(result.status,'publisher-live-reference-only');
  assert.equal(result.yearCertified,false);
  assert.equal(result.addressAssignmentCertified,false);
  assert.deepEqual(result.names,{elementary:'Barton ES',middle:'Crockett MS',high:'Irving HS'});
  assert.equal(result.features.length,3);
  assert.equal(result.features.every(f=>f.properties.sourceYearVerified===false),true);
  assert.equal(result.features.every(f=>M.polygonContains([lon,lat],f.geometry)),true);
  assert.equal(collected.length,3);
  assert.ok(collected.some(u=>u.startsWith('https://iisd1.maps.arcgis.com/sharing/rest/content/items/')));
  assert.ok(collected.every(u=>!u.includes('Conflans')&&!u.includes('Irving%2CTX')&&!u.includes('token=')));
 }finally{global.fetch=old}
});
test('incomplete or drifted operational source fails closed',()=>{
 const map=fixtureMap();
 assert.equal(M.validateMap(map),true);
 map.operationalLayers[0].url='https://attacker.invalid/FeatureServer/4';
 assert.throws(()=>M.validateMap(map),/URL drift/);
});
test('geometry and exact high campuses cannot be guessed from nearby polygons',()=>{
 assert.equal(M.polygonContains([lon,lat],{type:'Polygon',coordinates:[square]}),true);
 assert.equal(M.polygonContains([-98,30],{type:'Polygon',coordinates:[square]}),false);
 const high=fixtureMap();
 assert.equal(M.decodeHighLayer(high,[lon,lat]).properties.school,'Irving HS');
 high.operationalLayers[2].featureCollection.layers[0].featureSet.features.pop();
 assert.throws(()=>M.decodeHighLayer(high,[lon,lat]),/count changed/);
 assert.throws(()=>M.wmPoint([-75,40]),/outside validated Irving/);
});
