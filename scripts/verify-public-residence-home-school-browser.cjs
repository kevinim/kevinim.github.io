#!/usr/bin/env node
'use strict';
// REAL public leasing-office/residential-building base address, no private occupant/unit.
// Genuine Esri geocoding + real dashboard GIS + real Leaflet map interaction.
// An official district Finder result is NOT inferred from this test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const ROOT=process.cwd(),OUT=path.resolve(ROOT,'artifacts/public-residential-e2e');
const TEST_CASES={
  apartment:{id:'st-martin-frisco-base',address:'9425 Rolater Rd, Frisco, TX 75035',kind:'public-apartment-leasing-base',
   source:'https://www.har.com/st-martin-frisco-tx/apartment_9535A?print=1',district:'FISD'},
  listedHouse:{id:'lockshire-frisco-public-lease',address:'11379 Lockshire Dr, Frisco, TX 75035',kind:'publicly-listed-single-family-for-lease',
   source:'https://exitrealty.com/listing/nltpoLnSFv6oQIYsNTltb/11379-lockshire-drive-frisco-tx-75035',district:'FISD'}
};
const SAMPLE=TEST_CASES[process.env.PUBLIC_RESIDENTIAL_CASE||'apartment'];
if(!SAMPLE)throw Error('Invalid public address QA case');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.css':'text/css'};
fs.mkdirSync(OUT,{recursive:true});
const result={sampleId:SAMPLE.id,publicResidentialBase:SAMPLE.kind==='public-apartment-leasing-base',publiclyListedResidence:true,unitSpecificResidenceVerified:false,source:SAMPLE.source,
 checkedAt:new Date().toISOString(),district:SAMPLE.district,
 officialFinderIndependentlyVerified:false,officialFinderYearAndEnrollmentVerified:false,
 mobileDesktopResults:[],issues:[],warnings:[],
 overallResidentialEnrollmentCertification:'NO_GO'};
function safeJson(err){return String(err?.message||err).slice(0,500)}
const server=http.createServer((req,res)=>{
 try{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404).end();return;
  }
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [1366,390]){
   const entry={width,kind:SAMPLE.kind,checkedRealEsri:false,geocodeQuality:null,
    assignmentStatus:null,assignedCandidateSchools:[],homePolygonCount:0,
    homeMarkerCount:0,schoolMatchMarkerCount:0,schoolClicked:null,
    clickedSchoolZonePolygons:0,UIRendered:false,consoleErrors:[],networkErrors:[],issues:[]};
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   page.on('pageerror',e=>entry.consoleErrors.push(safeJson(e)));
   page.on('requestfailed',req=>{
    const u=req.url();
    if(/geocode.arcgis.com|school.borders.2627|prosper-attendance-2026/.test(u))
     entry.networkErrors.push({host:new URL(u).hostname,error:req.failure()?.errorText||'network error'});
   });
   try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&typeof window.HomeAssignmentMap?.plan==='function'&&typeof map!=='undefined'&&map,{timeout:100000});
    await page.locator('#homeAddress').fill(SAMPLE.address);
    await page.locator('#homeSearch').click();
    await page.waitForFunction(()=>!document.getElementById('homeSearch').disabled&&
      !/주소를 검색 중/.test(document.getElementById('homeStatus')?.textContent||''),null,{timeout:70000});
    const choices=page.locator('#homeCandidates button.lisd-apartment-choice');
    if(await choices.count()>0){
      const [houseNumber,roadName]=SAMPLE.address.split(' ');
      const good=choices.filter({hasText:new RegExp(houseNumber+'.*'+roadName,'i')}).first();
      if(await good.count())await good.click();
      else throw Error('Ambiguous geocoder result: public apartment base address was not found in candidate list');
    }
    await page.waitForFunction(()=>typeof home!=='undefined'&&!!home&&!!home.ll&&!!home.assignment,{timeout:30000});
    entry.checkedRealEsri=true;
    const state=await page.evaluate(()=>{
      const groups={
       currentHome: typeof homeZoneGroup!=='undefined'&&homeZoneGroup?homeZoneGroup.getLayers().length:0,
       school:typeof schoolGroup!=='undefined'&&schoolGroup?schoolGroup.getLayers().length:0};
      const evidence=document.getElementById('homeMapAssignmentStatus');
      return {
       geocode:home.geocodeQuality,
       status:home.assignment.status,
       district:home.assignment.district,
       features:home.assignment.features?.map(f=>({name:f.properties?.school,grade:f.properties?.gradeLevel,year:f.properties?.schoolYear||null}))||[],
       homePolygons:groups.currentHome,allMarkers:groups.school,
       homeMarker:!!homeMarker&&map.hasLayer(homeMarker),
       markerMatches:[...document.querySelectorAll('.home-match')].length,
       visible:evidence?.dataset.visible||null,
       userSummary:(evidence?.textContent||'').trim().slice(0,600),
       notice:(document.getElementById('homeStatus')?.textContent||'').slice(0,450)
      };
    });
    entry.geocodeQuality={usableForSchoolCandidate:!!state.geocode?.usableForSchoolCandidate,reason:state.geocode?.reason||null};
    entry.assignmentStatus=state.status;
    entry.district=state.district||null;
    entry.assignedCandidateSchools=state.features;
    entry.homePolygonCount=state.homePolygons;entry.homeMarkerCount=state.homeMarker?1:0;
    entry.schoolMatchMarkerCount=state.markerMatches;entry.UIRendered=state.visible==='true';
    entry.homeStatus=state.notice;entry.userSummary=state.userSummary;
    assert.equal(entry.homeMarkerCount,1,'Real geocoded property must create home map pin');
    assert.ok(entry.district==='FISD'||!entry.geocodeQuality.usableForSchoolCandidate,'Do not assign apartment building to wrong district');
    // Only if real-source 2026-27 polygon candidates exist and geocoding is high confidence:
    // click REAL rendered school marker using Playwright, not a manually injected school.
    if(entry.geocodeQuality.usableForSchoolCandidate&&['current','boundary-review'].includes(entry.assignmentStatus)){
      assert.ok(entry.homePolygonCount>0,'Precise real residential building should paint map candidates');
      assert.equal(entry.UIRendered,true);
      assert.ok(entry.assignedCandidateSchools.length>=2,'At least two level-specific candidates should exist');
      assert.ok(entry.schoolMatchMarkerCount>0,'At least one matched school campus marker should be displayed');
      const marker=page.locator('.leaflet-marker-icon').filter({has:page.locator('.home-match')}).first();
      if(await marker.count()){
       await marker.click({timeout:12000});
       const clicked=await page.evaluate(()=>({selected:state.selectedSchool?.name||null,
        polygons:typeof zoneGroup!=='undefined'&&zoneGroup?zoneGroup.getLayers().length:0}));
       entry.schoolClicked=clicked.selected;
       entry.clickedSchoolZonePolygons=clicked.polygons;
       assert.ok(entry.schoolClicked,'Real marker click must open school details');
       assert.ok(entry.clickedSchoolZonePolygons>0,'Real school click must render polygon');
      }else entry.issues.push('school_match_marker_not_clickable');
    }else{
      entry.warnings=['Real public apartment base address was not high-confidence/current-year zone resolved. NO polygon or official enrollment verification should be claimed.'];
      assert.equal(entry.homePolygonCount,0,'Unverified apartment assignment must never paint current zones');
    }
    await page.screenshot({path:path.join(OUT,SAMPLE.id+'-'+width+'.png'),fullPage:true,timeout:40000});
    console.log('PUBLIC_RESIDENCE_BROWSER '+JSON.stringify({width,status:entry.assignmentStatus,district:entry.district,features:entry.assignedCandidateSchools,homePolygons:entry.homePolygonCount,schoolMarkers:entry.schoolMatchMarkerCount,clickedZonePolygons:entry.clickedSchoolZonePolygons,officialVerified:false}));
   }catch(e){
    entry.issues.push(safeJson(e));
    result.issues.push('width_'+width+':'+safeJson(e));
    await page.screenshot({path:path.join(OUT,SAMPLE.id+'-failure-'+width+'.png'),fullPage:true,timeout:40000}).catch(()=>{});
   }finally{
    result.mobileDesktopResults.push(entry);
    await page.close();
   }
  }
  result.dashboardRenderedWithoutErrors=result.mobileDesktopResults.every(x=>x.issues.length===0&&x.consoleErrors.length===0);
  result.localUIFlowVerified=result.mobileDesktopResults.every(x=>x.checkedRealEsri&&x.homeMarkerCount===1&&x.homePolygonCount>0&&x.clickedSchoolZonePolygons>0);
  if(!result.localUIFlowVerified)result.warnings.push('Real residence-base address → current school marker → visible polygon is not proven for BOTH responsive viewports');
  result.warnings.push('This is a publicly listed apartment COMPLEX base address, NOT a consented unit/address-specific district Finder assignment; official enrolled-campus match remains unverified.');
 }catch(e){result.issues.push('fatal:'+safeJson(e))}
 finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(OUT,'report-'+SAMPLE.id+'.json'),JSON.stringify(result,null,2)+'\n');
  console.log('PUBLIC_RESIDENCE_E2E '+JSON.stringify({status:result.overallResidentialEnrollmentCertification,localUIFlowVerified:result.localUIFlowVerified,dashboardRenderedWithoutErrors:result.dashboardRenderedWithoutErrors,issues:result.issues,warnings:result.warnings}));
  if(result.issues.length||result.dashboardRenderedWithoutErrors===false)process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
