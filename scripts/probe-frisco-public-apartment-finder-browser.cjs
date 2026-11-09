#!/usr/bin/env node
'use strict';
// One public apartment complex building address and one public for-lease house.
// Official Frisco ISD 2026-27 UI only. No hidden API or batch scraping.
// Never claim confirmed zoned attendance from autocomplete or a generic FAQ.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const OUT='artifacts/public-residential-e2e';
const OFFICIAL_PAGE='https://schools.friscoisd.org/page/2026-2027-zones';
const SAMPLES=[
 {id:'st-martin-frisco-base',address:'9425 Rolater Rd, Frisco, TX 75035',queries:['9425 Rolater','9425 Rola','9425']},
 {id:'lockshire-frisco-public-lease',address:'11379 Lockshire Dr, Frisco, TX 75035',queries:['11379 Lockshire','11379 Lock','11379']}
];
fs.mkdirSync(OUT,{recursive:true});
const report={checkedAt:new Date().toISOString(),officialPage:OFFICIAL_PAGE,status:'NO_OFFICIAL_ASSIGNMENT_CERTIFICATION',
 cases:[],pageErrors:[],officialDataSource:'user-facing Frisco ISD public 2026-27 School Zone Search'};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const safe=(v,max=300)=>clean(v).slice(0,max);
function isValidAddressCandidate(label,num,road){
 const l=clean(label).toLowerCase();
 return l.includes(num)&&l.includes(road)&&
 !/no results found|sorry|not found|not available|error|not zoned|could not find|search all/i.test(l)&&l.length<200;
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1366,height:900},locale:'en-US',timezoneId:'America/Chicago'});
 page.on('pageerror',e=>report.pageErrors.push(safe(e.message,180)));
 const nav=await page.goto(OFFICIAL_PAGE,{waitUntil:'domcontentloaded',timeout:75000});
 report.http=nav?.status()||null;
 const field=page.locator('#dom-address-input'),button=page.locator('#check-address');
 await field.waitFor({timeout:35000});await button.waitFor({timeout:15000});
 report.inputMarkup=await field.evaluate(e=>e.parentElement?.parentElement?.outerHTML.slice(0,2500));
 for(const sample of SAMPLES){
  const item={id:sample.id,address:sample.address,queries:[],addressCandidateSelected:false,
   verifiedGrades:{},gradeMatches:0,officialFinderVerified:false,status:'INCONCLUSIVE'};
  const num=sample.address.match(/^\d+/)?.[0],road=sample.address.split(/\s+/)[1].toLowerCase();
  try{
   for(const q of sample.queries){
    await field.fill('');await page.waitForTimeout(300);
    await field.pressSequentially(q,{delay:30});
    await page.waitForTimeout(1600);
    const visible=await page.locator('#dom-autocomplete li').evaluateAll(els=>els.slice(0,12).map(e=>({text:(e.textContent||'').trim().slice(0,160),
       visible:e.getClientRects().length>0,className:e.className,html:e.outerHTML.slice(0,450)})));
    const dom=await page.evaluate(()=>{
     const el=document.querySelector('#dom-autocomplete');
     return {listDisplay:el?getComputedStyle(el).display:null,className:el?.className||null,
       html:el?.outerHTML.slice(0,2000)||null,
       text:(document.querySelector('.attendance-zones-input-area')?.innerText||'').slice(0,850)};
    });
    const attempt={query:q,visibleSuggestions:visible,dom};
    item.queries.push(attempt);
    let loc=page.locator('#dom-autocomplete li').filter({hasText:new RegExp(num+'.*'+road,'i')}).first();
    if(await loc.count()&&await loc.isVisible().catch(()=>false)){
      const label=clean(await loc.innerText());
      if(isValidAddressCandidate(label,num,road)){
       await loc.click({timeout:10000});
       item.addressCandidateSelected=true;item.selectedAddressLabel=label;item.selectionStage='native-autocomplete';
       break;
      }
    }
    // The district's explicit zone-search button may produce a native results
    // list only after submitted partial input. Click this exact control only.
    await button.click({timeout:12000});await page.waitForTimeout(2100);
    const results=await page.evaluate(()=>{
     const body=document.body?.innerText||'';
     const list=[...document.querySelectorAll('#dom-autocomplete li,[class*="attendance-zones"] li,[class*="dom-address"] li,[class*="result"] li')];
     return {possibleAddressLabels:list.slice(0,25).map(e=>({text:(e.innerText||'').trim().slice(0,160),visible:e.getClientRects().length>0,
       html:e.outerHTML.slice(0,320)})),excerpt:body.slice(body.indexOf('School Zone Search'),body.indexOf('Notes on Middle School Zones:')).slice(0,3500)};
    });
    attempt.afterSubmit=results;
    // Select only a unique rendered native candidate, never an error message or
    // a static text block with address substring.
    const matches=results.possibleAddressLabels.filter(x=>x.visible&&isValidAddressCandidate(x.text,num,road));
    if(matches.length===1){
      const candidate=page.locator('#dom-autocomplete li,[class*="attendance-zones"] li,[class*="dom-address"] li,[class*="result"] li')
       .filter({hasText:new RegExp(num+'.*'+road,'i')}).first();
      if(await candidate.count()&&await candidate.isVisible().catch(()=>false)){
       await candidate.click({timeout:10000});
       item.addressCandidateSelected=true;item.selectedAddressLabel=matches[0].text;item.selectionStage='submitted-result-list';
       break;
      }
    }
   }
   await page.waitForTimeout(2000);
   const snapshot=await page.evaluate(()=>{
    const body=document.body?.innerText||'',idx=body.indexOf('School Zone Search'),end=body.indexOf('Notes on Middle School Zones:');
    const section=idx>=0?body.slice(idx,end>idx?end:idx+6500):body.slice(0,6500);
    const domResults=[...document.querySelectorAll('#dom-autocomplete,[class*="address-result"],[class*="attendance-zones-result"],[id*="school-result"],[id*="zone-result"]')].slice(0,25);
    return {section:section.slice(0,5500),resultHtml:domResults.map(x=>({id:x.id,cls:String(x.className).slice(0,100),text:(x.innerText||'').slice(0,400),html:x.outerHTML.slice(0,1000)}))};
   });
   item.snapshot=snapshot;
   // Do not parse generic school mentions or static Nelson policy notices.
   // The native selection and explicit grade-tagged results must both be present.
   if(item.addressCandidateSelected&&!/no results found|we could not find/i.test(snapshot.section)){
     const perLevel={
      elementary:/\bElementary\s+School\s*:\s*([^\r\n]+)/i,
      middle:/\bMiddle\s+School\s*:\s*([^\r\n]+)/i,
      high:/\bHigh\s+School\s*:\s*([^\r\n]+)/i
     };
     for(const [grade,re] of Object.entries(perLevel)){
      const m=snapshot.section.match(re);
      if(m&&/^[A-Z][A-Za-z .'-]{3,100}$/.test(m[1].trim()))item.verifiedGrades[grade]=m[1].trim();
     }
   }
   item.gradeMatches=Object.keys(item.verifiedGrades).length;
   item.officialFinderVerified=item.addressCandidateSelected&&item.gradeMatches===3;
   item.status=item.officialFinderVerified?'THREE_EXPLICIT_FINDER_GRADE_RESULTS':
    item.addressCandidateSelected?'ADDRESS_SELECTED_SCHOOL_RESULTS_NOT_PARSED':'NO_DISTRICT_ADDRESS_CANDIDATE';
   await page.screenshot({path:path.join(OUT,'official-frisco-'+sample.id+'.png'),fullPage:true,timeout:30000}).catch(()=>{});
  }catch(e){item.status='OFFICIAL_FINDER_UI_ERROR';item.error=safe(e.message,450)}
  report.cases.push(item);
 }
 }catch(e){report.fatal=safe(e.message,600)}
 finally{await browser.close();fs.writeFileSync(path.join(OUT,'frisco-official-finder.json'),JSON.stringify(report,null,2)+'\n');
  console.log('FRISCO_OFFICIAL_FINDER_HUMAN_UI '+JSON.stringify({http:report.http,cases:report.cases.map(x=>({
   id:x.id,status:x.status,selected:x.addressCandidateSelected,address:x.selectedAddressLabel,grades:x.verifiedGrades,
   summary:x.snapshot?.section.slice(0,220),attempts:x.queries.map(q=>({query:q.query,suggestions:q.visibleSuggestions?.map(s=>s.text),
    after:q.afterSubmit?.excerpt?.slice(0,350)})),error:x.error
  })),errors:report.pageErrors,fatal:report.fatal}).slice(0,12500));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
