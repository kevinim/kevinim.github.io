#!/usr/bin/env node
'use strict';
// Synthetic public geometry only: no residential address or external Finder calls.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=process.cwd();
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end();}
});
async function run(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const port=server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:850}});
   await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForFunction(()=>typeof map!=='undefined'&&!!map&&typeof drawHomeAssignmentMap==='function'&&
    !!window.HomeAssignmentMap&&typeof home!=='undefined',{timeout:30000});
   const result=await page.evaluate(()=>{
    const coords=[-96.8,33.1],point=[33.12,-96.79];
    const box={type:'Feature',properties:{school:'Synthetic School QA',gradeLevel:'elementary',grades:'K-5'},
     geometry:{type:'Polygon',coordinates:[[
      [-96.85,33.08],[-96.75,33.08],[-96.75,33.15],[-96.85,33.15],[-96.85,33.08]
     ]]}};
    const tempSchool={name:'Synthetic School QA',type:'elementary',district:'FISD',ll:point};
    state.schools.push(tempSchool);state.level='all';state.ratingFilter='all';state.showSchools=true;state.showHistoric=true;
    map.setView([coords[1],coords[0]],12,{animate:false});
    home={address:'PUBLIC SYNTHETIC QA ONLY',ll:[coords[1],coords[0]],geocodeQuality:{usableForSchoolCandidate:true},
     assignment:{status:'current',district:'FISD',features:[box]}};
    const mount=document.getElementById('homeSchoolInfo');mount.replaceChildren();
    const el=document.createElement('div');el.id='homeMapAssignmentStatus';mount.appendChild(el);
    drawHomeAssignmentMap();drawSchools();
    const loaded={layers:homeZoneGroup.getLayers().length,
     active:document.getElementById('homeMapAssignmentStatus').dataset.visible,
     marker:schoolGroup.getLayers().some(m=>m.options?.icon?.options?.html?.includes('home-match')),
     source:document.getElementById('homeMapAssignmentStatus').dataset.evidence};
    home.assignment={status:'needs-address-verification',district:'FISD',features:[box]};
    drawHomeAssignmentMap();
    const blocked=homeZoneGroup.getLayers().length;
    home=null;drawHomeAssignmentMap();drawSchools();
    return {loaded,blocked,cleared:homeZoneGroup.getLayers().length};
   });
   assert.equal(result.loaded.layers,1,'synthetic home should draw one polygon at '+width);
   assert.equal(result.loaded.active,'true','home zone should be visible at '+width);
   assert.equal(result.loaded.marker,true,'assigned synthetic school marker should be highlighted at '+width);
   assert.equal(result.loaded.source,'current-gis');
   assert.equal(result.blocked,0,'unverified address cannot draw zones');
   assert.equal(result.cleared,0,'clear removes map overlays');
   console.log('PASS home auto-school overlay at '+width+'px (synthetic geometry only)');
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
}
run().catch(e=>{console.error(e);process.exitCode=1;server.close()});
