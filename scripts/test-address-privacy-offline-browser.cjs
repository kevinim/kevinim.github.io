#!/usr/bin/env node
'use strict';
// Agent 06: deterministic synthetic-only privacy/outage test of the isolated public preview.
// Never use or log a residential address. All address/provider requests are intercepted.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve('dist/public-preview');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json'};
function serve(req,res){
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
 catch{res.writeHead(400).end();return;}
 if(pathname==='/')pathname='/index.html';
 const file=path.resolve(root,'.'+pathname);
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
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 let browser;
 const reports=[];
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}});
   let externalBlocked=0,loggedInput=false;
   page.on('console',msg=>{if(msg.text().includes('Test'))loggedInput=true;});
   await page.route('**/*',route=>{
    const host=new URL(route.request().url()).hostname;
    if(host==='127.0.0.1'||host==='unpkg.com')return route.continue();
    externalBlocked++;
    return route.abort('blockedbyclient');
   });
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#homeAddress').waitFor({timeout:45000});
   await page.waitForFunction(()=>document.querySelector('#map.leaflet-container')!==null,
    null,{timeout:45000});
   await page.locator('#workplacesPanel > summary').click();
   await page.locator('#workplaceName').fill('Synthetic office');
   await page.locator('#workplaceAddress').fill('00000 Synthetic Office Road, TX 00000');
   assert.equal(await page.evaluate(()=>localStorage.getItem('tx-dashboard-workplaces-v1')),null,
    'typing a workplace must not save it');
   await page.locator('#workplaceSave').click();
   await page.waitForFunction(()=>window.WorkplaceDestinations?.list().length===1);
   // Artificial search prefix, never a residence or person. Provider call cannot leave browser.
   await page.locator('#homeAddress').fill('Test');
   await page.waitForTimeout(950);
   assert.equal(await page.locator('#homeClear').isVisible(),true);
   await page.locator('#homeClear').click();
   const outcome=await page.evaluate(async()=>{
    let databases=[];
    if(indexedDB.databases)databases=(await indexedDB.databases()).map(x=>x.name);
    return {
     cleared:document.getElementById('homeAddress').value==='',
     suggestionsHidden:document.getElementById('homeSuggestions').hidden,
     mapPresent:!!document.querySelector('#map.leaflet-container'),
     expectedKeysOnly:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i))
       .every(key=>['tx-dashboard-theme-v1','tx-dashboard-workplaces-v1'].includes(key)),
     intentionalWorkplaceOnly:(()=>{
      const saved=JSON.parse(localStorage.getItem('tx-dashboard-workplaces-v1')||'[]');
      return saved.length===1&&saved[0].name==='Synthetic office'
       &&saved[0].address==='00000 Synthetic Office Road, TX 00000'
       &&Object.keys(saved[0]).sort().join(',')==='address,id,name';
     })(),
     noTypedHomeInStorage:![...Array(localStorage.length)].some((_,i)=>
      String(localStorage.getItem(localStorage.key(i))).includes('Test')),
     sessionEmpty:sessionStorage.length===0,
     noCookies:document.cookie==='',
     indexedDbEmpty:databases.length===0,
     cleanUrl:location.pathname==='/'&&!location.search&&!location.hash
    };
   });
   for(const [key,value] of Object.entries(outcome))assert.equal(value,true,key+' failed at '+width);
   assert.equal(loggedInput,false,'synthetic typed input reached console output');
   assert.ok(externalBlocked>0,'test did not intercept provider and map requests');
   await page.reload({waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>window.WorkplaceDestinations?.list().length===1);
   assert.equal(await page.locator('#homeAddress').inputValue(),'','home input survived reload');
   await page.locator('#workplacesPanel > summary').click();
   await page.locator('.workplace-entry-actions button').nth(2).click();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tx-dashboard-workplaces-v1')).length),0,
    'explicitly deleting a saved workplace must remove its address');
   reports.push({width,externalCallsBlocked:externalBlocked,
    addressCleared:true,persistentHomeStorage:false,explicitWorkplaceSaveOnly:true,
    workplaceSurvivesReload:true,workplaceDeletion:true,offlineMapShell:true});
   await page.close();
  }
 }finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
 }
 fs.mkdirSync('artifacts/security',{recursive:true});
 fs.writeFileSync('artifacts/security/agent06-browser-privacy.json',
  JSON.stringify({status:'PASS',syntheticOnly:true,providerNetwork:'blocked',views:reports},null,2)+'\n');
 console.log('PASS Agent 06 synthetic-only address privacy and third-party outage smoke');
}
main().catch(error=>{
 // Never emit raw browser URLs or input values in error logs.
 console.error('FAIL Agent 06 browser privacy/outage assertion:',error.name||'Error');
 process.exitCode=1;
});
