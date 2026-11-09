#!/usr/bin/env node
'use strict';
// QA-only: use Lewisville ISD's *official apartment complex* selector.
// Do not invent zoning, scrape GIS, or require apartment unit numbers.
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const cases=require('../tests/dfw-public-leasing-address-e2e-2026.json').cases.filter(x=>x.districtHint==='LISD');
const URL='https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=8b1628e7345e4a98a4dcf6c852581656';
const OUT=path.resolve(__dirname,'../artifacts/dfw-official-finder-ui-probe');
fs.mkdirSync(OUT,{recursive:true});
const result={schemaVersion:1,schoolYear:'2026-27',locator:URL,unitRequiredByDefault:false,
 perComplex:[],releaseGate:'NO_GO'};
const normalize=s=>String(s||'').toLowerCase().replace(/\b(the|at|apartments|apartment|homes)\b/g,'').replace(/[^a-z0-9]/g,'');
const snapshot=async(page,name)=>{try{await page.screenshot({path:path.join(OUT,name),timeout:17000});return true;}catch{return false}};
async function runOne(browser,item){
 const row={id:item.id,complexName:item.complexName,district:'LISD',
  baseAddress:item.address,selectorPresent:false,complexNameSelected:false,
  independentCurrentYearAssignmentCertified:false,status:'UNVERIFIED',details:[]};
 const context=await browser.newContext({viewport:{width:1366,height:930}});
 const page=await context.newPage();
 try{
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:40000});
  const input=page.locator('input[placeholder="Find address or place"]').first();
  await input.waitFor({state:'visible',timeout:25000});
  await input.fill(item.address);
  await page.waitForTimeout(2400);
  const parts=item.address.split(',')[0].split(/\s+/).filter(Boolean);
  const house=parts[0].toLowerCase(),street=parts.find(t=>t.length>3&&t.toLowerCase()!=='windhaven')||parts[1];
  const cands=page.getByText(new RegExp('^\\s*'+house+'\\s+.+?'+street,'i'),{exact:false});
  if(await cands.count()){
   try{await cands.first().click({timeout:7000});await page.waitForTimeout(1300);
    row.addressSuggestionSelected=true;}catch(e){row.details.push('address:'+String(e.message||e).slice(0,180))}
  }
  // Published find-apartment icon in top-left map toolbar near x482,y110.
  await page.mouse.click(482,110);
  const chooser=page.locator('#dijit_form_FilteringSelect_0');
  await chooser.waitFor({state:'visible',timeout:18000});
  row.selectorPresent=true;
  await chooser.fill(item.complexName);
  await page.waitForTimeout(2800);
  const menu=page.locator('.dijitComboBoxMenuPopup .dijitMenuItem, .dijitMenuItem');
  let optionSelected=false;
  for(let i=0,n=Math.min(await menu.count(),150);i<n;i++){
   const el=menu.nth(i),v=await el.innerText().catch(()=>''),norm=normalize(v);
   if(norm&&norm===normalize(item.complexName) && await el.isVisible()){
    await el.click({timeout:4500});row.officialSelectedComplexLabel=v.trim();
    optionSelected=true;break;
   }
  }
  if(!optionSelected){
   row.visibleOptions=await menu.allTextContents().then(a=>a.slice(0,18)).catch(()=>[]);
   row.status='APARTMENT_COMPLEX_NOT_IN_OFFICIAL_PICKER_OR_NOT_LOADED';
  }else{
   row.complexNameSelected=true;
   const apply=page.getByText('Apply',{exact:true}).last();
   if(await apply.count()){
    await apply.click({timeout:7000});
    await page.waitForTimeout(2600);
    row.applyClicked=true;
   }
   row.panelText=await page.evaluate(()=>document.body.innerText
    .replace(/\s+/g,' ').slice(-2500));
   row.status='COMPLEX_SELECTED_OFFICIAL_RESULTS_NEED_GRADE_REVIEW';
  }
  row.screenshotCaptured=await snapshot(page,'lisd-apartment-'+item.id+'.png');
 }catch(e){row.status='OFFICIAL_APARTMENT_PICKER_ERROR';row.error=String(e.message||e).slice(0,260);
  row.screenshotCaptured=await snapshot(page,'lisd-apartment-'+item.id+'-error.png');}
 finally{
  result.perComplex.push(row);
  fs.writeFileSync(path.join(OUT,'lisd-official-apartment-complex-picker.json'),JSON.stringify(result,null,2)+'\n');
  console.log('LISD_OFFICIAL_APARTMENT_COMPLEX '+JSON.stringify({
   id:row.id,status:row.status,selectorPresent:row.selectorPresent,
   matchedComplex:row.officialSelectedComplexLabel||null,unitRequired:false}));
  await context.close();
 }
}
async function main(){
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const x of cases)await runOne(browser,x);
 }finally{await browser?.close().catch(()=>{});}
 console.log('LISD_APARTMENT_PICKER_SUMMARY '+JSON.stringify({
  total:result.perComplex.length,matchedComplexNames:result.perComplex.filter(x=>x.complexNameSelected).length,
  verifiedSchoolEnrollments:0,releaseGate:'NO_GO'}));
}
main().catch(e=>{console.error(String(e.message||e));process.exitCode=1});
