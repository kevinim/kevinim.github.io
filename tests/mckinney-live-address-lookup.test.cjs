'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../features/mckinney-live-address-lookup.js');
const spec=[['elementary','SYNTH ELEM','043907101'],['middle','SYNTH MID','043907102'],['high','SYNTH HIGH','043907103']];
function fixture(){
 const layers=[],zones=[],sizes={elementary:17,middle:5,high:3};
 for(const [title,field,level] of [['Elementary Boundaries','ELEM_NAME','elementary'],
  ['Middle Boundaries','MID_NAME','middle'],['High Boundaries','HIGH_NAME','high']]){
  const list=[],first=spec.find(x=>x[0]===level);
  for(let i=0;i<sizes[level];i++){
   const name=i?level+' Other '+i:first[1];
   list.push({attributes:{[field]:name,...(level==='elementary'?{SCHL_YEAR:'2026-27'}:{})},
    geometry:{rings:[[[0,0],[1,0],[1,1],[0,0]]]}});
   zones.push({type:'Feature',properties:{gradeLevel:level,school:name,
    campusId:i?null:first[2],sourceYearRaw:level==='elementary'?'2026-27':null},
    geometry:{type:'Polygon',coordinates:[],__selected:i===0}});
  }
  layers.push({title,featureCollection:{layers:[{featureSet:{features:list}}]}});
 }
 return {point:[-96.6,33.18],map:{operationalLayers:layers},
  localCandidate:{district:'043907',status:'finder-current',features:zones.filter(x=>x.geometry.__selected)},
  convert:()=>zones,contains:(_p,g)=>g.__selected===true};
}
test('current publisher E/M/H map is only GIS source evidence',()=>{
 const r=api.compare(fixture());
 assert.equal(r.kind,'source-matched');
 assert.deepEqual(r.schools.map(x=>x.level),['elementary','middle','high']);
 assert.deepEqual(r.warnings,['middle GIS 학년도 미표기','high GIS 학년도 미표기']);
 assert.equal(r.independentOfficialAddressVerified,false);
 assert.equal('address' in r,false);
 assert.equal('coordinates' in r,false);
});
test('remote publisher never receives coordinates or address',async()=>{
 const f=fixture(),calls=[];
 const r=await api.lookup({...f,requestJson:async(url,opt)=>{calls.push([url,opt]);return f.map}});
 assert.equal(r.kind,'source-matched');assert.equal(calls.length,1);
 assert.equal(calls[0][0],api.URL);assert.equal(calls[0][0].includes('33.18'),false);
 assert.equal(calls[0][1].cache,'no-store');
});
test('wrong-district and low precision are blocked',()=>{
 const f=fixture();f.localCandidate.district='FISD';
 assert.equal(api.compare(f).code,'not-mckinney-zone');
 f.localCandidate.district='043907';f.point=[-95,33.18];
 assert.equal(api.compare(f).code,'imprecise-address');
});
test('stale current-year elementary layer and missing source are blocked',()=>{
 const f=fixture();f.map.operationalLayers[0].featureCollection.layers[0].featureSet.features[0].attributes.SCHL_YEAR='2025-26';
 assert.equal(api.compare(f).code,'stale-elementary');
 const g=fixture();g.map.operationalLayers.pop();
 assert.equal(api.compare(g).code,'invalid-layer');
});
test('publisher planning-area duplicates above 300 do not masquerade as schema changes',()=>{
 const f=fixture();
 const rows=f.map.operationalLayers[0].featureCollection.layers[0].featureSet.features;
 for(let i=0;i<310;i++)rows.push({attributes:{ELEM_NAME:'SYNTH ELEM',SCHL_YEAR:'2026-27'},
  geometry:{rings:[[[0,0],[1,0],[1,1],[0,0]]]}});
 assert.equal(api.compare(f).kind,'source-matched');
});
test('non-zoned placeholder entries are ignored but malformed named zones are rejected',()=>{
 const f=fixture();
 const rows=f.map.operationalLayers[0].featureCollection.layers[0].featureSet.features;
 rows.push({attributes:{ELEM_NAME:''},geometry:{rings:[]}});
 assert.equal(api.compare(f).kind,'source-matched');
 rows.push({attributes:{ELEM_NAME:'SYNTH ELEM',SCHL_YEAR:'2026-27'},geometry:{rings:[]}});
 assert.equal(api.compare(f).code,'invalid-layer');
});
test('large changed source and stale year on named zone still fail closed',()=>{
 const f=fixture(),rows=f.map.operationalLayers[0].featureCollection.layers[0].featureSet.features;
 rows.push({attributes:{ELEM_NAME:'SYNTH ELEM',SCHL_YEAR:'2025-26'},geometry:{rings:[[[0,0],[1,0],[1,1],[0,0]]]}});
 assert.equal(api.compare(f).code,'stale-elementary');
 const g=fixture(),huge=g.map.operationalLayers[0].featureCollection.layers[0].featureSet.features;
 for(let i=0;i<5001;i++)huge.push({attributes:{ELEM_NAME:''},geometry:{rings:[]}});
 assert.equal(api.compare(g).code,'invalid-layer');
});
test('fresh middle school different from the previously loaded GIS is a hard conflict',()=>{
 const f=fixture(),zones=f.convert();
 f.convert=()=>zones.map(x=>x.properties.gradeLevel==='middle'&&x.geometry.__selected?
  {...x,properties:{...x.properties,school:'OTHER MID'}}:x);
 assert.equal(api.compare(f).code,'different-school');
});
test('explicit older high school year cannot be promoted',()=>{
 const f=fixture();f.convert().find(x=>x.properties.gradeLevel==='high'&&x.geometry.__selected).properties.sourceYearRaw='2025-26';
 assert.equal(api.compare(f).code,'stale-school-year');
});
test('late response cancelled after address change',async()=>{
 const f=fixture();
 await assert.rejects(api.lookup({...f,signal:{aborted:true},requestJson:async()=>f.map}),{name:'AbortError'});
});
