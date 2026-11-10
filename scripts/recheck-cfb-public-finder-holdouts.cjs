#!/usr/bin/env node
'use strict';
// Read-only 2 PUBLIC address Finder fixture recheck, NOT a GIS validation.
// Do not interpret the "Matching Results" all-school catalog as assigned zones.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fixture=require('../tests/cfb-official-resident-finder-verified-2026-11-07.json');
const outfile=path.join(process.cwd(),'artifacts/cfb-reconstruction/current-finder-public-address-recheck.json');
const domain='https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/';
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function assigned(text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const seen=[];
 for(let i=1;i<lines.length;i++)if(lines[i]==='Assigned school'&&!seen.includes(lines[i-1]))seen.push(lines[i-1]);
 const filter=re=>seen.filter(s=>re.test(s)&&!/Bilingual/i.test(s));
 return {
  elementary:filter(/Elementary \(K-5\)/i),
  middle:filter(/Middle School \(6-8\)/i),
  high:filter(/High School \(9-12\)/i)
 };
}
async function main(){
 assert.equal(fixture.district,'CFB');assert.equal(fixture.samples.length,2);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const test of fixture.samples){
   const page=await browser.newPage({viewport:{width:1366,height:900},locale:'en-US'});
   const report={address:test.address,publicAssetType:test.type,nativeCandidateSelected:false,
    exactCandidateMatch:false,status:'NOT_VERIFIED',geometryCrosschecked:false};
   try{
    await page.goto(domain,{waitUntil:'domcontentloaded',timeout:65000});
    const input=page.locator('.address_input input[type="text"]').first();
    await input.waitFor({state:'visible',timeout:20000});
    await input.fill(test.address);
    const options=page.locator('.address_input .search_result_container .search_result');
    await options.first().waitFor({state:'visible',timeout:12000});
    const choices=await options.allInnerTexts();
    const expected=normalize(test.candidateSelected);
    const matchIndex=choices.findIndex(x=>normalize(x)===expected);
    report.candidates=choices.length;
    report.exactCandidateMatch=matchIndex>=0;
    if(matchIndex<0){report.status='NO_EXACT_NATIVE_ADDRESS_MATCH';results.push(report);continue}
    await options.nth(matchIndex).click({timeout:12000});
    report.nativeCandidateSelected=true;
    await page.waitForFunction(()=>document.body?.innerText?.includes('Assigned school'),null,{timeout:18000});
    const actual=assigned(await page.locator('body').innerText());
    report.found=actual;
    const expectedNames=test.assigned;
    report.schoolComparisons=Object.fromEntries(['elementary','middle','high'].map(level=>{
     const rows=actual[level],want=normalize(expectedNames[level]);
     return [level,{expected:expectedNames[level],observed:rows,
      pass:rows.length===1&&normalize(rows[0])===want}];
    }));
    report.status=Object.values(report.schoolComparisons).every(x=>x.pass)?'OFFICIAL_FINDER_TWO_HOLDOUTS_RECHECK_MATCH':'OFFICIAL_FINDER_DISAGREES';
   }catch(error){
    report.status='FINDER_UI_NOT_VERIFIED';
    report.failureKind=String(error?.name||'Error').slice(0,80);
   }finally{
    results.push(...([])); // report is appended below only on paths without early continue
    await page.close();
   }
   if(!results.includes(report))results.push(report);
  }
 }finally{await browser.close()}
 const overall=results.length===2&&results.every(r=>r.status==='OFFICIAL_FINDER_TWO_HOLDOUTS_RECHECK_MATCH')
  ?'TWO_EXISTING_PUBLIC_FINDER_FIXTURES_RECONFIRMED':'OFFICIAL_FINDER_RECHECK_PARTIAL_OR_UNVERIFIED';
 const report={district:'CFB',officialFinder:domain,probe: 'publicly listed only',
  recordSource:'tests/cfb-official-resident-finder-verified-2026-11-07.json',
  geometryCrosscheckCount:0,verifiedResidentialZoningByReconstructedGeometry:0,
  verdict:overall,samples:results};
 fs.mkdirSync(path.dirname(outfile),{recursive:true});fs.writeFileSync(outfile,JSON.stringify(report,null,2)+'\n');
 console.log('CFB_OFFICIAL_PUBLIC_FINDER_RECHECK '+JSON.stringify({verdict:overall,found:results.length,matched:results.filter(r=>r.status==='OFFICIAL_FINDER_TWO_HOLDOUTS_RECHECK_MATCH').length,geospatialMatches:0}));
 if(overall!=='TWO_EXISTING_PUBLIC_FINDER_FIXTURES_RECONFIRMED')process.exitCode=2; // advisory, no production promotion
}
main().catch(e=>{console.error('CFB_OFFICIAL_FINDER_RECHECK_ERROR',e.name||'Error');process.exitCode=1});
