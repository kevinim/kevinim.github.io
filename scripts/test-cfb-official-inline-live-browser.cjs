#!/usr/bin/env node
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});
  fs.createReadStream(target).pipe(res);
 }catch{return res.writeHead(400).end()}
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 const results=[];
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:80000});
   const source=page.locator('#cfbOfficialRezoningReference');
   await source.locator('summary').click();
   assert.equal(await page.locator('#cfbOfficialFinderPanel').isVisible(),false);
   assert.equal(await page.locator('#cfbInlineFinderFrameHost iframe').count(),0);
   await source.locator('#cfbOpenInlineFinder').click();
   assert.equal(await page.locator('#cfbOfficialFinderPanel').isVisible(),true);
   assert.equal(await page.locator('#cfbInlineFinderFrameHost iframe').count(),0,
    'Opening panel should not contact the vendor before explicit load');
   await page.locator('#cfbLoadInlineFinder').click();
   const iframe=page.locator('#cfbInlineFinderFrameHost iframe');
   await iframe.waitFor({state:'attached',timeout:10000});
   const src=await iframe.getAttribute('src');
   assert.equal(src,'https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/');
   const f=await (await iframe.elementHandle()).contentFrame();
   assert.ok(f,'third-party frame not created');
   await f.waitForLoadState('domcontentloaded',{timeout:45000});
   // Real provider frame must render useful official content in the browser.
   // DOMContentLoaded precedes vendor SPA rendering; wait for actual content.
   // The vendor is cross-origin, but Playwright can inspect the test frame.
   let bodyText='';
   try{
    await f.waitForFunction(()=>/Carrollton.Farmers Branch ISD|SchoolSearch/i.test(
     document.body?.innerText||''),null,{timeout:25000});
    bodyText=await f.locator('body').innerText({timeout:10000});
   }catch(err){
    const debug=await f.evaluate(()=>({url:location.href,title:document.title,
      bodyText:(document.body?.innerText||'').slice(0,300),
      htmlLength:document.documentElement?.outerHTML?.length||0})).catch(e=>({browserError:String(e).slice(0,300)}));
    console.error('CFB_PROVIDER_FRAME_DIAGNOSTIC',JSON.stringify({width,...debug}));
    throw Error('GuideK12 failed to render official content after a bounded SPA wait: '+String(err).slice(0,160));
   }
   assert.match(bodyText,/Carrollton.Farmers Branch ISD|SchoolSearch/i,
    'GuideK12 did not render official content inside the browser');
   const dims=await page.evaluate(()=>{
    const p=document.getElementById('cfbOfficialFinderPanel').getBoundingClientRect();
    const f=document.querySelector('#cfbInlineFinderFrameHost iframe').getBoundingClientRect();
    return {panelWidth:p.width,frameWidth:f.width,viewport:document.documentElement.clientWidth};
   });
   assert.ok(dims.frameWidth<=dims.panelWidth+1);
   assert.ok(dims.frameWidth<=dims.viewport+1);
   assert.deepEqual(errors,[]);
   results.push({width,src,loaded:true,frameWidth:dims.frameWidth,viewport:dims.viewport});
   await page.locator('#cfbCloseInlineFinder').click();
   assert.equal(await page.locator('#cfbInlineFinderFrameHost iframe').count(),0);
   await page.close();
  }
  console.log(JSON.stringify({verdict:'EMBED_RENDER_VERIFIED_ON_LOCAL_ORIGIN',results}));
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(err=>{console.error('CFB_GUIDEK12_LIVE_EMBED_NOT_VERIFIED',err);process.exitCode=1;server.close()});
