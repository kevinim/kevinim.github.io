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
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools?.length>0&&
    typeof map!=='undefined'&&!!map&&typeof schoolClicked==='function'&&
    !!window.DentonZonePdfReference,null,{timeout:70000});
   const campus=await page.evaluate(()=>{
    const ms=window.DentonZonePdfReference;
    const c=state.schools.find(s=>s.district==='061901'&&
     s.ll?.length===2&&ms.lookup(s,scoreRecord(s.name,s.district)?.id)?.id);
    if(!c)return null;
    return {name:c.name,level:c.type,id:scoreRecord(c.name,c.district)?.id,
     url:ms.lookup(c,scoreRecord(c.name,c.district)?.id)?.url};
   });
   assert.ok(campus,'No real Denton TEA-ID-matched campus markers; cannot certify browser UI');
   await page.evaluate(n=>{
    const s=state.schools.find(x=>x.district==='061901'&&x.name===n);
    state.level='all';state.ratingFilter='all';state.showSchools=true;
    map.setView(s.ll,14,{animate:false});map.invalidateSize();drawSchools();
   },campus.name);
   const marker=page.locator('.leaflet-marker-icon[title='+JSON.stringify(campus.name)+']').first();
   await marker.waitFor({state:'attached',timeout:20000});
   await marker.click({force:true,timeout:15000});
   await page.waitForFunction(()=>!!document.querySelector('#zoneNotice .denton-zone-reference'),null,{timeout:20000});
   const result=await page.evaluate(()=>{
    const note=document.querySelector('#zoneNotice'),source=note?.querySelector('.denton-zone-reference');
    const anchors=[...source?.querySelectorAll('a')||[]].map(a=>({url:a.href,label:a.textContent,rel:a.rel}));
    return {zoneLayers:zoneGroup.getLayers().length,sourceType:source?.dataset.sourceType,
     schoolYear:source?.dataset.schoolYear,heading:source?.querySelector('strong')?.textContent,
     warning:source?.querySelector('small')?.textContent,anchors,
     selectedDistrict:state.selectedSchool?.district,selectedName:state.selectedSchool?.name};
   });
   assert.equal(result.selectedDistrict,'061901');
   assert.equal(result.selectedName,campus.name);
   assert.equal(result.zoneLayers,0,'do not fabricate or draw Denton current polygons');
   assert.equal(result.sourceType,'official-pdf-reference-not-GIS');
   assert.equal(result.schoolYear,'2026-27');
   assert.match(result.heading,/지도 폴리곤 미확보/);
   assert.match(result.warning,/School Locator/);
   assert.equal(result.anchors.length,3);
   assert.equal(result.anchors[0].url,campus.url);
   assert.match(result.anchors[0].url,/\.pdf$/);
   assert.match(result.anchors[1].url,/webquery-2-denton-tx\.etstack\.io/);
   for(const a of result.anchors)assert.match(a.rel,/noopener/);
   const dir=path.join(ROOT,'artifacts','denton-browser');fs.mkdirSync(dir,{recursive:true});
   await page.locator('#zoneNotice').screenshot({path:path.join(dir,'denton-official-pdf-no-polygon-'+width+'px.png'),timeout:20000,animations:'disabled'});
   await page.locator('#map').screenshot({path:path.join(dir,'denton-marker-without-polygon-'+width+'px.png'),timeout:20000,animations:'disabled'});
   console.log('PASS '+width+'px REAL DENTON marker → TEA ID → official 2026-27 PDF, no fabricated polygon',
    {id:campus.id,level:campus.level,links:result.anchors.length,pageErrors:messages.length});
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
}
main().catch(e=>{console.error('DENTON_BROWSER_QA_FAILED',e);process.exitCode=1;server.close()});
