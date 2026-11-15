'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const registry=require('../district-registry.js');
const {context,response}=require('./helpers/bounded-context.cjs');
test('McKinney elementary verification does not certify middle or high source years',()=>{
 assert.equal(registry.districtZoneDisplay('043907',{'043907':true},'elementary',{verifiedYear:'2026-27'}),'official');
 assert.equal(registry.districtZoneDisplay('043907',{'043907':true},'middle',{sourceYear:'2025-26'}),'finder');
 assert.equal(registry.districtZoneDisplay('043907',{'043907':true},'high',{}),'finder');
});
test('Finder conversion retains source years and verifies only the inspected elementary scope',()=>{
 const h=context(()=>Promise.resolve(response({})));
 h.ctx.L={point:(x,y)=>({x,y}),CRS:{EPSG3857:{unproject:p=>({lng:p.x,lat:p.y})}}};
 const layers=[['Elementary Boundaries','ELEM_NAME','2026-27'],['Middle Boundaries','MID_NAME','2025-26'],['High Boundaries','HIGH_NAME',null]];
 const webmap={operationalLayers:layers.map(([title,field,year])=>({title,featureCollection:{layers:[{featureSet:{features:[{attributes:{[field]:'Synthetic school',SCHL_YEAR:year},geometry:{rings:[[[0,0],[1,0],[1,1],[0,0]]]}}]}}]}}))};
 h.ctx.__webmap=webmap;
 const p=JSON.parse(h.run('JSON.stringify(convertMetrostudyZones(__webmap,MCKINNEY_FINDER).map(f=>f.properties))'));
 assert.deepEqual(p.map(x=>x.sourceYear),['2026-27','2025-26',null]);
 assert.deepEqual(p.map(x=>x.verifiedYear),['2026-27',null,null]);
 assert.deepEqual(p.map(x=>x.yearVerified2627),[true,false,false]);
});
test('school selection preserves disabled reference and current-boundary overlays',async()=>{
 const h=context(()=>Promise.resolve(response({})));
 h.run('updateSelectedSchoolList=()=>{};drawDetail=()=>{};state.showOldZones=false;state.showHistoric=false;');
 await h.ctx.schoolClicked({name:'Synthetic campus',ll:[33,-96],district:'AISD'});
 assert.equal(h.run('state.showOldZones'),false);assert.equal(h.run('state.showHistoric'),false);
});
