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
    // Plano uses a real ASP.NET SELECT listbox; never click its surrounding
    // table row (that yields a false successful "selection" of the whole form).
    if(spec.district==='PISD'){
      const select=page.locator('select').filter({has:page.locator('option')}).first();
      const options=await select.locator('option').evaluateAll(items=>items.map(x=>({text:x.textContent?.trim()||'',value:x.value}))).catch(()=>[]);
      entry.planoNativeOptions=options.slice(0,12);
      const valid=options.filter(x=>new RegExp('^'+num+'\\s+'+road,'i').test(x.text)&&x.text.length<140&&!/no results|not found/i.test(x.text));
      entry.suggestionCount=valid.length;
      if(valid.length===1){
       await select.selectOption({value:valid[0].value},{timeout:9500});
       entry.nativeAddressSelected=true;entry.selectedLabel=valid[0].text;
      }
    }else{
      const opts=page.locator('.searchMenu li, .esriSearchResults li, .esriSearchResult, [role="menuitem"],[role="option"], .esri-menu li')
       .filter({hasText:new RegExp(num+'.*'+road,'i')});
      entry.suggestionCount=await opts.count();
      for(let i=0;i<Math.min(entry.suggestionCount,12);i++){
       const opt=opts.nth(i);
       if(!await opt.isVisible().catch(()=>false))continue;
       const label=clean(await opt.innerText(),170);
       if(label.length<5||label.length>170||/no results|not found|error/i.test(label))continue;
       try{await opt.click({timeout:9000});entry.nativeAddressSelected=true;entry.selectedLabel=label;break}
       catch(e){entry.selectionError=clean(e.message,130)}
      }
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
     if(spec.district==='PISD'){
       // The selected address must produce independent four-stage feeder table.
       entry.planoPostback=await page.locator('select').count();
       entry.sourceFeederRows=await page.locator('tr').evaluateAll(rows=>rows.slice(-80).map(r=>
         [...r.querySelectorAll('td,th')].map(x=>(x.innerText||'').trim()).filter(Boolean)).filter(x=>x.length)).catch(()=>[]);
       entry.gradeResultUiObserved=entry.sourceFeederRows.length>0;
     }
     if(spec.district==='LISD'||spec.district==='043907'){
       // After a TRUE autocomplete result, district's own instructions say
       // click map at searched location. Map normally centers at house point.
       const map=page.locator('#map_root,.esriMapContainer,.mapContainer').first();
       entry.mapControlFound=await map.count()>0;
       if(entry.mapControlFound){
        const box=await map.boundingBox();
        if(box&&box.width>300&&box.height>300){
          // Click the exact viewport center after the geocoder panned there.
          // Close search-result popup first so it cannot intercept map identify.
          await page.locator('.esriPopup .titleButton.close').first().click({timeout:4000}).catch(()=>{});
          await map.click({position:{x:Math.floor(box.width/2),y:Math.floor(box.height/2)},timeout:9000})
           .catch(e=>entry.mapClickError=clean(e.message,200));
          entry.clickedMapCenteredGeocode=true;
          await page.waitForTimeout(3200);
        }
        entry.popupText=await page.locator('.esriPopup,.esriPopupWrapper,.esriPopup .contentPane')
         .allTextContents().then(x=>x.map(t=>clean(t,950))).catch(()=>[]);
        entry.popupRows=await page.locator('.esriPopup .contentPane tr').evaluateAll(rows=>rows.map(r=>
         [...r.querySelectorAll('td,th')].map(x=>(x.innerText||'').trim()).filter(Boolean))).catch(()=>[]);
        entry.popupRaw=await page.locator('.esriPopup .contentPane').first().innerText().catch(()=>'');
        const levels=spec.district==='LISD'?
          {'elementary':/Elementary/i,'middle':/^Middle$/i,'freshman':/9th Grade/i,'high':/HIGH_NAME|High School/i}:
          {'elementary':/Elementary/i,'middle':/^Middle$/i,'high':/High/i};
        for(const [grade,re] of Object.entries(levels)){
         const row=(entry.popupRows||[]).find(x=>x[0]&&re.test(x[0])&&x[1]);
         if(row)entry.officialGradeResults[grade]=row[1];
        }
        entry.zonedCampusResultsFound=Object.keys(entry.officialGradeResults).length===(spec.district==='LISD'?4:3);
       }
     }
     if(entry.zonedCampusResultsFound||spec.district==='PISD'&&entry.gradeResultUiObserved)
       entry.result='OFFICIAL_BROWSER_CAMPUS_RESULTS_OBSERVED_YEAR_AND_ENROLLMENT_SEPARATE';
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
   popup:entry.popupText,sourceRows:entry.sourceFeederRows,grades:entry.officialGradeResults,error:entry.error,htmlChoices:entry.partialMatchingUi?.map(x=>({text:x.text,tag:x.html.slice(0,180)})),pageErrors:entry.pageErrors}).slice(0,9000));
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
