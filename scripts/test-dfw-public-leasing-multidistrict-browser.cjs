#!/usr/bin/env node
'use strict';
// QA-only actual Chromium interactions. Public leasing-office street addresses;
// not apartment units, certified school assignments, or independent Finder checks.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const {resolveApartmentPolicy,compareFinderToDashboard}=require('./dfw-official-finder-evidence-policy.cjs');
const ROOT=path.resolve(__dirname,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(ROOT,'tests/dfw-public-leasing-address-e2e-2026.json'),'utf8'));
const OUT=path.join(ROOT,'artifacts/dfw-public-leasing-address-qa');
fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(ROOT,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end();}
});
const report={
 schemaVersion:1,asOf:fixture.asOf,scope:fixture.scope,
 browser:'real headless Chromium, mobile 390px and desktop 1366px',
 liveAddressSearch:true,geocoderMocked:false,polygonOrSchoolMocked:false,
 independentDistrictFinderUiVerified:false,unitNumberRequiredByDefault:false,
 enrollmentEligibilityNotTested:true,
 officialGradeMatchCount:0,officialGradeMismatchCount:0,
 releaseGate:{status:'NO_GO',reviewerApproved:false},
 rows:[],failures:[],warnings:[],technicalStatus:'PENDING'
};
function save(){
 report.technicalChecks=report.rows.length;
 report.technicalPassed=report.rows.filter(r=>r.technicalStatus==='PASS').length;
 report.technicalFailed=report.rows.filter(r=>r.technicalStatus==='FAIL').length;
 report.technicalStatus=report.technicalFailed?'FAIL_TECHNICAL_QA':'PASS_TECHNICAL_QA_ONLY';
 report.finderMatchedAddresses=0;report.finderMismatchedAddresses=0;
 report.finderUnverifiedAddresses=fixture.cases.length;
 fs.writeFileSync(path.join(OUT,'multidistrict-evidence.json'),JSON.stringify(report,null,2)+'\n');
}
async function inspect(page){
 return page.evaluate(()=>{
  const a=typeof home!=='undefined'&&home?.assignment;
  const groups=typeof homeZoneGroup!=='undefined'&&homeZoneGroup?homeZoneGroup.getLayers():[];
  const polygons=groups.reduce((n,g)=>n+(typeof g.getLayers==='function'?g.getLayers().length:1),0);
  const grades={};
  for(const f of a?.features||[]){
   const key=f.properties?.gradeLevel||'unknown';
   (grades[key]||(grades[key]=[])).push({school:f.properties?.school||null,
    campusId:f.properties?.campusId||null,year:f.properties?.schoolYear||f.properties?.sourceVintage||null});
  }
  const status=document.getElementById('homeMapAssignmentStatus');
  return {selectedAddress:typeof home!=='undefined'&&home?.address||null,
   hasHome:typeof home!=='undefined'&&!!home,
   geocodeQuality:typeof home!=='undefined'&&home?.geocodeQuality?.reason||null,
   preciseEnough:typeof home!=='undefined'&&!!home?.geocodeQuality?.usableForSchoolCandidate,
   district:a?.district||null,assignmentStatus:a?.status||'none',grades,
   renderedPolygonGroups:groups.length,renderedPolygonFeatures:polygons,
   homeMarker:typeof homeMarker!=='undefined'&&!!homeMarker&&map.hasLayer(homeMarker),
   sourceMode:a?.district?districtZoneDisplay(a.district,state.liveFinder):null,
   visible:status?.dataset?.visible||null,evidence:status?.dataset?.evidence||null,
   matchedListCount:document.querySelectorAll('#schoolList button.school.home-match').length,
   matchedMarkers:typeof schoolGroup!=='undefined'&&schoolGroup?
    schoolGroup.getLayers().filter(m=>String(m.options?.icon?.options?.html||'').includes('home-match')).length:0,
   warningText:status?.textContent?.slice(0,300)||null,
   pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
 });
}
async function selectPublicAddress(page,entry,width,sequence){
 const row={id:entry.id,districtHint:entry.districtHint,viewport:width,sequence,
  actualPropertyType:'public apartment complex/base street address',
  complexName:entry.complexName,
  apartmentPolicy:resolveApartmentPolicy(entry),
  independentFinderVerified:false,officialElementaryMatch:null,
  officialMiddleMatch:null,officialHighMatch:null,technicalStatus:'FAIL'};
 const input=page.locator('#homeAddress');
 try{
  // Leave time for the actual Esri Suggest endpoint (never mock or replay).
  await input.fill(entry.address.slice(0,Math.min(entry.address.length,25)));
  await page.waitForTimeout(1400);
  row.suggestionCount=await page.locator('#homeSuggestions [role="option"]').count();
  if(row.suggestionCount>0){
   await input.press('Escape');
   row.escapeClosedSuggestions=await input.getAttribute('aria-expanded')==='false';
   assert.equal(row.escapeClosedSuggestions,true,'Escape must dismiss suggestions');
  }else{
   report.warnings.push({id:entry.id,width,reason:'LIVE_AUTOCOMPLETE_NOT_OBSERVED'});
  }
  await input.fill(entry.address);
  await page.locator('#homeSearch').click({timeout:14000});
  await page.waitForFunction(()=>{
   const b=document.getElementById('homeSearch');
   const t=document.getElementById('homeStatus')?.textContent||'';
   return b&&!b.disabled&&!t.includes('검색 중');
  },null,{timeout:85000});
  const choices=page.locator('#homeCandidates button.lisd-apartment-choice');
  if(await choices.count()){
   const tokens=entry.address.toLowerCase().replace(/[,.]/g,' ').split(/\s+/).filter(Boolean);
   let selected=false;
   for(let i=0;i<await choices.count();i++){
    const t=(await choices.nth(i).innerText()).toLowerCase();
    if(t.includes(tokens[0])&&t.includes(tokens[1])){
     await choices.nth(i).click({timeout:12000});selected=true;break;
    }
   }
   if(!selected)throw Error('NO_PUBLIC_LEASING_OFFICE_EXACT_CANDIDATE');
  }
  await page.waitForFunction(()=>typeof home!=='undefined'&&!!home?.assignment,null,{timeout:30000});
  row.map=await inspect(page);
  row.finderComparison=compareFinderToDashboard({sample:entry,official:null,display:row.map});
  assert.equal(row.finderComparison.status,'UNVERIFIED_OFFICIAL_FINDER');
  assert.equal(row.apartmentPolicy.unitRequired,false,'unit number must not be a blanket gate');
  assert.equal(row.map.hasHome,true,'no selected address');
  // Do not call an approximate or wrong-ZIP Esri result a valid address test.
  const streetKey=value=>String(value||'').split(',')[0].toLowerCase()
   .replace(/\bwest\b/g,'w').replace(/\beast\b/g,'e')
   .replace(/\bnorth\b/g,'n').replace(/\bsouth\b/g,'s')
   .replace(/\bparkway\b/g,'pkwy').replace(/\bboulevard\b/g,'blvd')
   .replace(/\blane\b/g,'ln').replace(/\broad\b/g,'rd')
   .replace(/\bstreet\b/g,'st').replace(/[^a-z0-9]+/g,'');
  assert.equal(streetKey(row.map.selectedAddress),streetKey(entry.address),
   'ESRI_GEOCODER_PUBLIC_STREET_NOT_EQUAL');
  const expectedZip=(entry.address.match(/\b\d{5}$/)||[])[0];
  const actualZip=(String(row.map.selectedAddress).match(/\b\d{5}(?:-\d{4})?\b/)||[])[0]?.slice(0,5);
  assert.equal(actualZip,expectedZip,'ESRI_GEOCODER_POSTAL_MISMATCH');
  row.geocoderMatchesPublicStreetAndZip=true;
  const sourceYears=Object.values(row.map.grades||{}).flat().map(x=>String(x.year||''));
  row.sourceYearReview=sourceYears.some(v=>/2025[–-]26|2024[–-]25/.test(v))
   ?'PRIOR_YEAR_LAYER_REQUIRES_CURRENT_FINDER_COMPARISON'
   :sourceYears.some(v=>/미확인|unknown|unverified/i.test(v))
    ?'SOURCE_YEAR_UNVERIFIED':'SOURCE_CURRENT_YEAR_LABEL_ONLY';
  assert.equal(row.map.homeMarker,true,'selected home point must appear');
  const safe=['current','finder-current','boundary-review','finder-boundary-review'];
  const canDisplay=safe.includes(row.map.assignmentStatus)&&['official','finder'].includes(row.map.sourceMode);
  if(!canDisplay){
   assert.equal(row.map.renderedPolygonFeatures,0,'unverified provenance must never paint polygons');
   assert.notEqual(row.map.visible,'true','unverified assignment shown as verified');
   row.assignmentKind='FAIL_CLOSED_NO_VERIFIED_BOUNDARY';
  }else{
   assert.equal(row.map.visible,'true','qualified zones must be visible');
   assert.ok(row.map.renderedPolygonFeatures>=1,'map has no actual child polygon features');
   assert.ok(row.map.matchedMarkers>=1,'no matching actual school marker');
   assert.ok(row.map.matchedListCount>=1,'no matching school in list');
   for(const grade of ['elementary','middle','high'])
    assert.ok((row.map.grades[grade]||[]).length>=1,'qualified address missing '+grade+' zone');
   const btn=page.locator('#schoolList button.school.home-match').first();
   await btn.click({timeout:12000});
   row.clicked=await page.evaluate(()=>({school:state.selectedSchool?.name||null,
    polygons:zoneGroup.getLayers().length,
    status:state.selectedSchool?schoolZoneInfo(state.selectedSchool).kind:null}));
   assert.ok(row.clicked.school,'school list click failed');
   assert.ok(row.clicked.polygons>=1,'school click failed to render boundary');
   row.assignmentKind='LIVE_GIS_CORROBORATION_ONLY';
  }
  if(width===390)assert.ok(row.map.pageWidth<=width+6,'mobile horizontal overflow');
  row.technicalStatus='PASS';
 }catch(e){
  row.issue=String(e?.message||e).slice(0,350);
  report.failures.push({id:entry.id,width,issue:row.issue});
 }finally{
  try{await page.screenshot({path:path.join(OUT,entry.id+'-'+width+'px.png'),fullPage:false,timeout:20000})}
  catch(e){row.screenshotIssue=String(e.message||e).slice(0,120)}
  report.rows.push(row);save();
  console.log('DFW_PUBLIC_LEASING_BROWSER '+JSON.stringify(row));
 }
 return row;
}
async function verifyClearing(page,first,second,width){
 const key=first.districtHint+'-'+width,step={id:key,viewport:width};
 try{
  // Re-search must immediately drop old markers/polygons before new geocode completes.
  await page.locator('#homeAddress').fill(second.address);
  const pre=await page.evaluate(()=>({empty:home===null,
   layers:homeZoneGroup.getLayers().length}));
  assert.equal(pre.empty,true,'old house retained while typing new address');
  assert.equal(pre.layers,0,'stale polygon retained while changing address');
  step.oldAddressCleared=true;
  await selectPublicAddress(page,second,width,2);
  await page.locator('#homeClear').click({timeout:12000});
  const clean=await page.evaluate(()=>({
   empty:home===null,marker:homeMarker===null,polygons:homeZoneGroup.getLayers().length,
   input:document.getElementById('homeAddress').value,
   clearHidden:document.getElementById('homeClear').hidden
  }));
  assert.deepEqual(clean,{empty:true,marker:true,polygons:0,input:'',clearHidden:true});
  step.clearLeavesNoMarkersOrPolygons=true;
  // Real request cancellation: start a search and clear without waiting for Esri response.
  await page.locator('#homeAddress').fill(first.address);
  await page.locator('#homeSearch').click({timeout:12000});
  await page.locator('#homeClear').click({timeout:12000});
  await page.waitForTimeout(1600);
  const abort=await page.evaluate(()=>({empty:home===null,
   polygons:homeZoneGroup.getLayers().length,input:document.getElementById('homeAddress').value}));
  assert.deepEqual(abort,{empty:true,polygons:0,input:''},'cancelled search rendered stale home data');
  step.inFlightCancelSafe=true;
 }catch(e){
  step.issue=String(e.message||e).slice(0,250);
  report.failures.push({id:key,issue:step.issue});
 }
 report.rows.push({id:key,viewport:width,kind:'lifecycle',
  technicalStatus:step.issue?'FAIL':'PASS',...step});save();
 console.log('DFW_LIFECYCLE '+JSON.stringify(step));
}
async function run(){
 assert.equal(fixture.releaseGate,'NO_GO');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const groups=[...new Set(fixture.cases.map(x=>x.districtHint))].map(d=>fixture.cases.filter(x=>x.districtHint===d));
  for(const [width,height] of [[390,850],[1366,930]]){
   for(const pair of groups){
    assert.equal(pair.length,2,'two independent public bases per candidate district');
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,200)));
    try{
     await page.goto('http://127.0.0.1:'+server.address().port+'/',{
      waitUntil:'domcontentloaded',timeout:95000});
     await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&
      typeof state!=='undefined'&&!!state.zoneData&&
      typeof home!=='undefined'&&!!window.HomeAssignmentMap&&state.schools.length>1500,
      null,{timeout:105000});
     await selectPublicAddress(page,pair[0],width,1);
     await verifyClearing(page,pair[0],pair[1],width);
     if(errors.length){
      report.warnings.push({id:pair[0].districtHint,width,reason:'PAGE_ERRORS',
       messages:errors.slice(0,5)});
     }
    }catch(e){
     report.failures.push({id:pair[0].districtHint,width,issue:'BOOTSTRAP: '+String(e.message||e)});
     report.rows.push({id:pair[0].districtHint+'-bootstrap',viewport:width,
      technicalStatus:'FAIL',issue:String(e.message||e).slice(0,250)});
     save();
     try{await page.screenshot({path:path.join(OUT,pair[0].districtHint+'-'+width+'-bootstrap.png'),timeout:20000})}
     catch{}
    }finally{await page.close();}
   }
  }
 }finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
  save();
 }
 console.log('DFW_PUBLIC_LEASING_QA_SUMMARY '+JSON.stringify({
  technicalStatus:report.technicalStatus,technicalPassed:report.technicalPassed,
  technicalFailed:report.technicalFailed,
  officialGradeMatches:0,officialGradeMismatches:0,
  independentFinderVerified:false,releaseGate:'NO_GO'}));
 if(report.technicalFailed)process.exitCode=1;
}
run().catch(e=>{report.failures.push({id:'fatal',issue:String(e.message||e)});save();
 console.error('DFW_PUBLIC_LEASING_QA_FATAL '+String(e.stack||e));process.exitCode=1;});
