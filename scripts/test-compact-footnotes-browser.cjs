#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try {
  const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end()}
});
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    return host==='127.0.0.1'||host==='unpkg.com'?route.continue():route.abort('blockedbyclient');
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>!!window.DashboardFootnotes&&document.querySelectorAll('.footnote-ref').length>0,{timeout:60000});
   const initial=await page.evaluate(()=>{
    const original=[...document.querySelectorAll('.footnote-original-hidden')];
    return {closed:!document.getElementById('centralFootnotes').open,
      refs:document.querySelectorAll('.footnote-ref').length,
      sourceCopies:document.querySelectorAll('#sourceFootnotes li').length,
      allHidden:original.every(x=>getComputedStyle(x).display==='none'),
      addressPrivacyRetained:!!document.getElementById('homePrivacy')&&!document.getElementById('homePrivacy').classList.contains('footnote-original-hidden')};
   });
   assert.equal(initial.closed,true);
   assert.ok(initial.refs>0&&initial.sourceCopies>0);
   assert.equal(initial.allHidden,true);
   assert.equal(initial.addressPrivacyRetained,true);
   await page.locator('.footnote-ref').first().click();
   assert.equal(await page.locator('#centralFootnotes').evaluate(e=>e.open),true);
   await page.evaluate(()=>{
     const section=document.createElement('section');
     section.id='syntheticFootnoteRegion';
     section.innerHTML='<p class="source">합성 테스트 전용 각주 문구입니다. 자료 출처와 집계 기준을 설명하는 테스트 문장으로 화면에 긴 내용이 노출되지 않도록 합니다.</p>';
     document.querySelector('.shell').appendChild(section);
   });
   await page.waitForFunction(()=>!!document.querySelector('#syntheticFootnoteRegion .footnote-ref'));
   assert.equal(await page.locator('#syntheticFootnoteRegion .source').evaluate(e=>getComputedStyle(e).display),'none');
   assert.match(await page.locator('#sourceFootnotes').innerText(),/합성 테스트 전용/);
   await page.evaluate(()=>document.getElementById('syntheticFootnoteRegion').remove());
   await page.waitForFunction(()=>!document.getElementById('sourceFootnotes').textContent.includes('합성 테스트 전용'));
   await page.evaluate(()=>document.documentElement.dataset.theme='dark');
   const color=await page.locator('.footnote-ref').first().evaluate(e=>getComputedStyle(e).color);
   assert.equal(color,'rgb(167, 199, 255)');
   assert.ok(!errors.some(x=>/compact-footnotes/i.test(x)),errors.join('\n'));
   console.log('PASS compact footnotes at '+width+'px:',JSON.stringify(initial));
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
run().catch(e=>{console.error(e);process.exitCode=1;server.close()});