#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=process.cwd();
const server=http.createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'}[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
 }catch{return res.writeHead(400).end()}
});
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:80000});
   const box=page.locator('#cfbOfficialRezoningReference');
   await box.locator('summary').click();
   const result=await page.evaluate(()=>{
    const d=document.getElementById('cfbOfficialRezoningReference');
    return {expanded:d.open,warning:d.textContent,
     links:[...d.querySelectorAll('a')].map(a=>({url:a.href,rel:a.rel})),
     width:d.getBoundingClientRect().width,scroll:d.scrollWidth,
     grants:window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals};
   });
   assert.equal(result.expanded,true);
   assert.match(result.warning,/GIS 폴리곤이 연결되지 않았으며/);
   assert.match(result.warning,/2025년 3월 6일/);
   assert.equal(result.links.length,2);
   assert.deepEqual(result.links.map(l=>new URL(l.url).origin),['https://www.cfbisd.edu','https://www.cfbisd.edu']);
   assert.ok(result.links.every(l=>l.rel.includes('noopener')));
   assert.equal(result.grants,0);assert.ok(result.scroll<=result.width+16);
   assert.equal(pageErrors.length,0,'Unhandled JS errors');
   const dir=path.join(root,'artifacts','cfb-public-sources');fs.mkdirSync(dir,{recursive:true});
   await box.screenshot({path:path.join(dir,'cfb-approved-2025-source-warning-'+width+'.png'),animations:'disabled'});
   console.log('CFB Track B source-only official links + warning PASS',width);
   await page.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r))}
}
run().catch(e=>{console.error('CFB_OFFICIAL_MAP_REFERENCE_FAILED',e);process.exitCode=1;server.close()});
