'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const p=require('../scripts/prosper-public-parcel-overlap-audit.cjs');

const DATA=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','prosper-attendance-2026.geojson'),'utf8'));
const square=(x,y)=>[[[x-.0001,y-.0001],[x+.0001,y-.0001],
 [x+.0001,y+.0001],[x-.0001,y+.0001],[x-.0001,y-.0001]]];
const feature=(q,propType,taxUnit)=>({type:'Feature',
 properties:{propType,entitySchoolCode:taxUnit,schoolTaxingUnitName:taxUnit,
  ownerName:'MUST NOT SURVIVE',situsFullAddress:'PRIVATE'},
 geometry:{type:'Polygon',coordinates:square(...q)}});
const mock=(body)=>async(url,opts)=>{
 const form=new URLSearchParams(opts.body);
 assert.equal(opts.method,'POST');
 assert.equal(form.get('f'),'geojson');
 assert.equal(form.get('geometryType'),'esriGeometryMultipoint');
 assert.equal(form.get('returnGeometry'),'true');
 assert.equal(form.get('inSR'),'4326');
 assert.equal(form.get('outSR'),'4326');
 assert.doesNotMatch(form.get('outFields'),/owner|address|situs|parcel|propid/i);
 assert.match(url,/^https:\/\/(services2\.arcgis\.com|geo\.dentoncad\.com)\//);
 return {ok:true,json:async()=>body};
};
test('only published synthetic Prosper grid cells used, never real residences',()=>{
 assert.equal(DATA.features.length,31);
 const cells=p.makeSyntheticCells(DATA.features);
 assert.equal(cells.length,293);
 assert.deepEqual([...new Set(cells.map(c=>c.missing))].sort(),[
  'elementary','elementary+high','elementary+middle','high','middle','middle+high'
 ].sort());
 assert.ok(cells.every(c=>c.point.length===2&&c.point[0]<-96&&c.point[1]>33));
});
test('provider fields are strictly limited and responses discard property identities',async()=>{
 const q=[-96.8,33.22];
 const form=p.buildForm([q],'propType,propSubType,propYear,entitySchoolCode');
 assert.equal(form.get('outFields'),'propType,propSubType,propYear,entitySchoolCode');
 assert.doesNotMatch(form.toString(),/owner|situs/i);
 assert.throws(()=>p.buildForm([[0,0]],'propType,propSubType,propYear'));
 const raw={type:'FeatureCollection',features:[feature(q,'Residential','SPR')]};
 const out=await p.fetchChunk(mock(raw),p.ENDPOINTS.collin,[q]);
 assert.equal(out.length,1);
 assert.equal(out[0].propType,'Residential');
 assert.equal(out[0].taxUnit,'SPR');
 assert.equal('ownerName' in out[0],false);
 assert.equal('situsFullAddress' in out[0],false);
 assert.deepEqual(out[0].geometry,raw.features[0].geometry);
});
test('source success, unknown source, empty parcel, and ambiguous classification stay separate',async()=>{
 const a=[-96.8,33.22],b=[-96.81,33.23];
 const features=[feature(a,'Residential','SPR'),feature(b,'Commercial','OTHER')];
 const request=async(url,opts)=>{
  const form=new URLSearchParams(opts.body);
  assert.equal(form.get('f'),'geojson');
  return {ok:true,json:async()=>({type:'FeatureCollection',
   features:url.includes('services2.arcgis')?features:[]})};
 };
 const r=await p.auditCells([{point:a,missing:'middle'},{point:b,missing:'elementary'}],request);
 assert.equal(r.inputSyntheticCells,2);
 assert.equal(r.categories['residential-property-category'],1);
 assert.equal(r.categories['other-property-category'],1);
 assert.equal(r.taxingUnitEvidence['prosper-isd-taxing-code-reference'],1);
 assert.equal(r.taxingUnitEvidence['nonmatching-or-unmapped-tax-code'],1);
 assert.equal(r.landUseTaxCrossTab['residential-property-category | prosper-isd-taxing-code-reference'],1);
 assert.equal(r.sourceFailureChunks.collin,0);
 assert.equal(r.sourceFailureChunks.denton,0);
 assert.doesNotMatch(JSON.stringify(r),/MUST NOT SURVIVE|PRIVATE|coordinates|owner/i);
 const empty=await p.auditCells([{point:a,missing:'middle'}],
  async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[]})}));
 assert.equal(empty.categories['no-parcel-at-grid-point'],1);
 const offline=await p.auditCells([{point:a,missing:'middle'}],async()=>{throw Error('offline')});
 assert.equal(offline.categories['source-unavailable'],1);
 assert.equal(offline.sourceFailureChunks.collin,1);
 assert.equal(offline.sourceFailureChunks.denton,1);
});
test('untrusted ArcGIS response cannot masquerade as parcel evidence',()=>{
 assert.throws(()=>p.readFeatureResponse({error:{message:'not permitted'}}));
 assert.throws(()=>p.readFeatureResponse({type:'FeatureCollection',features:[],exceededTransferLimit:true}));
 assert.throws(()=>p.readFeatureResponse({type:'FeatureCollection',features:[{geometry:{type:'Point',coordinates:[0,0]},properties:{}}]}));
 assert.equal(p.landCategory('R'),'residential-property-category');
 assert.equal(p.landCategory('Commercial'),'other-property-category');
 assert.equal(p.landCategory('Vacant Lot'),'unknown-property-category');
 assert.equal(p.landCategory(null),'unknown-property-category');
 assert.equal(p.taxUnitEvidence('SPR'),'prosper-isd-taxing-code-reference');
 assert.equal(p.taxUnitEvidence('Prosper ISD'),'prosper-isd-taxing-code-reference');
 assert.equal(p.taxUnitEvidence('Other ISD'),'nonmatching-or-unmapped-tax-code');
 assert.equal(p.taxUnitEvidence(null),'taxing-unit-unmapped');
});

test('transient official-CAD failure is retried once without false no-residence label',async()=>{
 const q=[-96.8,33.22];
 const attempts={collin:0,denton:0};
 const fn=async(url)=>{
  const key=url.includes('services2.arcgis')?'collin':'denton';
  attempts[key]++;
  if(key==='denton'&&attempts[key]===1)throw Error('transient public source');
  return {ok:true,json:async()=>({type:'FeatureCollection',
   features:key==='collin'?[feature(q,'Residential')]:[]})};
 };
 const result=await p.auditCells([{point:q,missing:'middle'}],fn);
 assert.equal(attempts.collin,1);
 assert.equal(attempts.denton,2);
 assert.deepEqual(result.sourceFailureChunks,{collin:0,denton:0});
 assert.equal(result.categories['residential-property-category'],1);
});

test('persistent public CAD outage opens a bounded circuit and keeps every cell unavailable',async()=>{
 const q=[-96.8,33.22],cells=Array.from({length:48},()=>({point:q,missing:'middle'}));
 const attempts={collin:0,denton:0};
 const fetcher=async(url)=>{
  const which=url.includes('services2.arcgis')?'collin':'denton';attempts[which]++;
  if(which==='denton')throw Error('Denton source offline');
  return {ok:true,json:async()=>({type:'FeatureCollection',features:[]})};
 };
 const result=await p.auditCells(cells,fetcher);
 assert.equal(result.chunksPerSource,4);
 assert.deepEqual(attempts,{collin:4,denton:4},'two bounded retries across two chunks, then stop source calls');
 assert.equal(result.sourceFailureChunks.denton,4,'skipped chunks remain unavailable');
 assert.equal(result.sourceFailureChunks.collin,0);
 assert.equal(result.providerCircuitOpen.denton,true);
 assert.equal(result.providerCircuitOpen.collin,false);
 assert.equal(Object.values(result.categories).reduce((a,b)=>a+b,0),48);
 assert.equal(result.categories['no-parcel-at-grid-point']||0,0,
  'an offline source must never be treated as a confirmed empty property map');
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|ownerName|situsFullAddress/i);
});
test('a recovered CAD source resets its failure streak and stays queryable',async()=>{
 const q=[-96.8,33.22],cells=Array.from({length:36},()=>({point:q,missing:'middle'}));
 let failures=0,requests=0;
 const fetcher=async(url)=>{
  if(url.includes('geo.dentoncad.com')){
   requests++;
   if(failures<2){failures++;throw Error('temporary outage');}
  }
  return {ok:true,json:async()=>({type:'FeatureCollection',features:[]})};
 };
 const result=await p.auditCells(cells,fetcher);
 assert.equal(requests,4,'first two attempts fail, then next two chunks work');
 assert.equal(result.providerCircuitOpen.denton,false);
 assert.equal(result.sourceFailureChunks.denton,1);
});
