#!/usr/bin/env node
'use strict';
// Real Chromium integration with synthetic-only coordinates/name. Not an official
// residence/Finder check. ALL provider requests are blocked before dispatch.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve('dist/public-preview');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json'};
function serve(req,res){
 let name;
 try{name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
 catch{res.writeHead(400).end();return;}
 if(name==='/')name='/index.html';
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404).end();return;
 }
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
  'Cache-Control':'no-store'});
 fs.createReadStream(file).pipe(res);
}
async function main(){
 assert.ok(fs.existsSync(path.join(root,'index.html')),'Build sanitized preview first');
 const server=http.createServer(serve);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 const base='http://127.0.0.1:'+server.address().port+'/';
 const views=[];
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   let blocked=0;
   await page.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    if(host==='127.0.0.1'||host==='unpkg.com')return route.continue();
    blocked++;return route.abort('blockedbyclient');
   });
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>!!window.ConditionalSchoolRelease&&
    !!document.getElementById('homeSchoolInfo'),null,{timeout:45000});
   const verdict=await page.evaluate(()=>{
    const testCandidate={status:'current',district:'FISD',
     features:[{type:'Feature',properties:{school:'SYNTHETIC SCHOOL',
      gradeLevel:'elementary'},geometry:{type:'Polygon',coordinates:[]}}]};
    const preview=window.ConditionalSchoolRelease.apply(testCandidate);
    const original=schoolAssignmentFor;
    schoolAssignmentFor=()=>testCandidate;
    // Non-residential synthetic point. No address or provider query is sent.
    home={ll:[33.11,-96.72],address:'SYNTHETIC PLACEHOLDER',
     geocodeQuality:{usableForSchoolCandidate:true}};
    let rendered=false;
    try{renderHome();rendered=true;}
    finally{schoolAssignmentFor=original;}
    const heading=document.getElementById('homeSchoolInfo').textContent;
    return {rendered,policyStatus:preview.status,homeStatus:home.assignment.status,
     schoolCandidateBlocked:!homeSchoolMatches({district:'FISD',name:'SYNTHETIC SCHOOL',
      type:'elementary'}),
     noSyntheticSchoolNameInUI:!heading.includes('SYNTHETIC SCHOOL'),
     warningShown:heading.includes('학교 자동 배정 미인증'),
     finderSectionShown:heading.includes('학군별 공식 배정 확인'),
     currentAutoApprovals:window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals};
   });
   for(const property of ['rendered','schoolCandidateBlocked','noSyntheticSchoolNameInUI',
    'warningShown','finderSectionShown'])assert.equal(verdict[property],true,
    property+' at '+width);
   assert.equal(verdict.policyStatus,'conditional-finder-only');
   assert.equal(verdict.homeStatus,'conditional-finder-only');
   assert.equal(verdict.currentAutoApprovals,0);
   views.push({width,uiWarning:true,syntheticUnreviewedSchoolBlocked:true,
    networkCallsBlocked:blocked});
   await page.close();
  }
 }finally{
  await browser?.close().catch(()=>{});
  await new Promise(r=>server.close(r));
 }
 fs.mkdirSync('artifacts/release',{recursive:true});
 fs.writeFileSync('artifacts/release/conditional-browser.json',JSON.stringify({
  status:'PASS',scope:'INFORMATIONAL_ONLY',syntheticOnly:true,views,
  realOfficialFinderVerification:false,productionDeployment:false
 },null,2)+'\n');
 console.log('PASS conditional information-only browser fail-closed residential school UI');
}
main().catch(err=>{
 // Browser URL, query and input must not appear in logs.
 console.error('FAIL conditional informational-only browser:',err.name||'Error');
 process.exitCode=1;
});
