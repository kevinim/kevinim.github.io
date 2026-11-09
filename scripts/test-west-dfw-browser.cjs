#!/usr/bin/env node
'use strict';
// READ-ONLY browser integration test of exact PR files. No home address is entered.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=process.cwd();
const OUT='artifacts/west-dfw/west-dfw-browser.json';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
function serve(req,res){
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const f=path.resolve(ROOT,'.'+rel);
  if(!f.startsWith(ROOT+path.sep))return res.writeHead(403).end();
  if(!fs.existsSync(f)||!fs.statSync(f).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream',
   'Cache-Control':'no-store'});
  fs.createReadStream(f).pipe(res);
 }catch{return res.writeHead(400).end();}
}
async function measure(page,width,base){
 await page.setViewportSize({width,height:900});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>document.querySelector('#westDfwPanel')?.dataset.state==='ready',null,{timeout:30000});
 await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true,null,{timeout:110000});
 const details=page.locator('#westDfwPanel');
 await details.locator('summary').click();
 const result=await page.evaluate(()=>{
  const box=document.getElementById('westDfwPanel');
  const districts=[...box.querySelectorAll('.west-dfw-district')];
  const zips=[...box.querySelectorAll('button[data-zip]')];
  const links=[...box.querySelectorAll('.west-dfw-official')];
  return {
   status:box.dataset.state,districtCodes:districts.map(x=>x.dataset.district),
   availableZips:zips.filter(b=>!b.disabled).map(b=>b.dataset.zip),
   linkHosts:links.map(a=>new URL(a.href).hostname),
   relSafe:links.every(a=>a.target==='_blank'&&/noopener/.test(a.rel)&&/noreferrer/.test(a.rel)),
   hasKellerHistoricalWarning:box.querySelector('[data-district="220907"] .west-dfw-vintage-warning')?.textContent.includes('2018–19')===true,
   hasDisclosure:box.textContent.includes('학군 배정 경계가 아닙니다')&&
     box.textContent.includes('76262 ZIP만으로 우선 자격이 생기지는 않습니다'),
   schoolCounts:districts.map(x=>({
    district:x.dataset.district,count:Number(x.querySelector('.west-dfw-count')?.dataset.count||-1)})),
   docWidth:document.documentElement.scrollWidth,
   panelWidth:box.getBoundingClientRect().width
  };
 });
 assert.equal(result.status,'ready');
 assert.deepEqual(new Set(result.districtCodes),new Set(['220919','220907','061911','220906']));
 assert.deepEqual(new Set(result.availableZips),new Set(['76092','76262','76248','76034','76051','76052','76247']));
 assert.equal(result.linkHosts.length,5,'4 ISD links + 1 Westlake Academy charter');
 assert.equal(result.relSafe,true);
 assert.equal(result.hasDisclosure,true);
 assert.equal(result.hasKellerHistoricalWarning,true,'Keller stale GIS needs visible 2018-19 disclosure');
 assert.ok(result.schoolCounts.every(x=>x.count>=(x.district==='220919'?5:10)),
   'West district school-directory counts insufficient: '+JSON.stringify(result.schoolCounts));
 assert.ok(result.docWidth<=width+1,'mobile horizontal overflow '+width);
 await page.locator('#westDfwPanel button[data-zip="76092"]').click();
 await page.waitForFunction(()=>state.zip==='76092'&&
   document.getElementById('schoolScope').value==='zip',null,{timeout:10000});
 const markerCount=await page.evaluate(()=>({
  visible:schoolGroup.getLayers().length,
  scope:document.getElementById('schoolScope').value,
  zip:state.zip,
  selectedPolys:!!state.polys['76092'],
  localWestPolygonLayers:['220919','220907','061911','220906']
    .reduce((n,id)=>n+(state.zoneData[id]||[]).length,0)
 }));
 assert.equal(markerCount.selectedPolys,true,'Southlake ZIP boundary must be loaded');
 assert.ok(markerCount.visible>=5,'at least five school markers should be visible in selected west ZIP viewport');
 assert.equal(markerCount.localWestPolygonLayers,0,'No unverified west attendance polygons can be displayed');
 return {width,...result,southlake:markerCount};
}
(async()=>{
 fs.mkdirSync(path.dirname(OUT),{recursive:true});
 const srv=http.createServer(serve);
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const url='http://127.0.0.1:'+srv.address().port+'/';
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const reports=[];
  for(const width of [1280,390])reports.push(await measure(page,width,url));
  fs.writeFileSync(OUT,JSON.stringify({status:'PASS',noDeployment:true,
   noHomeAddressEntered:true,views:reports},null,2)+'\n');
  process.stdout.write('WEST_DFW_BROWSER_PASS '+JSON.stringify(reports.map(x=>({
    width:x.width,districts:x.districtCodes.length,zips:x.availableZips.length,
    schoolCount:x.schoolCounts.reduce((a,z)=>a+z.count,0),
    southlakeMarkers:x.southlake.visible})))+'\n');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>srv.close(resolve));
 }
})().catch(e=>{process.stderr.write('WEST_DFW_BROWSER_FAIL '+e.message+'\n');process.exitCode=1;});
