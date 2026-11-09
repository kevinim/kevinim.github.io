#!/usr/bin/env node
'use strict';
// Real Esri address geocoding, real school list UI, and Allen school display.
// Address is from publicly advertised single-family sale; no occupant identity.
// Official Allen street-range year unspecified => cannot certify enrollment.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {review}=require('./audit-allen-listed-residence-street-ranges.cjs');
const record=review().records.find(x=>x.id==='allen-port-isabel');
if(!record||!record.zoningRowFound)throw Error('Allen source row missing');
const ROOT=process.cwd(),OUT=path.resolve('artifacts/allen-public-house-browser');
fs.mkdirSync(OUT,{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.geojson':'application/geo+json','.css':'text/css'};
const srv=http.createServer((req,res)=>{
 try{
  const reqPath=new URL(req.url,'http://127.0.0.1').pathname;
  const p=path.resolve(ROOT,'.'+(reqPath==='/'?'/index.html':reqPath));
  if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(p).pipe(res);
 }catch(e){res.writeHead(400).end();}
});
async function main(){
 const report={caseId:record.id,propertyClass:'publicly-listed-single-family',district:'AISD',
  officialSourceYearSpecified:false,liveEsriUsed:true,liveDistrictFinderUiUsed:false,
  exactStudentEnrollmentVerified:false,currentCampusPolygonVintageVerified:false,
  productionRelease:'NO_GO',devices:[]};
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1366]){
   const item={width,geocode:null,assignmentStatus:null,schoolMatches:[],actualSchoolClick:false,
    error:null,status:'INCONCLUSIVE'};
   const page=await browser.newPage({viewport:{width,height:900}});
   try{
    await page.goto('http://127.0.0.1:'+srv.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&
      state.schools.length>1000&&typeof window.allenAssignment==='function',null,{timeout:105000});
    await page.locator('#homeAddress').fill(record.address);
    await page.locator('#homeSearch').click();
    await page.waitForFunction(()=>!document.getElementById('homeSearch').disabled&&
      !String(document.getElementById('homeStatus').textContent).includes('주소를 검색 중'),
      null,{timeout:60000});
    const choices=page.locator('#homeCandidates button.lisd-apartment-choice');
    if(await choices.count()){
     const row=choices.filter({hasText:/1808 Port Isabel/i}).first();
     if(!(await row.count()))throw Error('live_Esri_did_not_offer_the_exact_public_listed_home');
     await row.click({timeout:12000});
    }
    await page.waitForFunction(()=>typeof home!=='undefined'&&home&&home.assignment&&
      home.geocodeQuality,null,{timeout:25000});
    const x=await page.evaluate(()=>{
     document.getElementById('schoolScope').value='all';
     state.level='all';state.schoolQuery='';
     drawList();
     const schools=state.schools.filter(s=>s.district==='AISD'&&homeSchoolMatches(s));
     return {address:home.address,geocode:home.geocodeQuality,
      homePin:!!homeMarker&&map.hasLayer(homeMarker),
      district:home.assignment.district,status:home.assignment.status,
      allenRow:home.assignment.allen,
      schoolMatches:schools.map(s=>({name:s.name,type:s.type})),
      matchListCount:document.querySelectorAll('#schoolList button.school.home-match').length,
      officialSourceLink:[...document.querySelectorAll('#homeSchoolInfo a')].some(a=>a.href.includes('allenisd.org')),
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+5};
    });
    item.geocode={quality:x.geocode?.usableForSchoolCandidate,reason:x.geocode?.reason||null};
    item.assignmentStatus=x.status;item.schoolMatches=x.schoolMatches;
    if(!x.geocode?.usableForSchoolCandidate)throw Error('not_high_quality_live_Esri_geocode');
    if(!x.homePin||x.district!=='AISD'||x.status!=='unverified-year')
     throw Error('not_the_expected_Allen_unknown_academic_year_source_status');
    if(x.allenRow?.[2]!==record.schoolCandidates.elementary||
      x.allenRow?.[3]!==record.schoolCandidates.middle||
      x.allenRow?.[4]!==record.schoolCandidates.freshman||
      x.allenRow?.[5]!==record.schoolCandidates.high)
      throw Error('dashboard_Allen_street_row_differs_from_original_official_table');
    if(x.schoolMatches.length<2||x.matchListCount<2)
      throw Error('address_matched_school_list_not_rendered');
    if(!x.officialSourceLink)throw Error('official_Allen_Finder_link_not_shown');
    const target=page.locator('#schoolList button.school.home-match').first();
    await target.click({timeout:13000});
    const clicked=await page.evaluate(()=>({
      selected:!!state.selectedSchool&&state.selectedSchool.district==='AISD',
      note:document.getElementById('zoneNotice')?.innerText||'',
      polygons:zoneGroup.getLayers().length,
      sourceYearUnknown:true
    }));
    if(!clicked.selected)throw Error('actual_list_school_click_did_not_select_Allen_campus');
    if(!/과거|2019|2023|연도|최신|GIS/.test(clicked.note))
      throw Error('old_polygon_or_unknown_vintage_warning_not_visible');
    if(width===390&&x.horizontalOverflow)throw Error('mobile_horizontal_overflow');
    item.actualSchoolClick=true;
    item.selectedSchoolPolygonLayers=clicked.polygons;
    item.status='ALLEN_STREET_ROW_LIVE_ESRI_UI_PASS_YEAR_UNVERIFIED';
    await page.screenshot({path:path.join(OUT,'allen-'+width+'.png'),fullPage:true,timeout:40000});
   }catch(e){
    item.error=String(e?.message||e).slice(0,250);
    report.sourceOrUIInconclusive=true;
   }finally{
    report.devices.push(item);
    console.log('ALLEN_LISTED_RESIDENTIAL_BROWSER '+JSON.stringify(item));
    await page.close();
   }
  }
 }finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>srv.close(resolve));
 }
 report.browserVerifiedDevices=report.devices.filter(x=>x.status.endsWith('_PASS_YEAR_UNVERIFIED')).length;
 report.result=report.browserVerifiedDevices===2?'PASS_UNKNOWN_SOURCE_YEAR':'INCONCLUSIVE';
 fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify(report,null,2)+'\n');
 console.log('ALLEN_PUBLIC_HOUSE_BROWSER_SUMMARY '+JSON.stringify({status:report.result,
  devices:report.devices.length,browserPasses:report.browserVerifiedDevices,
  currentYearEnrollmentVerified:false}));
 if(report.browserVerifiedDevices!==2)process.exitCode=1;
}
main().catch(e=>{console.error('ALLEN_BROWSER_TEST_ERROR '+String(e.message||e));process.exitCode=1});
