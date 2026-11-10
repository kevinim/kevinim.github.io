#!/usr/bin/env node
'use strict';
// QA-only actual Leaflet/browser staging. It does NOT register Irving as a
// current GIS source, test any residential address, or modify app/runtime code.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const ROOT=process.cwd(),OUT=path.join(ROOT,'artifacts/agent01-irving-browser');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
function serve(req,res){
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end()}
}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=http.createServer(serve);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const summaries=[];
  for(const width of [1366,390]){
   const page=await browser.newPage({viewport:{width,height:950},deviceScaleFactor:1});
   const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
   await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&typeof map!=='undefined'&&!!map&&typeof schoolClicked==='function',null,{timeout:110000});
   // Exercise the actual house-search UI with a PUBLIC school campus coordinate.
   // This is publisher-source point QA, not a real household assignment result.
   await page.evaluate(()=>{
    const sample={address:'2931 Conflans Rd, Irving, Texas, 75061',
     location:{x:-96.986394877074,y:32.822898576419},score:100,
     savedTypedAddress:'2931 Conflans Rd, Irving, TX 75061',
     savedGeocodeQuality:{usableForSchoolCandidate:true}};
    if(!useHomeCandidate(sample))throw Error('public campus address cannot populate home search');
   });
   await page.locator('#officialIrvingCheck').click({timeout:10000});
   await page.waitForFunction(()=>home?.irvingChecking===false&&home?.irvingSpatial?.status==='ready',
    null,{timeout:60000});
   const spatial=await page.evaluate(()=>({
    names:home.irvingSpatial.names,
    count:irvingReferenceLayer?.getLayers()?.length||0,
    notice:document.getElementById('irvingSpatialStatus')?.innerText||'',
    addressStatus:document.getElementById('homePrivacy')?.innerText||'',
    directLocatorLink:document.querySelector('#officialReviewPanel a.cardlink[href*="f27bba7ee02141c58c8c9375431effa2"]')?.href||null,
    zoneKey:window.DISTRICT_REGISTRY?.['057912']?.zoneKey
   }));
   assert.deepEqual(spatial.names,{elementary:'Barton ES',middle:'Crockett MS',high:'Irving HS'});
   assert.equal(spatial.count,3,'all three official GIS source features must render in Leaflet');
   const safe=await page.evaluate(()=>({
    status:home?.assignment?.status,
    warning:document.querySelector('.reference-gis-warning')?.innerText||'',
    popup:(()=>{
     let found='';const walk=(layer,depth)=>{
      if(!layer||depth>5||found)return;
      const p=layer.getPopup?.();if(p){found=String(p.getContent()||'');return}
      if(layer.getLayers)for(const child of layer.getLayers())walk(child,depth+1);
     };
     walk(irvingReferenceLayer,0);return found;
    })(),
    yearCertified:window.ConditionalSchoolRelease?.releaseSummary().currentYearResidentialDistrictApprovals
   }));
   assert.ok(['conditional-finder-only','unavailable'].includes(safe.status),'unverified Irving residence must not be assigned');
   assert.equal(safe.yearCertified,0);
   assert.match(safe.warning,/현재 배정학교가 아닙니다/);
   assert.match(safe.warning,/2024–25/);assert.match(safe.warning,/2025–26/);
   assert.match(safe.popup,/학교 배정 미인증/);assert.match(safe.popup,/원본 학년도/);
   assert.match(spatial.notice,/학년도 확인 필요/);
   assert.match(spatial.addressStatus,/집 핀 좌표/);
   assert.match(spatial.directLocatorLink||'',/^https:\/\/iisd1\.maps\.arcgis\.com\/apps\/instant\/lookup\/index\.html\?appid=f27bba7ee02141c58c8c9375431effa2$/);
   assert.equal(spatial.zoneKey,null,'2026-27 school-year approval must not be inferred from point lookup');
   // The manual official Finder name comparison is informational: never upgrade
   // 2024-25 / 2025-26 source polygons to verified residential assignment.
   await page.locator('#officialReviewDistrict').selectOption('057912');
   await page.locator('#officialReviewLevel').selectOption('middle');
   await page.locator('#officialReviewName').fill('Crockett Middle School');
   await page.locator('#officialReviewYear').selectOption('2026–27');
   await page.locator('#officialManualCompare').click();
   const manualMatch=await page.evaluate(()=>({
    status:home.officialReview?.status,
    certified:home.officialReview?.yearCertified,
    independent:home.officialReview?.independentlyVerified,
    message:document.querySelector('#officialReviewResult')?.innerText||''
   }));
   assert.equal(manualMatch.status,'manual-match');
   assert.equal(manualMatch.certified,false);
   assert.equal(manualMatch.independent,false);
   assert.match(manualMatch.message,/독립적인 Finder 화면 검증/);
   await page.locator('#officialReviewName').fill('Bowie Middle School');
   await page.locator('#officialManualCompare').click();
   const manualMismatch=await page.evaluate(()=>({
    status:home.officialReview?.status,
    message:document.querySelector('#officialReviewResult')?.innerText||''
   }));
   assert.equal(manualMismatch.status,'manual-mismatch');
   assert.match(manualMismatch.message,/다릅니다/);
   const mapReferences=await page.locator('#officialReviewPanel a.cardlink[href*="current-campus-level-maps"]').count();
   assert.equal(mapReferences,3,'district-published elementary/middle/high maps must be accessible');
   // Capture the ACTUAL 3-grade live publisher GIS overlay before clearing it.
   // The test uses a public school campus location; no private household appears.
   await page.locator('#map').screenshot({path:path.join(OUT,'irving-live-reference-map-'+width+'.png')});
   // Privacy/cancellation regression: selected home/overlay clears on X.
   await page.evaluate(()=>clearHome());
   const cleared=await page.evaluate(()=>({homePresent:!!home,overlay:!!irvingReferenceLayer}));
   assert.deepEqual(cleared,{homePresent:false,overlay:false});
   // Browser screenshots are only general public dashboard / temporary QA
   // school sources; there are no personal, residential or student addresses.
   await page.screenshot({path:path.join(OUT,'irving-trackb-'+width+'.png'),fullPage:false});
   summaries.push({width,irvingSourceLookup:{count:spatial.count,names:spatial.names,unverifiedYearWarning:true,userReportedMatch:manualMatch.status,userReportedMismatch:manualMismatch.status,approved:false,officialMapLinks:mapReferences,cleared:true},pageErrorCount:pageErrors.length});
   await page.close();
  }
  fs.writeFileSync(path.join(OUT,'trackb-reference-browser-qa.json'),JSON.stringify({residentialAssignmentApproved:false,sourceYearVerified:false,independentFinderChecked:false,summary:summaries},null,2)+'\n');
  console.log('Track B publisher GIS reference and visible warning QA PASS (not residential assignment): '+JSON.stringify(summaries));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
