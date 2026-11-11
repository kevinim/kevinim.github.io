#!/usr/bin/env node
'use strict';
// Strict read-only smoke against the ACTUALLY DEPLOYED GitHub Pages site.
// Never submits residential addresses, records students, or rehosts GIS.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=(process.env.DASHBOARD_BASE_URL||'https://kevinim.github.io/').replace(/\/?$/,'/');
const outdir='artifacts/track-b-live-pages';fs.mkdirSync(outdir,{recursive:true});
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={target:base,checkedAt:new Date().toISOString(),status:'running',checks:[],errors:[]};
 try{
  for(const width of [1366,390]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
   await page.goto(base+'?track-b-live-qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>{
    if(typeof state==='undefined'||!state?.ratingIndex||!window.DentonCampusMarkerInfo)return false;
    return window.DentonCampusMarkerInfo.loadState==='ready'&&
     typeof map!=='undefined'&&!!map&&!!window.DallasAttendanceLive&&
     window.DentonZonePdfReference?.ROWS?.length===39&&
     typeof schoolClicked==='function'&&state.schools.length>1500;
   },null,{timeout:100000});
   const theme=await page.evaluate(()=>document.documentElement.dataset.theme);
   assert.equal(theme,'dark',width+': default dark theme disappeared');
   const permits=await page.evaluate(()=>window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals);
   assert.equal(permits,0,'Uncertified residential assigned-school results must remain disabled');
   // Ensure real Allen ISD markers remain visible on the selected ZIP, not only other ISDs.
   await page.locator('#zipSelect').selectOption('75013');
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.zip==='75013'&&
    schoolGroup.getLayers().length>0,null,{timeout:30000});
   const allen=await page.evaluate(()=>{
    const layers=schoolGroup.getLayers();
    const represented=layers.flatMap(x=>x.options?.schoolMembers||[]);
    // Before rollout Pages may still serve the previous one-marker-per-school
    // code, while preview/after rollout uses member-preserving clusters.
    const oldSchoolTitles=new Set(layers.map(x=>x.options?.title));
    const inside=state.schools.filter(s=>s.district==='AISD'&&s.ll&&
     ['elementary','middle','high'].includes(s.type)&&map.getBounds().contains(s.ll));
    return {inside:inside.length,drawn:inside.filter(s=>represented.includes(s)||oldSchoolTitles.has(s.name)).length};
   });
   assert.ok(allen.inside>0,'No Allen campus in selected ZIP bounds');
   assert.equal(allen.drawn,allen.inside,'Allen visible school markers regressed');
   // Official source-only CFB disclosure.
   if(await page.locator('#schoolDataDetails').count())await page.locator('#schoolDataDetails > summary').click();
   const cfb=page.locator('#cfbOfficialRezoningReference');
   await cfb.locator('summary').click();
   const cfbLinks=await cfb.locator('a').evaluateAll(all=>all.map(a=>a.href));
   assert.equal(cfbLinks.length,2);
   assert.ok(cfbLinks.every(x=>x.startsWith('https://www.cfbisd.edu/')));
   assert.match(await cfb.innerText(),/학교별 검증 GIS 폴리곤이 연결되지 않았으며/);
   // Public Denton 39-school official PDF references, exact campus ID.
   const zone=page.locator('#dentonPdfZoneDirectory');
   await zone.locator('summary').click();
   assert.equal(await page.locator('#dentonPdfCampusSelect option').count(),40);
   await page.locator('#dentonPdfCampusSelect').selectOption('061901127');
   const bellPdf=await page.locator('#dentonPdfCampusLink').getAttribute('href');
   assert.match(bellPdf,/^https:\/\/resources\.finalsite\.net\/images\/.+BellES-ZoneMap_26-27\.pdf$/);
   await page.evaluate(()=>{
    const s=state.schools.find(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id==='061901127');
    if(!s||!s.ll)throw Error('Original NCES Bell campus point not found');
    schoolClicked(s);
   });
   await page.waitForFunction(()=>document.getElementById('dentonCampusProvenance')?.dataset.campusId==='061901127',null,{timeout:25000});
   const bell=await page.evaluate(()=>{
    const node=document.getElementById('dentonCampusProvenance');
    return {status:node.dataset.pointStatus,text:node.textContent,
     pdf:node.querySelector('a')?.href,
     originalMarkerCount:state.schools.filter(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id==='061901127').length};
   });
   assert.equal(bell.status,'historical-two-source');
   assert.match(bell.pdf,/BellES-ZoneMap_26-27\.pdf$/);
   assert.equal(bell.originalMarkerCount,1,'Never duplicate Denton campus marker');
   await page.evaluate(()=>{
    const s=state.schools.find(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id==='061901051');
    if(!s||!s.ll)throw Error('Original NCES Cheek campus marker missing');
    schoolClicked(s);
   });
   await page.waitForFunction(()=>document.getElementById('dentonCampusProvenance')?.dataset.campusId==='061901051',null,{timeout:25000});
   const cheek=await page.evaluate(()=>{
    const n=document.getElementById('dentonCampusProvenance');
    return {status:n.dataset.pointStatus,text:n.textContent,url:n.querySelector('a')?.href};
   });
   assert.equal(cheek.status,'historical-exception');
   assert.match(cheek.text,/마커 좌표 미인증/);
   assert.match(cheek.url,/CheekMS-ZoneMap_26-27\.pdf$/);
   // Dallas direct publisher GIS and Irving module must still be present without current-year enrollment certification.
   const sources=await page.evaluate(()=>({
    dallas:window.DallasAttendanceLive?.SOURCES?.length||0,
    irving:!!window.IrvingOfficialSpatial,
    dallasUnverified:window.DallasAttendanceLive?.SOURCES?.every(x=>!!x.level),
    globalWarning:document.querySelector('.reference-gis-global-warning')?.textContent||'',
    overflow:document.documentElement.scrollWidth-innerWidth
   }));
   assert.equal(sources.dallas,3);assert.equal(sources.irving,true);
   assert.match(sources.globalWarning,/학교 배정 확정 정보가 아닙니다/);
   if(width<=390)assert.ok(sources.overflow<=4,'Mobile page horizontal overflow '+sources.overflow);
   assert.deepEqual(errors,[],'Live Pages browser page errors '+errors.join('; '));
   await page.screenshot({path:path.join(outdir,'track-b-live-'+width+'.png'),timeout:25000});
   report.checks.push({width,defaultDark:true,allen,cfbOfficialLinks:2,
    dentonPdfCatalog:39,bellStatus:bell.status,cheekStatus:cheek.status,
    dallasSourceLayers:3,irvingModule:true,residentialGrants:0,mobileOverflowPx:sources.overflow});
   await page.close();
  }
  report.status='PASS';
  console.log('TRACK_B_LIVE_PRODUCTION_PASS '+JSON.stringify(report.checks));
 }catch(e){report.status='FAIL';report.errors.push(String(e.stack||e));console.error('TRACK_B_LIVE_PRODUCTION_FAIL',String(e.stack||e));process.exitCode=1}
 finally{
  fs.writeFileSync(path.join(outdir,'track-b-live-report.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
