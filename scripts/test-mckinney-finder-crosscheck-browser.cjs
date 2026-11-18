#!/usr/bin/env node
'use strict';
// Synthetic McKinney Finder GIS browser QA; no real residential address.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
   'Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end()}
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const base='http://127.0.0.1:'+server.address().port+'/';
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1'||url.hostname==='unpkg.com')return route.continue();
    return route.abort('blockedbyclient');
   });
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>typeof renderHome==='function'&&
    typeof window.McKinneyFinderCrosscheck?.crosscheck==='function'&&
    !!document.getElementById('homeAssignmentPriority')&&!!state.schools,null,{timeout:60000});
   const overview=await page.evaluate(()=>{
    window.__mckinneyPriorAssignment=schoolAssignmentFor;
    const fake=(level,school,id,year='2026-27')=>({
     type:'Feature',properties:{gradeLevel:level,school,campusId:id,
      sourceYearRaw:year,sourceYear:year,
      ...(level==='elementary'?{verifiedYear:'2026-27'}:{})},
     geometry:{type:'MultiPolygon',coordinates:[[[[-96.7,33.1],[-96.6,33.1],[-96.6,33.2],[-96.7,33.1]]]]}
    });
    const records=[
      ['elementary','SYNTHETIC <img src=x onerror=alert(1)> ELEM','043907101'],
      ['middle','SYNTHETIC MID','043907102'],
      ['high','SYNTHETIC HIGH','043907103']
    ];
    window.__mckinneyRaw={
      district:'043907',status:'finder-current',
      features:records.map(([level,school,id])=>fake(level,school,id))
    };
    schoolAssignmentFor=()=>window.__mckinneyRaw;
    state.liveFinder['043907']=true;
    state.schools=records.map(([type,name,id])=>({type,name,id,district:'043907',ll:[33.1,-96.7]}));
    state.ratings=records.map(([type,name,id])=>({type,name,id,district:'043907',
     rating:'A',score:91}));
    home={address:'SYNTHETIC ADDRESS — NO REAL RESIDENCE',ll:[33.15,-96.65],
      geocodeQuality:{usableForSchoolCandidate:true},parcel:{status:'idle'}};
    renderHome();drawSchools();drawList();
    const priority=document.getElementById('homeAssignmentPriority');
    const link=[...priority.querySelectorAll('a')].find(a=>a.href.startsWith('https://www.mckinneyisd.net/'));
    return {
     visible:!priority.hidden,
     status:document.getElementById('homeAssignmentPriorityStatus').textContent,
     count:priority.querySelectorAll('.home-assignment-school').length,
     safe:!priority.querySelector('img')&&!priority.querySelector('script'),
     source:priority.textContent.includes('Campus ID')&&priority.textContent.includes('2026–27'),
     officialLink:link?.href,
     listCount:document.querySelectorAll('#schoolList button.school').length,
     markers:schoolGroup.getLayers().length,
     conditional:home.assignment.status,
     docWidth:document.documentElement.scrollWidth,
     clientWidth:document.documentElement.clientWidth
    };
   });
   assert.equal(overview.visible,true,'McKinney official GIS evidence shown in address priority panel');
   assert.match(overview.status,/GIS 후보 · 배정 미인증/);
   assert.equal(overview.count,3,'E/M/H source names are shown individually');
   assert.equal(overview.safe,true,'School name remains inert DOM text');
   assert.equal(overview.source,true);
   assert.match(overview.officialLink,/^https:\/\/www\.mckinneyisd\.net\//);
   assert.equal(overview.listCount,0,'Reference names never become assigned-school rows');
   assert.equal(overview.markers,0,'Reference names never become assigned-school markers');
   assert.equal(overview.conditional,'conditional-finder-only');
   assert.ok(overview.docWidth<=overview.clientWidth+3,'Mobile/desktop width has no overflow');
   const stale=await page.evaluate(()=>{
    window.__mckinneyRaw.features[1].properties.sourceYearRaw='2025-26';
    renderHome();drawSchools();drawList();
    return {status:document.getElementById('homeAssignmentPriorityStatus').textContent,
      cards:document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school').length};
   });
   assert.equal(stale.cards,0,'Stale middle school source cannot display candidate');
   assert.match(stale.status,/배정 미확인|미인증/);
   const wrong=await page.evaluate(()=>{
    window.__mckinneyRaw.district='FISD';
    renderHome();drawSchools();drawList();
    return {
      state:home.mckinneyCrosscheck?.code,
      cards:document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school').length};
   });
   assert.equal(wrong.state,'other-district');
   assert.equal(wrong.cards,0,'A McKinney postal city cannot force McKinney ISD');
   await page.evaluate(()=>{
    schoolAssignmentFor=window.__mckinneyPriorAssignment;
    delete window.__mckinneyPriorAssignment;
    delete window.__mckinneyRaw;
    clearHome();
   });
   assert.equal(await page.locator('#homeAssignmentPriority').evaluate(e=>e.hidden),true);
   assert.deepEqual(errors,[],'Unhandled browser exceptions');
   console.log('PASS McKinney Finder GIS source/TEA/label/fallback at '+width+'px');
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(err=>{console.error('FAIL McKinney Finder browser: '+err.message);
 process.exitCode=1;server.close()});
