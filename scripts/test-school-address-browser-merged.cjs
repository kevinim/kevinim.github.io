#!/usr/bin/env node
'use strict';
// Real desktop/mobile Chromium against the exact combined PR snapshot.
// Geocoding is explicitly REPLAYED from the archived PUBLIC FACILITY crosscheck.
// This is NOT live residential enrollment verification or a current-year GIS certification.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const fixtures=require('../tests/public-address-finder-crosscheck-2026.json').records
 .filter(r=>r.district==='FISD'&&r.kind==='district-headquarters'||r.district==='FISD'&&r.kind==='city-hall');
const base='http://127.0.0.1:8765/';
const output='artifacts/school-merged-address-browser';
fs.mkdirSync(output,{recursive:true});
if(fixtures.length!==2||fixtures.some(x=>!x.point||!x.officialSchools))
 throw Error('public_facility_fixtures_missing_or_changed');
const levels=['elementary','middle','high'];
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={scope:'actual Chromium dashboard UI with replayed public-facility coordinates',
  combinedPr:'PR141 + PR163',officialFinderQueriedLive:false,
  residentialE2EVerified:false,schoolZoneReleaseApproved:false,devices:[]};
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:930},deviceScaleFactor:1});
   const errors=[],csp=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   await page.addInitScript(()=>{
    document.addEventListener('securitypolicyviolation',e=>{
     window.__schoolMergedCsp=(window.__schoolMergedCsp||[]).concat(e.violatedDirective+':'+e.blockedURI);
    });
   });
   try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&
       state.schools.length>1500&&state.zoneData.FISD?.length>0,
       null,{timeout:110000});
    let active=fixtures[0],captured=0;
    await page.route('**/GeocodeServer/findAddressCandidates*',async route=>{
     const query=new URLSearchParams(route.request().postData()||'');
     const requested=query.get('SingleLine')||'';
     if(!requested.includes(active.address.split(',')[0])){
      return route.fulfill({status:400,contentType:'application/json',
       body:JSON.stringify({error:{message:'unexpected public sample; refusing'}})});
     }
     captured++;
     const zipcode=active.address.match(/\b\d{5}\b/)?.[0];
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({candidates:[{
       address:active.address,
       score:100,
       location:{x:active.point[0],y:active.point[1]},
       attributes:{Region:'TX',Postal:zipcode,Addr_type:'PointAddress'}
      }]})});
    });
    await page.route('**/GeocodeServer/suggest*',async route=>
     route.fulfill({status:200,contentType:'application/json',body:'{"suggestions":[]}'}));
    const checks=[];
    for(const [i,fixture] of fixtures.entries()){
     active=fixture;
     await page.locator('#homeAddress').fill(fixture.address);
     await page.locator('#homeSearch').click();
     await page.waitForFunction(()=>typeof home==='object'&&home?.assignment&&
       document.getElementById('homeSchoolInfo')?.textContent?.includes('집 주소 학교 후보'),null,{timeout:25000});
     const stateCheck=await page.evaluate(()=>({
      district:home.assignment?.district,status:home.assignment?.status,
      features:(home.assignment?.features||[]).map(f=>({
       school:f.properties?.school,grade:f.properties?.gradeLevel
      })),
      houseMarkerPresent:!!homeMarker&&map.hasLayer(homeMarker),
      schoolInfo:document.getElementById('homeSchoolInfo')?.textContent||'',
      officialFinderAvailable:[...document.querySelectorAll('#homeSchoolInfo a')]
        .some(a=>/friscoisd\.org/.test(a.href)),
      csp:window.__schoolMergedCsp||[]
     }));
     assert.ok(['current','boundary-review'].includes(stateCheck.status),
      'Frisco public facility must remain current-year candidate '+JSON.stringify(stateCheck));
     assert.equal(stateCheck.district,'FISD');
     assert.ok(stateCheck.houseMarkerPresent,'public-facility geocoded map pin must be visible');
     assert.ok(stateCheck.officialFinderAvailable,'verified Frisco official lookup link must appear');
     for(const grade of levels){
      const expected=fixture.officialSchools[grade];
      const actual=stateCheck.features.filter(f=>f.grade===grade).map(f=>f.school);
      assert.ok(actual.length>0,'no '+grade+' GIS result for fixture '+i);
      const names=await page.evaluate(({expected,actual})=>({
       expected:window.SchoolBoundaryMatch.boundarySchoolKey(expected),
       actual:actual.map(s=>window.SchoolBoundaryMatch.boundarySchoolKey(s))
      }),{expected,actual});
      assert.ok(names.actual.includes(names.expected),
       'public 2026-27 official fixture mismatch '+grade+': '+JSON.stringify(names));
      // Trigger the real school-list button, not a direct schoolClicked() shortcut.
      const listed=await page.evaluate(({school,grade})=>{
       const key=n=>window.SchoolBoundaryMatch.boundarySchoolKey(n);
       const target=state.schools.find(s=>s.district==='FISD'&&
         s.type===grade&&key(s.name)===key(school));
       if(!target)return {targetMissing:true};
       state.schoolQuery=target.name.toLowerCase();
       document.getElementById('schoolScope').value='all';
       drawList();
       return {targetMissing:false,index:state.schools.indexOf(target),name:target.name};
      },{school:expected,grade});
      assert.ok(!listed.targetMissing,'campus must be available for list click '+grade);
      const schoolButton=page.locator('#schoolList button.school[data-sid="'+listed.index+'"]');
      await schoolButton.click({timeout:12000});
      const clicked=await page.evaluate(index=>{
       const target=state.schools[index];
       return {targetMissing:false,selected:state.selectedSchool===target,
        layers:zoneGroup.getLayers().length,
        mapNotice:document.getElementById('zoneNotice')?.textContent||'',
        sourceKind:schoolZoneInfo(target).kind};
      },listed.index);
      assert.ok(!clicked.targetMissing&&clicked.selected,
       'campus click selection must work '+grade+' '+JSON.stringify(clicked));
      assert.ok(clicked.layers>0,'school click must render a real GIS polygon '+grade);
      assert.equal(clicked.sourceKind,'current','2026-27 official polygon status required');
     }
     assert.deepEqual(stateCheck.csp,[]);
     checks.push({publicSampleId:'published-public-facility-'+(i+1),
       expectedSchoolLevels:3,candidateDistrict:'FISD',geocodeMethod:'archived-point-replay',
       schoolNamesCrosschecked:3,threeGradePolygonsRendered:true,realResidence:false,
       sourceYearClaim:'FISD official 2026-27 source; archived reference checked 2026-11-06'});
     await page.screenshot({path:path.join(output,'frisco-public-'+(i+1)+'-'+width+'.png'),fullPage:true,timeout:45000});
     await page.locator('#homeClear').click();
     const cleared=await page.evaluate(()=>({
      homeNull:home===null,markerRemoved:homeMarker===null,
      field:document.getElementById('homeAddress').value,
      clearHidden:document.getElementById('homeClear').hidden
     }));
     assert.deepEqual(cleared,{homeNull:true,markerRemoved:true,field:'',clearHidden:true},
      'address clear must reset private in-memory location and marker');
    }
    assert.equal(captured,2,'geocoding must be submitted once per selected PUBLIC sample');
    const cfb=await page.evaluate(async ()=>{
     const school=state.schools.find(s=>s.district==='CFB'&&s.type==='elementary'&&s.ll);
     if(!school)return {missingSchool:true};
     await schoolClicked(school);
     return {missingSchool:false,sourceKind:schoolZoneInfo(school).kind,
      layers:zoneGroup.getLayers().length,
      hint:document.getElementById('schoolZoneMapHint')?.textContent||'',
      officialLink:schoolZoneInfo(school).officialUrl};
    });
    assert.ok(!cfb.missingSchool,'CFB district school must load');
    assert.equal(cfb.sourceKind,'finder-only');
    assert.equal(cfb.layers,0,'CFB may not inherit invented campus polygon');
    assert.ok(cfb.officialLink?.startsWith('https://www.cfbisd.edu/'));
    const dim=await page.evaluate(()=>({
     viewport:innerWidth,width:document.documentElement.scrollWidth,
     csp:window.__schoolMergedCsp||[]
    }));
    assert.deepEqual(dim.csp,[]);assert.deepEqual(errors,[],'browser JS errors');
    if(width===390)assert.ok(dim.width<=width+5,
     'mobile horizontal overflow '+JSON.stringify(dim));
    report.devices.push({width,checks,cfbFinderOnly:true,cfbSchoolPolygons:0,
      horizontalOverflow:false,jsErrors:errors.length,cspViolations:dim.csp.length});
    await page.screenshot({path:path.join(output,'cfb-finder-only-'+width+'.png'),fullPage:true,timeout:45000});
   }finally{await page.close()}
  }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
 console.log('SCHOOL_MERGED_PUBLIC_FACILITY_E2E '+JSON.stringify({
  status:'PASS_BROWSER_FLOW_ONLY',devices:report.devices.length,
  publicFacilities:fixtures.length,gradeChecks:fixtures.length*levels.length*report.devices.length,
  geocoder:'archived point replay',officialFinderLive:false,
  independentResidentialAssignmentsVerified:0,productionReleaseApproved:false}));
}
run().catch(e=>{console.error('SCHOOL_MERGED_PUBLIC_FACILITY_E2E_FAILED '+String(e.stack||e));process.exitCode=1});
