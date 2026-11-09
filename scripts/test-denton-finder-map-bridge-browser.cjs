#!/usr/bin/env node
'use strict';
// Real browser cross-check: nine actual official Finder result IDs resolve to
// existing Denton campus markers and correct district 2026-27 PDF references.
// This does NOT infer or fabricate school attendance polygons from addresses.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),ROOT=process.cwd();
const evidence=require('../data/denton-independent-finder-evidence-20261109.json');
const official=require('../denton-official-zone-references.js');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost'),f=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(f).pipe(res);
 }catch{return res.writeHead(400).end()}
});
const unique=[...new Set(evidence.rows.map(x=>x.campusId))];
const dest=path.join(ROOT,'artifacts','denton-finder-map-bridge');
fs.mkdirSync(dest,{recursive:true});
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true});
 const findings=[];
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:850}});
   await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:50000});
   await page.waitForFunction(()=>{
    if(typeof state==='undefined'||!state.ratingIndex||!window.DentonZonePdfReference)return false;
    if(typeof map==='undefined'||typeof zoneGroup==='undefined')return false;
    return window.DentonZonePdfReference.ROWS.length===39&&
      window.DentonZonePdfReference.ROWS.every(row=>state.schools.some(s=>
       s.district==='061901'&&s.type===row.level&&Array.isArray(s.ll)&&scoreRecord(s.name,s.district)?.id===row.id));
   },null,{timeout:65000});
   await page.waitForFunction(()=>document.querySelector('#mapLoadStatus')?.textContent.includes('ZIP 통계 경계 표시'),null,{timeout:65000});
   for(const id of unique){
    const expected=official.ROWS.find(x=>x.id===id);
    assert.ok(expected,'Expected campus not found in PDF source '+id);
    const school=await page.evaluate(id=>{
     const row=state.schools.find(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id===id);
     if(!row||!row.ll)throw Error('Denton campus marker missing '+id);
     state.showSchools=true;state.level='all';state.ratingFilter='all';
     map.stop();map.setView(row.ll,14,{animate:false,zoom:{animate:false},pan:{animate:false}});
     map.invalidateSize();drawSchools();
     return {name:row.name,ll:row.ll,quality:row.campusPointReview};
    },id);
    await page.waitForFunction(ll=>map.getBounds().contains(ll)&&map.getZoom()>=13,school.ll,{timeout:14000});
    await page.evaluate(()=>drawSchools());
    const marker=page.locator('.leaflet-marker-icon[title='+JSON.stringify(school.name)+']').first();
    await marker.waitFor({state:'attached',timeout:12000});
    await marker.click({force:true,timeout:12000});
    await page.waitForFunction(id=>state.selectedSchool&&scoreRecord(state.selectedSchool.name,state.selectedSchool.district)?.id===id,id,{timeout:12000});
    const actual=await page.evaluate(()=>{
     const note=document.querySelector('#zoneNotice');
     return {id:scoreRecord(state.selectedSchool.name,state.selectedSchool.district)?.id,
      school:state.selectedSchool.name,
      level:state.selectedSchool.type,
      markerQuality:state.selectedSchool.campusPointReview,
      pdf:note?.querySelector('.denton-zone-reference a')?.href,
      sourceType:note?.querySelector('.denton-zone-reference')?.dataset.sourceType,
      warning:note?.textContent||'',
      attendanceLayerCount:zoneGroup.getLayers().length};
    });
    assert.equal(actual.id,id);
    assert.equal(actual.level,expected.level);
    assert.equal(actual.pdf,expected.url);
    assert.equal(actual.sourceType,'official-pdf-reference-not-GIS');
    assert.equal(actual.attendanceLayerCount,0,'Finder campus must not create unverified attendance polygons');
    assert.match(actual.warning,/지도 폴리곤 미확보/);
    if(evidence.rows.some(x=>x.campusId===id&&x.historicCampusCoordinateHold)){
      assert.equal(actual.markerQuality,'single-source-historical','Unverified campus point must remain provisional');
      assert.match(actual.warning,/현행 위치 검증은 미완료/);
    }
    findings.push({width,id,school:actual.school,level:actual.level,pdfMatched:true,quality:actual.markerQuality,
      polygonPresent:false,status:'CAMPUS_MARKER_AND_OFFICIAL_PDF_MATCH_FINDER_RESULT_NO_POLYGON_CERTIFICATION'});
    console.log('DENTON_FINDER_MAP_BRIDGE_PASS',JSON.stringify({width,id,school:actual.school,quality:actual.markerQuality,pdfMatched:true,currentPolygon:false}));
    if(id==='061901132'||id==='061901003'){
     await page.locator('#zoneNotice').screenshot({path:path.join(dest,id+'-'+width+'px.png'),animations:'disabled',timeout:18000});
    }
   }
   await page.close();
  }
  assert.equal(findings.length,14);
 }finally{
  await browser.close();
  await new Promise(ok=>server.close(ok));
  fs.writeFileSync(path.join(dest,'bridge-results.json'),JSON.stringify({sourceRun:evidence.githubActionsEvidence,
    finderObservedRows:evidence.rows.length,uniqueSchools:unique.length,verifiedCurrentYearSchoolPolygons:0,
    release:'NO_GO',checks:findings},null,2)+'\n');
 }
 console.log('DENTON_FINDER_MAP_BRIDGE_SUMMARY',JSON.stringify({tested:findings.length,unique:unique.length,
  mobileAndDesktop:true,polygonCertified:0,production:'NO_GO'}));
}
main().catch(e=>{console.error('DENTON_FINDER_MAP_BRIDGE_FAILED',String(e));process.exitCode=1;server.close()});
