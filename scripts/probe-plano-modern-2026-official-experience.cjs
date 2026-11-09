#!/usr/bin/env node
'use strict';
// Official *modern* Plano ISD Find My School ArcGIS Experience Builder app.
// A separate (legacy) ASP.NET Finder returns school year 2024–25 and MUST NOT
// be confused with this address/academic year 2026–27 official tool.
// This script is public-sample, read-only browser audit, not an enrollment proof.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const OUT='artifacts/plano-current-2026',TARGET='https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4';
const ADDRESS='4661 Baldwin Ln, Plano, TX 75024';
fs.mkdirSync(OUT,{recursive:true});
const report={checkedAt:new Date().toISOString(),district:'PISD',officialApp:TARGET,source:'Plano ISD 2026-27 SchoolFinder landing and Blue Raster project link',
 propertyType:'publicly-advertised-residence',address:ADDRESS,legacyFinderYear:'2024-25',
 currentOfficialAcademicYear: 'not independently confirmed by app output',
 officialAddressSelected:false,independentCurrentGradeAssignments:false,
 schoolNames:[],siteOpened:false,errors:[],frames:[],status:'UNVERIFIED'};
const safe=(x,n=320)=>String(x||'').replace(/\s+/g,' ').trim().slice(0,n);
const simpleUrl=s=>{try{const u=new URL(s);return u.origin+u.pathname}catch{return '[invalid]'}};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1366,height:900},locale:'en-US',timezoneId:'America/Chicago'});
 page.on('pageerror',e=>{if(report.errors.length<20)report.errors.push(safe(e.message,170))});
 const response=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:80000});
 report.http=response?.status()||null;await page.waitForTimeout(9000);
 report.title=safe(await page.title(),130);
 report.siteOpened=!!(response?.ok()&&report.http===200);
 report.frames=await Promise.all(page.frames().slice(0,10).map(async f=>({
   url:simpleUrl(f.url()),
   inputs:await f.locator('input').evaluateAll(els=>els.slice(0,18).map(x=>({
    id:x.id,placeholder:x.placeholder,aria:x.getAttribute('aria-label'),type:x.type,visible:!!x.getClientRects().length
   }))).catch(()=>[]),
   buttons:await f.locator('button').evaluateAll(els=>els.slice(0,24).map(x=>({
    text:(x.textContent||'').trim().slice(0,70),label:x.getAttribute('aria-label'),title:x.title,visible:!!x.getClientRects().length
   }))).catch(()=>[])
 })));
 report.bodyHead=safe((await page.locator('body').innerText().catch(()=>'')),2300);
 // If the modern app has a user-facing address field, genuinely type sample.
 const candidates=[];
 for(const f of page.frames().slice(0,10)){
  const inputs=f.locator('input');
  for(let i=0,n=await inputs.count();i<Math.min(n,20);i++){
   const x=inputs.nth(i);if(!await x.isVisible().catch(()=>false))continue;
   const p=await x.getAttribute('placeholder')||'',a=await x.getAttribute('aria-label')||'',
    t=await x.getAttribute('type')||'text';
   if(!['text','search'].includes(t))continue;
   if(/address|find|search|place/i.test(p+' '+a))candidates.push({frame:f,input:x,desc:p||a});
  }
 }
 report.searchInputs=candidates.map(x=>({frame:simpleUrl(x.frame.url()),description:x.desc}));
 if(candidates.length){
  const chosen=candidates.find(x=>/address|search/i.test(x.desc))||candidates[0];
  await chosen.input.fill('4661 Baldwin',{timeout:10000});
  await page.waitForTimeout(2400);
  report.afterPartial=await chosen.frame.evaluate(()=>{
   const opts=[...document.querySelectorAll('[role="option"],[role="menuitem"],.esri-search__suggestion-menu li,[class*="suggestion"] li')]
    .filter(e=>e.getClientRects().length);
   return {options:opts.slice(0,15).map(e=>({text:(e.textContent||'').trim().slice(0,140),
     html:e.outerHTML.slice(0,300)})),body:(document.body?.innerText||'').slice(-1500)};
  });
  const options=chosen.frame.locator('[role="option"],[role="menuitem"],.esri-search__suggestion-menu li,[class*="suggestion"] li')
   .filter({hasText:/4661.*baldwin/i});
  for(let i=0,n=await options.count();i<Math.min(n,12);i++){
   const option=options.nth(i);if(!await option.isVisible().catch(()=>false))continue;
   const label=safe(await option.innerText(),160);
   if(!label||/no results|not found|error/i.test(label))continue;
   await option.click({timeout:12000});
   report.officialAddressSelected=true;report.selectedAddressLabel=label;break;
  }
  await page.waitForTimeout(5000);
  report.afterSearchExcerpt=await chosen.frame.locator('body').innerText().then(s=>s.slice(-5700)).catch(()=>'');
  const lines=report.afterSearchExcerpt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  report.schoolCandidatesMentioned=lines.filter(x=>/Gulledge|Robinson|Jasper|Plano West|Beaty|School|Elementary|Senior|Feeder/i.test(x)).slice(-45).map(x=>safe(x,180));
  // 2026–27 official address->4 grades needs a per-property explicit zoned-campus
  // result with year, NOT a static list of "nearby" schools. This is only source
  // reconnaissance; no automatic certification without result structure.
  report.status=report.officialAddressSelected?'ADDRESS_SELECTED_CURRENT_YEAR_RESULTS_UNREVIEWED':'MODERN_APP_ADDRESS_AUTOCOMPLETE_NOT_CONFIRMED';
 }else report.status='MODERN_APP_ADDRESS_INPUT_NOT_FOUND';
 await page.screenshot({path:path.join(OUT,'modern-plano-2026-27.png'),fullPage:true,timeout:40000});
 }catch(e){report.status='MODERN_APP_BROWSER_ERROR';report.errors.push(safe(e.message,450))}
 finally{await browser.close();
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PLANO_MODERN_2026_APP '+JSON.stringify({siteOpened:report.siteOpened,status:report.status,
   inputs:report.searchInputs,frames:report.frames,selected:report.officialAddressSelected,
   label:report.selectedAddressLabel,candidateSchools:report.schoolCandidatesMentioned,
   yearCertified:false,errors:report.errors}).slice(0,14000));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
