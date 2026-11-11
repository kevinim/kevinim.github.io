'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('features/cfb-zone-overlay.js','utf8');
const bridge=fs.readFileSync('features/cfb-official-bridge.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const release=require('../features/conditional-school-release.js');
const SCHOOL={district:'CFB',type:'elementary',name:'Synthetic Test Elementary',ll:[32.98,-96.9]};
const POLY={type:'Polygon',coordinates:[[[-96.92,32.96],[-96.88,32.96],[-96.88,33.0],[-96.92,33.0],[-96.92,32.96]]]};
function feature(extra={}){
 return {type:'Feature',properties:{district:'CFB',school:SCHOOL.name,gradeLevel:'elementary',
  schoolYear:'2025-26',geometryStatus:'reconstructed',sourceId:'AG03-draft',...extra},geometry:POLY};
}
function setup(){
 const spans=[],bounds=[],layers=new Set();
 const map={fitBounds:(b,opts)=>bounds.push({b,opts}),removeLayer:l=>layers.delete(l)};
 const L={
  layerGroup(){const group={items:[],clearLayers(){this.items.length=0},addTo(m){layers.add(this);return this}};return group},
  geoJSON(f,opts){return {addTo(layer){layer.items.push({f,opts});return this},
   getBounds(){return {isValid:()=>true}}}}
 };
 const ctx={window:{},map,L};
 vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:2500});
 return {api:ctx.window.CFBZoneOverlay,spans,bounds,layers};
}
test('new CFB module is local-origin, separate from home and global school assignment',()=>{
 assert.match(html,/features\/cfb-zone-overlay\.js\?v=1/);
 assert.match(html,/features\/cfb-official-bridge\.js\?v=2/);
 assert.match(html,/features\/cfb-official-inline\.css\?v=2/);
 assert.match(bridge,/showZone\(s\)/);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|postMessage|home\.assignment\s*=|APPROVED_AUTO_DISTRICTS\s*=/);
 assert.equal(release.releaseSummary().currentYearResidentialDistrictApprovals,0);
 assert.equal(release.decide({status:'current',district:'CFB'}).allowed,false);
});
test('AG03 draft schema is accepted but cannot render without explicit opt-in',()=>{
 const {api,layers,bounds}=setup();
 assert.equal(api.setGeoJSON({type:'FeatureCollection',features:[feature()]}).accepted,1);
 assert.equal(api.getSummary().verified,0);
 assert.equal(api.getSummary().draftVisible,false);
 assert.equal(api.showForSchool(SCHOOL),'draft-hidden');
 assert.equal(api.getSummary().overlayVisible,false);
 assert.equal(layers.size,0);
 assert.equal(bounds.length,0);
 assert.equal(api.setDraftVisibility(true),'draft-visible');
 // The caller must explicitly check the draft box or invoke setDraftVisibility(true).
 assert.equal(api.getSummary().overlayVisible,true);
 assert.equal(layers.size,1);
 assert.equal(bounds.length,1);
 assert.equal(bounds[0].opts.maxZoom,14);
 assert.equal(api.setDraftVisibility(false),'draft-hidden');
 assert.equal(api.getSummary().overlayVisible,false);
 api.reset();
 assert.equal(api.getSummary().draftVisible,false);
});
test('data claiming official-verified cannot self-approve a boundary',()=>{
 const {api}=setup();
 assert.equal(api.setGeoJSON({type:'FeatureCollection',features:[feature({
  geometryStatus:'official-verified',sourceId:'pretend-approved-by-source'
 })]}).verified,0);
 assert.equal(api.showForSchool(SCHOOL),'draft-hidden');
 assert.equal(api.getSummary().automaticAssignmentApproved,false);
});
test('non CFB and wrong grade/name have no overlay, even if a valid draft is loaded',()=>{
 const {api}=setup();
 api.setGeoJSON({type:'FeatureCollection',features:[feature()]});
 api.setDraftVisibility(true);
 for(const school of [
  {...SCHOOL,district:'LISD'},{...SCHOOL,type:'middle'},{...SCHOOL,name:'Different Elementary'}
 ]){
  assert.equal(api.showForSchool(school),'unavailable');
  assert.equal(api.getSummary().overlayVisible,false);
 }
 assert.equal(api.showForSchool(SCHOOL),'draft-visible');
});
test('invalid/missing/unclosed/out-of-area or duplicated zones fail closed',()=>{
 const {api}=setup();
 assert.throws(()=>api.setGeoJSON({type:'FeatureCollection',features:new Array(121).fill(feature())}),/형식/);
 const bad=feature();bad.geometry={type:'Polygon',coordinates:[[[-96.91,32.98],[-96.9,33],[-96.8,33],[-96.91,33]]]};
 const outside=feature({school:'Other'});outside.geometry={type:'Polygon',
  coordinates:[[[-74,40],[-73,40],[-73,41],[-74,40]]]};
 const missing=feature({gradeLevel:'unknown'});
 const data={type:'FeatureCollection',features:[feature(),feature(),bad,outside,missing]};
 const result=api.setGeoJSON(data);
 assert.equal(result.accepted,1);
 assert.equal(result.rejected,4);
 assert.equal(api.showForSchool(SCHOOL),'draft-hidden');
 assert.equal(api.showForSchool({district:'CFB',type:'high',name:'Missing'}),'unavailable');
});
test('no loaded CFB geometry leaves honest unknown state rather than an invented assignment',()=>{
 const {api}=setup();
 assert.equal(api.showForSchool(SCHOOL),'unavailable');
 assert.equal(api.getSummary().features,0);
 assert.equal(api.getSummary().overlayVisible,false);
 assert.equal(api.getSummary().automaticAssignmentApproved,false);
});
