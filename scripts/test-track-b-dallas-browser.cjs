#!/usr/bin/env node
'use strict';
// Real publisher GIS and actual dashboard/Leaflet browser: synthetic
// nonresidential interior point. Never tests or records a private house.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),ROOT=process.cwd(),OUT=path.join(ROOT,'artifacts/track-b-dallas');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json','.geojson':'application/geo+json','.css':'text/css; charset=utf-8',
 '.png':'image/png','.svg':'image/svg+xml'};
function serve(req,res){
 try{
  const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(ROOT,'.'+(p==='/'?'/index.html':p));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream',
   'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end()}
}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const server=http.createServer(serve);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});const reports=[];
  for(const width of [1366,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>!!window.DallasAttendanceLive&&typeof useHomeCandidate==='function'&&
    typeof map!=='undefined'&&!!map,null,{timeout:100000});
   const probe=await page.evaluate(async()=>{
    const m=window.DallasAttendanceLive,raw=await m.load();
    const count={elementary:0,middle:0,high:0};
    for(const f of raw.features)count[f.properties.gradeLevel]++;
    let chosen=null;
    const middle=raw.features.filter(f=>f.properties.gradeLevel==='middle');
    const high=raw.features.filter(f=>f.properties.gradeLevel==='high');
    for(const f of raw.features.filter(f=>f.properties.gradeLevel==='elementary')){
     const ring=(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates[0])[0]||[];
     if(!ring.length)continue;
     const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
     const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
     for(let i=1;i<=9&&!chosen;i++)for(let j=1;j<=9&&!chosen;j++){
      const p=[minx+(maxx-minx)*i/10,miny+(maxy-miny)*j/10];
      if(m.inside(p,f.geometry)&&middle.some(a=>m.inside(p,a.geometry))&&high.some(a=>m.inside(p,a.geometry)))chosen=p;
     }
     if(chosen)break;
    }
    return {count,point:chosen,meta:raw.summary.map(a=>({level:a.level,year:a.campusYearConfirmed}))};
   });
   assert.deepEqual(probe.count,{elementary:135,middle:30,high:22});
   assert.ok(probe.point,'source polygons must have a nonresidential 3-grade interior intersection');
   assert.equal(probe.meta.length,3);assert.ok(probe.meta.every(a=>a.year===false));
   await page.evaluate(point=>{
    const synthetic={address:'PUBLIC GIS SYNTHETIC SAMPLE, Dallas, TX',
     savedTypedAddress:'PUBLIC GIS SYNTHETIC SAMPLE, Dallas, TX',
     location:{x:point[0],y:point[1]},score:100,
     savedGeocodeQuality:{usableForSchoolCandidate:true}};
    if(!useHomeCandidate(synthetic))throw Error('dashboard rejected safe reference test point');
   },probe.point);
   await page.locator('#officialDallasCheck').click({timeout:25000});
   try{
    await page.waitForFunction(()=>home?.dallasChecking===false&&home?.dallasSpatial?.status==='ready',null,{timeout:90000});
   }catch(err){
    const diag=await page.evaluate(()=>({spatial:home?.dallasSpatial,status:document.getElementById('dallasSpatialStatus')?.textContent||''}));
    throw Error('Dallas live publisher lookup failed '+JSON.stringify(diag)+' '+String(err));
   }
   const result=await page.evaluate(()=>{
    let popup='';const walk=(o,n)=>{
     if(!o||n>6||popup)return;
     if(o.getPopup?.())popup=String(o.getPopup().getContent()||'');
     if(o.getLayers)for(const child of o.getLayers())walk(child,n+1);
    };
    walk(dallasReferenceLayer,0);
    return {count:dallasReferenceLayer?.getLayers()?.length||0,
     warning:document.querySelector('#officialReviewPanel .reference-gis-warning')?.textContent||'',
     globalWarning:document.querySelector('.reference-gis-global-warning')?.textContent||'',
     result:document.querySelector('#dallasSpatialStatus')?.textContent||'',
     popup,sourceLink:document.querySelector('#officialReviewPanel a[href*="schoolsite-locator"]')?.href||'',
     mapVisible:!!map&&map.getZoom()>0,
     schoolStatus:home?.assignment?.status,
     residentialGrants:window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals,
     names:home?.dallasSpatial?.names||null};
   });
   assert.equal(result.count,3,'three publisher E/M/H polygon overlays must render');
   assert.equal(result.residentialGrants,0);
   assert.ok(!['current','finder-current'].includes(result.schoolStatus));
   assert.match(result.warning,/현재 배정학교가 아닙니다/);
   assert.match(result.warning,/2026–27 배정/);
   assert.match(result.globalWarning,/학교 배정 확정 정보가 아닙니다/);
   assert.match(result.popup,/학교 배정 미인증/);assert.match(result.popup,/원본 수정일/);
   assert.match(result.sourceLink,/^https:\/\/www\.dallasisd\.org\//);
   assert.ok(result.mapVisible);
   assert.deepEqual(Object.keys(result.names).sort(),['elementary','high','middle']);
   await page.locator('#map').screenshot({path:path.join(OUT,'dallas-reference-map-'+width+'.png')});
   await page.evaluate(()=>clearHome());
   const cleared=await page.evaluate(()=>({hasHome:!!home,hasDallasOverlay:!!dallasReferenceLayer}));
   assert.deepEqual(cleared,{hasHome:false,hasDallasOverlay:false});
   assert.equal(errors.length,0,'public dashboard unhandled JS errors: '+errors.join(';'));
   await page.screenshot({path:path.join(OUT,'dallas-reference-dashboard-'+width+'.png')});
   reports.push({viewportWidth:width,loadedTotal:187,threePublisherReferences:result.count,warning:true,
    cleared:true,residentialGrants:0,schoolStatus:result.schoolStatus});
   await page.close();
  }
  fs.writeFileSync(path.join(OUT,'reference-browser-qa.json'),JSON.stringify({
   scope:'publisher-linked historical-reference-only',currentYearEnrollmentCertified:false,
   protectedPersonalAddressesProcessed:false,reports
  },null,2)+'\n');
  console.log('Dallas Track B live publisher GIS browser E2E PASS '+JSON.stringify(reports));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{console.error('DALLAS_TRACK_B_E2E_FAILED',e);process.exitCode=1});
