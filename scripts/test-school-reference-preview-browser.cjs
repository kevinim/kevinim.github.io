#!/usr/bin/env node
'use strict';
// Opt-in reference UX E2E using synthetic fake campuses and local static assets.
// Every third-party endpoint is blocked; no real residential address is collected.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end()}
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const folder=path.join(root,'artifacts','school-reference-preview');fs.mkdirSync(folder,{recursive:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[],external=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>{
    const hostname=new URL(route.request().url()).hostname;
    if(hostname==='127.0.0.1'||hostname==='unpkg.com')return route.continue();
    external.push(hostname);return route.abort('blockedbyclient');
   });
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>typeof renderHome==='function'&&!!window.SchoolReferencePreview&&
     !!window.ConditionalSchoolRelease&&!!document.getElementById('homeSchoolInfo'),null,{timeout:60000});
   const before=await page.evaluate(()=>{
    const original=schoolAssignmentFor;
    const candidate={status:'current',district:'FISD',features:[
     {type:'Feature',properties:{school:'SYNTHETIC <img onerror=alert(1)> ELEMENTARY',gradeLevel:'elementary',grades:'K–5'},
      geometry:{type:'Polygon',coordinates:[[[-96.81,33],[-96.80,33],[-96.80,33.01],[-96.81,33]]] }},
     {type:'Feature',properties:{school:'SYNTHETIC MIDDLE',gradeLevel:'middle'},
      geometry:{type:'Polygon',coordinates:[[[-96.81,33],[-96.80,33],[-96.80,33.01],[-96.81,33]]] }},
     {type:'Feature',properties:{school:'SYNTHETIC HIGH',gradeLevel:'high'},
      geometry:{type:'Polygon',coordinates:[[[-96.81,33],[-96.80,33],[-96.80,33.01],[-96.81,33]]] }}
    ]};
    // Keep the synthetic source installed until the actual Chromium click.
    // Asynchronous initial GIS loads can re-render this panel in the meantime.
    window.__referenceOriginalAssignment=original;
    schoolAssignmentFor=()=>candidate;
    home={address:'SYNTHETIC TEST LOCATION',ll:[33.1,-96.8],
      geocodeQuality:{usableForSchoolCandidate:true},parcel:{status:'idle'}};
    renderHome();
    const box=document.getElementById('homeSchoolInfo');
    return {hasToggle:!!box.querySelector('#homeReferencePreviewToggle'),
      containsSchool:box.textContent.includes('SYNTHETIC HIGH'),
      homeStatus:home.assignment.status,
      noAssignedMarker:!homeSchoolMatches({district:'FISD',type:'high',name:'SYNTHETIC HIGH'})};
   });
   assert.equal(before.hasToggle,true);
   assert.equal(before.containsSchool,false,'Preview must never auto-display reference names');
   assert.equal(before.homeStatus,'conditional-finder-only');
   assert.equal(before.noAssignedMarker,true);
   await page.locator('#homeReferencePreviewToggle').click();
   const shown=await page.evaluate(()=>{
    const box=document.getElementById('homeSchoolInfo');
    const result=document.getElementById('homeReferencePreviewResult');
    const link=result.querySelector('a');
    return {visible:result.getClientRects().length>0,
      title:result.textContent.includes('실제 배정 미인증'),
      campus:result.textContent.includes('SYNTHETIC HIGH'),
      rawHtmlInjected:!!result.querySelector('img'),
      source:result.textContent.includes('2026–27'),
      linkHref:link?.href,linkRel:link?.rel,
      status:home.assignment.status,expanded:document.getElementById('homeReferencePreviewToggle').getAttribute('aria-expanded'),
      docWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
      noAssignedMarker:!homeSchoolMatches({district:'FISD',type:'high',name:'SYNTHETIC HIGH'})};
   });
   assert.equal(shown.visible,true);
   assert.equal(shown.title,true);
   assert.equal(shown.campus,true);
   assert.equal(shown.rawHtmlInjected,false);
   assert.equal(shown.source,true);
   assert.match(shown.linkHref,/^https:\/\/www\.friscoisd\.org\//);
   assert.match(shown.linkRel,/noopener noreferrer/);
   assert.equal(shown.status,'conditional-finder-only');
   assert.equal(shown.expanded,'true');
   assert.equal(shown.noAssignedMarker,true);
   assert.ok(shown.docWidth<=shown.clientWidth+2,'No horizontal overflow');
   await page.locator('#homeSchoolInfo').screenshot({path:path.join(folder,'reference-'+width+'.png')});
   await page.evaluate(()=>{schoolAssignmentFor=window.__referenceOriginalAssignment;
    delete window.__referenceOriginalAssignment;});
   const hardBlock=await page.evaluate(()=>{
    const original=schoolAssignmentFor;
    schoolAssignmentFor=()=>({status:'apartment-split-review',district:'AISD',exception:{note:'SYNTHETIC SPLIT'}});
    home={address:'SYNTHETIC SPLIT TEST',ll:[33.1,-96.8],
      geocodeQuality:{usableForSchoolCandidate:true},parcel:{status:'idle'}};
    try{renderHome()}finally{schoolAssignmentFor=original}
    return {noToggle:!document.getElementById('homeReferencePreviewToggle'),
      noPreview:!document.getElementById('homeSchoolInfo').textContent.includes('SYNTHETIC HIGH'),
      homeStatus:home.assignment.status};
   });
   assert.equal(hardBlock.noToggle,true);
   assert.equal(hardBlock.noPreview,true);
   assert.equal(hardBlock.homeStatus,'apartment-split-review');
   await page.evaluate(()=>clearHome());
   assert.equal(await page.locator('#homeSchoolInfo').innerText(),'');
   assert.deepEqual(errors,[],'Unhandled browser exceptions');
   console.log('PASS opt-in GIS reference preview at '+width+'px; external endpoints blocked '+external.length);
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(err=>{console.error('FAIL reference preview browser: '+err.message);process.exitCode=1;server.close()});
