#!/usr/bin/env node
'use strict';
// Two currently publicly advertised single-family listings; no occupant names,
// accounts, student records, unit data, GIS extraction, or geometry downloads.
// A native GuideK12 address suggestion MUST be selected; an unfiltered
// catalog does NOT prove address-assigned campuses.
const {chromium}=require('playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const cases=[
 {id:'cfb-raine-2026',address:'2705 Raintree Dr, Carrollton, TX 75006',
  listing:'https://www.har.com/just-listed-homes-for-sale-75006'},
 {id:'cfb-yosemite-2026',address:'2201 Yosemite Ct, Carrollton, TX 75006',
  listing:'https://www.har.com/zipcode_75006/realestate/for_sale'}
];
const FINDER='https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/';
const OUT='artifacts/cfb-listed-house-finder';
mkdirSync(OUT,{recursive:true});
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function assignedSchoolLevels(body){
 const lines=String(body||'').split(/\r?\n/).map(clean).filter(Boolean);
 const names=[];
 for(let i=1;i<lines.length;i++)
  if(/^Assigned school$/i.test(lines[i])&&!names.includes(lines[i-1]))names.push(lines[i-1]);
 const elementary=names.filter(x=>/Elementary\s*\(K-5\)/i.test(x)&&!/Bilingual/i.test(x));
 const middle=names.filter(x=>/Middle School\s*\(6-8\)/i.test(x));
 const high=names.filter(x=>/High School\s*\(9-12\)/i.test(x));
 return {elementary,middle,high,uniqueThreeLevels:elementary.length===1&&middle.length===1&&high.length===1};
}
function safeLabel(s){return clean(s).slice(0,180)}
(async()=>{
 const report={asOf:new Date().toISOString(),source:FINDER,
  testType:'browser-native-address-selection-publicly-listed-single-family',
  liveFinderBrowser:true,dashboardPolygonMatched:false,officialYearExplicitlyVerified:false,
  currentYearCampusGISVerified:false,independentEnrollmentVerified:false,
  currentYearResidentialE2ECertification:'NO_GO',listings:[]};
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1365,height:900},locale:'en-US'});
  const page=await context.newPage();
  const nav=await page.goto(FINDER,{waitUntil:'domcontentloaded',timeout:60000});
  if(!nav?.ok())throw Error('official_finder_navigation_'+(nav?.status()||'none'));
  await page.waitForTimeout(3500);
  for(const item of cases){
   const row={id:item.id,listingEvidence:item.listing,address:item.address,
    siteStatus:'observed',nativeCandidateSelected:false,
    assigned:null,verification:'INCONCLUSIVE',reason:null};
   try{
    const clear=page.getByRole('button',{name:/clear location/i}).first();
    if(await clear.count())await clear.click({timeout:4500}).catch(()=>{});
    // District's GuideK12 UI hydrates asynchronously after DOMContentLoaded.
    // Wait for a visible official address entry field, not the initial HTML shell.
    await page.waitForFunction(() => [...document.querySelectorAll('input')].some(el=>{
      const type=el.getAttribute('type')||'text';
      return ['text','search'].includes(type)&&!!el.getClientRects().length;
    }),null,{timeout:24000});
    const inputs=page.locator('input[type="text"],input[type="search"],input:not([type])');
    let address=null;
    for(let n=0;n<await inputs.count();n++){
      const c=inputs.nth(n);
      if(!await c.isVisible())continue;
      const p=String(await c.getAttribute('placeholder')||'');
      if(/address|search|type to/i.test(p)||await c.locator('xpath=ancestor::*[contains(@class,"address_input")]').count()){
        address=c;break;
      }
      if(!address)address=c;
    }
    if(!address)throw Error('no_visible_address_input_after_hydration');
    await address.fill('');
    await address.pressSequentially(item.address.split(',')[0].slice(0,-3),{delay:65});
    await page.waitForTimeout(1700);
    await address.fill(item.address);
    await page.waitForTimeout(2100);
    const options=page.locator('.address_input .search_result_container .search_result');
    const number=item.address.match(/^\d+/)?.[0];
    const candidates=options.filter({hasText:new RegExp('^\\s*'+number+'\\s','i')});
    let candidate=null;
    for(let i=0;i<Math.min(await candidates.count(),20);i++){
      const c=candidates.nth(i);
      const label=safeLabel(await c.innerText());
      if(label.toUpperCase().includes(item.address.split(',')[1].trim().toUpperCase())&&
         !/\b(?:UNIT|APT|#)\s*\w+/i.test(label)){candidate=c;row.nativeLabel=label;break}
    }
    if(!candidate)throw Error('official_native_address_not_offered_or_ambiguous');
    if(!(await candidate.isVisible()))throw Error('official_native_address_not_visible');
    await candidate.click({timeout:10000});
    row.nativeCandidateSelected=true;
    await page.waitForTimeout(4300);
    const txt=await page.locator('body').innerText();
    const pos=txt.toLowerCase().indexOf('matching results');
    const listed=pos<0?'':txt.slice(pos,pos+6000);
    row.assigned=assignedSchoolLevels(listed);
    if(!row.assigned.uniqueThreeLevels)throw Error('explicit_three_grade_assigned_school_labels_not_verified');
    row.verification='FINDER_3_LEVELS_OBSERVED';
    row.reason=null;
    // Screenshot only of public lookup; do not treat as official 2026-27 GIS.
    await page.screenshot({path:path.join(OUT,item.id+'.png'),fullPage:false,timeout:25000});
   }catch(e){row.reason=String(e.message||e).slice(0,200);}
   report.listings.push(row);
   console.log('CFB_LISTED_HOUSE_FINDER '+JSON.stringify({id:row.id,nativeSelected:row.nativeCandidateSelected,
    status:row.verification,assigned:row.assigned,reason:row.reason}));
  }
 }catch(e){
  report.browserError=String(e.message||e).slice(0,300);
 }finally{await browser?.close().catch(()=>{});}
 report.finderThreeLevelObserved=report.listings.filter(x=>x.verification==='FINDER_3_LEVELS_OBSERVED').length;
 report.result=report.finderThreeLevelObserved===cases.length?'FINDER_SAMPLES_OBSERVED':'INCONCLUSIVE_SOURCE_OR_ADDRESS_SELECTION';
 writeFileSync(path.join(OUT,'read-only-result.json'),JSON.stringify(report,null,2)+'\n');
 console.log('CFB_LISTED_RESIDENCE_SUMMARY '+JSON.stringify({result:report.result,
  listedHomes:cases.length,officialThreeLevels:report.finderThreeLevelObserved,
  yearsVerified:0,campusPolygonsVerified:0,householdEnrollmentCertified:false}));
 if(report.browserError)process.exitCode=1;
})().catch(e=>{console.error('CFB_LISTED_HOUSE_BROWSER_ERROR '+String(e.message||e));process.exitCode=1});
