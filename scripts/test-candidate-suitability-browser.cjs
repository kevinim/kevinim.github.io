#!/usr/bin/env node
'use strict';
// Offline UX smoke: synthetic public addresses; no routing/geocoding requests.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'candidate-compare.js'),'utf8');
const css=fs.readFileSync(path.join(root,'features/candidate-suitability.css'),'utf8');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<!doctype html><html data-theme="dark"><head></head><body>'+
    '<div class="candidate-panel"><div id="candidateCount"></div>'+
    '<div id="candidateStatus" role="status"></div><div id="candidateCards" class="candidate-cards"></div>'+
    '<button id="addComparison">Add</button></div><input id="homeAddress"><div id="map"></div></body></html>');
   await page.addStyleTag({content:'.candidate-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}'+
    '.candidate-card{min-width:0;max-width:100%;padding:9px;overflow-wrap:anywhere}'+
    '@media(max-width:720px){.candidate-cards{grid-template-columns:minmax(0,1fr)}}'});
   await page.addStyleTag({content:css});
   await page.evaluate(()=>{
    window.el=id=>document.getElementById(id);
    window.escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    window.homeZipMatches=()=>[];
    window.schoolAssignmentFor=()=>({status:'finder-current'});
    window.assignmentHtml=()=>'<b>GIS 후보 · 배정 미인증</b>';
    window.useHomeCandidate=selection=>{window.lastOpened=selection.address;return true;};
    window.home={address:'100 Oak St, Plano, TX 75093',ll:[33,-96.7],
      geocodeQuality:{usableForSchoolCandidate:true}};
   });
   await page.addScriptTag({content:js});
   await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));
   assert.equal(await page.locator('#candidatePriority').count(),1);
   await page.locator('#addComparison').click();
   assert.equal(await page.locator('.candidate-card').count(),1);
   assert.equal(await page.locator('.candidate-fit-row').count(),7);
   assert.equal(await page.locator('.candidate-demographics').evaluate(x=>x.open),false);
   assert.match(await page.locator('.candidate-fit-row:first-child .candidate-fit-state').innerText(),/공식 배정 미확인/);
   await page.locator('.candidate-demographics summary').click();
   assert.equal(await page.locator('.candidate-demographics').evaluate(x=>x.open),true);
   await page.locator('.candidate-time-entry summary').click();
   const commute=page.locator('[data-candidate-index="0"][data-candidate-minutes="commute"]');
   await commute.fill('30');await commute.dispatchEvent('change');
   assert.match(await page.locator('.candidate-fit-row').nth(1).innerText(),/입력 기준 30분 이내/);
   assert.equal(await page.locator('.candidate-demographics').evaluate(x=>x.open),true,'expanded ZIP detail retained');
   await page.locator('[data-candidate-index="0"][data-candidate-minutes="church"]').fill('20');
   await page.locator('[data-candidate-index="0"][data-candidate-minutes="church"]').dispatchEvent('change');
   assert.match(await page.locator('.candidate-fit-row').nth(2).innerText(),/사용자 입력 20분/);
   await page.locator('.candidate-housing-entry summary').click();
   await page.locator('[data-candidate-rent="0"]').fill('2450');
   await page.locator('[data-candidate-rent="0"]').dispatchEvent('change');
   assert.match(await page.locator('.candidate-fit-row').last().innerText(),/\$2,450/);
   assert.equal(await page.locator('.candidate-housing-entry').evaluate(x=>x.open),true);
   await page.locator('[data-candidate-photos="0"]').check();
   assert.match(await page.locator('.candidate-fit-row').last().innerText(),/사진 검토 표시/);
   await page.selectOption('#candidatePriority','housing');
   assert.match(await page.locator('.candidate-fit-row').first().innerText(),/임대료/);
   await page.selectOption('#candidatePriority','ballet');
   assert.match(await page.locator('.candidate-fit-row').first().innerText(),/Contemporary Ballet Dallas/);
   await page.evaluate(()=>window.home={address:'200 Maple St, Allen, TX 75013',ll:[33.11,-96.66]});
   await page.locator('#addComparison').click();
   assert.equal(await page.locator('.candidate-card').count(),2);
   await page.evaluate(()=>window.home={address:' 200   MAPLE st, allen, tx 75013 ',ll:[33.11,-96.66]});
   await page.locator('#addComparison').click();
   assert.equal(await page.locator('.candidate-card').count(),2,'duplicate whitespace/case must be rejected');
   await page.locator('[data-open="1"]').click();
   assert.equal(await page.evaluate(()=>window.lastOpened),'200 Maple St, Allen, TX 75013');
   await page.locator('[data-remove="0"]').click();
   assert.equal(await page.locator('.candidate-card').count(),1);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'horizontal overflow '+width+': '+overflow);
   assert.deepEqual(errors,[],'uncaught browser errors '+width);
   await page.close();
  }
 }finally{await browser.close()}
 console.log('PASS candidate suitability browser QA 390/1366, priority, travel, duplicate, map, removal');
})().catch(error=>{console.error(error);process.exitCode=1});
