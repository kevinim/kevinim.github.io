#!/usr/bin/env node
'use strict';
// AG05 real Chromium, synthetic polygons only. No third-party Finder queries.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json'};
const server=http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end()}
});
const SCHOOL={district:'CFB',type:'elementary',name:'Synthetic Test Elementary',ll:[32.98,-96.9]};
const SHAPE={type:'Feature',properties:{district:'CFB',school:SCHOOL.name,gradeLevel:'elementary',
 schoolYear:'2025-26',geometryStatus:'reconstructed',sourceId:'AG03-draft'},
 geometry:{type:'Polygon',coordinates:[[[-96.92,32.96],[-96.88,32.96],[-96.88,33.0],[-96.92,33.0],[-96.92,32.96]]]}};
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const output=path.join(root,'artifacts','cfb-zone-overlay');fs.mkdirSync(output,{recursive:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',err=>errors.push(String(err)));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(['127.0.0.1','unpkg.com'].includes(u.hostname))return route.continue();
    return route.abort('blockedbyclient');
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>typeof map!=='undefined'&&!!map&&typeof L!=='undefined'&&
      !!window.CFBZoneOverlay&&!!window.ConditionalSchoolRelease,{timeout:70000});
   assert.equal(await page.locator('#cfbInlineFinderFrameHost iframe').count(),0);
   await page.locator('#schoolDataDetails > summary').click();
   await page.locator('#cfbOfficialRezoningReference summary').click();
   await page.locator('#cfbOpenInlineFinder').click();
   await page.locator('#cfbZoneReferenceControls').waitFor({timeout:12000});
   assert.equal(await page.locator('#cfbShowDraftZone').isChecked(),false);
   const first=await page.evaluate(({shape,school})=>{
    window.CFBZoneOverlay.setGeoJSON({type:'FeatureCollection',features:[shape]});
    return {result:window.CFBZoneOverlay.showForSchool(school),summary:window.CFBZoneOverlay.getSummary(),
       homeGrant:window.ConditionalSchoolRelease.decide({status:'current',district:'CFB'}).allowed};
   },{shape:SHAPE,school:SCHOOL});
   assert.equal(first.result,'draft-hidden');
   assert.equal(first.summary.overlayVisible,false);
   assert.equal(first.homeGrant,false);
   assert.equal(await page.locator('#cfbZoneReferenceStatus').getAttribute('data-state'),'draft-hidden');
   await page.locator('#cfbShowDraftZone').check();
   const visible=await page.evaluate(()=>window.CFBZoneOverlay.getSummary());
   assert.equal(visible.overlayVisible,true);
   assert.equal(visible.verified,0);
   assert.equal(await page.locator('#cfbZoneReferenceStatus').getAttribute('data-state'),'draft-visible');
   assert.match(await page.locator('#cfbZoneReferenceStatus').innerText(),/재구성 추정 경계.*GIS 미인증/);
   await page.evaluate(()=>window.CFBZoneOverlay.showForSchool({district:'CFB',name:'Nonexistent Campus',type:'middle'}));
   assert.equal((await page.evaluate(()=>window.CFBZoneOverlay.getSummary())).overlayVisible,false);
   await page.evaluate(school=>window.CFBZoneOverlay.showForSchool(school),SCHOOL);
   assert.equal((await page.evaluate(()=>window.CFBZoneOverlay.getSummary())).overlayVisible,true);
   // Any new home search invalidates prior CFB overlays and the draft opt-in.
   await page.locator('#homeAddress').fill('123 Synthetic Lane, Carrollton TX 75006');
   assert.equal((await page.evaluate(()=>window.CFBZoneOverlay.getSummary())).overlayVisible,false);
   assert.equal(await page.locator('#cfbShowDraftZone').isChecked(),false);
   assert.equal(await page.locator('#cfbInlineFinderFrameHost iframe').count(),0);
   // Preserve existing manual school → TEA card and campus marker.
   await page.waitForFunction(()=>typeof state!=='undefined'&&Array.isArray(state.schools)&&
      state.schools.some(s=>s.district==='CFB'&&s.type==='elementary'&&Array.isArray(s.ll)),{timeout:60000});
   const schoolName=await page.evaluate(()=>state.schools.find(s=>s.district==='CFB'&&s.type==='elementary'&&Array.isArray(s.ll)).name);
   await page.locator('#cfbManualElementary').focus();
   await page.locator('#cfbManualElementary').selectOption(schoolName);
   await page.locator('#cfbManualApply').click();
   assert.equal(await page.locator('#cfbManualSchoolCards .cfb-manual-card').count(),1);
   assert.equal(await page.locator('.cfb-manual-campus').count(),1);
   await page.locator('#cfbManualSchoolCards .cfb-manual-card button').click();
   assert.match(await page.locator('#cfbZoneReferenceStatus').innerText(),/검증된 GIS 경계가 없습니다/);
   const layout=await page.evaluate(()=>{
    const panel=document.getElementById('cfbZoneReferenceControls');
    return {document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
     panel:panel.getBoundingClientRect().width,host:panel.parentElement.getBoundingClientRect().width};
   });
   assert.ok(layout.panel<=layout.host+2,'Reference controls overflow their host');
   assert.ok(layout.document<=layout.viewport+30,'Page unexpectedly overflows width');
   assert.deepEqual(errors,[],'Uncaught browser JavaScript errors');
   await page.locator('#cfbOfficialFinderPanel').screenshot({
     path:path.join(output,'cfb-zone-'+width+'.png'),animations:'disabled'});
   console.log('PASS AG05 CFB Chromium',width,JSON.stringify(layout));
   await page.close();
  }
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error('FAIL AG05 CFB reference browser test:',e);process.exitCode=1;if(server.listening)server.close()});
