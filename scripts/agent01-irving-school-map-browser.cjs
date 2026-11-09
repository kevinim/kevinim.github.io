#!/usr/bin/env node
'use strict';
// QA-only actual Leaflet/browser staging. It does NOT register Irving as a
// current GIS source, test any residential address, or modify app/runtime code.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const ROOT=process.cwd(),OUT=path.join(ROOT,'artifacts/agent01-irving-browser');
const geo=JSON.parse(fs.readFileSync(path.join(ROOT,'artifacts/agent01-irving-gis-stage/QUARANTINED-source-year-unknown.geojson'),'utf8'));
assert.equal(geo.features.length,28,'all historical staging layers must be loaded first');
assert.deepEqual([...new Set(geo.features.map(f=>f.properties.gradeLevel))].sort(),['elementary','high','middle']);
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
   const check=await page.evaluate(async features=>{
    // Only populate the temporary browser state; the district remains absent
    // from the real registry, so all matching geometry must be HISTORICAL.
    const original=state.zoneData['057912'];
    state.zoneData['057912']=features;
    state.showHistoric=true;state.showOldZones=true;
    const grades=['elementary','middle','high'],results=[];
    for(const grade of grades){
     const feature=features.find(f=>f.properties.gradeLevel===grade);
     const bounds=L.geoJSON(feature).getBounds(),point=bounds.getCenter();
     const temp={name:feature.properties.school,type:grade,district:'057912',
       districtName:'Irving ISD — isolated historical GIS QA only',ll:[point.lat,point.lng],
       source:'TEMPORARY CI historical geometry, not current campus address'};
     // Real dashboard schoolClicked handler (not a mocked draw function).
     await schoolClicked(temp);
     const match=window.SchoolBoundaryMatch.findSchoolBoundary(temp,features,()=>null);
     results.push({grade,school:temp.name,match:match.status,leafletLayers:zoneGroup.getLayers().length,
       historicalNotice:document.getElementById('zoneNotice')?.innerText||'',
       officialFinderHref:document.querySelector('#detailContent a.cardlink[href*="f27bba7ee02141c58c8c9375431effa2"]')?.href||null,
       yearVerified:feature.properties.sourceYearVerified,
       currentGISSourceActivated:!!window.DISTRICT_REGISTRY?.['057912']?.zoneKey});
    }
    state.zoneData['057912']=original;
    return results;
   },geo.features);
   for(const c of check){
    assert.equal(c.match,'matched','GIS school-name click match '+c.grade);
    assert.ok(c.leafletLayers>0,'visible Leaflet zone missing '+c.grade);
    assert.equal(c.yearVerified,false);
    assert.equal(c.currentGISSourceActivated,false);
    assert.match(c.historicalNotice,/과거 GIS 경계/);
    assert.match(c.officialFinderHref||'',/^https:\/\/iisd1\.maps\.arcgis\.com\/apps\/instant\/lookup\/index\.html\?appid=f27bba7ee02141c58c8c9375431effa2$/);
   }
   // Browser screenshots are only general public dashboard / temporary QA
   // school sources; there are no personal, residential or student addresses.
   await page.screenshot({path:path.join(OUT,'irving-staging-'+width+'.png'),fullPage:false});
   summaries.push({width,gradeChecks:check.map(c=>({grade:c.grade,matched:c.match,layerCount:c.leafletLayers,historyWarning:true})),pageErrorCount:pageErrors.length});
   await page.close();
  }
  fs.writeFileSync(path.join(OUT,'staging-browser-qa.json'),JSON.stringify({readyForRelease:false,sourceYearVerified:false,independentFinderChecked:false,summary:summaries},null,2)+'\n');
  console.log('Irving historical school-selected Map QA PASS (not residential assignment): '+JSON.stringify(summaries));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
