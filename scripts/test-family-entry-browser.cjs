#!/usr/bin/env node
'use strict';
// Browser smoke of a PUBLIC holding page; contains no family data and NO login link
// until Access protection is independently verified.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve('dist/family-entry-preview');
async function main(){
 assert.deepEqual(fs.readdirSync(root).sort(),['index.html','robots.txt']);
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  const files={'/':'index.html','/index.html':'index.html','/robots.txt':'robots.txt'};
  const f=files[u.pathname];
  if(!f){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':f==='index.html'?'text/html; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store'});
  res.end(fs.readFileSync(path.join(root,f)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 let browser;
 const views=[];
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [320,390,1280]){
   const page=await browser.newPage({viewport:{width,height:860}});
   const requests=[];
   page.on('request',r=>requests.push(r.url()));
   await page.goto(url,{waitUntil:'load'});
   const state=await page.evaluate(()=>({
    headline:document.querySelector('h1')?.textContent,
    hasDashboard:!!document.querySelector('#map,#homeAddress,script,iframe'),
    hasExternalLinks:[...document.querySelectorAll('a[href^="https://"]')].length>0,
    scrollWidth:document.documentElement.scrollWidth,
    title:document.title,
    text:document.body.textContent
   }));
   assert.match(state.headline||'',/가족용 지도/);
   assert.match(state.text,/아직 연결되지 않았습니다/);
   assert.equal(state.hasDashboard,false);
   assert.equal(state.hasExternalLinks,false);
   assert.ok(state.scrollWidth<=width+1,'Horizontal overflow at '+width);
   assert.ok(requests.every(r=>r.startsWith(url)),'Unexpected external request');
   views.push({width,passed:true,requests:requests.length});
   await page.close();
  }
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
 fs.mkdirSync('artifacts/security',{recursive:true});
 fs.writeFileSync('artifacts/security/family-entry-browser.json',JSON.stringify({status:'PASS',views,cutoverPerformed:false},null,2)+'\n');
 process.stdout.write('Family gateway browser smoke passed at 320px/390px/1280px. No external URLs or deployment.\n');
}
main().catch(e=>{process.stderr.write('Family gateway browser smoke failed: '+e.message+'\n');process.exitCode=1;});
