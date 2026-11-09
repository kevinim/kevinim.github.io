#!/usr/bin/env node
'use strict';
/* Read-only official Finder verification. One browser PAGE per address/grade:
   the vendor's Results overlay blocks Grade after Go, so NEVER reuse the page.
   Public real-estate listings only, no private user data; NO fabricated GIS. */
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const fixture=require('../data/denton-public-residential-finder-holdouts-2026.json');
const roster=require('../denton-official-zone-references.js').ROWS;
const outDir=path.resolve('artifacts/denton-independent-grade-finder');
fs.mkdirSync(outDir,{recursive:true});
const sel='[role="option"],.pac-item,[class*="suggestion" i],[class*="autocomplete" i]';
const n=s=>String(s||'').toLowerCase().replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
function streetStem(addr){
 return addr.split(',')[0].trim().replace(/\s+(street|st|avenue|ave|drive|dr|road|rd|lane|ln|court|ct|boulevard|blvd|circle|cir|trail|trl)$/i,'');
}
function isExact(candidate,addr){
 const name=n(candidate),stem=n(streetStem(addr)),city=n(addr.split(',')[1]||'');
 return name.startsWith(stem+' ')&&!!city&&name.includes(city);
}
async function suggestions(page){
 return page.evaluate(selector=>[...document.querySelectorAll(selector)].filter(e=>{
 const b=e.getBoundingClientRect();return b.width>0&&b.height>0;
 }).map(e=>(e.innerText||e.textContent||'').trim()).filter(Boolean).slice(0,12),sel);
}
async function pickAngular(page,selector,optionValue){
 const control=page.locator(selector).first();
 if(!await control.isVisible())throw Error('UI control missing '+selector);
 await control.click({timeout:7000});
 await page.locator('mat-option[role="option"]').first().waitFor({state:'visible',timeout:7000});
 const choices=(await page.locator('mat-option[role="option"]').allTextContents()).map(x=>x.trim());
 const choice=page.locator('mat-option[role="option"]').filter({hasText:new RegExp('^'+optionValue+'$','i')}).first();
 if(!await choice.count()){await page.keyboard.press('Escape');throw Error('Requested option '+optionValue+' unavailable: '+choices.join(','));}
 await choice.click({timeout:7000});
 return (await control.innerText()).trim();
}
async function one(browser,s,grade){
 const page=await browser.newPage({viewport:{width:1366,height:850},locale:'en-US'});
 const res={addressId:s.id,grade,level:grade===2?'elementary':grade===7?'middle':'high',status:'NO_GO',school:null,schoolId:null,pdfMatched:false};
 try {
  const response=await page.goto(fixture.officialLocator,{waitUntil:'domcontentloaded',timeout:30000});
  if(response?.status()!==200)throw Error('HTTP '+response?.status());
  await page.locator('input[placeholder="Enter a location"]').waitFor({state:'visible',timeout:15000});
  await page.waitForTimeout(1000);
  const query=streetStem(s.address);
  await page.locator('input[placeholder="Enter a location"]').fill(query);
  await page.waitForTimeout(2300);
  const options=await suggestions(page);
  const exact=options.filter(x=>isExact(x,s.address));
  res.suggestions=options;
  if(exact.length!==1){res.status='NO_GO_AMBIGUOUS_ADDRESS';return res;}
  const choice=page.locator(sel).filter({hasText:exact[0]}).last();
  if(await choice.count()!==1)throw Error('Exact suggestion DOM ambiguous');
  await choice.click({timeout:8000});
  res.selectedSuggestion=exact[0];
  const gradeLabel=String(grade).padStart(2,'0');
  const selected=await pickAngular(page,'mat-select[formcontrolname="gradeSelected"]',gradeLabel);
  if(Number(selected)!==grade)throw Error('Grade selection mismatch');
  const prog=page.locator('mat-select[formcontrolname="programSelected"]').first();
  let active=(await prog.innerText()).trim();
  if(active!=='DFLT')active=await pickAngular(page,'mat-select[formcontrolname="programSelected"]','DFLT');
  if(active!=='DFLT')throw Error('Cannot certify DFLT program: '+active);
  res.program='DFLT';
  await page.getByRole('button',{name:'Go',exact:true}).click({timeout:8000});
  await page.waitForTimeout(3000);
  const body=(await page.locator('body').innerText()).slice(0,4000);
  const result=body.match(/School Results\s+Results\s+1\s+([^\n]+)\n(\d{1,3})\n/);
  res.resultScreenPreview=body.slice(0,700);
  if(!result){res.status='NO_GO_NO_SINGLE_OFFICIAL_SCHOOL_RESULT';return res;}
  res.school=result[1].trim();res.schoolId='061901'+result[2].padStart(3,'0');
  res.pdfMatched=roster.some(x=>x.id===res.schoolId&&x.level===res.level);
  res.status=res.pdfMatched?'OFFICIAL_FINDER_GRADE_RESULT_OBSERVED_CURRENT_GIS_MISSING':'NO_GO_RESULT_NOT_IN_2026_PDF_ROSTER';
  await page.screenshot({path:path.join(outDir,s.id+'-grade'+grade+'.png'),animations:'disabled',timeout:12000});
  return res;
 }catch(e){res.status='NO_GO_BROWSER_ERROR';res.error=String(e).slice(0,300);return res;}
 finally{await page.close();}
}
async function main(){
 const b=await chromium.launch({headless:true});
 const r={generatedAt:new Date().toISOString(),officialLocator:fixture.officialLocator,
  sourceYear:'Current official school locator, verified against 2026–27 district PDF roster',
  production:'NO_GO',polygonLayerVerified:false,enrollmentEligibilityCertified:false,results:[]};
 try{
  for(const s of fixture.samples){
   for(const grade of [2,7,10]){
    const item=await one(b,s,grade);r.results.push(item);
    console.log('DENTON_OFFICIAL_FINDER_RESULT',JSON.stringify(item));
   }
  }
 }finally{await b.close();fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(r,null,2)+'\n');}
 const passed=r.results.filter(x=>x.status==='OFFICIAL_FINDER_GRADE_RESULT_OBSERVED_CURRENT_GIS_MISSING').length;
 console.log('DENTON_OFFICIAL_FINDER_SUMMARY',JSON.stringify({observed:passed,expected:9,remaining:9-passed,production:'NO_GO',currentPolygonsCertified:0}));
}
main().catch(e=>{console.error('DENTON_OFFICIAL_FINDER_FATAL',String(e));process.exitCode=1;});
