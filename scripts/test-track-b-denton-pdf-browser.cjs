#!/usr/bin/env node
'use strict';
// Real local app + real Denton campus marker; public district PDFs only.
// No residential addresses, housing coordinates or Finder submissions.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=process.cwd();
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
   const page=await browser.newPage({viewport:{width,height:830}});
   const messages=[];page.on('pageerror',e=>messages.push(String(e)));
   await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:50000});
   await page.waitForFunction(()=>!!window.DentonZonePdfReference&&
    document.querySelectorAll('#dentonPdfCampusSelect option').length===40&&
    typeof map!=='undefined'&&!!map&&typeof zoneGroup!=='undefined'&&!!zoneGroup,
    null,{timeout:35000});
   const count=await page.evaluate(()=>({
    rows:window.DentonZonePdfReference.ROWS.length,
    locatedDentonSchools:state.schools.filter(s=>s.district==='061901'&&s.ll).length,
    realSchoolLocationData:state.schools.length}));
   assert.equal(count.rows,39);
   // The module supplies official source references regardless of NCES marker status. Verify the honest
   // official-source directory UI instead of injecting synthetic markers.
   await page.locator('#schoolDataDetails > summary').click();
   await page.locator('#dentonPdfZoneDirectory > summary').click();
   const geoPdf=page.locator('#dentonGeoPdfResearchStatus');
   await geoPdf.waitFor({state:'attached',timeout:12000});
   assert.equal(await geoPdf.evaluate(x=>x.open),false,'Staging source panel must remain collapsed by default');
   await geoPdf.locator('summary').click();
   const evidence=await geoPdf.innerText();
   assert.match(evidence,/39개 학교별 후보 도형/);
   assert.match(evidence,/폴리곤은 0개/);
   assert.match(evidence,/2028–29/);
   const originalGeoPdfs=geoPdf.locator('a');
   assert.equal(await originalGeoPdfs.count(),3,'Elementary, middle, high official GeoPDF originals');
   const api=await page.evaluate(()=>window.DentonZonePdfReference.ALL);
   for(const [i,level] of ['elementary','middle','high'].entries()){
    assert.equal(await originalGeoPdfs.nth(i).getAttribute('href'),api[level]);
    assert.equal(await originalGeoPdfs.nth(i).getAttribute('rel'),'noopener noreferrer');
    assert.equal(await originalGeoPdfs.nth(i).getAttribute('target'),'_blank');
   }
   assert.equal(await page.evaluate(()=>zoneGroup.getLayers().length),0,
    'Viewing official original PDF sources must never create Denton GIS features');
   await geoPdf.locator('summary').click();
   await page.locator('#dentonPdfCampusSelect').selectOption('061901127');
   const result=await page.evaluate(()=>{
    const a=document.getElementById('dentonPdfCampusLink');
    const panel=document.getElementById('dentonPdfZoneDirectory');
    const source=window.DentonZonePdfReference.lookup(
     {district:'061901',type:'elementary'},'061901127');
    return {label:a.textContent,url:a.href,hidden:a.hidden,correctUrl:source.url,
     schoolCount:document.querySelectorAll('#dentonPdfCampusSelect option').length-1,
     containsSourceWarning:/GIS.*(미연결|미인증|폴리곤|연결)/.test(panel.textContent),
     mapPolygonCount:zoneGroup.getLayers().length,
     panelWidth:panel.getBoundingClientRect().width,
     panelScrollWidth:panel.scrollWidth};
   });
   assert.equal(result.schoolCount,39);
   assert.equal(result.hidden,false);
   assert.equal(result.url,result.correctUrl);
   assert.ok(result.url.endsWith('BellES-ZoneMap_26-27.pdf'));
   assert.match(result.label,/Bell/);
   assert.equal(result.mapPolygonCount,0,'Never silently draw fake Denton school GIS');
   assert.equal(result.containsSourceWarning,true);
   assert.ok(result.panelScrollWidth<=result.panelWidth+12,
    'Denton PDF selector overflow at '+width+'px: '+JSON.stringify(result));
   // A verified 2024-25 school-building point may be highlighted, never a
   // residence attendance polygon. The eight unresolved site points must not move the map.
   await page.waitForFunction(()=>window.DentonCampusMarkerInfo?.loadState==='ready',null,{timeout:30000});
   await page.locator('#dentonPdfCampusSelect').selectOption('061901007');
   await page.locator('#dentonPdfShowCampusMap').click();
   const focused=await page.evaluate(()=>({
    campusId:state.selectedSchool?.id,
    note:document.getElementById('dentonPdfMapStatus').textContent,
    polygons:zoneGroup.getLayers().length
   }));
   assert.equal(focused.campusId,'061901007','Guyer historic reviewed marker selection');
   assert.match(focused.note,/2024–25.*교차검증/);
   assert.equal(focused.polygons,0,'School marker is not a Denton attendance boundary');
   await page.locator('#dentonPdfCampusSelect').selectOption('061901003');
   await page.locator('#dentonPdfShowCampusMap').click();
   const blocked=await page.evaluate(()=>({
    campusId:state.selectedSchool?.id,
    note:document.getElementById('dentonPdfMapStatus').textContent,
    polygons:zoneGroup.getLayers().length
   }));
   assert.equal(blocked.campusId,'061901007','Unverified Denton High point must not replace selection');
   assert.match(blocked.note,/좌표.*이동을 중단/);
   assert.equal(blocked.polygons,0);
   const dir=path.join(ROOT,'artifacts','denton-browser');fs.mkdirSync(dir,{recursive:true});
   await page.locator('#dentonPdfZoneDirectory').screenshot({
    path:path.join(dir,'denton-39-official-pdf-sources-'+width+'px.png'),
    timeout:20000,animations:'disabled'});
   await page.locator('#map').screenshot({
    path:path.join(dir,'denton-no-fabricated-campus-gis-'+width+'px.png'),
    timeout:20000,animations:'disabled'});
   console.log('PASS '+width+'px real Denton official PDF directory; 39 TEA ID sources, no fake school polygon',count);
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
}
main().catch(e=>{console.error('DENTON_PDF_DIRECTORY_BROWSER_QA_FAILED',e);process.exitCode=1;server.close()});
