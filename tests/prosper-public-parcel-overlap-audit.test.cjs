'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const p=require('../scripts/prosper-public-parcel-overlap-audit.cjs');

const DATA=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','prosper-attendance-2026.geojson'),'utf8'));
const square=(x,y)=>[[[x-.0001,y-.0001],[x+.0001,y-.0001],
 [x+.0001,y+.0001],[x-.0001,y+.0001],[x-.0001,y-.0001]]];
const feature=(q,propType)=>({type:'Feature',
 properties:{propType,ownerName:'MUST NOT SURVIVE',situsFullAddress:'PRIVATE'},
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
 const form=p.buildForm([q],'propType,propSubType,propYear');
 assert.equal(form.get('outFields'),'propType,propSubType,propYear');
 assert.doesNotMatch(form.toString(),/owner|situs/i);
 assert.throws(()=>p.buildForm([[0,0]],'propType,propSubType,propYear'));
 const raw={type:'FeatureCollection',features:[feature(q,'Residential')]};
 const out=await p.fetchChunk(mock(raw),p.ENDPOINTS.collin,[q]);
 assert.equal(out.length,1);
 assert.equal(out[0].propType,'Residential');
 assert.equal('ownerName' in out[0],false);
 assert.equal('situsFullAddress' in out[0],false);
 assert.deepEqual(out[0].geometry,raw.features[0].geometry);
});
test('source success, unknown source, empty parcel, and ambiguous classification stay separate',async()=>{
 const a=[-96.8,33.22],b=[-96.81,33.23];
 const features=[feature(a,'Residential'),feature(b,'Commercial')];
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
