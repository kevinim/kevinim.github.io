#!/usr/bin/env node
'use strict';
// Public-institution address UI regression only, never residential certification.
// No private addresses/coordinates, network response bodies or screenshots logged.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=(process.env.DASHBOARD_BASE_URL||'https://kevinim.github.io/').replace(/\/?$/,'/');
const sample=JSON.parse(fs.readFileSync('tests/public-address-finder-crosscheck-2026.json','utf8'))
 .records.filter(x=>x.district==='PROSPER'&&x.residentialEnrolmentVerified===false);
const report={kind:'prosper-public-facility-typed-address-e2e',source:'production Pages / 2026-27 GIS',
 at:new Date().toISOString(),residentialAddressCertified:false,checks:[],official:[]};
function fail(message){throw Error(message)}
function codeMap(rows) {
 const out={};
 for(const r of rows||[]) {
  if(!['elementary','middle','high'].includes(r.level)||!r.code)continue;
  if(out[r.level])fail('duplicate grade');
  out[r.level]=r.code;
 }
 return out;
}
function same(a,b){return ['elementary','middle','high'].every(k=>a[k]===b[k])&&Object.keys(a).length===3}
async function officialAddress(record,index){
 // District-operated endpoint, QA on *public offices/campus only*.
 const u=new URL('https://www.infofinderi.com/ifi/ws/SearchRequest.asmx/SearchAddress');
 const street=record.address.split(',')[0];
 for(const [k,v] of Object.entries({clientId:'PI5FFG7RYZ1',streetAddress:street,
 zipCode:record.zip,schoolId:'-1',gradeId:'-1'}))u.searchParams.set(k,v);
 try {
  const res=await fetch(u,{signal:AbortSignal.timeout(18000)});
  if(!res.ok)fail('http');
  let data=await res.json();
  if(typeof data==='string')data=JSON.parse(data);
  if(data?.resultCode!==200)fail('provider_result_code');
  if(data.exactAddressMatch!==true)fail('not_exact');
  const rows=(data.addresses||[]).filter(a=>a.addressExact===true);
  if(rows.length!==1)fail('ambiguous');
  const found=(data.schools||[]).map(x=>String(x.schoolCode||'').padStart(3,'0'));
  const expected=Object.values(record.officialCodes);
  if(expected.some(x=>!found.includes(x))||found.length!==3)fail('official_school_code_mismatch');
  report.official.push({case:index,source:'SearchAddress',status:'matched',schoolCount:found.length});
 }catch(err){
  const e=String(err.message||err);
  // Never transform provider failures or mismatches into a fake PASS.
  const mismatch=/school_code_mismatch|not_exact|ambiguous|provider_result_code/.test(e);
  report.official.push({case:index,source:'SearchAddress',status:mismatch?'mismatch':'unavailable'});
  if(mismatch)throw Error('official case '+index+' mismatch');
 }
}
async function run(){
 assert.equal(sample.length,2,'Two nonresidential Prosper reference addresses required');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1366,390]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
   try {
    await page.goto(base+'?prosper-typed-qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:80000});
    await page.waitForFunction(()=>typeof state!=='undefined'&&state.zoneData?.PROSPER?.length===31
      &&typeof map!=='undefined'&&!!map&&typeof schoolAssignmentFor==='function',null,{timeout:110000});
    for(let index=0;index<sample.length;index++){
     const item=sample[index];
     await page.locator('#homeAddress').fill(item.address);
     await page.locator('#homeSearch').click();
     await page.waitForFunction(()=>typeof home!=='undefined'&&!!home&&
       document.querySelector('#homeStatus')?.textContent?.includes('자동 선택:'),null,{timeout:55000});
     const stateReport=await page.evaluate(()=>{
      const q=schoolAssignmentFor(home);
      const view=addressSchoolView();
      const cards=[...document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school')];
      const levels=(q.features||[]).map(f=>({level:f.properties.gradeLevel,code:f.properties.schoolCode}));
      return {sourceStatus:q.status,district:q.district,quality:home.geocodeQuality?.usableForSchoolCandidate===true,
       referenceKind:view?.kind,referenceCandidates:view?.candidates?.length||0,
       assignedCount:view?.schools?.length||0,levels,
       cards:cards.length,homeLayer:prosperReferenceZoneGroup?.getLayers().length||0,
       certified:window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals,
       status:document.querySelector('#homeAssignmentPriorityStatus')?.textContent||''};
     });
     assert.equal(stateReport.quality,true,'precise geocode was not usable');
     assert.equal(stateReport.district,'PROSPER','wrong district');
     assert.equal(stateReport.sourceStatus,'current','current GIS source not available');
     assert.equal(stateReport.referenceKind,'gis-reference','reference cards absent');
     assert.equal(stateReport.referenceCandidates,3,'not all three school grades referenced');
     assert.equal(stateReport.cards,3,'three visible cards required');
     assert.equal(stateReport.assignedCount,0,'GIS reference promoted to residential assignment');
     assert.equal(stateReport.certified,0,'automatic residence certification must stay disabled');
     assert.equal(stateReport.homeLayer,3,'three Prosper school boundary overlays required');
     assert.ok(/미인증/.test(stateReport.status),'reference status was not clearly disclosed');
     assert.ok(same(codeMap(stateReport.levels),item.officialCodes),'GIS codes differ from approved public source fixture');
     report.checks.push({width,case:index,status:'passed',gradeCount:3,visibleCards:3,
       gisOverlays:stateReport.homeLayer,certified:0});
     // Actual clear-button path must remove stale results and polygons.
     await page.locator('#homeClear').click();
     const cleared=await page.evaluate(()=>({
      homeEmpty:home===null,inputEmpty:document.querySelector('#homeAddress').value==='',
      cards:document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school').length,
      overlay:prosperReferenceZoneGroup?.getLayers().length||0
     }));
     assert.equal(cleared.homeEmpty,true,'clear did not reset address');
     assert.equal(cleared.inputEmpty,true,'clear did not reset input');
     assert.equal(cleared.cards,0,'clear left stale school cards');
     assert.equal(cleared.overlay,0,'clear left stale Prosper polygons');
     report.checks.push({width,case:index,status:'cleared',staleCards:0,stalePolygons:0});
    }
   }finally{await page.close()}
  }
  // Separate provider review: server-side public facility source check only.
  // It does not bypass browser CORS or authorize automatic residential results.
  for(let i=0;i<sample.length;i++)await officialAddress(sample[i],i);
 }finally{await browser.close()}
}
run().then(()=>{
 const n=report.checks.length;
 const unavailable=report.official.filter(x=>x.status==='unavailable').length;
 report.status=unavailable?'PASS_UI_OFFICIAL_UNAVAILABLE':'PASS_PUBLIC_FACILITY_ONLY';
 fs.mkdirSync('artifacts/prosper-address-e2e',{recursive:true});
 fs.writeFileSync('artifacts/prosper-address-e2e/summary.json',JSON.stringify(report,null,2)+'\n');
 console.log('PROSPER_TYPED_PUBLIC_E2E '+JSON.stringify({status:report.status,
   uiChecks:n,official:report.official,residentialCertified:false}));
}).catch(err=>{
 report.status='FAIL';
 report.failureClass=String(err.message||err).replace(/[0-9]{3,7}\s+\w+\s+[A-Za-z]+/g,'[redacted]').slice(0,180);
 fs.mkdirSync('artifacts/prosper-address-e2e',{recursive:true});
 fs.writeFileSync('artifacts/prosper-address-e2e/summary.json',JSON.stringify(report,null,2)+'\n');
 console.error('PROSPER_TYPED_PUBLIC_E2E_FAIL '+report.failureClass);
 process.exitCode=1;
});