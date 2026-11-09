#!/usr/bin/env node
'use strict';
/*
 * Prove what the CURRENT CSP actually permits and why removing unsafe-inline
 * needs a planned JS refactor. Isolated in-memory Chromium document only:
 * NO navigation to the real dashboard and NO outgoing network requests.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {checkCurrentRepo}=require('./audit-csp-readiness.cjs');

function documentFor(policy){
 const escaped=policy.replaceAll('&','&amp;').replaceAll('"','&quot;');
 return '<!doctype html><html><head>'+
  '<meta http-equiv="Content-Security-Policy" content="'+escaped+'">'+
  '</head><body>'+
  '<script>window.__testInlineBootstrap=(window.__testInlineBootstrap||0)+1</script>'+
  '<img src="data:image/png;base64,YmFk" onerror="window.__testInlineHandler=(window.__testInlineHandler||0)+1">'+
  '<div id="result">CSP isolated test</div></body></html>';
}
async function inspect(browser,policy,width){
 const page=await browser.newPage({viewport:{width,height:700}});
 const violations=[];
 page.on('console',()=>{}); // CSP messages can appear without causing test failure.
 await page.route('**/*',route=>route.abort()); // never call untrusted hosts
 try{
  await page.setContent(documentFor(policy),{waitUntil:'load'});
  await page.waitForTimeout(160);
  const first=await page.evaluate(()=>({
    bootstrap:window.__testInlineBootstrap||0,
    handler:window.__testInlineHandler||0,
  }));
  // A script from an unapproved origin should be rejected by script-src.
  await page.evaluate(()=>{
    window.__testCspViolations=[];
    document.addEventListener('securitypolicyviolation',e=>{
      window.__testCspViolations.push({directive:e.violatedDirective,blocked:e.blockedURI});
    });
    const s=document.createElement('script');
    s.src='https://unapproved.example.invalid/script.js';
    document.head.appendChild(s);
  });
  await page.waitForFunction(()=>window.__testCspViolations?.length>0,{timeout:3000});
  const blocked=await page.evaluate(()=>window.__testCspViolations);
  assert.ok(blocked.some(x=>x.directive.startsWith('script-src')),
    'the script-src rule must block scripts from an unapproved host');
  return {first,blockedCount:blocked.length,blockedDirectives:blocked.map(x=>x.directive)};
 }finally{await page.close();}
}

(async()=>{
 const reports=checkCurrentRepo();
 assert.ok(reports.every(r=>r.errors.length===0),'cannot test a malformed baseline CSP');
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const report of reports){
   const baseline=report.summary.policy;
   assert.match(baseline,/'unsafe-inline'/,'baseline changed: update security expectations');
   const strict=baseline.replace(/\s*'unsafe-inline'/g,'');
   for(const width of [390,1280]){
    const actual=await inspect(browser,baseline,width);
    assert.equal(actual.first.bootstrap,1,
      'existing inline application bootstrap should be permitted by current CSP');
    assert.equal(actual.first.handler,1,
      'current unsafe-inline policy still permits inline event attribute execution');
    const tightened=await inspect(browser,strict,width);
    assert.equal(tightened.first.bootstrap,0,
      'strict script-src should prevent inline script execution');
    assert.equal(tightened.first.handler,0,
      'strict script-src should prevent inline event handler execution');
    console.log('PASS '+report.name+' width='+width+
      ' current inline JS/event allowed, unapproved host blocked; stricter CSP blocks both');
   }
  }
  console.log('PASS 4 real Chromium CSP comparison scenarios (two pages x two viewports).');
  console.log('NOT FIXED: current public CSP allows unsafe-inline; harden only after externalizing scripts/handlers and regression testing.');
 }finally{await browser?.close();}
})().catch(e=>{console.error('CSP browser QA failed:',e.stack||String(e));process.exitCode=1});
