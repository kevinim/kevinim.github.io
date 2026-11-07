#!/usr/bin/env node
'use strict';
// Read-only, public institutional-address browser diagnosis for the CFBISD
// SchoolSearch frontend. Runs only on explicit GitHub Action dispatch and
// matching PRs, using the runner's open-source Playwright/Chromium.
// Never use private home addresses. Never interpret all-school catalog cards
// as property-zoned enrollment results.
const {chromium}=require('playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const out='artifacts/cfb-browser-probe';
mkdirSync(out,{recursive:true});
const report={checkedAt:new Date().toISOString(),district:'CFB',
 finder:'https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/',
 address:'1600 S Josey Ln, Carrollton, TX 75006',
 addressKind:'public-school-campus',result:'inconclusive',
 propertyZonedCampusResultsVerified:false,driver:'GitHub Actions Playwright Chromium',
 errors:[],networkFailures:[],diagnostics:{},publicNetworkTrace:[]};
const cleanUrl=u=>{try{const x=new URL(u);return x.origin+x.pathname}catch{return '[unparseable URL]'}};
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:1365,height:1000},locale:'en-US',timezoneId:'America/Chicago'});
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push(String(e.message||e).slice(0,220)));
  // Instrument only PUBLIC endpoint paths, never full query strings, POST
  // payloads, credentials, cookies, authorization headers or response bodies.
  page.on('response',response=>{
   if(report.publicNetworkTrace.length>=120)return;
   const request=response.request();
   const resourceType=request.resourceType();
   const url=cleanUrl(response.url());
   if(/\.(?:png|jpe?g|gif|webp|svg|woff2?|ttf)(?:$|\?)/i.test(url))return;
   if(!['xhr','fetch','document','script'].includes(resourceType))return;
   report.publicNetworkTrace.push({type:resourceType,method:request.method(),url,status:response.status()});
  });
  page.on('console',m=>{
   if(['error','warning'].includes(m.type())&&report.errors.length<18)
    report.errors.push('console '+m.type()+': '+String(m.text()).slice(0,200));
  });
  page.on('requestfailed',request=>{
   if(report.networkFailures.length>=30)return;
   report.networkFailures.push({url:cleanUrl(request.url()),reason:String(request.failure()?.errorText||'').slice(0,150)});
  });
  const nav=await page.goto(report.finder,{waitUntil:'domcontentloaded',timeout:55000});
  report.diagnostics.navigationHttp=nav?.status()||null;
  await page.waitForTimeout(4000);
  report.diagnostics.pageTitle=await page.title();
  report.diagnostics.publicScripts=(await page.locator('script[src]').evaluateAll(els=>els.map(e=>{
   try{const u=new URL(e.src);return u.origin+u.pathname}catch{return '[invalid script URL]'}
  }).slice(0,70)));
  report.diagnostics.inputsBefore=await page.locator('input').evaluateAll(els=>els.slice(0,20).map(el=>({type:el.type,placeholder:el.placeholder,ariaLabel:el.getAttribute('aria-label')})));
  const inputs=page.locator('input');
  const count=await inputs.count();
  let addressInput=null;
  for(let i=0;i<count;i++){
   const candidate=inputs.nth(i);
   const type=await candidate.getAttribute('type')||'text';
   const placeholder=await candidate.getAttribute('placeholder')||'';
   if((type==='text'||type==='search')&&/address|type to search|search results/i.test(placeholder)){
    addressInput=candidate;break;
   }
  }
  if(!addressInput)addressInput=page.getByRole('textbox',{name:/address/i}).first();
  if(!(await addressInput.count()))throw Error('No public address text input was located in GuideK12');
  await addressInput.fill('');
  await addressInput.pressSequentially('1600 S Josey',{delay:75});
  report.diagnostics.firstInputInteraction=await page.evaluate(()=>{
   const el=document.activeElement;return {tag:el?.tagName,type:el?.getAttribute('type'),
    value:el?.value,nearbyMarkup:el?.parentElement?.parentElement?.outerHTML?.slice(0,1900)};
  });
  await page.waitForTimeout(2800);
  report.diagnostics.suggestionsAfterPartial=await page.evaluate(()=>[...document.querySelectorAll('[role="option"], [class*="suggest"], [class*="autocomplete"]')].filter(el=>el.getClientRects().length).slice(0,16).map(el=>(el.textContent||'').trim().slice(0,150)));
  await addressInput.fill(report.address);
  await page.waitForTimeout(1300);
  const find=page.getByRole('button',{name:/find on map/i}).first();
  report.diagnostics.hasFindOnMapButton=(await find.count())>0;
  if(report.diagnostics.hasFindOnMapButton){
   await find.click({timeout:10000});
   report.diagnostics.findOnMapClicked=true;
  }else{
   await addressInput.press('Enter').catch(()=>{});
   report.diagnostics.findOnMapClicked=false;
  }
  await page.waitForTimeout(8000);
  const dom=await page.evaluate(()=>{
   const txt=(document.body?.innerText||'').slice(0,22000);
   const idx=txt.toLowerCase().indexOf('matching results');
   return {
    bodyPrefix:txt.slice(0,1200),
    matchingResultsExcerpt:idx>=0?txt.slice(idx,idx+4500):'',
    visibleOptionCount:[...document.querySelectorAll('[role="option"]')].filter(el=>el.getClientRects().length).length,
    containsAddressInBody:txt.toLowerCase().includes('1600 s josey'),
    containsZoningPhrase:/\b(zoned schools|assigned schools|schools assigned to|your attendance zone)\b/i.test(txt),
    resultElementCounts:{
      results:document.querySelectorAll('[class*="result"]').length,
      schoolCards:document.querySelectorAll('[class*="school-card"], [class*="school-result"]').length
    },
    mapCanvasPresent:!!document.querySelector('canvas, .ol-viewport, .esri-view-surface')
   };
  });
  report.diagnostics.afterSearch=dom;
  await page.screenshot({path:join(out,'search.png'),animations:'disabled',timeout:20000});
  // A public SCHOOL campus address can be absent from residential address
  // catalogs. Repeat with an advertised apartment building whose inclusion
  // in CFB rezoning is independently documented by the district.
  const publicApartment='1011 S Main St, Carrollton, TX 75006';
  report.diagnostics.apartmentProbe={address:publicApartment,propertyType:'public apartment leasing address (Lux on Main)',zonedSchoolConfirmed:false};
  const clear=page.getByRole('button',{name:/clear location/i}).first();
  if(await clear.count())await clear.click({timeout:5000}).catch(()=>{});
  await addressInput.fill('');
  await addressInput.pressSequentially('1011 S Main',{delay:80});
  report.diagnostics.apartmentProbe.inputMarkup=await page.evaluate(()=>document.activeElement?.parentElement?.parentElement?.outerHTML?.slice(0,1600));
  await page.waitForTimeout(2000);
  report.diagnostics.apartmentProbe.suggestions=await page.evaluate(()=>[...document.querySelectorAll('[role="option"], [class*="suggest"], [class*="autocomplete"]')].filter(el=>el.getClientRects().length).slice(0,12).map(el=>(el.textContent||'').trim().slice(0,150)));
  await addressInput.fill(publicApartment);
  if(await find.count())await find.click({timeout:10000});
  else await addressInput.press('Enter').catch(()=>{});
  await page.waitForTimeout(7000);
  const secondText=await page.locator('body').innerText();
  const start=secondText.toLowerCase().indexOf('matching results');
  const secondListing=start>=0?secondText.slice(start,start+3500):'';
  const firstListing=dom.matchingResultsExcerpt.slice(0,3500);
  report.diagnostics.apartmentProbe.resultsExcerpt=secondListing.slice(0,2200);
  report.diagnostics.apartmentProbe.sameFirst3500CharsAsPublicSchool=secondListing===firstListing;
  report.diagnostics.apartmentProbe.containsAssignmentHeading=/\b(your zoned schools|assigned schools|schools assigned to address)\b/i.test(secondListing);
  await page.screenshot({path:join(out,'apartment-search.png'),animations:'disabled',timeout:20000});
  report.result='address-search-attempted-results-for-manual-review';
  // This probe intentionally NEVER certifies a school assignment from
  // the presence of a school card or words in provider boilerplate.
 }catch(error){
  report.result='browser-probe-inconclusive';
  report.errors.push(String(error?.stack||error).slice(0,1250));
 }finally{
  await browser?.close().catch(()=>{});
  writeFileSync(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log('CFB BROWSER PROBE: '+report.result+'; property-zoned campus set verified=false');
  console.log('CFB DIAGNOSTIC: '+JSON.stringify({navigationHttp:report.diagnostics.navigationHttp,inputs:report.diagnostics.inputsBefore,suggestions:report.diagnostics.suggestionsAfterPartial,afterSearch:report.diagnostics.afterSearch,errors:report.errors,failures:report.networkFailures.slice(0,10)}).slice(0,7600));
  console.log('CFB RESIDENTIAL COMPLEX PROBE: '+JSON.stringify(report.diagnostics.apartmentProbe||{}).slice(0,2800));
  console.log('CFB PUBLIC NETWORK TRACE (paths only): '+JSON.stringify(report.publicNetworkTrace).slice(0,8500));
  console.log('CFB INPUT DOM DETAILS: '+JSON.stringify({initial:report.diagnostics.firstInputInteraction,scripts:report.diagnostics.publicScripts,apartment:report.diagnostics.apartmentProbe?.inputMarkup}).slice(0,4800));
 }
})().catch(error=>{console.error(error);process.exitCode=1});
