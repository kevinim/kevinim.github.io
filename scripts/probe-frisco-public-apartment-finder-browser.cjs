#!/usr/bin/env node
'use strict';
// One human-style public apartment building BASE address on district's public
// 2026-27 Finder UI. No hidden APIs, bulk collection, student records or auth.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const OUT='artifacts/public-residential-e2e',OFFICIAL_PAGE='https://schools.friscoisd.org/page/2026-2027-zones';
const address='9425 Rolater Rd, Frisco, TX 75035';
fs.mkdirSync(OUT,{recursive:true});
const report={checkedAt:new Date().toISOString(),officialPage:OFFICIAL_PAGE,publicApartmentBuilding:true,
 officialFinderIndependentlyVerified:false,sourceYearUrl:'2026-27',addressEntered:false,
 candidateSelected:false,explicitZonedSchools:{},frames:[],inputs:[],diagnostics:[],status:'UNVERIFIED'};
const safeUrl=s=>{try{const u=new URL(s);return u.origin+u.pathname}catch{return '[invalid]'}};
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1366,height:900}});
 page.on('pageerror',e=>report.diagnostics.push(String(e.message||e).slice(0,160)));
 const response=await page.goto(OFFICIAL_PAGE,{waitUntil:'domcontentloaded',timeout:75000});
 report.http=response?.status()||null;
 await page.waitForTimeout(5000);
 for(const frame of page.frames()){
  const inputs=await frame.locator('input').evaluateAll(els=>els.slice(0,24).map(x=>({placeholder:x.placeholder||'',aria:x.getAttribute('aria-label')||'',type:x.type||'',id:x.id||''}))).catch(()=>[]);
  report.frames.push({url:safeUrl(frame.url()),inputCount:inputs.length});
  report.inputs.push(...inputs.map(x=>({...x,frame:safeUrl(frame.url())})));
 }
 let chosen=null;
 for(const frame of page.frames()){
  const inputs=frame.locator('input');
  const count=await inputs.count().catch(()=>0);
  for(let i=0;i<count;i++){
   const input=inputs.nth(i);
   const [placeholder,aria,type]=await Promise.all([
    input.getAttribute('placeholder'),input.getAttribute('aria-label'),input.getAttribute('type')]);
   const x=((placeholder||'')+' '+(aria||'')).toLowerCase();
   if((!type||['text','search'].includes(type))&&/enter (your )?address|street address|find your zone|search by address|search address|type your address|address search/.test(x)){
    chosen={frame,input};break;
   }
  }
  if(chosen)break;
 }
 if(chosen){
  report.addressFormMarkup=await chosen.input.evaluate(x=>x.parentElement?.parentElement?.outerHTML.slice(0,3200)).catch(()=>null);
  await chosen.input.fill(address,{timeout:12000});
  report.addressEntered=true;
  await page.waitForTimeout(2500);
  const initial=chosen.frame.locator('[role="option"],.pac-item,.suggestion,.search-result,[class*="autocomplete"] li');
  const pre=initial.filter({hasText:/9425.*rolater/i}).first();
  if(await pre.count()>0&&await pre.isVisible()){
   await pre.click({timeout:12000});
   report.candidateSelected=true;
  }else{
   // Click the ZONE SEARCH field's adjacent button. A generic getByRole('Search')
   // accidentally opened the sitewide search modal, a serious false-positive risk.
   const btn=chosen.input.locator('xpath=following::button[1]');
   report.zoneButtonText=(await btn.innerText().catch(()=>'')).slice(0,100);
   if(await btn.count()&&await btn.isVisible())await btn.click({timeout:12000});
   else await chosen.input.press('Enter').catch(()=>{});
  }
  await page.waitForTimeout(3600);
  report.afterSubmitText=(await chosen.frame.locator('body').innerText()).slice(-5000);
  if(!report.candidateSelected){
   const candidates=chosen.frame.locator('[role="option"],button,li,[class*="result"],[class*="address"]');
   const match=candidates.filter({hasText:/9425.*rolater/i}).last();
   report.afterSubmitCandidateCount=await candidates.filter({hasText:/9425.*rolater/i}).count().catch(()=>0);
   if(await match.count()>0&&await match.isVisible().catch(()=>false)){
    const label=(await match.innerText()).trim();
    if(label.length<250&&/9425.*rolater/i.test(label)){
     await match.click({timeout:12000});
     report.candidateSelected=true;
     report.selectedCandidateLabel=label.slice(0,160);
    }
   }
  }
  await page.waitForTimeout(4500);
  const body=await chosen.frame.locator('body').innerText().catch(()=>null);
  const excerpt=String(body||'').slice(-9000);
  report.bodyMatchHighlights=excerpt.split('\n').filter(x=>/school|zone|rolater|9425|assigned|search/i.test(x)).slice(-45).map(x=>x.slice(0,180));
  if(report.candidateSelected){
   // Parse ONLY dynamically selected-address result data; don't parse static
   // boilerplate about Nelson enrollment or site navigation as school assignments.
   const resultArea=excerpt.slice(Math.max(0,excerpt.toLowerCase().indexOf('based on your search')));
   const patterns=[
    ['elementary',/elementary\\s*(?:school)?\\s*[:\\-]\\s*([^\\n]+)/i],
    ['middle',/middle\\s*(?:school)?\\s*[:\\-]\\s*([^\\n]+)/i],
    ['high',/high\\s*(?:school)?\\s*[:\\-]\\s*([^\\n]+)/i]];
   for(const [grade,pattern] of patterns){
    const match=resultArea.match(pattern);
    if(match&&/school|elementary|middle|high/i.test(match[1]))
     report.explicitZonedSchools[grade]=match[1].trim().slice(0,120);
   }
  }
  report.officialFinderIndependentlyVerified=report.candidateSelected&&
   Object.keys(report.explicitZonedSchools).length===3;
  report.status=report.officialFinderIndependentlyVerified?'EXPLICIT_3_LEVEL_FINDER_RESULT':'INCONCLUSIVE_FINDER_SEARCH';
 }else{
  report.status='FINDER_ADDRESS_INPUT_NOT_VISIBLE';
  report.diagnostics.push('No explicit official zone-search address input found in visible page frames; no invented assigned-school comparison.');
 }
 await page.screenshot({path:path.join(OUT,'official-frisco-2026-27-public-apartment.png'),fullPage:true,timeout:30000}).catch(()=>{});
 }catch(e){report.status='FINDER_BROWSER_ERROR';report.diagnostics.push(String(e?.message||e).slice(0,500))}
 finally{await browser.close();fs.writeFileSync(path.join(OUT,'frisco-official-finder.json'),JSON.stringify(report,null,2)+'\n');
  console.log('OFFICIAL_FRISCO_PUBLIC_APARTMENT '+JSON.stringify({status:report.status,officialFinderVerified:report.officialFinderIndependentlyVerified,addressEntered:report.addressEntered,candidateSelected:report.candidateSelected,schools:report.explicitZonedSchools,frames:report.frames,inputs:report.inputs,diagnostics:report.diagnostics}).slice(0,9000));
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
