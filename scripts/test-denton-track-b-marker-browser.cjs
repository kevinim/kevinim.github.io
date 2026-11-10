#!/usr/bin/env node
'use strict';
// Real Chromium checks for public CAMPUS POINTS only. No residential address,
// reverse-geocoding of homes, enrollment claim or inferred attendance polygon.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),ROOT=process.cwd();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost'),src=decodeURIComponent(u.pathname);
  const file=path.resolve(ROOT,'.'+(src==='/'?'/index.html':src));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end()}
});
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:50000});
   // Do not inspect only schools.json or an early render before TEA/NCES load.
   await page.waitForFunction(()=>{
    if(typeof state==='undefined'||!state.ratingIndex||!window.DentonZonePdfReference)return false;
    const pdf=window.DentonZonePdfReference.ROWS;
    return typeof map!=='undefined'&&!!map&&typeof zoneGroup!=='undefined'&&
     window.DentonCampusMarkerInfo?.loadState==='ready'&&
     pdf.every(row=>state.schools.some(s=>s.district==='061901'&&s.type===row.level&&
      Array.isArray(s.ll)&&scoreRecord(s.name,s.district)?.id===row.id));
   },null,{timeout:65000});
   // Initial ZIP GeoJSON loading can call map.fitBounds() after TEA/NCES,
   // so test real marker clicks only once that first map fit is finished.
   await page.waitForFunction(()=>document.querySelector('#mapLoadStatus')?.textContent.includes('ZIP 통계 경계 표시'),
    null,{timeout:65000});
   const audit=await page.evaluate(()=>{
    const pdf=window.DentonZonePdfReference.ROWS;
    const all=pdf.map(row=>({
     id:row.id,level:row.level,school:state.schools.find(s=>s.district==='061901'&&
      s.type===row.level&&scoreRecord(s.name,s.district)?.id===row.id)
    }));
    return {total:all.length,
     byLevel:Object.fromEntries(['elementary','middle','high'].map(t=>[t,all.filter(x=>x.level===t).length])),
     withCoordinates:all.filter(x=>x.school?.ll?.length===2).length,
     reviewed:pdf.filter(r=>window.DentonCampusMarkerInfo.statusFor(r.id).state==='historical-two-source').length,
     missing:all.filter(x=>!x.school||x.school.type==='other').map(x=>x.id)};
   });
   assert.deepEqual(audit.byLevel,{elementary:26,middle:9,high:4});
   assert.equal(audit.withCoordinates,39);assert.equal(audit.reviewed,31);assert.deepEqual(audit.missing,[]);
   const samples=[['061901127','BellES-ZoneMap_26-27.pdf',true],['061901047','NavoMS-ZoneMap_26-27.pdf',true],
    ['061901008','BraswellHS-ZoneMap_26-27.pdf',true],['061901051','CheekMS-ZoneMap_26-27.pdf',false]];
   for(const [id,filename,reviewed] of samples){
    const campus=await page.evaluate(id=>{
     const s=state.schools.find(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id===id);
     state.showSchools=true;state.level='all';state.ratingFilter='all';
     const before=[map.getCenter().lat,map.getCenter().lng,map.getZoom()];
     const loaded=!!map._loaded,animating=!!map._animatingZoom;
     map.stop();
     const afterStop=[map.getCenter().lat,map.getCenter().lng,map.getZoom()];
     map.setView(s.ll,14,{animate:false,zoom:{animate:false},pan:{animate:false}});
     const afterSet=[map.getCenter().lat,map.getCenter().lng,map.getZoom()];
     map.invalidateSize();
     const afterResize=[map.getCenter().lat,map.getCenter().lng,map.getZoom()];
     drawSchools();
     const afterDraw=[map.getCenter().lat,map.getCenter().lng,map.getZoom()];
     return {name:s.name,grade:s.type,id,review:s.campusPointReview,point:s.ll,
      before,afterStop,afterSet,afterResize,afterDraw,loaded,animating,
      immediateCenter:[map.getCenter().lat,map.getCenter().lng],
      immediateZoom:map.getZoom(),immediateWithin:map.getBounds().contains(s.ll),
      immediateMarkers:schoolGroup.getLayers().filter(x=>x.options?.title===s.name).length};
    },id);
    console.log('DENTON_SET_VIEW_IMMEDIATE',width,id,JSON.stringify(campus));
    // Leaflet can animate the zoom despite a top-level animate flag.
    // The QA must observe the actual map bounds before clicking a campus.
    await page.waitForFunction(ll=>map.getBounds().contains(ll)&&map.getZoom()>=13,
     campus.point,{timeout:12000});
    await page.evaluate(()=>drawSchools());
    const selector='.leaflet-marker-icon[title='+JSON.stringify(campus.name)+']';
    const diag=await page.evaluate(name=>{
     const s=state.schools.find(x=>x.district==='061901'&&x.name===name);
     return {mapSize:map.getSize(),bounds:map.getBounds().toBBoxString(),
      within:map.getBounds().contains(s.ll),
      eligible:state.schools.filter(x=>x.ll&&x.type!=='other').length,
      schoolGroup:schoolGroup.getLayers().length,
      selectedSchoolPoint:s.ll,
      schoolStatus:document.getElementById('schoolMapStatus')?.textContent,
      candidateLayer:schoolGroup.getLayers().filter(x=>x.options?.title===name).length,
      domMarkers:document.querySelectorAll('.leaflet-marker-icon').length,
      visible:getComputedStyle(map.getContainer()).display};
    },campus.name);
    console.log('DENTON_REAL_MARKER_DIAGNOSTIC',width,id,JSON.stringify({campus,diag}));
    const marker=page.locator(selector).first();
    await marker.waitFor({state:'attached',timeout:12000});
    await marker.click({force:true,timeout:12000});
    await page.waitForFunction(id=>state.selectedSchool&&scoreRecord(state.selectedSchool.name,state.selectedSchool.district)?.id===id,id,{timeout:12000});
    const result=await page.evaluate(()=>{
     const note=document.querySelector('#zoneNotice');
     const source=document.querySelector('#dentonCampusProvenance');
     return {district:state.selectedSchool.district,
      selectedCampus:scoreRecord(state.selectedSchool.name,state.selectedSchool.district)?.id,
      schoolLevel:state.selectedSchool.type,
      layerCount:zoneGroup.getLayers().length,
      pdf:source?.querySelector('a')?.href,
      text:source?.textContent||'',
      sourceStatus:source?.dataset.pointStatus,
      markerQuality:state.selectedSchool.campusPointReview
     };
    });
    assert.equal(result.district,'061901');
    assert.equal(result.selectedCampus,id);
    assert.equal(result.layerCount,0,'No school polygon exists; a campus point must never become a zone');
    assert.ok(result.pdf?.endsWith(filename),'Wrong official PDF for '+id+': '+result.pdf);
    assert.equal(result.sourceStatus,reviewed?'historical-two-source':'historical-exception');
    assert.match(result.text,/2026–27/);
    if(reviewed){
     assert.equal(result.markerQuality,'two-source-historical');
     assert.match(result.text,/두 출처 교차검증/);
    }else{
     assert.equal(result.markerQuality,'unreviewed-historical');
     assert.match(result.text,/마커 좌표 미인증/);
    }
    if(id==='061901127'||id==='061901051'){
     const dir=path.join(ROOT,'artifacts','denton-trackb-campuses');fs.mkdirSync(dir,{recursive:true});
     await page.locator('#dentonCampusProvenance').screenshot({path:path.join(dir, id+'-school-click-'+width+'px.png'),animations:'disabled',timeout:20000});
     await page.locator('#map').screenshot({path:path.join(dir,id+'-real-campus-marker-'+width+'px.png'),animations:'disabled',timeout:20000});
    }
    console.log('PASS '+width+'px real public campus marker '+id+' → official '+filename+
     ', reviewed point='+reviewed+', zero attendance zone polygon');
   }
   console.log('PASS Denton 2026-27 campus grade/point census '+width+'px: '+JSON.stringify(audit));
   if(errors.some(e=>/DentonCampusPointQuality|DentonZonePdfReference|DentonCampusMarkerInfo/.test(e)))throw Error('Denton QA page error: '+errors.join('; '));
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
}
main().catch(e=>{console.error('DENTON_REAL_CAMPUS_MARKER_QA_FAILED:',e);process.exitCode=1;server.close()});
