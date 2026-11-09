#!/usr/bin/env node
'use strict';
// Real public address interactions in officially linked school locators.
// Capture honest browser evidence only; do NOT infer an enrollment/zone match
// from a generic geocoder selection or a list of unrelated school names.
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const fixture=require('../tests/dfw-public-leasing-address-e2e-2026.json');
const OUT=path.join(__dirname,'../artifacts/dfw-official-finder-ui-probe');
fs.mkdirSync(OUT,{recursive:true});
const TARGETS={
 '043907':'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125',
 PISD:'https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4b48af4',
 LISD:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=8b1628e7345e4a98a4dcf6c852581656'
};
const report={schemaVersion:1,asOf:'2026-11-09',scope:'public apartment-complex base addresses',
 independentAssignedSchoolMatches:0,releaseGate:'NO_GO',checks:[]};
function save(){fs.writeFileSync(path.join(OUT,'official-address-ui-attempts.json'),JSON.stringify(report,null,2)+'\n');}
async function safeScreen(page,id){try{await page.screenshot({path:path.join(OUT,'official-address-'+id+'.png'),timeout:16000});return true;}catch{return false;}}
async function check(browser,district,entry){
 const out={id:entry.id,district,complex:entry.complexName,source:TARGETS[district],
  officialAddressSelected:false,officialGradeAssignmentsVerified:false,
  unitNumberNotRequired:true,schoolNames:{},status:'NOT_VERIFIED'};
 const context=await browser.newContext({viewport:{width:1366,height:930}});
 let page;
 try{
  page=await context.newPage();
  await page.goto(TARGETS[district],{waitUntil:'domcontentloaded',timeout:40000});
  const search=page.locator('input[placeholder="Find address or place"]').first();
  await search.waitFor({state:'visible',timeout:25000});
  out.officialInputDetected=true;
  await search.fill(entry.address);
  await page.waitForTimeout(2600);
  out.suggestions=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('[role="option"],.esri-search__suggestions li,.esri-search__suggestions-list li')];
   return nodes.filter(x=>x.getClientRects().length>0).slice(0,12)
     .map(x=>x.textContent?.replace(/\s+/g,' ').trim().slice(0,130)).filter(Boolean);
  });
  const parts=entry.address.split(',')[0].toLowerCase().split(/\s+/)
   .filter(Boolean).filter(x=>!['n','s','e','w','north','south','east','west'].includes(x));
  const firstTwo=parts.slice(0,2);
  const zip=entry.address.match(/\b\d{5}$/)?.[0];
  const exact=(out.suggestions||[]).find(v=>firstTwo.length===2
    &&firstTwo.every(w=>v.toLowerCase().includes(w))
    &&(!/\b\d{5}\b/.test(v)||v.includes(zip)));
  if(exact){
   const option=page.getByText(exact,{exact:false}).first();
   try{
    await option.click({timeout:4000});
    out.officialAddressSelected=true;
    await page.waitForTimeout(2200);
   }catch(e){out.clickIssue=String(e.message||e).slice(0,160);}
  }else{
   // Enter only if an exact first number+street suggestion is visible; otherwise
   // do not guess which street the locator accepted.
   out.suggestionIssue='NO_EXACT_STREET_NUMBER_SUGGESTION';
  }
  out.url=page.url();
  out.visiblePopupText=await page.evaluate(()=>{
   const s=[...document.querySelectorAll('.esriPopup,.esri-popup,.esri-popup__content,[role="dialog"],.jimu-widget')];
   return s.filter(e=>e.getClientRects().length>0).map(e=>e.textContent?.replace(/\s+/g,' ').trim().slice(0,600))
    .filter(Boolean).slice(0,5);
  });
  out.screenCaptured=await safeScreen(page,entry.id);
  out.status=out.officialAddressSelected?'OFFICIAL_GEOCODER_ADDRESS_SELECTED_NOT_SCHOOL_VERIFIED':
   'OFFICIAL_FINDER_QUERY_ATTEMPT_UNVERIFIED';
 }catch(e){out.issue=String(e?.message||e).slice(0,250);out.status='OFFICIAL_FINDER_QUERY_FAILED';
  if(page)out.screenCaptured=await safeScreen(page,entry.id);}
 finally{
  report.checks.push(out);save();
  console.log('OFFICIAL_ADDRESS_UI_ATTEMPT '+JSON.stringify({
   id:out.id,district,status:out.status,input:out.officialInputDetected||false,
   exactSuggestion:out.officialAddressSelected,unverified:true,issue:out.issue||out.suggestionIssue||null}));
  await context.close().catch(()=>{});
 }
}
async function main(){
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [district,url] of Object.entries(TARGETS)){
   if(!url.startsWith('https://'))throw Error('unsafe official URL');
   for(const item of fixture.cases.filter(x=>x.districtHint===district))
    await check(browser,district,item);
  }
 }finally{await browser?.close().catch(()=>{});save();}
 console.log('OFFICIAL_ADDRESS_UI_ATTEMPT_SUMMARY '+JSON.stringify({
  count:report.checks.length,inputAccessible:report.checks.filter(x=>x.officialInputDetected).length,
  exactGeocoderCandidates:report.checks.filter(x=>x.officialAddressSelected).length,
  independentlyCertifiedSchoolResults:0,releaseGate:'NO_GO'}));
}
main().catch(e=>{console.error(String(e.message||e));process.exitCode=1});
