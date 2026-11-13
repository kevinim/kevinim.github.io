'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','dashboard-main.js'),'utf8');
const start=source.indexOf('const schoolZipGeometries=new Map()');
const end=source.indexOf('function drawList(){',start);
if(start<0||end<=start)throw Error('School scope cache must exist in the production dashboard');

function harness(){
 const state={zip:'75093',polys:{}};
 const DATA=[{z:'75093'},{z:'75094'},{z:'75007'}];
 const countyData={zipCounty:{'75093':'Collin','75094':'Collin','75007':'Dallas'}};
 const control={value:'zip'};
 const calls={geometry:0};
 const bounds=(point,rect)=>point[0]>=rect[1]&&point[0]<=rect[3]&&point[1]>=rect[0]&&point[1]<=rect[2];
 function layer(west,south,east,north){
  const rect=[west,south,east,north];
  let conversions=0;
  return {
   getBounds(){return {contains(ll){return bounds(ll,rect)}};},
   toGeoJSON(){conversions++;return {type:'FeatureCollection',features:[{geometry:{rect}}]};},
   conversions(){return conversions}
  };
 }
 const context={state,DATA,countyData,el:()=>control,
  geometryContains(point,geometry){calls.geometry++;return bounds([point[1],point[0]],geometry.rect)}};
 const api=vm.runInNewContext(source.slice(start,end)+'\n({schoolWithinScope,schoolScopeZipCandidates})',context);
 return {state,DATA,countyData,control,calls,layer,...api};
}

test('repeated ZIP checks reuse parsed GeoJSON and per-school point results',()=>{
 const h=harness();
 const shape=h.layer(-97,32.9,-96.5,33.3);
 h.state.polys['75093']=shape;
 const school={ll:[33.05,-96.8]};
 for(let n=0;n<12;n++)assert.equal(h.schoolWithinScope(school),true);
 assert.equal(shape.conversions(),1,'GeoJSON must be built once per ZIP layer');
 assert.equal(h.calls.geometry,1,'point-in-polygon should be reused for unchanged school');
});

test('changed coordinates or replaced ZIP layer invalidate cached school membership',()=>{
 const h=harness();
 const first=h.layer(-97,33,-96.7,33.2);
 h.state.polys['75093']=first;
 const school={ll:[33.05,-96.8]};
 assert.equal(h.schoolWithinScope(school),true);
 school.ll=[33.1,-96.8];
 assert.equal(h.schoolWithinScope(school),true);
 assert.equal(h.calls.geometry,2,'updated point must be retested');
 const updated=h.layer(-97.3,33,-97.0,33.2);
 h.state.polys['75093']=updated;
 assert.equal(h.schoolWithinScope(school),false,'replacement zone cannot inherit old hit');
 assert.equal(updated.conversions(),0,'bounds short-circuit must avoid unnecessary JSON conversion');
 school.ll=[33.1,-97.1];
 assert.equal(h.schoolWithinScope(school),true);
 assert.equal(updated.conversions(),1);
});

test('ZIP, county and all-school scopes retain prior filtering semantics',()=>{
 const h=harness();
 h.state.polys['75093']=h.layer(-97,33,-96.9,33.1);
 h.state.polys['75094']=h.layer(-96.9,33,-96.7,33.1);
 h.state.polys['75007']=h.layer(-97.6,32.8,-97.2,33);
 const school={ll:[33.05,-96.8]};
 h.control.value='zip';
 assert.equal(h.schoolWithinScope(school),false);
 h.control.value='county';
 assert.equal(h.schoolWithinScope(school),true);
 h.control.value='all';
 assert.equal(h.schoolWithinScope({ll:null}),true,'unlocated campus remains in all-school list');
 h.control.value='county';h.state.zip='75007';
 assert.equal(h.schoolWithinScope(school),false);
 h.state.zip='unknown';
 assert.equal(h.schoolWithinScope(school),false,'unknown county must not widen results');
});

test('list search debounces, uses O(n) school indices, and delegates click listeners',()=>{
 assert.match(source,/schoolListSearchTimer=setTimeout\(drawList,140\)/);
 assert.match(source,/const scopeZips=schoolScopeZipCandidates\(\),schoolIndexes=new Map\(state\.schools\.map/);
 assert.match(source,/data-sid=\\"\$\{schoolIndexes\.get\(s\)\}/);
 assert.doesNotMatch(source,/state\.schools\.indexOf\(s\)/);
 assert.match(source,/el\('schoolList'\)\.addEventListener\('click'/);
 assert.doesNotMatch(source,/box\.querySelectorAll\('button\.school\[data-sid\]'\)\.forEach/);
});
