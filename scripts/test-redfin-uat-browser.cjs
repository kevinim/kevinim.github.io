'use strict';
// Real, isolated desktop/mobile Chromium UAT. No production deployment or Redfin requests.
const { chromium }=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const TEST_URL='https://www.redfin.com/TX/Plano/4652-Phillip-Dr-75024/home/123456';
const BASE='http://127.0.0.1:8765';
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850},serviceWorkers:'block'});
   // Deterministic local copy of pinned Leaflet: no dependency on external CDN availability.
   await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({
    status:200,contentType:'application/javascript',
    body:fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'))
   }));
   // Fake only the deliberate geocoding call. No real address is disclosed.
   await page.route('https://geocode.arcgis.com/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.includes('findAddressCandidates'))return route.fulfill({
     status:200,contentType:'application/json',
     body:JSON.stringify({candidates:[{score:99,address:'4652 Phillip Dr, Plano, TX 75024',
      location:{x:-96.8,y:33.03},attributes:{Addr_type:'PointAddress'}}]})
    });
    return route.fulfill({status:200,contentType:'application/json',body:'{"suggestions":[]}'});
   });
   const response=await page.goto(BASE+'/redfin-uat.html',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200);
   await page.locator('#redfinUatPanel').waitFor({state:'visible',timeout:15000});
   assert.equal(await page.locator('#redfinUatCards article').count(),0);
   await page.locator('#redfinUatUrl').fill(TEST_URL+'?utm_source=qa#photos');
   await page.locator('#redfinUatUrl').dispatchEvent('change');
   assert.equal(await page.locator('#redfinUatAddress').inputValue(),
    '4652 Phillip Dr, Plano, TX 75024','address is hint only');
   await page.locator('#redfinUatRent').fill('2750');
   await page.locator('#redfinUatForm button[type=submit]').click();
   assert.equal(await page.locator('#redfinUatCards article').count(),1);
   assert.match(await page.locator('#redfinUatCards article').innerText(),/\$2,750/);
   const source=page.locator('#redfinUatCards article a');
   assert.equal(await source.getAttribute('href'),TEST_URL,'no query tracking');
   assert.equal(await source.getAttribute('rel'),'noopener noreferrer');
   // Toggling two same-map layers must not pan or zoom the existing Leaflet map.
   await page.waitForFunction(()=>typeof map!=='undefined'&&map&&map.getZoom()>=1,
    null,{timeout:20000});
   const toggle=await page.evaluate(()=>{
    const start={z:map.getZoom(),lat:map.getCenter().lat,lng:map.getCenter().lng};
    const listing=document.querySelector('#redfinUatLayerToggle [data-mode=listings]');
    const area=document.querySelector('#redfinUatLayerToggle [data-mode=area]');
    listing.click();const active=listing.getAttribute('aria-pressed');
    area.click();const restored=area.getAttribute('aria-pressed');
    const end={z:map.getZoom(),lat:map.getCenter().lat,lng:map.getCenter().lng};
    return {start,end,active,restored};
   });
   assert.equal(toggle.active,'true');assert.equal(toggle.restored,'true');
   assert.deepEqual(toggle.start,toggle.end,'map extent unchanged after toggle');
   await page.locator('#redfinUatCards [data-action=pin]').click();
   await page.waitForFunction(()=>document.querySelector('#redfinUatCards')?.textContent.includes('지도 핀: Esri 참고 좌표'),null,{timeout:16000});
   assert.equal(await page.locator('#redfinUatLayerToggle [data-mode=listings]').getAttribute('aria-pressed'),'true');
   await page.locator('#redfinUatCards [data-action=analyze]').click();
   assert.equal(await page.locator('#homeAddress').inputValue(),'4652 Phillip Dr, Plano, TX 75024');
   await page.locator('#redfinUatLayerToggle [data-mode=area]').click();
   // Invalid URL must not add another card or execute third-party code.
   await page.locator('#redfinUatUrl').fill('https://www.redfin.com.evil.example/TX/Plano/Other-Dr-75024/home/123');
   await page.locator('#redfinUatAddress').fill('111 Other Dr, Plano, TX 75024');
   await page.locator('#redfinUatForm button[type=submit]').click();
   assert.equal(await page.locator('#redfinUatCards article').count(),1);
   assert.equal(await page.locator('#redfinUatStatus').getAttribute('data-error'),'true');
   const out=path.resolve('artifacts/redfin-uat');
   fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'redfin-'+width+'.png')});
   await page.locator('#redfinUatCards [data-action=remove]').click();
   assert.equal(await page.locator('#redfinUatCards article').count(),0);
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#redfinUatCards article').count(),0,'memory-only after refresh');
   await page.close();
   console.log('PASS Redfin UAT browser '+width+'px: URL, photo source, map layers, pin, home analysis, invalid URL, delete, reload');
  }
  const prod=await browser.newPage();
  await prod.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({
   status:200,contentType:'application/javascript',
   body:fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'))
  }));
  await prod.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(await prod.locator('#redfinUatPanel').count(),0,'production entry must never expose UAT');
  await prod.close();
  console.log('PASS normal dashboard unchanged');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});