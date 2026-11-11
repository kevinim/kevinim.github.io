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
   await page.locator('#dentonPdfZoneDirectory summary').click();
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
