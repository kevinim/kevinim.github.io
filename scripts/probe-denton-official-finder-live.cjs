#!/usr/bin/env node
'use strict';
// Single, deliberately bounded READ-ONLY reconnaissance of the district's PUBLIC
// School Locator. Only published builder model-home addresses; no private homes,
// bulk requests, reverse engineering, endpoint extraction or fabricated schools.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const fixtures=require('../data/denton-public-modelhome-finder-holdouts-2026.json');
const target='https://webquery-2-denton-tx.etstack.io/';
const dir=path.resolve('artifacts/denton-official-finder-probe');
fs.mkdirSync(dir,{recursive:true});
async function main(){
 const report={checkedAt:new Date().toISOString(),district:'061901',schoolYear:'2026-27',
  url:target,classification:'EXPLORATORY_NOT_INDEPENDENT_ENROLLMENT_EVIDENCE',
  productionGo:false,verifiedCurrentZonePolygonCount:0,results:[],error:null};
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:820},locale:'en-US'});
  const problems=[];page.on('pageerror',e=>problems.push(String(e).slice(0,300)));
  const result=await page.goto(target,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForTimeout(5000);
  const detail=await page.evaluate(()=>{
   const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>0&&b.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
   return {title:document.title,bodyText:(document.body?.innerText||'').slice(0,1500),
    inputs:[...document.querySelectorAll('input')].filter(visible).map(x=>({type:x.type,placeholder:x.placeholder,ariaLabel:x.getAttribute('aria-label')})).slice(0,20),
    buttons:[...document.querySelectorAll('button')].filter(visible).map(x=>({label:(x.innerText||x.title||x.getAttribute('aria-label')||'').trim().slice(0,80)})).slice(0,25)};
  });
  report.httpStatus=result?.status()??null;
  report.locatorUi=detail;
  report.browserErrors=problems;
  await page.screenshot({path:path.join(dir,'initial-finder-ui.png'),fullPage:true,animations:'disabled',timeout:15000});
  // Never claim a result unless a person has independently compared the
  // *specific* Finder-reported school and an authorized current-year polygon.
  const input=page.locator('input[placeholder*="address" i],input[aria-label*="address" i],input[placeholder*="street" i],input[aria-label*="street" i]').first();
  if(await input.count()===0||!await input.isVisible()){
   report.finderUiState='NO_UNAMBIGUOUS_PUBLIC_ADDRESS_FIELD';
  }else{
   report.finderUiState='ADDRESS_FIELD_VISIBLE_UNCERTIFIED';
   for(const s of fixtures.samples){
    const entry={id:s.id,address:s.address,source:s.addressSource,officialSchools:[],status:'NO_GO_UNREVIEWED'};
    try{
     await input.fill(s.address,{timeout:8000});
     await page.waitForTimeout(1800);
     entry.suggestedText=(await page.locator('body').innerText()).slice(0,1300);
     await page.screenshot({path:path.join(dir,s.id+'-typed-address.png'),animations:'disabled',timeout:12000});
     // No speculative click/submit when the vendor UI controls cannot be
     // independently identified. This is a UI reconnaissance only.
     entry.status='PUBLIC_ADDRESS_TYPED_NO_OFFICIAL_ASSIGNMENT_CERTIFIED';
    }catch(e){entry.status='PUBLIC_ADDRESS_UI_FAILED';entry.error=String(e).slice(0,180);}
    report.results.push(entry);
   }
  }
  await page.close();
 }catch(e){report.error=String(e).slice(0,500);report.finderUiState='UPSTREAM_ACCESS_FAILED';}
 finally{
  if(browser)await browser.close();
  fs.writeFileSync(path.join(dir,'official-finder-probe.json'),JSON.stringify(report,null,2)+'\n');
  console.log('DENTON_FINDER_READ_ONLY_PROBE',JSON.stringify({state:report.finderUiState,httpStatus:report.httpStatus,samples:report.results.map(x=>({id:x.id,status:x.status})),error:report.error}));
  console.log('MANDATORY_NO_GO: typed public model-home addresses and browser screenshot do not certify actual district schools or current polygons');
 }
}
main().catch(e=>{console.error('FINDER_PROBE_INTERNAL_ERROR',String(e));process.exitCode=1;});
