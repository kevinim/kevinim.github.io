#!/usr/bin/env node
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd();
const liveBase=(process.env.DASHBOARD_BASE_URL||'').trim();
if(liveBase&&new URL(liveBase).origin!=='https://kevinim.github.io')throw Error('Live smoke must target production GitHub Pages only');
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
 if(!liveBase)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 const results=[];
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const target=liveBase||'http://127.0.0.1:'+server.address().port+'/';
   await page.goto(target,{waitUntil:'domcontentloaded',timeout:80000});
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
   // Vendor SPA may render long after DOMContentLoaded and an isolated
   // frame.waitForFunction can time out even when body text is visible.
   // Poll the actual rendered body used by a visitor, with a bounded deadline.
   let bodyText='';
   const officialContent=/Carrollton.Farmers Branch ISD|SchoolSearch/i;
   for(let attempt=0;attempt<30;attempt++){
    bodyText=await f.locator('body').innerText({timeout:5000}).catch(()=>'');
    if(officialContent.test(bodyText))break;
    await page.waitForTimeout(1200);
   }
   if(!officialContent.test(bodyText)){
    const debug=await f.evaluate(()=>({url:location.href,title:document.title,
      bodyText:(document.body?.innerText||'').slice(0,300),
      htmlLength:document.documentElement?.outerHTML?.length||0})).catch(e=>({browserError:String(e).slice(0,300)}));
    console.error('CFB_PROVIDER_FRAME_DIAGNOSTIC',JSON.stringify({width,...debug}));
    throw Error('GuideK12 failed to render official content after 36-second SPA grace');
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
   // Test the *real* dashboard campus directory, cards and Leaflet marker,
   // without inferring a residential enrollment or scraping the provider frame.
   await page.waitForFunction(()=>typeof state!=='undefined'&&Array.isArray(state.schools)&&
    state.schools.some(s=>s.district==='CFB'&&s.type==='elementary'&&
     Array.isArray(s.ll)&&s.ll.length===2&&s.ll.every(Number.isFinite))&&
    typeof map!=='undefined'&&!!map,{timeout:30000});
   const campus=await page.evaluate(()=>state.schools.find(s=>s.district==='CFB'&&
    s.type==='elementary'&&Array.isArray(s.ll)&&s.ll.length===2&&s.ll.every(Number.isFinite)).name);
   await page.locator('#cfbManualElementary').focus();
   await page.locator('#cfbManualElementary').selectOption(campus);
   await page.locator('#cfbManualApply').click();
   await page.locator('#cfbManualSchoolCards .cfb-manual-card').first().waitFor({timeout:12000});
   const cardText=await page.locator('#cfbManualSchoolCards').innerText();
   assert.ok(cardText.includes(campus));
   assert.ok(cardText.includes('사용자가 공식 Finder에서 직접 선택한 참고 정보'));
   await page.locator('.cfb-manual-campus').first().waitFor({timeout:10000});
   const cardCount=await page.locator('#cfbManualSchoolCards .cfb-manual-card').count();
   const markerCount=await page.locator('.cfb-manual-campus').count();
   assert.equal(cardCount,1,'manual campus bridge must show one actual CFB school card');
   assert.ok(markerCount>=1,'manual campus bridge must show native map point');
   await page.locator('#homeAddress').dispatchEvent('input');
   assert.equal(await page.locator('#cfbManualSchoolCards .cfb-manual-card').count(),0,
    'address change must erase stale school selections');
   assert.equal(await page.locator('.cfb-manual-campus').count(),0,
    'address change must remove temporary manual campus map markers');
   assert.deepEqual(errors,[]);
   results.push({width,src,loaded:true,frameWidth:dims.frameWidth,viewport:dims.viewport,
    manualBridge:{cardCount,markerCount,clearedOnAddressChange:true}});
   await page.locator('#cfbCloseInlineFinder').click();
   assert.equal(await page.locator('#cfbInlineFinderFrameHost iframe').count(),0);
   await page.close();
  }
  console.log(JSON.stringify({verdict:'EMBED_RENDER_VERIFIED_ON_LOCAL_ORIGIN',results}));
 }finally{
  await browser.close();
  if(!liveBase)await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(err=>{console.error('CFB_GUIDEK12_LIVE_EMBED_NOT_VERIFIED',err);process.exitCode=1;if(server.listening)server.close()});
