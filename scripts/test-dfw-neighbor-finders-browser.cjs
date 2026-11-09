#!/usr/bin/env node
'use strict';
// Exact PR website, no personal addresses, no external enrollment submission.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const manifest=require('../data/dfw-neighbor-official-school-links-2026.json');
const BASE='http://127.0.0.1:8765/';
const FOLDER='artifacts/neighbor-school-finders';
fs.mkdirSync(FOLDER,{recursive:true});
const expectedKind=kind=>kind==='choice-process'?'choice-only':kind==='official-map'?'map-only':
 kind==='official-inquiry'?'inquiry-only':'finder-only';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:920},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   await page.addInitScript(()=>{
    window.__neighborCsp=[];
    document.addEventListener('securitypolicyviolation',e=>window.__neighborCsp.push(e.violatedDirective+':'+e.blockedURI));
   });
   try{
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&
      typeof state!=='undefined'&&state.schools.length>1500&&typeof schoolZoneInfo==='function',null,{timeout:120000});
    const report=await page.evaluate((districts)=>{
     const output={selected:[],errors:[],viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth};
     for(const d of districts){
      const schools=state.schools.filter(s=>s.district===d.code&&
        ['elementary','middle','high'].includes(s.type));
      if(!schools.length){output.errors.push('No TEA school loaded for '+d.code);continue}
      const withLocation=schools.filter(s=>Array.isArray(s.ll));
      const sorted=(withLocation.length?withLocation:schools).sort((a,b)=>a.name.localeCompare(b.name));
      const picks=[sorted[0],sorted[Math.floor(sorted.length/2)]].filter(Boolean);
      for(const s of picks){
       state.selectedSchool=s;
       state.showOldZones=true;state.showHistoric=true;
       drawDetail();drawBoundary();
       const zone=schoolZoneInfo(s);
       const detail=document.getElementById('detailContent');
       const hint=document.getElementById('schoolZoneMapHint');
       const links=[...detail.querySelectorAll('a')];
       const official=links.find(a=>a.getAttribute('href')===d.url);
       const mapLink=hint.querySelector('a');
       output.selected.push({code:d.code,school:s.name,expectedKind:d.kind,
         kind:zone.kind,layerCount:zoneGroup.getLayers().length,badge:detail.querySelector('.school-zone-label')?.textContent.trim(),
         hintVisible:!hint.hidden,sourceNote:hint.textContent.includes(zone.officialNote||'##missing##'),
         detailOfficial:!!official,detailText:official?.textContent,
         mapLink:mapLink?.href||null,mapLinkText:mapLink?.textContent,
         officialUrl:zone.officialUrl});
      }
     }
     output.csp=window.__neighborCsp;
     return output;
    },manifest.districts);
    assert.deepEqual(report.errors,[]);
    assert.ok(report.selected.length>=36,'at least two real school records from all 18 surrounding districts');
    for(const row of report.selected){
     if(row.code==='057905'){
      assert.equal(row.kind,'provisional','Dallas GIS must remain unverified provisional '+JSON.stringify(row));
      assert.ok(row.layerCount>0,'only real publisher polygon may be drawn as provisional '+row.school);
      assert.ok(row.badge?.includes('학년도 검증 중'),'Dallas must not carry a current-year badge');
     }else{
      assert.equal(row.kind,expectedKind(row.expectedKind),JSON.stringify(row));
      assert.equal(row.layerCount,0,'never create invented per-campus polygon '+row.school);
     }
     assert.equal(row.hintVisible,true,'missing-geometry banner must be visible '+row.school);
     assert.ok(row.detailOfficial,'district official landing page missing from school detail: '+row.school);
     assert.equal(row.mapLink,row.officialUrl,'map-side link must go to approved district URL: '+row.school);
     assert.ok(row.sourceNote,'academic-year/choice/outage caution missing in map: '+row.school);
     if(row.expectedKind==='choice-process')
      assert.ok(row.mapLinkText.includes('선택')&&!row.mapLinkText.includes('주소 검색기'));
     if(row.expectedKind==='official-map')
      assert.ok(row.mapLinkText.includes('지도')&&!row.mapLinkText.includes('주소 검색기'));
     if(row.expectedKind==='official-inquiry')
      assert.ok(row.mapLinkText.includes('문의'));
    }
    assert.deepEqual(report.csp,[],'unexpected CSP violation '+JSON.stringify(report.csp));
    assert.deepEqual(errors,[],'uncaught UI JavaScript errors');
    if(width===390)assert.ok(report.scrollWidth<=report.viewport+5,
     'mobile overflow after school URL labels '+report.scrollWidth+'px');
    fs.writeFileSync(path.join(FOLDER,'campuses-'+width+'.json'),JSON.stringify(report,null,2)+'\n');
    await page.screenshot({path:path.join(FOLDER,'campuses-'+width+'.png'),fullPage:true,timeout:35000});
    const kinds=report.selected.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{});
    console.log('PASS 18 adjacent ISDs official parent lookup/map/choice link QA '+width+'px '+JSON.stringify(kinds));
   }finally{await page.close()}
  }
 }finally{await browser.close()}
})().catch(err=>{console.error('FAIL DFW neighbor school browser QA:',err.stack||err);process.exitCode=1});
