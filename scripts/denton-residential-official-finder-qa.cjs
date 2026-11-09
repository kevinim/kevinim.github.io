#!/usr/bin/env node
'use strict';
/* Publicly advertised housing, read-only. Never infer assignment from a Google
 * suggestion, a campus location, a marketing page or a historical polygon. */
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const fixture=require('../data/denton-public-residential-finder-holdouts-2026.json');
const base=fixture.officialLocator,dir=path.resolve('artifacts/denton-residential-finder');
fs.mkdirSync(dir,{recursive:true});
const wait=ms=>new Promise(ok=>setTimeout(ok,ms));
const norm=s=>String(s||'').toLowerCase().replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
function titleOnly(a){return a.split(',')[0].trim().replace(/\s+(street|st|avenue|ave|drive|dr|road|rd|lane|ln|court|ct|boulevard|blvd|circle|cir|trail|trl)$/i,'');}
function suggestionMatches(text,address){
 const label=norm(text), first=norm(titleOnly(address)), city=norm(address.split(',')[1]||'');
 const num=first.split(' ')[0], street=first.split(' ').slice(1).join(' ');
 return !!num&&!!street&&!!city&&label.includes(num+' ')&&label.includes(street)&&label.includes(city);
}
async function visibleCandidates(page){
 return page.evaluate(()=>{
   const selector='[role="option"],.pac-item,[class*="suggestion" i],[class*="autocomplete" i]';
   const inView=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'};
   return [...document.querySelectorAll(selector)].filter(inView).map(el=>({
     text:(el.innerText||el.textContent||'').trim().slice(0,170),html:el.outerHTML.slice(0,600)
   })).filter(x=>x.text.length>0).slice(0,12);
 });
}
async function formDetail(page){
 return page.evaluate(()=>{
  const inView=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'};
  const elems=[...document.querySelectorAll('input,select,[role="combobox"],[role="listbox"],[role="option"],button')].filter(inView).slice(0,35);
  return {body:(document.body?.innerText||'').slice(0,2700),elements:elems.map(el=>({
    tag:el.tagName,role:el.getAttribute('role'),name:el.getAttribute('name'),
    placeholder:el.getAttribute('placeholder'),aria:el.getAttribute('aria-label'),
    text:(el.innerText||'').slice(0,110),html:el.outerHTML.slice(0,420)
  }))};
 });
}
async function main(){
 const browser=await chromium.launch({headless:true});
 const report={source:'Denton ISD official Web Query',schoolYear:'2026-27',checkedAt:new Date().toISOString(),
  status:'NO_GO',verifiedAddressGradeAssignments:0,verifiedPolygons:0,productionApproved:false,results:[]};
 try{
  for(const s of fixture.samples){
   const item={id:s.id,listedAddress:s.address,gradeOutcomes:[],match:'UNVERIFIED',status:'NO_GO'};
   const page=await browser.newPage({viewport:{width:1366,height:820},locale:'en-US'});
   try{
    const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    item.httpStatus=response?.status();
    await page.waitForTimeout(4200);
    const input=page.locator('input[placeholder="Enter a location"]').first();
    if(!await input.isVisible())throw Error('Official location search field missing');
    const terms=[titleOnly(s.address),s.address.split(',')[0]];
    for(const term of terms){
     await input.fill(term,{timeout:9000});
     await page.waitForTimeout(2300);
     const candidates=await visibleCandidates(page);
     const matches=candidates.filter(c=>suggestionMatches(c.text,s.address));
     item.searches=(item.searches||[]).concat([{term,candidates:candidates.map(c=>c.text),exactCandidates:matches.map(c=>c.text)}]);
     console.log('DENTON_LISTING_LOOKUP',JSON.stringify({id:s.id,term,options:candidates.map(x=>x.text),exact:matches.map(x=>x.text)}));
     if(matches.length===1){
      const match=matches[0],options=page.locator('[role="option"],.pac-item,[class*="suggestion" i],[class*="autocomplete" i]');
      const candidate=options.filter({hasText:match.text}).last();
      if(await candidate.count()===1){
       await candidate.click({timeout:8000});
       item.match='EXACT_STREET_CITY_OPTION_SELECTED';
       item.selectedSuggestion=match.text;
       const form=await formDetail(page);
       item.gradeForm=form;
       console.log('DENTON_GRADE_FORM',JSON.stringify({id:s.id,selected:match.text,elements:form.elements,body:form.body.slice(0,800)}));
       // Do not submit generic All Grades or infer hidden grade/year selectors.
       const selects=page.locator('select');
       if(await selects.count()>0){
        item.gradeOutcomes.push({status:'NATIVE_SELECT_DETECTED_NEEDS_OPTION_REVIEW'});
       } else {
        item.gradeOutcomes.push({status:'CUSTOM_GRADE_CONTROL_REQUIRES_VERIFIED_UI_SELECTORS'});
       }
       break;
      }
     }
     await input.fill('');
    }
    await page.screenshot({path:path.join(dir,s.id+'.png'),animations:'disabled',timeout:16000});
    if(item.match==='UNVERIFIED')item.status='NO_UNAMBIGUOUS_OFFICIAL_AUTOCOMPLETE';
    else item.status='ADDRESS_SELECTED_GRADE_RESULTS_NOT_YET_CERTIFIED';
   }catch(e){item.status='FINDER_UI_ERROR';item.error=String(e).slice(0,350);}
   finally{report.results.push(item);console.log('DENTON_LISTING_RESULT',JSON.stringify({id:item.id,status:item.status,match:item.match,error:item.error||null}));await page.close();}
  }
 }finally{await browser.close();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2)+'\n');}
 console.log('DENTON_RESIDENTIAL_FINDER_GATE',JSON.stringify({status:'NO_GO',cases:report.results.map(x=>({id:x.id,status:x.status})),certified:0}));
}
main().catch(e=>{console.error('FINDER_READONLY_QA',String(e));process.exitCode=1;});
