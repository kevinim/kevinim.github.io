#!/usr/bin/env node
'use strict';
// Real published Dallas GIS polygons, but only synthetic/nonresidential
// representative interior points. Never submits or logs a private home address.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=process.cwd();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const part=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const full=path.resolve(ROOT,'.'+(part==='/'?'/index.html':part));
  if(!full.startsWith(ROOT+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(full)]||'application/octet-stream',
   'Cache-Control':'no-store'});
  fs.createReadStream(full).pipe(res);
 }catch{return res.writeHead(400).end();}
});
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:800}});
   const diagnostics=[];
   page.on('requestfailed',req=>{if(req.url().includes('arcgis'))diagnostics.push('REQUEST '+req.url().slice(0,145)+' '+req.failure()?.errorText)});
   page.on('console',msg=>{if(msg.type()==='error')diagnostics.push('CONSOLE '+msg.text().slice(0,300))});
   page.on('pageerror',err=>diagnostics.push('PAGE '+String(err).slice(0,250)));
   await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{
    waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.zoneReady&&
    typeof homeZoneMatches==='function'&&typeof drawHomeAssignmentMap==='function',
    {timeout:65000});
   const snapshot=await page.evaluate(()=>{
    const zones=state.zoneData['057905']||[];
    const byLevel={elementary:0,middle:0,high:0};
    for(const f of zones)if(Object.hasOwn(byLevel,f.properties?.gradeLevel))byLevel[f.properties.gradeLevel]++;
    const live=!!state.liveFinder['057905'];
    const display=districtZoneDisplay('057905',state.liveFinder);
    const status=districtPolygonStatus('057905',state.liveFinder);
    let probe=null;
    if(zones.length&&live){
     // Find a deterministic nonresidential interior point of a Dallas polygon:
     // Grid-sample each first polygon's bounding box, no street geocoding.
     for(const f of zones.filter(f=>f.properties?.gradeLevel==='elementary').slice(0,25)){
      const poly=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates[0];
      const ring=poly?.[0]||[];
      if(!ring.length)continue;
      const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      for(let i=1;i<=9&&!probe;i++)for(let j=1;j<=9&&!probe;j++){
       const lng=minX+(maxX-minX)*i/10,lat=minY+(maxY-minY)*j/10;
       if(geometryContains([lng,lat],f.geometry))probe={ll:[lat,lng],matched:f.properties.campusId};
      }
      if(probe)break;
     }
    }
    let actual=null,overlay=null;
    if(probe){
     const candidates=homeZoneMatches(probe.ll,'057905');
     const result=resolveAssignment({polygons:[{district:'057905',status,features:candidates}]});
     actual={status:result.status,schoolMatches:candidates.length,
      codeMatch:candidates.some(f=>f.properties.campusId===probe.matched)};
     const parent=document.getElementById('homeSchoolInfo');
     parent.replaceChildren();
     const node=document.createElement('div');node.id='homeMapAssignmentStatus';parent.appendChild(node);
     home={address:'PUBLIC_GIS_INTERIOR_QA_NOT_A_HOME',ll:probe.ll,
      geocodeQuality:{usableForSchoolCandidate:true},assignment:result};
     state.showHistoric=true;drawHomeAssignmentMap();drawSchools();
     overlay={layers:homeZoneGroup.getLayers().length,
      evidence:node.dataset.evidence,visible:node.dataset.visible,
      warning:node.textContent};
     // Keep only the nonresidential QA sample while collecting rendered screenshots.
    }
    return {loaded:zones.length,byLevel,live,display,status,probe:!!probe,
     actual,overlay,error:state.zoneLoadErrors?.['057905']||null};
   });
   if(snapshot.error){
    try{snapshot.directAccess=await page.evaluate(async()=>{try{
      const url='https://services.arcgis.com/RfrtTbYxQ8YIhjWT/ArcGIS/rest/services/Elementary_Attendance_Boundaries/FeatureServer/0?f=pjson';
      const r=await fetch(url);return {ok:r.ok,status:r.status,type:r.type};
     }catch(e){return {failure:String(e)}}});}catch(e){snapshot.directAccess={failure:String(e)}}
    snapshot.diagnostics=diagnostics.slice(-22);
   }
   assert.equal(snapshot.error,null,JSON.stringify(snapshot));
   assert.equal(snapshot.loaded,187,JSON.stringify(snapshot));
   assert.deepEqual(snapshot.byLevel,{elementary:135,middle:30,high:22});
   assert.equal(snapshot.live,true);
   assert.equal(snapshot.display,'published');assert.equal(snapshot.status,'publisher-provisional');
   assert.equal(snapshot.probe,true);
   assert.equal(snapshot.actual.status,'publisher-provisional');
   assert.equal(snapshot.actual.codeMatch,true);
   assert.ok(snapshot.actual.schoolMatches>=3);
   assert.ok(snapshot.overlay.layers>0);
   assert.equal(snapshot.overlay.evidence,'publisher-unconfirmed');
   assert.equal(snapshot.overlay.visible,'true');
   assert.match(snapshot.overlay.warning,/미완료/);
   // Actual Leaflet renderer evidence for manual review; no real address or input ever used.
   const capture=path.join(ROOT,'artifacts','gis-browser');
   fs.mkdirSync(capture,{recursive:true});
   await page.locator('#map').screenshot({
    path:path.join(capture,'dallas-provisional-map-'+width+'px.png'),animations:'disabled',timeout:20000});
   await page.locator('#homeSchoolInfo').screenshot({
    path:path.join(capture,'dallas-provisional-candidate-'+width+'px.png'),animations:'disabled',timeout:20000});
   await page.evaluate(()=>{home=null;drawHomeAssignmentMap();drawSchools()});
   console.log('PASS Dallas public GIS live → nonresidential point → school candidates → orange dashed zone at '+width+'px',snapshot.byLevel);
   console.log('SCREENSHOT_RENDERED',width,'only synthetic GIS interior, no user home address');
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
run().catch(err=>{console.error('Dallas GIS UI regression',err);process.exitCode=1;server.close()});
