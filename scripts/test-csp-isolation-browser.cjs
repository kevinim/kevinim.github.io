#!/usr/bin/env node
'use strict';
/*
 * Compare the current PR89 strict, hash-locked CSP with a deliberately weakened
 * counterfactual in isolated browser documents. No live dashboard navigation,
 * no external requests, no personal inputs, no attack destinations.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {checkCurrentRepo}=require('./audit-csp-readiness.cjs');

function documentFor(policy){
 return '<!doctype html><html><head>'+
  '<meta http-equiv="Content-Security-Policy" content="'+policy.replaceAll('"','&quot;')+'">'+
  '</head><body>'+
  '<script>window.__testInlineBootstrap=(window.__testInlineBootstrap||0)+1</script>'+
  '<img src="data:image/png;base64,YmFk" onerror="window.__testInlineHandler=(window.__testInlineHandler||0)+1">'+
  '<div id="result">Isolated CSP probe</div></body></html>';
}
function weakenForCounterfactual(baseline){
 // Remove the exact hash and script-src-attr prohibition. This intentionally
 // models the OLD policy, never a policy recommendation or a runtime change.
 const loosened=baseline
  .replace(/'sha256-[A-Za-z0-9+/]+=*'/g,"'unsafe-inline'")
  .replace(/;\s*script-src-attr 'none'/g,'');
 assert.match(loosened,/'unsafe-inline'/);
 assert.doesNotMatch(loosened,/script-src-attr/);
 return loosened;
}
async function inspect(browser,policy,width){
 const page=await browser.newPage({viewport:{width,height:700}});
 await page.route('**/*',route=>route.abort());
 try{
  await page.setContent(documentFor(policy),{waitUntil:'load'});
  await page.waitForTimeout(160);
  const flags=await page.evaluate(()=>({
   bootstrap:window.__testInlineBootstrap||0,handler:window.__testInlineHandler||0
  }));
  const blocked=await page.evaluate(()=>new Promise(resolve=>{
   const seen=[];
   document.addEventListener('securitypolicyviolation',e=>{
    if(e.violatedDirective.startsWith('script-src'))seen.push(e.violatedDirective);
    if(seen.length)resolve(seen);
   },{once:true});
   const script=document.createElement('script');
   script.src='https://unapproved.example.invalid/script.js';
   document.head.appendChild(script);
   setTimeout(()=>resolve(seen),2500);
  }));
  assert.ok(blocked.some(x=>x.startsWith('script-src')),
   'CSP must block an unapproved remote script');
  return flags;
 }finally{await page.close();}
}
(async()=>{
 let browser;
 try{
  const pages=checkCurrentRepo();
  assert.ok(pages.every(x=>!x.errors.length));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const p of pages){
   assert.equal(p.summary.allowsUnsafeInline,false,'Current CSP must remain strict');
   assert.equal(p.summary.inlineHashes,1,'Current inline bootstrap must remain hash-locked');
   const older=weakenForCounterfactual(p.summary.policy);
   for(const width of [390,1280]){
    const secure=await inspect(browser,p.summary.policy,width);
    assert.deepEqual(secure,{bootstrap:0,handler:0},
      'Current hash-lock + script-src-attr must reject unrelated inline JS and HTML handlers');
    const permissive=await inspect(browser,older,width);
    assert.deepEqual(permissive,{bootstrap:1,handler:1},
      'Loosening CSP reproduces the old inline execution weakness');
    console.log('PASS '+p.name+' width='+width+' strict hash CSP rejects injection, older permissive policy executes it');
   }
  }
  console.log('PASS 4 real Chromium CSP comparison scenarios (two pages x two viewports).');
  console.log('LIMITATION: in-memory probes do not replace full app source-to-sink analysis or header-level CSP tests.');
 }finally{await browser?.close();}
})().catch(e=>{console.error('CSP browser QA failed:',e.stack||String(e));process.exitCode=1});
