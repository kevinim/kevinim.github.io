#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const BASE='http://127.0.0.1:8765/';
const out='artifacts/school-zone-fallback';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1366,390]){
   const page=await browser.newPage({viewport:{width,height:930}});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   await page.addInitScript(()=>{
    window.__zoneCsp=[];
    document.addEventListener('securitypolicyviolation',e=>window.__zoneCsp.push(e.violatedDirective+':'+e.blockedURI));
   });
   try{
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&state.schools.length>1500&&typeof schoolZoneInfo==='function',null,{timeout:110000});
    const result=await page.evaluate(()=>{
     const codes=['FISD','PISD','AISD','LISD','PROSPER','CFB','043907','220919','220907','061911','220906'];
     const samples=[], counts={},base=state.selectedSchool;
     state.showOldZones=true;state.showHistoric=true;
     for(const code of codes){
      const schools=state.schools.filter(s=>s.district===code&&['elementary','middle','high'].includes(s.type)&&s.ll)
       .sort((a,b)=>a.name.localeCompare(b.name));
      const chosen=[...new Set([0,Math.floor(schools.length/3),Math.floor(schools.length*2/3),schools.length-1])]
       .map(i=>schools[i]).filter(Boolean);
      for(const s of chosen){
       state.selectedSchool=s;drawDetail();drawBoundary();
       const status=schoolZoneInfo(s),layers=zoneGroup.getLayers().length,
        banner=document.getElementById('schoolZoneMapHint');
       const badge=document.querySelector('#detailContent .school-zone-label');
       const officialInDetail=[...document.querySelectorAll('#detailContent a')]
        .find(a=>a.getAttribute('href')===status.officialUrl);
       const record={
        district:code,school:s.name,kind:status.kind,match:status.match.status,layers,
        hintVisible:!banner.hidden,badge:badge?.textContent?.trim(),
        mapLink:banner.querySelector('a')?.href||null,
        detailLink:officialInDetail?.href||null,
        hint:banner.textContent?.slice(0,150)
       };
       samples.push(record);
       if(!counts[code])counts[code]={picked:0,drawn:0,finderOnly:0,mapOnly:0,unverified:0,special:0};
       const c=counts[code];c.picked++;
       if(layers>0)c.drawn++;if(status.kind==='finder-only')c.finderOnly++;if(status.kind==='map-only')c.mapOnly++;
       if(status.kind==='unverified')c.unverified++;if(status.kind==='special')c.special++;
      }
     }
     const unregistered=state.schools.find(s=>!window.DISTRICT_REGISTRY[s.district]&&['elementary','middle','high'].includes(s.type)&&s.ll);
     if(unregistered){
      state.selectedSchool=unregistered;drawDetail();drawBoundary();
      const fallback=schoolZoneInfo(unregistered);
      samples.push({district:unregistered.district,school:unregistered.name,kind:fallback.kind,
       layers:zoneGroup.getLayers().length,hintVisible:!document.getElementById('schoolZoneMapHint').hidden,
       detailLink:[...document.querySelectorAll('#detailContent a')].some(a=>a.textContent.includes('학군 공식 주소 검색기')),
       hint:document.getElementById('schoolZoneMapHint').textContent});
     }
     // Also test the selected school in the visible list, not only its detail.
     document.getElementById('schoolScope').value='all';
     const name=state.schools.find(s=>s.district==='CFB'&&s.ll)?.name;
     state.schoolQuery=name?.toLowerCase()||'';
     drawList();
     const listBadge=document.querySelector('#schoolList .school-zone-label')?.textContent?.trim()||'';
     state.schoolQuery='';document.getElementById('schoolScope').value='zip';
     drawList();
     state.selectedSchool=base;drawDetail();drawBoundary();
     return {samples,counts,listBadge,csp:window.__zoneCsp||[],
      scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
      totalSchools:state.schools.length};
    });
    assert.ok(result.samples.length>=40,'must sample 3-4 schools from every North and West DFW district');
    const mapKinds=new Set(['current','finder','historical']);
    for(const r of result.samples){
      if(mapKinds.has(r.kind)){
       assert.ok(r.layers>0,'matched polygon must visibly render '+JSON.stringify(r));
       assert.equal(r.hintVisible,false,'successful map polygon must not show missing hint '+r.school);
      }else{
       assert.equal(r.layers,0,'missing boundary cannot use invented geometry '+JSON.stringify(r));
       assert.equal(r.hintVisible,true,'missing-school map must immediately explain absence '+JSON.stringify(r));
       if(r.kind==='finder-only'){
        assert.ok(r.mapLink?.startsWith('https://'),'verified district Finder must be beside map '+r.school);
        assert.ok(r.detailLink?.startsWith('https://'),'verified district Finder must be in detail '+r.school);
       }
       if(r.kind==='unverified')assert.equal(r.detailLink,false,
        'unknown district must not pretend TEA ratings is the address school finder');
      }
    }
    assert.ok(result.counts.CFB?.finderOnly>=3,'CFB school samples must offer their official Finder');
    for(const code of ['220919','220907','061911'])
     assert.ok(result.counts[code]?.finderOnly>=2,'West DFW '+code+' must link the approved district tool without invented polygons');
    assert.ok(result.counts['220906']?.mapOnly>=2,'GCISD must show official map status, not an address-school Finder');
    assert.ok(result.counts.FISD?.drawn>=3,'Frisco known polygons must draw');
    assert.ok(result.counts.AISD?.drawn>=2,'Allen historic polygons must draw with notice');
    assert.ok(result.listBadge.includes('공식 조회'),'list must label CFB as official lookup only');
    assert.deepEqual(result.csp,[],'unexpected CSP violations');
    assert.deepEqual(errors,[],'runtime JS errors');
    if(width===390)assert.ok(result.scrollWidth<=width+5,
      'new school badges caused horizontal overflow '+result.scrollWidth);
    await page.screenshot({path:path.join(out,'sample-'+width+'.png'),fullPage:true,timeout:40000});
    fs.writeFileSync(path.join(out,'sample-'+width+'.json'),JSON.stringify(result,null,2)+'\n');
    console.log('PASS school zone 4-per-district sample + nonregistry '+width+'px '+JSON.stringify({counts:result.counts,listBadge:result.listBadge,csp:result.csp,unregistered:result.samples.at(-1)}));
   }finally{await page.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('FAIL school boundary status sample:',e.stack||e);process.exitCode=1});
