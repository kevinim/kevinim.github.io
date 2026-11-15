'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {context,response,flush}=require('./helpers/bounded-context.cjs');
async function load({claim=false}={}){
 let finish;const h=context(()=>new Promise(resolve=>{finish=resolve}));let fits=0;
 h.ctx.__map={fitBounds(){fits++}};h.ctx.L={geoJSON:()=>({getBounds:()=>({isValid:()=>true,getCenter:()=>({lat:33,lng:-96})})})};
 h.run('map=__map;drawZip=()=>{};');
 const task=h.ctx.loadZipShapes();await flush();if(claim)h.ctx.claimMapViewport();
 const zips=JSON.parse(h.run('JSON.stringify(DATA.map(x=>x.z))'));
 finish(response({type:'FeatureCollection',features:zips.map(ZCTA5CE20=>({type:'Feature',properties:{ZCTA5CE20},geometry:{type:'Polygon',coordinates:[]}}))}));
 await task;return fits;
}
test('ordinary initial ZIP fit still occurs when no other view owns the map',async()=>assert.equal(await load(),1));
test('late ZIP geometry cannot overwrite an already claimed map viewport',async()=>assert.equal(await load({claim:true}),0));
