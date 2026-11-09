#!/usr/bin/env node
'use strict';
// Independent browser navigation into the district-linked Infofinder user interface.
// Discovery is address-free. The sample mode is isolated, read-only and never saves
// private full street addresses, geocoordinates, cookies or address query strings.
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const FINDER_URL='https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1';
const ALLOWED='www.infofinderi.com';
const OUTPUT=path.join(ROOT,'artifacts/prosper-real-home/finder-ui-browser-observation.json');
const PUBLIC=JSON.parse(fs.readFileSync(path.join(ROOT,'tests/prosper-public-listed-single-family-2026.json'),'utf8'));
const SECOND_ZIP=JSON.parse(fs.readFileSync(path.join(ROOT,'tests/prosper-second-zip-public-candidates-2026.json'),'utf8'));
const GEO=JSON.parse(fs.readFileSync(path.join(ROOT,'prosper-attendance-2026.geojson'),'utf8'));
const SAMPLE_SET=[PUBLIC.cases[0],SECOND_ZIP.candidates[0]];
function normalizedSchool(x){return String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function observedSchoolNames(text,features){
 const s=normalizedSchool(text);
 return [...new Set((features||[]).map(x=>x.properties?.school).filter(Boolean))]
   .filter(name=>s.includes(normalizedSchool(name)));
}
async function lookupOfficialBrowser(page,sample){
 const street=String(sample.address).split(',')[0];
 const zip=String(sample.zip||sample.address.match(/\b\d{5}\b/)?.[0]||'');
 const before=(await page.locator('body').innerText().catch(()=>''))||'';
 const ui={sampleId:sample.id,zip,status:'FINDER_LOOKUP_INCONCLUSIVE',
  searchSubmitted:false,foundUiSchoolNames:[],baselineSchoolNames:[],
  networkResponses:[],independentReviewerApproved:false,releaseApproved:false};
 const requests=[];
 const onResponse=(resp)=>{
  try{const u=new URL(resp.url());if(u.hostname.endsWith('infofinderi.com')){
   requests.push({host:u.hostname,pathname:u.pathname.slice(0,120),httpStatus:resp.status()});}
  }catch{}
 };
 page.on('response',onResponse);
 try{
  await page.locator('#input-street').fill(street,{timeout:10000});
  await page.locator('#input-zip').fill(zip,{timeout:10000});
  await page.getByRole('button',{name:'Search',exact:true}).click({timeout:15000});
  ui.searchSubmitted=true;
  await page.waitForTimeout(6500);
  const after=await page.locator('body').innerText().catch(()=>''),features=GEO.features;
  ui.baselineSchoolNames=observedSchoolNames(before,features);
  ui.foundUiSchoolNames=observedSchoolNames(after,features);
  ui.newSchoolNames=ui.foundUiSchoolNames.filter(x=>!ui.baselineSchoolNames.includes(x));
  ui.hasVisibleGradeResult=ui.newSchoolNames.length>=3;
  ui.networkResponses=requests.filter(x=>/Search|school|location|route/i.test(x.pathname));
  ui.status=ui.hasVisibleGradeResult?'UI_VISIBLE_SCHOOL_RESULT':'FINDER_LOOKUP_INCONCLUSIVE';
 }catch(e){ui.errorType=String(e.name||'Error').slice(0,40);}
 finally{page.off('response',onResponse);}
 return ui;
}

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
  officialUrl:FINDER_URL,year:'2026-27',schoolAssignmentIndependentlyCertified:false,
  signedReviewerCount:0,productionAuthorized:false,mode:sampleMode?'public-house-ui-probe':'no-address-discovery',
  cases:[],frames:[],status:'INCONCLUSIVE'};
 // Independent source transport diagnostic; never mistake status=200 for enrollment evidence.
 report.httpDiagnostic={status:null,errorType:null,headOnly:false};
 try{
  const response=await fetch(FINDER_URL,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000)});
  report.httpDiagnostic.status=response.status;
 }catch(e){report.httpDiagnostic.errorType=String(e.name||'Error').slice(0,50);}
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900},locale:'en-US'});
  const blockers=[];
  page.on('pageerror',e=>blockers.push(String(e.name||'PageError').slice(0,40)));
  try{
   await page.goto(FINDER_URL,{waitUntil:'commit',timeout:25000});
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
    const hasFields=report.frames.some(x=>x.controls.some(c=>c.id==='input-street')&&
     x.controls.some(c=>c.id==='input-zip'));
    if(hasFields){
     for(const sample of SAMPLE_SET){
      const pageCase=await lookupOfficialBrowser(page,sample);
      report.cases.push(pageCase);
     }
     report.status='PUBLIC_SAMPLE_BROWSER_RESULTS_CAPTURED_NOT_CERTIFIED';
    }else report.status='OFFICIAL_FINDER_CONTROLS_MISSING';
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
  samples:report.cases,policyResult:gate,pageErrorKinds:report.pageErrorKinds
 }));
 return report;
}
if(require.main===module)run().catch(e=>{console.error('PROSPER_FINDER_DISCOVERY_ERROR '+String(e.message||e));process.exitCode=1});
module.exports={run,safeControls,discover,normalizedSchool,observedSchoolNames,lookupOfficialBrowser};
