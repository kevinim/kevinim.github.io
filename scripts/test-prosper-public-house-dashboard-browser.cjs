#!/usr/bin/env node
'use strict';
// Actual interactive Chromium E2E on the #162 dashboard UI with real Esri
// geocoding; compare campus codes to independently collected LIVE Prosper
// Infofinder point responses from the previous step. No test mocks.
// A match is source corroboration, NOT enrollment or independent vendor proof.
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {readFileSync,writeFileSync,mkdirSync}=fs;
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/prosper-real-home');
const live=JSON.parse(readFileSync(path.join(OUT,'official-lookup-vs-gis.json'),'utf8'));
const fixtures=JSON.parse(readFileSync(path.join(ROOT,'tests/prosper-public-listed-single-family-2026.json'),'utf8'));
const approved=live.results.filter(x=>x.status==='OFFICIAL_POINT_GIS_CORROBORATED')
 .map(row=>({source:fixtures.cases.find(x=>x.id===row.id),reference:row}))
 .filter(x=>x.source).slice(0,4);
if(approved.length<4)throw Error('not_enough_live_official_gis_matched_homes_for_full_4_house_browser_qa');
mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json','.geojson':'application/geo+json','.css':'text/css',
 '.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),file=path.resolve(ROOT,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end();}
});
function gradedFeatures(row){
 return Object.fromEntries(['elementary','middle','high'].map(grade=>
  [grade,(row?.features||[]).filter(f=>f.grade===grade)]));
}
async function main(){
 const report={schemaVersion:1,scope:'actual dashboard house-search UI and source-backed maps',
  reference:'live Prosper Infofinder + geocoder source check from same CI run',
  browserCodeBranch:'feature/address-selected-auto-school-map-20261109 (#162) plus this QA only',
  addressType:'public advertised single family only',
  independentDistrictFinderUiVerified:false,independentVendorSource:false,
  genuineEsriGeocoderNotReplayed:true,officialInfofinderPointSourceGenuine:true,
  currentYearGISMetadataVerified:true,independentEnrollmentOrUnitEligibility:false,
  productionReleaseApproved:false,checks:[]};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const sample of approved){
   for(const width of [390,1366]){
    const check={id:sample.source.id,viewport:width,status:'INCONCLUSIVE',
     selectedSchool:null,renderedPolygonCount:0,issue:null};
    const page=await browser.newPage({viewport:{width,height:930},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,170)));
    try{
     await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
     await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&
       !!state.zoneData.PROSPER&&state.zoneData.PROSPER.length>=31&&
       !!window.HomeAssignmentMap&&state.schools.length>1500,null,{timeout:105000});
     await page.locator('#homeAddress').fill(sample.source.address);
     await page.locator('#homeSearch').click();
     await page.waitForFunction(()=>!document.getElementById('homeSearch').disabled&&
        !String(document.getElementById('homeStatus').textContent).includes('주소를 검색 중'),null,{timeout:65000});
     const choices=page.locator('#homeCandidates button.lisd-apartment-choice');
     if(await choices.count()){
      const n=sample.source.address.split(' ')[0],street=sample.source.address.split(',')[0].replace(/^\d+\s+/,'');
      const option=choices.filter({hasText:new RegExp(n+'\\s+'+street.split(' ')[0],'i')}).first();
      if(!(await option.count()))throw Error('precise_public_listing_not_offered_among_geocoder_choices');
      await option.click({timeout:10000});
     }
     await page.waitForFunction(()=>typeof home!=='undefined'&&home&&home.geocodeQuality&&
       home.assignment&&typeof homeMapAssignmentStatus!=='undefined',null,{timeout:25000})
      .catch(async()=>page.waitForFunction(()=>typeof home!=='undefined'&&home&&home.geocodeQuality&&home.assignment,null,{timeout:12000}));
     const info=await page.evaluate(()=>{
      const features=(home.assignment?.features||[]).map(f=>({
       school:f.properties?.school,code:String(f.properties?.schoolCode||'').padStart(3,'0'),
       grade:f.properties?.gradeLevel,year:f.properties?.schoolYear}));
      // The app intentionally wraps all three grade-zone polygons in ONE
      // L.geoJSON layer group. Count actual child polygons, not wrapper layers.
      const groups=typeof homeZoneGroup!=='undefined'&&homeZoneGroup?
       homeZoneGroup.getLayers():[];
      const layers=groups.length;
      const shapes=groups.reduce((n,g)=>n+(typeof g.getLayers==='function'?
       g.getLayers().length:1),0);
      return {quality:home.geocodeQuality,status:home.assignment.status,district:home.assignment.district,
       features,panels:layers,polygonFeatures:shapes,homeMarker:!!homeMarker&&map.hasLayer(homeMarker),
       UIStatus:document.getElementById('homeMapAssignmentStatus')?.textContent?.slice(0,480)||'',
       UIVIsible:document.getElementById('homeMapAssignmentStatus')?.dataset?.visible||null,
       mapSource:districtZoneDisplay('PROSPER',state.liveFinder),
       viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
       officialLink:[...document.querySelectorAll('#homeSchoolInfo a')]
         .some(a=>a.href.startsWith('https://www.prosper-isd.net/'))
      };
     });
     check.geocodeUsable=info.quality?.usableForSchoolCandidate;
     check.district=info.district;check.assignmentStatus=info.status;
     check.homeLayerGroups=info.panels;check.homePolygonCount=info.polygonFeatures;check.homeMapVisible=info.UIVIsible;
     if(!info.quality?.usableForSchoolCandidate)throw Error('browser_esri_geocode_not_building_accurate');
     if(info.district!=='PROSPER'||!['current','boundary-review'].includes(info.status))
      throw Error('browser_not_in_prosper_current_source:'+info.district+':'+info.status);
     if(!info.homeMarker||info.polygonFeatures<3||info.UIVIsible!=='true')
      throw Error('home_marker_or_three_grade_polygon_display_missing');
     if(!info.officialLink||info.mapSource!=='official')
      throw Error('official_prosper_source_link_or_label_missing');
     const by=gradedFeatures(info);
     for(const level of ['elementary','middle','high']){
      const expected=sample.reference.GIS[level]?.[0]?.code;
      const actual=by[level].map(x=>x.code);
      if(!expected||actual.length!==1||actual[0]!==expected)
       throw Error('dashboard_official_gis_campus_mismatch_'+level+':'+actual.join('/')+' expected '+expected);
      if(by[level][0].year!=='2026–27')
       throw Error('dashboard_zone_source_year_unverified_'+level);
     }
     const listed=await page.evaluate(()=>{
      document.getElementById('schoolScope').value='all';
      state.schoolQuery='';state.level='all';drawList();
      return [...document.querySelectorAll('#schoolList button.school.home-match')].map(b=>({
       index:Number(b.dataset.sid),name:(b.innerText||'').slice(0,130)
      }));
     });
     check.listMatchedSchoolButtons=listed.length;
     if(listed.length<1)throw Error('no_matched_school_in_interactive_list');
     const btn=page.locator('#schoolList button.school.home-match').first();
     await btn.click({timeout:12000});
     const clicked=await page.evaluate(()=>({
      district:state.selectedSchool?.district||null,
      selected:state.selectedSchool?.name||null,
      visibleLayers:zoneGroup.getLayers().length,
      source:state.selectedSchool?schoolZoneInfo(state.selectedSchool).kind:null,
      width:document.documentElement.scrollWidth
     }));
     check.selectedSchool=clicked.selected;check.renderedPolygonCount=clicked.visibleLayers;
     if(clicked.district!=='PROSPER'||clicked.visibleLayers<1||clicked.source!=='current')
      throw Error('actual_school_click_did_not_render_2026_27_zone');
     if(width===390&&info.scrollWidth>width+6)throw Error('mobile_horizontal_overflow');
     if(errors.length)throw Error('browser_javascript_errors:'+errors.slice(0,2).join(';'));
     check.status='PUBLIC_HOUSE_BROWSER_OFFICIAL_GIS_CORROBORATED';
     await page.screenshot({path:path.join(OUT,sample.source.id+'-'+width+'px.png'),fullPage:false,timeout:25000});
     // No stale residential polygon, marker or address may persist after Clear.
     await page.locator('#homeClear').click({timeout:12000});
     const cleared=await page.evaluate(()=>({
      homeNull:home===null,
      markerGone:homeMarker===null,
      zoneGroups:homeZoneGroup.getLayers().length,
      addressInput:document.getElementById('homeAddress').value,
      clearHidden:document.getElementById('homeClear').hidden
     }));
     assert.deepEqual(cleared,{homeNull:true,markerGone:true,zoneGroups:0,
      addressInput:'',clearHidden:true},'home clearing must reset map and search');
     check.clearHomeLeavesNoZone=true;
    }catch(e){
     check.status='NOT_VERIFIED';
     check.issue=String(e?.message||e).slice(0,250);
     report.hasIssues=true;
    }finally{
     report.checks.push(check);
     console.log('PROSPER_PUBLIC_HOUSE_MAP_E2E '+JSON.stringify(check));
     await page.close();
    }
   }
  }
 }finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
 }
 report.passes=report.checks.filter(x=>x.status==='PUBLIC_HOUSE_BROWSER_OFFICIAL_GIS_CORROBORATED').length;
 report.status=report.passes===approved.length*2?'PASS_BROWSER_MAP_ONLY':'NO_GO_BROWSER_ISSUES';
 writeFileSync(path.join(OUT,'dashboard-browser-map-e2e.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PROSPER_PUBLIC_HOUSE_MAP_SUMMARY '+JSON.stringify({
  status:report.status,checks:report.checks.length,passed:report.passes,
  independentEnrollmentVerified:0,productionReleaseApproved:false}));
 if(report.status!=='PASS_BROWSER_MAP_ONLY')process.exitCode=1;
}
main().catch(e=>{
 console.error('PROSPER_PUBLIC_HOUSE_MAP_FATAL '+String(e.message||e));
 process.exitCode=1;
});
