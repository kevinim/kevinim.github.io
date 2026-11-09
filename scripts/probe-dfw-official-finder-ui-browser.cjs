#!/usr/bin/env node
'use strict';
// Real official-site UI discovery, not a school assignment certification.
// Only public complex names / base street addresses; never unit, user PII,
// GIS harvesting, API probing, or inferred school names.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const fixture=require('../tests/dfw-public-leasing-address-e2e-2026.json');
const OUT=path.join(ROOT,'artifacts/dfw-official-finder-ui-probe');
fs.mkdirSync(OUT,{recursive:true});
const officialPages=[
 {district:'043907',url:'https://www.mckinneyisd.net/page/attendance-zones-maps/',label:'26-27 School Locator',directLocator:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125'},
 {district:'PISD',url:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder',label:'Find My School'},
 {district:'LISD',url:'https://www.lisd.net/resources/families/school-locator',label:'VIEW 2026-2027 SCHOOL LOCATOR',directLocator:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=8b1628e7345e4a98a4dcf6c852581656'}
];
const report={asOf:'2026-11-09',schemaVersion:1,publicBasesOnly:true,
 unitNumberRequiredByDefault:false,independentGradeAssignmentsCertified:0,
 releaseGate:'NO_GO',portals:[],warnings:[]};
function save(){fs.writeFileSync(path.join(OUT,'official-portal-ui-evidence.json'),JSON.stringify(report,null,2)+'\n');}
const short=e=>String(e?.message||e).slice(0,280);
const screenshot=async(page,file)=>{try{await page.screenshot({path:path.join(OUT,file),timeout:18000});return true;}catch{return false;}};
async function inventory(page){
 return page.evaluate(()=>{
  const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
  const fields=[...document.querySelectorAll('input,select')].filter(visible).slice(0,20)
   .map(e=>({tag:e.tagName,type:e.getAttribute('type'),placeholder:e.getAttribute('placeholder'),
    label:e.getAttribute('aria-label'),id:e.id,options:e.tagName==='SELECT'
     ?[...e.options].slice(0,30).map(x=>x.textContent?.trim()?.slice(0,80)):undefined}));
  const controls=[...document.querySelectorAll('a,button,[role=button]')].filter(visible).slice(0,150)
   .map(e=>({label:e.textContent?.trim()?.slice(0,90)||e.getAttribute('aria-label'),
    href:e.tagName==='A'?e.href:null})).filter(e=>e.label);
  return {url:location.href,title:document.title,yearPresent:/2026.{0,4}2027|2026.{0,3}27/.test(document.body.innerText),
   excerpt:document.body.innerText.replace(/\s+/g,' ').slice(-2400),fields,controls:controls.slice(-75)};
 });
}
async function runDistrict(browser,d){
 const row={district:d.district,startUrl:d.url,status:'UNVERIFIED',siteOpened:false,
  officialAddressSpecificResultExtracted:false,officialSchoolMatch:null,
  unitRequested:false,apartmentPickerAvailable:false,gradeResults:[],
  screenshots:[],errors:[]};
 const context=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:false});
 const page=await context.newPage();
 try{
  await page.goto(d.url,{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForTimeout(3500);
  row.siteOpened=true;
  row.landing=await inventory(page);
  if(await screenshot(page,'official-'+d.district+'-landing.png'))row.screenshots.push('landing');
  // Prefer an official entry-point link/button. Never follow non-HTTPS.
  const target=page.getByText(d.label,{exact:false}).first();
  if(await target.count()){
   try{
    const before=context.pages().length;
    await target.click({timeout:6500});
    await page.waitForTimeout(5000);
    const pages=context.pages();
    const next=pages.length>before?pages[pages.length-1]:page;
    if(next!==page){
     try{await next.waitForLoadState('domcontentloaded',{timeout:15000})}catch{}
    }
    if(!row.locatorOpened && d.directLocator){
     try{
      await next.goto(d.directLocator,{waitUntil:'domcontentloaded',timeout:33000});
      await next.waitForTimeout(6000);
      row.officialPublishedDirectLocatorFallback=true;
      row.locatorIsDifferent=true;
      row.locatorOpened=true;
     }catch(e){row.errors.push('published_locator_fallback:'+short(e));}
    }
    row.locator=await inventory(next);
    row.locatorIsDifferent=next.url()!==d.url;
    row.locatorOpened=row.locatorIsDifferent || next.frames().length>1;
    if(!row.locatorOpened)row.errors.push('clicked_entrypoint_but_no_new_locator_or_embedded_frame');
    if(await screenshot(next,'official-'+d.district+'-locator.png'))row.screenshots.push('locator');
    if(d.district==='LISD'){
     // Lewisville's PUBLISHED INSTRUCTIONS use "Find an Apartment" and
     // a complex-name drop-down. We record proof of that UI if found;
     // absence is inconclusive (often embedded map iframe or blocked origin).
     const picker=next.getByText('Find an Apartment',{exact:false}).first();
     row.apartmentPickerAvailable=(await picker.count())>0;
     if(row.apartmentPickerAvailable){
      try{await picker.click({timeout:6000});await next.waitForTimeout(1200);
       row.apartmentUi=await inventory(next);
       if(await screenshot(next,'official-LISD-apartment-picker.png'))row.screenshots.push('apartmentPicker');
      }catch(e){row.errors.push('apartment_picker:'+short(e));}
     }
     // Do not assume any dropdown listing equals an approved house assignment.
     row.publicComplexes=fixture.cases.filter(x=>x.districtHint==='LISD')
      .map(x=>({id:x.id,complexName:x.complexName,selected:false,independentlyVerified:false}));
    }
    row.status=row.locatorOpened?'OFFICIAL_LOCATOR_UI_OPENED_NOT_ADDRESS_VERIFIED':'CTA_CLICKED_BUT_LOCATOR_NOT_CONFIRMED';
   }catch(e){
    row.errors.push('locator_click:'+short(e));
    row.status='LOCATOR_UI_NOT_REACHED';
    if(d.directLocator){
     try{
      await page.goto(d.directLocator,{waitUntil:'domcontentloaded',timeout:33000});
      await page.waitForTimeout(4500);
      row.locator=await inventory(page);
      row.locatorOpened=true;
      row.officialPublishedDirectLocatorFallback=true;
      row.status='PUBLISHED_LOCATOR_OPENED_NOT_ADDRESS_VERIFIED';
      if(await screenshot(page,'official-'+d.district+'-direct-locator.png'))row.screenshots.push('directLocator');
     }catch(err){row.errors.push('direct_fallback:'+short(err));}
    }
   }
  }else{
   row.status='OFFICIAL_LOCATOR_CONTROL_NOT_DETECTED';
   if(d.directLocator){
    try{
     await page.goto(d.directLocator,{waitUntil:'domcontentloaded',timeout:33000});
     await page.waitForTimeout(4500);
     row.locator=await inventory(page);
     row.locatorOpened=true;
     row.officialPublishedDirectLocatorFallback=true;
     row.status='PUBLISHED_LOCATOR_OPENED_NOT_ADDRESS_VERIFIED';
     if(await screenshot(page,'official-'+d.district+'-direct-locator.png'))row.screenshots.push('directLocator');
    }catch(err){row.errors.push('direct_fallback:'+short(err));}
   }
  }
 }catch(e){row.errors.push('open:'+short(e));row.status='OFFICIAL_PAGE_UNAVAILABLE';}
 finally{
  await context.close().catch(()=>{});
  report.portals.push(row);save();
  console.log('OFFICIAL_DISTRICT_UI_PROBE '+JSON.stringify({
   district:row.district,status:row.status,siteOpened:row.siteOpened,
   locatorOpened:row.locatorOpened||false,
   apartmentPickerAvailable:row.apartmentPickerAvailable,
   independentGradeAssignmentsCertified:0,releaseGate:'NO_GO',errors:row.errors}));
 }
}
async function main(){
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const d of officialPages)await runDistrict(browser,d);
 }finally{await browser?.close().catch(()=>{});save();}
 console.log('OFFICIAL_LOCATOR_UI_PROBE_SUMMARY '+JSON.stringify({
  portals:report.portals.length,reached:report.portals.filter(x=>x.locatorOpened).length,
  independentGradeAssignmentsCertified:0,releaseGate:'NO_GO'}));
}
main().catch(e=>{report.warnings.push(short(e));save();console.error(short(e));process.exitCode=1});
