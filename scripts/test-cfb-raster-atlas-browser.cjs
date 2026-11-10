#!/usr/bin/env node
'use strict';
// Browser QA only, using synthetic UI interactions; outside services are blocked.
// The original CFB raster host is stubbed with a transparent PNG, and we assert
// the actual canonical URL (never scrape or rehost its original pixels).
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json'};
const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6HVNwAAAAASUVORK5CYII=','base64');
const server=http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end()}
});
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const folder=path.resolve(root,'artifacts/cfb-atlas-browser');fs.mkdirSync(folder,{recursive:true});
 const records=[];
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   let remoteImages=0,remoteOther=0;
   const errors=[];page.on('pageerror',x=>errors.push(String(x)));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1'||url.hostname==='unpkg.com')return route.continue();
    if(url.hostname==='resources.finalsite.net'&&route.request().resourceType()==='image'){
     remoteImages++;return route.fulfill({status:200,contentType:'image/png',body:tinyPng});
    }
    remoteOther++;return route.abort('blockedbyclient');
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
   const atlas=page.locator('#cfbAtlas');
   await atlas.waitFor({state:'attached',timeout:45000});
   assert.equal(remoteImages,0,'No official raster should be fetched on initial page render');
   assert.equal(await atlas.isVisible(),false,'Atlas should be within the opt-in CFB panel');
   await page.locator('#cfbOfficialRezoningReference > summary').click();
   await page.locator('#cfbOpenInlineFinder').click();
   assert.equal(await atlas.isVisible(),true);
   assert.equal(remoteImages,0,'Opening CFB panel must not fetch map rasters');
   await atlas.locator('summary').click();
   await page.locator('#cfbAtlasBands button').first().waitFor({timeout:25000});
   assert.equal(remoteImages,0,'Opening raster atlas itself must not fetch third-party images');
   assert.equal(await page.locator('#cfbAtlasBands button').count(),3);
   for(const [level,slug] of [['elementary','elementary-zones.jpg'],['middle','middleschoolproposed-02.png'],['high','highschoolproposed-02.png']]){
    await page.locator('#cfbAtlasBands button[data-level="'+level+'"]').click();
    await page.waitForFunction(n=>document.querySelector('#cfbAtlasImageWrap img')?.src.includes(n),slug);
    assert.match(await page.locator('#cfbAtlasImageWrap img').getAttribute('src'),/^https:\/\/resources\.finalsite\.net\//);
    assert.equal(await page.locator('#cfbAtlasBands button[data-level="'+level+'"]').getAttribute('aria-pressed'),'true');
    await page.locator('#cfbAtlasImageWrap img').waitFor({state:'visible',timeout:7000});
    await page.waitForFunction(()=>{const image=document.querySelector('#cfbAtlasImageWrap img');return !!image&&image.complete&&image.naturalWidth>0},{timeout:10000});
   }
   assert.equal(remoteImages,3,'Exactly one official image per selected grade');
   await page.locator('#cfbAtlasAreaSelect').selectOption('Morningside subdivision');
   const area=await page.locator('#cfbAtlasAreaResult').innerText();
   assert.match(area,/Thompson Elementary/);
   assert.match(area,/Blalack Middle School/);
   assert.match(area,/Creekview High School/);
   assert.match(area,/2025–26 승인 내역/);
   await page.locator('.cfb-atlas-evidence > summary').click();
   const evidence=await page.locator('.cfb-atlas-evidence-list').innerText();
   assert.match(evidence,/1600 S Josey Ln/);
   assert.match(evidence,/1011 S Main St/);
   assert.match(evidence,/폴리곤과의 교차검증은 아직 이루어지지 않았습니다/);
   assert.equal(await page.locator('#cfbInlineFinderFrameHost iframe').count(),0,
    'Reference map must never secretly start official Finder iframe');
   const dimensions=await page.evaluate(()=>{
    const x=document.getElementById('cfbAtlas').getBoundingClientRect();
    return {width:x.width,viewport:document.documentElement.clientWidth,bodyScroll:document.body.scrollWidth};
   });
   assert.ok(dimensions.width<=dimensions.viewport+5,'Atlas overflows viewport');
   assert.ok(dimensions.bodyScroll<=dimensions.viewport+40,'New page horizontal overflow');
   assert.deepEqual(errors,[],'No uncaught app errors');
   await page.locator('#cfbAtlas').screenshot({path:path.join(folder,'atlas-'+width+'.png'),animations:'disabled'});
   records.push({width,threeOfficialImages:true,changesSource:true,existingPublicHoldouts:2,
    reconstructedGeometry:0,iframeStarted:false,thirdPartyImagesAfterUserAction:remoteImages});
   await page.close();
  }
  fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify({status:'PASS',scope:'RASTER_REFERENCE_ONLY',records},null,2)+'\n');
  console.log('CFB source raster atlas browser E2E PASS '+JSON.stringify(records));
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error('CFB_RASTER_ATLAS_BROWSER_FAILED',e);process.exitCode=1;server.close()});
