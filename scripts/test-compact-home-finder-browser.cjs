#!/usr/bin/env node
'use strict';
// Offline, synthetic-only Chromium QA. Prevents all official/geocode requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(target).pipe(res);
 }catch{res.writeHead(400).end()}
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const artifacts=path.join(root,'artifacts','compact-home-finder');fs.mkdirSync(artifacts,{recursive:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    if(host==='127.0.0.1'||host==='unpkg.com')return route.continue();
    return route.abort('blockedbyclient');
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>typeof renderHome==='function'&&!!window.ConditionalSchoolRelease,{timeout:60000});
   const result=await page.evaluate(()=>{
    const original=schoolAssignmentFor;
    schoolAssignmentFor=()=>({status:'unavailable'});
    home={address:'123 Example Road, Carrollton, Texas, 75010',ll:[33.035,-96.914],geocodeQuality:{usableForSchoolCandidate:true},parcel:{status:'idle'}};
    try{renderHome()}finally{schoolAssignmentFor=original}
    const box=document.getElementById('homeSchoolInfo');
    const picker=document.getElementById('homeFinderDistrict');
    const link=document.getElementById('homeFinderLaunch');
    const advanced=document.getElementById('homeAdvancedSchoolTools');
    const shownLinks=[...box.querySelectorAll('a')].filter(a=>a.getClientRects().length>0);
    return {
     schoolStatus:home.assignment.status,
     finderCount:box.querySelectorAll('#homeFinderLaunch').length,
     pickerCount:box.querySelectorAll('#homeFinderDistrict').length,
     firstCode:picker.value,linkUrl:link.href,linkHidden:link.hidden,
     shownLinks:shownLinks.length,advancedClosed:!advanced.open,
     parcelHidden:document.getElementById('parcelCheck').getClientRects().length===0,
     exactSchoolClaims:box.textContent.includes('Castle Hills Elementary'),
     width:box.scrollWidth,viewport:document.documentElement.clientWidth,
     warning:box.textContent.includes('학교 자동 배정 미인증')
    };
   });
   console.log('Synthetic compact UI QA',width,JSON.stringify(result));
   assert.equal(result.schoolStatus,'unavailable'); // No GIS source: unavailability must not be misreported as a certified assignment.
   assert.equal(result.finderCount,1);
   assert.equal(result.pickerCount,1);
   assert.equal(result.firstCode,'LISD');
   assert.match(result.linkUrl,/^https:\/\/www\.lisd\.net\//);
   assert.equal(result.linkHidden,false);
   assert.equal(result.shownLinks,1,'No giant visible directory of external links');
   assert.equal(result.advancedClosed,true);
   assert.equal(result.parcelHidden,true);
   assert.equal(result.exactSchoolClaims,false,'No invented home-school assignments');
   assert.equal(result.warning,true);
   assert.ok(result.width<=result.viewport+20,'Unexpected horizontal overflow');
   assert.deepEqual(errors,[],'No unhandled runtime JS errors');
   await page.locator('#homeSchoolInfo').screenshot({path:path.join(artifacts,'finder-'+width+'.png'),animations:'disabled'});
   console.log('PASS compact home finder at width',width);
   await page.close();
  }
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error('FAIL compact address Finder E2E',String(e));process.exitCode=1;server.close()});
