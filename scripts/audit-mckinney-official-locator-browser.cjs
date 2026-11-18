#!/usr/bin/env node
'use strict';
// Public district navigation/source availability audit. No residential addresses,
// cookies, credentials, or downloaded attendance rosters are collected.
const {chromium}=require('playwright');
const BASE='https://www.mckinneyisd.net/page/attendance-zones-maps';
const VENDOR='https://portal.metrostudygis.com/arcgis/sharing/rest/content/items/ed198c434d47474b88709e98d1f0a125/data?f=json';
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  const failed=[];
  page.on('requestfailed',r=>{const u=new URL(r.url());
   if(u.hostname==='www.mckinneyisd.net'||u.hostname.endsWith('.thrillshare.com'))
    failed.push({host:u.hostname,path:u.pathname.slice(0,90),failure:r.failure()});
  });
  const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>/26-27 School Locator|2026-27 Zone Maps/i.test(document.body.innerText),
   null,{timeout:45000}).catch(()=>{});
  const district=await page.evaluate(()=>{
   const links=[...document.querySelectorAll('a[href]')].map(a=>({
    label:(a.textContent||a.title||'').trim().replace(/\\s+/g,' ').slice(0,140),
    url:a.href
   })).filter(a=>/school locator|school finder|zone map|attendance/i.test(a.label)||
                 /metrostudy|school.*locator|school.*finder/i.test(a.url));
   const headings=[...document.querySelectorAll('*')].filter(e=>
    e.children.length===0&&/school locator/i.test(e.textContent||'')).slice(0,8)
    .map(e=>({text:e.textContent.trim().slice(0,130),
     parentTag:e.parentElement?.tagName,
     parentHref:e.closest('a')?.href||null}));
   return {title:document.title,has2026Locator:/26-27 School Locator/i.test(document.body.innerText),
    pageLength:document.body.innerText.length,links,headings};
  });
  let vendor={status:null,ok:false,json:false,hasSearchWidget:false};
  try{
   const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),18000);
   const r=await fetch(VENDOR,{signal:ctl.signal,headers:{accept:'application/json'}});clearTimeout(t);
   vendor.status=r.status;vendor.ok=r.ok;
   if(r.ok){
    const j=await r.json();vendor.json=true;
    const s=JSON.stringify(j);
    vendor.hasSearchWidget=/widgets\\/Search\\/Widget|SearchWidget|widget-search/i.test(s);
   }
  }catch(e){vendor.error=String(e.message||e).slice(0,130)}
  console.log('MCKINNEY_2026_LOCATOR_DISCOVERY '+JSON.stringify({
   districtUrl:BASE,htmlStatus:response?.status(),district,
   legacyVendorConfig:vendor,failedRequests:failed.slice(0,8),
   scope:'public-link-discovery-only; no residential address query or certification'
  }));
  if(!district.links.length)process.exitCode=2;
 }catch(e){console.error('LOCATOR_DISCOVERY_BLOCKED '+String(e.stack||e).slice(0,1200));process.exitCode=1}
 finally{await browser?.close().catch(()=>{})}
})();
