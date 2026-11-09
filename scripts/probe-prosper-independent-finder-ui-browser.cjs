#!/usr/bin/env node
'use strict';
// Independent browser navigation into the district-linked Infofinder user interface.
// Discovery is address-free. The sample mode is isolated, read-only and never saves
// private full street addresses, geocoordinates, cookies or address query strings.
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const URL='https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1';
const ALLOWED='www.infofinderi.com';
const OUTPUT=path.join(ROOT,'artifacts/prosper-real-home/finder-ui-browser-observation.json');
const PUBLIC=JSON.parse(fs.readFileSync(path.join(ROOT,'tests/prosper-public-listed-single-family-2026.json'),'utf8'));
const {evaluate:check}=require('./prosper-finder-ui-independent-policy.cjs');
function safeControls(controls){
 return controls.map(c=>({tag:String(c.tag||'').slice(0,15),type:String(c.type||'').slice(0,35),
  placeholder:String(c.placeholder||'').slice(0,80),id:String(c.id||'').slice(0,70),
  aria:String(c.aria||'').slice(0,70)}));
}
async function discover(frame){
 try{
  return await frame.evaluate(()=>{
   const visible=x=>{const s=getComputedStyle(x),r=x.getBoundingClientRect();
    return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0;};
   const controls=[...document.querySelectorAll('input,textarea')].filter(visible).map(e=>({
    tag:e.tagName.toLowerCase(),type:e.getAttribute('type')||'text',
    placeholder:e.getAttribute('placeholder')||'',id:e.id||'',aria:e.getAttribute('aria-label')||''
   }));
   const buttons=[...document.querySelectorAll('button,[role=button]')].filter(visible).slice(0,35).map(e=>({
    text:(e.textContent||'').trim().slice(0,48),
    aria:e.getAttribute('aria-label')||'',title:e.getAttribute('title')||''
   }));
   return {controls,buttons};
  });
 }catch{return {controls:[],buttons:[]};}
}
async function run({sampleMode=process.argv.includes('--samples')}={}){
 const report={schemaVersion:1,source:'OFFICIAL_PROSPER_LINKED_INFOFINDER_BROWSER',
  officialUrl:URL,year:'2026-27',schoolAssignmentIndependentlyCertified:false,
  signedReviewerCount:0,productionAuthorized:false,mode:sampleMode?'public-house-ui-probe':'no-address-discovery',
  cases:[],frames:[],status:'INCONCLUSIVE'};
 // Independent source transport diagnostic; never mistake status=200 for enrollment evidence.
 report.httpDiagnostic={status:null,errorType:null,headOnly:false};
 try{
  const response=await fetch(URL,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000)});
  report.httpDiagnostic.status=response.status;
 }catch(e){report.httpDiagnostic.errorType=String(e.name||'Error').slice(0,50);}
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900},locale:'en-US'});
  const blockers=[];
  page.on('pageerror',e=>blockers.push(String(e.name||'PageError').slice(0,40)));
  try{
   await page.goto(URL,{waitUntil:'commit',timeout:25000});
   await page.waitForLoadState('domcontentloaded',{timeout:12000}).catch(()=>{});
   await page.waitForTimeout(6500);
   const frames=page.frames();
   for(const frame of frames){
    const u=new URL(frame.url());
    const d=await discover(frame);
    report.frames.push({host:u.hostname,pathname:u.pathname,
     controls:safeControls(d.controls),buttons:d.buttons});
   }
   report.status='UI_OPENED_ADDRESS_LOOKUP_NOT_CERTIFIED';
   if(sampleMode){
    // This phase is enabled only after reviewing actual control discovery output.
    report.status='DISCOVERY_ONLY_NO_ADDRESS_SUBMISSION';
   }
  }catch(e){
   report.status='OFFICIAL_BROWSER_UNREACHABLE';
   report.errorType=String(e.name||'Error').slice(0,60);
   report.browserDiagnostic=String(e.message||'').replace(/https?:\/\/[^\s]+/g,'[official-url]').slice(0,170);
  }
  report.pageErrorKinds=[...new Set(blockers)];
  await page.close();
 }finally{await browser.close();}
 const gate=check(report);
 report.policyResult=gate;
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
 console.log('PROSPER_OFFICIAL_FINDER_UI_BROWSER '+JSON.stringify({
  status:report.status,errorType:report.errorType,browserDiagnostic:report.browserDiagnostic,
  httpDiagnostic:report.httpDiagnostic,frames:report.frames,caseCount:report.cases.length,
  policyResult:gate,pageErrorKinds:report.pageErrorKinds
 }));
 return report;
}
if(require.main===module)run().catch(e=>{console.error('PROSPER_FINDER_DISCOVERY_ERROR '+String(e.message||e));process.exitCode=1});
module.exports={run,safeControls,discover};
