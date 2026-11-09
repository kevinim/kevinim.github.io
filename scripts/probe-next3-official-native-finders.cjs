#!/usr/bin/env node
'use strict';
// Native official district UI verification only, at published public-for-sale/rent houses.
// Read-only user-style browser controls; no private address/unit or hidden API access.
// Never infer official assignment from autocomplete matches or a map screenshot.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const OUT='artifacts/next3-native-finders';fs.mkdirSync(OUT,{recursive:true});
const official=[
 {district:'PISD',url:'https://webservice.pisd.edu/SchoolFinderForSchoolWires/',prefix:'plano',address:'4661 Baldwin Ln, Plano, TX 75024',query:'4661 Bald'},
 {district:'LISD',url:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=8b1628e7345e4a98a4dcf6c852581656',
  prefix:'lewisville',address:'430 Hamilton St, Lewisville, TX 75067',query:'430 Hamilton'},
 {district:'043907',url:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125',
  prefix:'mckinney',address:'4727 Sunflower Dr, McKinney, TX 75070',query:'4727 Sunflower'}
];
const report={checkedAt:new Date().toISOString(),cases:[],allSevenISDRelease:'NO_GO',
 officialSourceResultCounts:[],privateResidenceDataCollected:false};
const clean=(s,n=320)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
const safeUrl=u=>{try{const x=new URL(u);return x.origin+x.pathname}catch{return '[unknown]'}};
async function inspect(page){
 return page.evaluate(()=>{
  const inputs=[...document.querySelectorAll('input')].filter(e=>e.getClientRects().length&&e.type!=='hidden').map(e=>({
   id:e.id,placeholder:e.placeholder||'',type:e.type,outer:e.outerHTML.slice(0,500)})).slice(0,12);
  const matches=[...document.querySelectorAll('tr,li,a,[role="option"],[class*="autocomplete"],[class*="suggest"],[class*="result"]')]
   .filter(e=>e.getClientRects().length).slice(0,300).map(e=>({
    text:(e.innerText||'').trim().slice(0,230),html:e.outerHTML.slice(0,700)}));
  return {inputs,matches};
 });
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const spec of official){
  const ctx=await browser.newContext({viewport:{width:1366,height:900},timezoneId:'America/Chicago'});
  const page=await ctx.newPage();
  const entry={district:spec.district,address:spec.address,officialUrl:spec.url,inputsFound:[],
    statuses:[],nativeAddressSelected:false,zonedCampusResultsFound:false,officialGradeResults:{},
    result:'NOT_CERTIFIED',pageErrors:[]};
  page.on('pageerror',e=>entry.pageErrors.push(clean(e.message,170)));
  try{
   const nav=await page.goto(spec.url,{waitUntil:'domcontentloaded',timeout:65000});
   entry.http=nav?.status()||null;
   await page.waitForTimeout(spec.district==='043907'?15000:3500);
   entry.title=clean(await page.title(),110);
   const state=await inspect(page);
   entry.inputsFound=state.inputs;
   entry.initialBody=await page.locator('body').innerText().then(x=>x.slice(0,1800)).catch(()=>'');
   let input=null;
   if(spec.district==='PISD')input=page.locator('#tbUserEntry');
   if(spec.district==='LISD')input=page.locator('#esri_dijit_Search_0_input');
   if(spec.district==='043907'){
    const possible=page.locator('input[placeholder*="address" i],input[placeholder*="search" i]');
    if(await possible.count())input=possible.first();
   }
   if(input&&await input.count()&&await input.isVisible().catch(()=>false)){
    entry.addressInputFound=true;
    await input.fill('');
    await input.pressSequentially(spec.query,{delay:95});
    await page.waitForTimeout(2800);
    const partial=await inspect(page);
    entry.partialMatchingUi=partial.matches.filter(x=>x.text.match(new RegExp(spec.address.match(/^\d+/)[0]+'.*'+spec.address.split(' ')[1],'i'))).slice(0,15);
    entry.partialText=await page.locator('body').innerText().then(t=>t.slice(0,4600)).catch(()=>'');
    await page.screenshot({path:path.join(OUT,spec.prefix+'-after-partial.png'),fullPage:true,timeout:25000});
    const pieces=spec.query.split(' '),num=pieces[0],road=pieces[1];
    // Only native short address suggestions, never a surrounding form or FAQ.
    const selector=spec.district==='PISD'?
      'table tr, li, a, option, [role="option"]':
      '.searchMenu li, .esriSearchResults li, .esriSearchResult, [role="option"], .esri-menu li';
    const opts=page.locator(selector).filter({hasText:new RegExp(num+'.*'+road,'i')});
    const options=await opts.count();
    entry.suggestionCount=options;
    for(let i=0;i<Math.min(options,12);i++){
      const opt=opts.nth(i);
      if(!await opt.isVisible().catch(()=>false))continue;
      const label=clean(await opt.innerText(),170);
      if(label.length<5||label.length>170||/no results|not found|error/i.test(label))continue;
      try{
       await opt.click({timeout:9000});
       entry.nativeAddressSelected=true;entry.selectedLabel=label;break;
      }catch(e){entry.selectionError=clean(e.message,130)}
    }
    if(!entry.nativeAddressSelected){
     // For Plano ASP.NET the suggestion can be a postback with a clickable
     // table cell; preserve markup before attempting an ungrounded click.
     entry.result='OFFICIAL_AUTOCOMPLETE_PRESENT_SELECTION_NOT_VERIFIED';
    }else{
     await page.waitForTimeout(2500);
     const body=await page.locator('body').innerText().catch(()=>'');
     entry.postSelectionText=body.slice(0,7000);
     entry.result='OFFICIAL_ADDRESS_SELECTED_RESULT_REQUIRES_GRADE_PARSE';
     if(spec.district==='LISD'){
       // District instructions explicitly require clicking the selected
       // property's location on the map to display zone information.
       // Use map center only if a search result visibly centered the map.
       const map=page.locator('#map_root,.esriMapContainer,.mapContainer').first();
       entry.mapControlFound=await map.count()>0;
       if(entry.mapControlFound){
        await map.click({position:{x:Math.min(480,(await map.boundingBox())?.width/2||180),
         y:Math.min(240,(await map.boundingBox())?.height/2||180)},timeout:9000}).catch(e=>entry.mapClickError=clean(e.message,200));
        await page.waitForTimeout(2700);
        entry.popupText=await page.locator('.esriPopup,.esriPopupWrapper,.esriPopup .contentPane').allTextContents().then(x=>x.map(t=>clean(t,950))).catch(()=>[]);
       }
     }
    }
    await page.screenshot({path:path.join(OUT,spec.prefix+'-after-choice.png'),fullPage:true,timeout:25000});
   }else{
    entry.result='NO_ADDRESS_INPUT_USABLE';entry.addressInputFound=false;
    await page.screenshot({path:path.join(OUT,spec.prefix+'-no-input.png'),fullPage:true,timeout:25000}).catch(()=>{});
   }
  }catch(e){entry.result='OFFICIAL_BROWSER_ERROR';entry.error=clean(e.message,430)}
  report.cases.push(entry);
  console.log('NEXT3_NATIVE_FINDER '+JSON.stringify({district:entry.district,result:entry.result,inputFound:entry.addressInputFound,
   autoSuggestions:entry.suggestionCount,selected:entry.nativeAddressSelected,selectedLabel:entry.selectedLabel,
   popup:entry.popupText,error:entry.error,htmlChoices:entry.partialMatchingUi?.map(x=>({text:x.text,tag:x.html.slice(0,180)})),pageErrors:entry.pageErrors}).slice(0,9000));
  await ctx.close();
 }
 }finally{
  await browser.close();
  fs.writeFileSync(path.join(OUT,'official-native-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('NEXT3_NATIVE_FINDER_SUMMARY '+JSON.stringify({sites:report.cases.length,
   addressInputFound:report.cases.filter(x=>x.addressInputFound).length,
   nativeSelected:report.cases.filter(x=>x.nativeAddressSelected).length,
   independentExactSchoolMatches:0,release:'NO_GO'}));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
