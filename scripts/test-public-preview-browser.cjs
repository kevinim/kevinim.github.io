#!/usr/bin/env node
'use strict';
// Isolated preview browser smoke. External map tiles and geocoding/routing APIs
// are blocked to avoid creating test traffic or submitting any addresses.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve('dist/public-preview');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
function serve(req,res){
 let p;
 try{p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{res.writeHead(400).end();return;}
 if(p==='/')p='/index.html';
 const target=path.resolve(root,'.'+p);
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
 fs.createReadStream(target).pipe(res);
}
async function main(){
 assert.ok(fs.existsSync(path.join(root,'index.html')),'Preview must be built first');
 const server=http.createServer(serve);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 let browser;const results=[];
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:880},deviceScaleFactor:1});
   const local404=[],errors=[];
   page.on('response',r=>{
    if(r.url().startsWith(url)&&r.status()>=400)local404.push({status:r.status(),asset:new URL(r.url()).pathname});
   });
   page.on('pageerror',e=>errors.push(e.message.slice(0,180)));
   await page.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    if(host==='127.0.0.1'||host==='unpkg.com')return route.continue();
    return route.abort('blockedbyclient');
   });
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#homeAddress').waitFor({timeout:30000});
   await page.waitForFunction(()=>typeof window.L!=='undefined'&&!!document.querySelector('#map.leaflet-container'),null,{timeout:45000});
   await page.waitForFunction(()=>typeof state!=='undefined'&&Array.isArray(state.schools)&&state.schools.length>0,null,{timeout:45000});
   const initial=await page.evaluate(()=>{
    const el=id=>document.getElementById(id);
    const map=el('map').getBoundingClientRect();
    return {
     destination:el('destination').value,
     office:el('officeSelect').value,
     legacyOverlayHidden:el('oneHourOverlay').hidden,
     privacyText:document.querySelector('aside[role="note"]')?.textContent,
     mapWidth:map.width,mapHeight:map.height,
     documentWidth:document.documentElement.scrollWidth,
     schoolCount:state.schools.length
    };
   });
   assert.equal(initial.destination,'','Public preview must not preset employer address');
   assert.equal(initial.office,'custom','Custom destination should be selected');
   assert.equal(initial.legacyOverlayHidden,true,'Legacy office overlay must remain disabled');
   assert.ok(initial.privacyText?.includes('외부 서비스'),'Address disclosure must be visible');
   assert.ok(initial.mapWidth>250&&initial.mapHeight>150,'Map viewport must be present');
   assert.ok(initial.schoolCount>0,'School source should load');
   assert.ok(initial.documentWidth<=width+5,'Preview horizontal overflow at '+width+'px');
   await page.locator('#homeAddress').fill('A');
   assert.equal(await page.locator('#homeClear').isVisible(),true);
   await page.locator('#homeClear').click();
   assert.equal(await page.locator('#homeAddress').inputValue(),'');
   assert.deepEqual(local404,[],'Local referenced assets returned 4xx');
   assert.deepEqual(errors,[],'Browser runtime errors');
   results.push({viewport:width,map:true,schoolsLoaded:initial.schoolCount,privacyDisclosure:true,clearButton:true,localAssetErrors:0});
   await page.close();
  }
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
 fs.mkdirSync('artifacts/security',{recursive:true});
 fs.writeFileSync('artifacts/security/public-preview-browser.json',JSON.stringify({status:'PASS',network:'third-party APIs and map tiles blocked',views:results},null,2)+'\n');
 process.stdout.write('Public preview real-browser smoke passed at 390px and 1280px; third-party requests blocked; no deployment.\n');
}
main().catch(e=>{process.stderr.write('Public preview browser QA failed: '+e.message+'\n');process.exitCode=1;});
