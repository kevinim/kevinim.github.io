#!/usr/bin/env node
'use strict';
// Local isolated Chromium against the exact PR filesystem. Read-only; never
// clicks an address, never submits coordinates, never edits app files.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {auditLinkage,CORE}=require('./school-polygon-linkage-audit.cjs');
const ROOT=process.cwd();
const FOLDER=path.join(ROOT,'artifacts/school-linkage');
const CONTENT={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
function serve(req,res){
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(ROOT+path.sep))return res.writeHead(403).end();
  if(!fs.existsSync(target)||!fs.statSync(target).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':CONTENT[path.extname(target)]||'application/octet-stream',
    'Cache-Control':'no-store'});
  fs.createReadStream(target).pipe(res);
 }catch{return res.writeHead(400).end();}
}
async function browserCapture(page){
 return page.evaluate(()=>{
  const TYPES=new Set(['elementary','middle','high']);
  const schools=state.schools.filter(s=>TYPES.has(s.type));
  const districts=[...new Set(['FISD','PISD','AISD','LISD','PROSPER','CFB','043907',
    ...schools.map(s=>s.district)])];
  const sources=districts.map(district=>{
    const registry=window.DISTRICT_REGISTRY?.[district];
    const sourceKey=window.SchoolBoundaryMatch.boundarySchoolSource(district);
    const list=state.zoneData[sourceKey]||[];
    const gradeCounts={elementary:0,middle:0,high:0,senior:0};
    for(const f of list)if(Object.hasOwn(gradeCounts,f.properties?.gradeLevel))
      gradeCounts[f.properties.gradeLevel]++;
    return {district,sourceKey,
      polygonCount:list.length,gradeCounts,sourceConfigured:!!registry?.zoneKey,
      sourceLoadError:!!state.zoneLoadErrors[sourceKey],
      liveFinderConfirmed:!!state.liveFinder[sourceKey]};
  });
  const rows=schools.map(s=>{
    const sourceKey=window.SchoolBoundaryMatch.boundarySchoolSource(s.district);
    const feats=state.zoneData[sourceKey]||[];
    const m=window.SchoolBoundaryMatch.findSchoolBoundary(s,feats,
      (name,district)=>scoreRecord(name,district));
    const levels=window.SchoolBoundaryMatch.boundaryGradeLevels(s.type);
    const eligible=feats.filter(f=>levels.includes(f?.properties?.gradeLevel));
    const id=String(s.id||'');
    const idEvidence=!!id&&id.length>=8&&eligible.some(f=>
      String(f.properties?.campusId||'')===id);
    // Hints only: surname may be shared; never auto-link a polygon based on this.
    const key=window.SchoolBoundaryMatch.boundarySchoolKey(s.name);
    const surname=key.split(' ').at(-1)||'';
    const nameEvidence=surname.length>=5&&eligible.some(f=>{
      const source=window.SchoolBoundaryMatch.boundarySchoolKey(f?.properties?.school);
      return source===surname||source.split(' ').at(-1)===surname;
    });
    return {school:s.name,district:s.district,type:s.type,
      matchStatus:m.status,polygonCount:feats.length,eligiblePolygonCount:m.eligible,
      sourceConfigured:!!window.DISTRICT_REGISTRY?.[s.district]?.zoneKey,
      sourceLoadError:!!state.zoneLoadErrors[sourceKey],
      liveFinderConfirmed:!!state.liveFinder[sourceKey],idEvidence,nameEvidence};
  });
  const renderChecks=[];
  const chosen=new Set(),original=state.selectedSchool,oldHistoric=state.showHistoric,
    oldOldZones=state.showOldZones;
  for(const s of schools){
    const r=rows.find(row=>row.district===s.district&&row.school===s.name&&row.type===s.type);
    if(!r||r.matchStatus!=='matched'||!Array.isArray(s.ll)||!window.map&&typeof map==='undefined')continue;
    const key=s.district+'|'+s.type;
    if(chosen.has(key))continue;
    chosen.add(key);
    try{
      state.selectedSchool=s;state.showOldZones=true;state.showHistoric=true;
      drawBoundary();
      const n=zoneGroup?.getLayers()?.length||0;
      renderChecks.push({district:s.district,school:s.name,status:n>0?'passed':'failed',
        actualLayers:n,reason:n>0?null:'matched-geometry-not-rendered'});
    }catch{
      renderChecks.push({district:s.district,school:s.name,status:'failed',
        actualLayers:0,reason:'drawing-exception'});
    }
  }
  state.selectedSchool=original;state.showHistoric=oldHistoric;state.showOldZones=oldOldZones;
  if(map)drawBoundary();
  return {rows,sources,renderChecks,browserLoaded:state.zoneReady,runMode:'isolated-pr'};
 });
}
async function main(){
 fs.mkdirSync(FOLDER,{recursive:true});
 const server=http.createServer(serve);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 let browser,report;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:920},deviceScaleFactor:1});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true,null,{timeout:110000});
  const input=await browserCapture(page);
  report=auditLinkage(input);
  if(report.coverage.totalLoadedDirectory<200||report.topSix.totalLoadedDirectory<200)
    throw Error('Loaded directory too small for six-district coverage audit');
  for(const code of CORE){
    if(report.byDistrict[code].totalLoadedDirectory===0)
      throw Error('Zero schools loaded for required target district '+code);
  }
  if(report.coverage.sampledRenderChecks===0)
    throw Error('No real map polygon render checks performed');
  fs.writeFileSync(path.join(FOLDER,'school-polygon-linkage-census.json'),
    JSON.stringify(report,null,2)+'\n');
  process.stdout.write('SCHOOL_LINKAGE_AUDIT '+JSON.stringify({
    status:report.status,coverage:report.coverage,topSix:report.topSix,
    reasons:report.reasons
  })+'\n');
  for(const code of Object.keys(report.byDistrict)){
    const d=report.byDistrict[code];
    process.stdout.write('SCHOOL_LINKAGE_DISTRICT '+JSON.stringify({
      district:code,total:d.totalLoadedDirectory,matched:d.linked,unmatched:d.unmatched,
      percent:d.matchRateLoadedPercent,counts:d.statusCounts,
      polygons:d.source?.polygonCount,live:d.source?.liveFinderConfirmed,
      fetchError:d.source?.sourceLoadError,mode:d.limitation
    })+'\n');
  }
  process.stdout.write('SCHOOL_LINKAGE_RENDER '+JSON.stringify(report.renderChecks)+'\n');
  if(report.blocked)throw Error('Actual polygon rendering defect detected; inspect report');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
main().catch(e=>{
 process.stderr.write('School polygon linkage audit requires review: '+e.message+'\n');
 process.exitCode=1;
});
