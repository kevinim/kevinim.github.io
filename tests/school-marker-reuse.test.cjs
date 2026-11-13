'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','dashboard-main.js'),'utf8');
const start=source.indexOf('const schoolMarkerIds=new WeakMap()');
const end=source.indexOf('function drawHomeAssignmentMap(){',start);
if(start<0||end<=start)throw Error('Actual incremental school marker renderer unavailable');
const renderer=source.slice(start,end);
const point=(lat,lng)=>({lat,lng,equals(other){return this.lat===other.lat&&this.lng===other.lng}});
function harness(n=8){
 const schoolGroup={
  layers:new Set(),additions:0,removals:0,
  hasLayer(m){return this.layers.has(m)},
  addLayer(m){this.additions++;this.layers.add(m);return this},
  removeLayer(m){this.removals++;this.layers.delete(m);return this},
  getLayers(){return [...this.layers]}
 };
 const state={zip:'75013',showSchools:true,selectedSchool:null,level:'all',
  schools:Array.from({length:n},(_,i)=>({name:'Campus '+i,ll:[33.1+i*.0001,-96.9+i*.0001],type:'elementary',district:'AISD'}))};
 const rating=new Map();
 const legend={innerHTML:'',classList:{toggle(){}}},notice={textContent:''};
 const elements={schoolLegend:legend,schoolMapStatus:notice};
 const map={
  zoom:14,view:null,stops:0,
  getZoom(){return this.zoom},
  getBounds(){return {contains(){return true}}},
  latLngToContainerPoint(ll){return {x:(ll[1]+97)*400,y:(ll[0]-33)*400}},
  stop(){this.stops++},
  setView(ll,zoom){this.view=ll;this.zoom=zoom}
 };
 let icons=0,markers=0;
 const L={
  divIcon(opts){return {serial:++icons,opts}},
  marker(ll,options){
   markers++;
   let loc=point(ll.lat??ll[0],ll.lng??ll[1]),icon=options.icon;
   const element={};
   return {options,element,handlers:{},
    getLatLng(){return loc},setLatLng(v){loc=point(v.lat??v[0],v.lng??v[1]);return this},
    setIcon(v){icon=v;return this},getIcon(){return icon},getElement(){return element},
    on(name,fn){this.handlers[name]=fn;return this}};
  },
  latLngBounds(lls){
   const lat=lls.reduce((sum,ll)=>sum+ll[0],0)/lls.length;
   const lng=lls.reduce((sum,ll)=>sum+ll[1],0)/lls.length;
   return {getCenter(){return point(lat,lng)}};
  }
 };
 const ctx={state,schoolGroup,map,L,window:{},home:null,
  el:id=>elements[id],syncMapSize:()=>({x:900,y:600}),
  schoolPassesRatingFilter:s=>state.level==='all'||s.type===state.level,
  homeSchoolMatches:()=>false,scoreRecord:name=>({rating:rating.get(name)||'A'}),
  schoolClicked:s=>{state.selectedSchool=s}};
 const api=vm.runInNewContext(renderer+'\n({drawSchools,schoolActiveMarkers})',ctx);
 return {state,schoolGroup,map,rating,api,counts:()=>({icons,markers})};
}
test('unchanged draw reuses exact marker objects, icon objects and layer memberships',()=>{
 const h=harness();h.api.drawSchools();
 const old=h.schoolGroup.getLayers();
 const counts=h.counts(),adds=h.schoolGroup.additions,removes=h.schoolGroup.removals;
 h.api.drawSchools();
 assert.equal(h.schoolGroup.getLayers().length,old.length);
 old.forEach(m=>assert.ok(h.schoolGroup.hasLayer(m)));
 assert.deepEqual(h.counts(),counts);
 assert.equal(h.schoolGroup.additions,adds);
 assert.equal(h.schoolGroup.removals,removes);
});
test('changing rating or school coordinates updates an existing pin and click targets correct school',()=>{
 const h=harness();h.api.drawSchools();
 const selected=h.schoolGroup.getLayers()[0],icon=selected.getIcon();
 h.rating.set('Campus 0','B');h.api.drawSchools();
 assert.ok(h.schoolGroup.hasLayer(selected));
 assert.notEqual(selected.getIcon(),icon,'rating change must update existing pin icon');
 h.state.schools[0].ll=[33.25,-96.75];h.api.drawSchools();
 assert.equal(selected.getLatLng().lat,33.25);
 selected.handlers.click();
 assert.equal(h.state.selectedSchool,h.state.schools[0]);
});
test('overlay filters detach pins and restore original markers without duplicates',()=>{
 const h=harness();h.api.drawSchools();
 const markers=h.schoolGroup.getLayers(),created=h.counts().markers;
 h.state.showSchools=false;h.api.drawSchools();
 assert.equal(h.schoolGroup.getLayers().length,0);
 h.state.showSchools=true;h.api.drawSchools();
 assert.equal(h.counts().markers,created);
 assert.equal(h.schoolGroup.getLayers().length,markers.length);
 markers.forEach(m=>assert.ok(h.schoolGroup.hasLayer(m)));
});
test('clusters reuse same grouped marker and click observes current zoom',()=>{
 const h=harness(60);h.map.zoom=10;h.api.drawSchools();
 const clusters=h.schoolGroup.getLayers().filter(m=>m.options.schoolMembers.length>1);
 assert.ok(clusters.length>0);
 const created=h.counts().markers;h.api.drawSchools();
 assert.equal(h.counts().markers,created);
 clusters.forEach(m=>assert.ok(h.schoolGroup.hasLayer(m)));
 h.map.zoom=11;clusters[0].handlers.click();
 assert.equal(h.map.zoom,13,'click must read current map zoom, not stale render zoom');
});
test('renderer keeps filtering and avoids destructive clearLayers',()=>{
 assert.doesNotMatch(renderer,/schoolGroup\.clearLayers\(/);
 assert.match(renderer,/schoolPassesRatingFilter\(s\)/);
 assert.match(renderer,/schoolPinCache=new WeakMap\(\)/);
 assert.match(renderer,/reconcileSchoolMarkerLayers\(next\)/);
});
