'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:8765/';
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 for(const width of [390,1366])for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme:theme});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let addressRequests=0;
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(/geocode|nominatim|osrm/i.test(u.hostname))addressRequests++;
   return u.hostname==='127.0.0.1'||u.hostname==='unpkg.com'?route.continue():route.abort('blockedbyclient')});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>document.querySelector('#compareTable [data-zip-select]')&&window.L&&document.querySelector('#map.leaflet-container'),null,{timeout:45000});
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  assert.equal(await page.locator('label[for="zipSelect"]').count(),1);assert.equal(await page.locator('label[for="metric"]').count(),1);
  const zip=page.locator('#compareTable [data-zip-select]').nth(1),value=await zip.getAttribute('data-zip-select');
  await zip.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#zipSelect').inputValue(),value);
  await page.keyboard.press('Space');assert.equal(await zip.getAttribute('aria-current'),'true');
  const level=page.locator('#levels button').nth(1);await level.focus();await page.keyboard.press('Space');assert.equal(await level.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#levels [aria-pressed="true"]').count(),1);
  const before=addressRequests;
  await page.locator('#destination').evaluate(input=>{input.value='123 Synthetic';input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}))});
  await page.waitForTimeout(400);assert.equal(addressRequests,before,'IME Enter must not send an address lookup');
  await page.locator('#destination').fill('');
  for(const zoom of [1,2]){
   // Browser zoom reduces CSS layout viewport; use the equivalent CSS width.
   await page.setViewportSize({width:Math.floor(width/zoom),height:900});
   const controls=await page.locator('#levels').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
   assert.ok(controls.scroll<=controls.width+2,'school level controls overflow');
   fs.mkdirSync('artifacts/review-controls',{recursive:true});await page.screenshot({path:`artifacts/review-controls/${width}-${theme}-${zoom}x.png`});
  }
  assert.deepEqual(errors,[]);await page.close();console.log('PASS keyboard/IME '+width+' '+theme+' 100/200% layout');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
