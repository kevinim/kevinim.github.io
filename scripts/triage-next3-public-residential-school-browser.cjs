#!/usr/bin/env node
'use strict';
// Human-style real-browser reconnaissance. Only PUBLICLY ADVERTISED residential
// addresses; never scrape bulk Finder data or save a student's/private address.
// Results are explicitly TRIAGE, not 2026-27 attendance certification.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=process.cwd(),OUT='artifacts/next3-residential-qa';
fs.mkdirSync(OUT,{recursive:true});
const samples=[
 {id:'plano-baldwin',district:'PISD',address:'4661 Baldwin Ln, Plano, TX 75024',source:'https://www.realtor.com/apartments/75024/type-single-family-home'},
 {id:'plano-durham',district:'PISD',address:'4704 Durham Dr, Plano, TX 75093',source:'https://www.realtor.com/apartments/75093/type-single-family-home'},
 {id:'plano-marshall',district:'PISD',address:'4204 Marshall Ct, Plano, TX 75093',source:'https://www.realtor.com/apartments/75093/type-single-family-home'},
 {id:'lisd-hamilton',district:'LISD',address:'430 Hamilton St, Lewisville, TX 75067',source:'https://www.realtor.com/apartments/75067/type-single-family-home'},
 {id:'lisd-hunt',district:'LISD',address:'460 Hunt Dr, Lewisville, TX 75067',source:'https://www.realtor.com/apartments/75067/type-single-family-home'},
 {id:'lisd-barrington',district:'LISD',address:'134 Barrington Ln, Lewisville, TX 75067',source:'https://www.realtor.com/apartments/75067/type-single-family-home'},
 {id:'mck-sunflower',district:'043907',address:'4727 Sunflower Dr, McKinney, TX 75070',source:'https://www.realtor.com/apartments/75070/type-single-family-home'},
 {id:'mck-montevista',district:'043907',address:'4801 Monte Vista Ln, McKinney, TX 75070',source:'https://www.realtor.com/rentals/details/4801-Monte-Vista-Ln_McKinney_TX_75070_M70009-24317'},
 {id:'mck-mariner',district:'043907',address:'3700 Mariner St, McKinney, TX 75070',source:'https://www.realtor.com/rentals/details/3700-Mariner-St_Mc-Kinney_TX_75070_M89700-44276'}
];
const sources=[
 {district:'PISD',url:'https://webservice.pisd.edu/SchoolFinderForSchoolWires/',name:'Plano direct public feeder Finder'},
 {district:'LISD',url:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=8b1628e7345e4a98a4dcf6c852581656',name:'Lewisville 2026-27 live locator linked from official district page'},
 {district:'043907',url:'https://portal.metrostudygis.com/arcgis/apps/webappviewer/index.html?id=ed198c434d47474b88709e98d1f0a125',name:'McKinney 2026-27 GIS locator'}
];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.css':'text/css'};
const server=http.createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+(p==='/'?'/index.html':p));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end();}
});
const clean=(x,max=240)=>String(x||'').replace(/\s+/g,' ').trim().slice(0,max);
const safeUrl=s=>{try{const u=new URL(s);return u.origin+u.pathname}catch{return '[invalid]'}};
const report={checkedAt:new Date().toISOString(),noPrivateAddresses:true,
 siteScope:'local Chromium preview built from actual Draft PR #165 stack; NOT deployed production',
 verificationLevel:'real browser UX + official Finder reconnaissance, not independent enrollment confirmation',
 samples:[],official:[],errors:[],release:'NO_GO'};
async function scanFrame(frame){
 const inputs=await frame.locator('input').evaluateAll(els=>els.slice(0,25).map(el=>({
  id:el.id,placeholder:el.placeholder||'',role:el.getAttribute('role')||'',type:el.type,
  aria:el.getAttribute('aria-label')||'',visible:!!el.getClientRects().length
 }))).catch(()=>[]);
 const buttons=await frame.locator('button').evaluateAll(els=>els.filter(el=>el.getClientRects().length).slice(0,25)
  .map(el=>({text:(el.innerText||'').trim().slice(0,60),id:el.id||'',title:el.title||'',aria:el.getAttribute('aria-label')||''}))).catch(()=>[]);
 const iframes=await frame.locator('iframe').evaluateAll(els=>els.slice(0,10).map(e=>{try{const u=new URL(e.src);return u.origin+u.pathname}catch{return '[invalid]'}})).catch(()=>[]);
 return {frame:safeUrl(frame.url()),inputs,buttons,iframes};
}
async function actualApp(browser){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 for(const width of [1366,390]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'en-US',timezoneId:'America/Chicago'});
  const errors=[];page.on('pageerror',e=>errors.push(clean(e.message,200)));
  try{
   await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded',timeout:85000});
   await page.waitForFunction(()=>typeof map!=='undefined'&&!!map&&window.schoolBoundaryAuditReady===true&&typeof home!=='undefined',{timeout:100000});
   for(const test of samples){
    const res={id:test.id,declaredDistrict:test.district,publicListing:test.source,width,
      status:'UNVERIFIED',schoolCandidates:[],renderedPolygonFeatures:0,clickedSchoolZoneFeatures:0,
      addressResolved:false,homeMarker:false,errors:[],warnings:[]};
    try{
      await page.locator('#homeAddress').fill(test.address);
      await page.locator('#homeSearch').click();
      await page.waitForFunction(()=>!document.querySelector('#homeSearch').disabled&&
        !/주소를 검색 중/.test(document.querySelector('#homeStatus')?.textContent||''),{timeout:35000}).catch(()=>{});
      const buttons=page.locator('#homeCandidates button.lisd-apartment-choice');
      if(await buttons.count()>0){
        const number=test.address.match(/^\d+/)?.[0];
        const chosen=buttons.filter({hasText:new RegExp(number,'i')}).first();
        if(await chosen.count()>0)await chosen.click({timeout:9000});
      }
      await page.waitForFunction(()=>typeof home!=='undefined'&&!!home&&!!home.ll&&!!home.assignment,{timeout:22000});
      const data=await page.evaluate(()=>({
       assigned:home.assignment,district:home.assignment.district,locationType:home.geocodeQuality,
       geometry:typeof homeZoneGroup!=='undefined'&&homeZoneGroup?homeZoneGroup.getLayers()
        .reduce((v,el)=>v+(typeof el.getLayers==='function'?el.getLayers().length:1),0):0,
       homeMarker:!!homeMarker&&map.hasLayer(homeMarker),
       statusText:document.querySelector('#homeMapAssignmentStatus')?.textContent?.slice(0,260)||'',
       visible:document.querySelector('#homeMapAssignmentStatus')?.dataset.visible||'',
       matches:document.querySelectorAll('.mapmark.home-match').length
      }));
      res.status=data.assigned?.status||null;res.actualDistrict=data.district||null;
      res.addressResolved=true;res.homeMarker=data.homeMarker;res.geometryVisible=data.visible;
      res.geocodeUsable=!!data.locationType?.usableForSchoolCandidate;
      res.schoolCandidates=(data.assigned?.features||[]).map(f=>({
       name:f.properties?.school,level:f.properties?.gradeLevel,code:f.properties?.schoolCode,
       sourceYear:f.properties?.schoolYear||null}));
      res.renderedPolygonFeatures=data.geometry;
      res.matchedSchoolMarkers=data.matches;res.banner=data.statusText;
      if(data.geometry>0&&data.matches>0){
       const match=page.locator('.leaflet-marker-icon').filter({has:page.locator('.mapmark.home-match')}).first();
       try{await match.click({force:true,timeout:4500});}catch{
        const list=page.locator('#schoolList button.school.home-match').first();
        if(await list.count())await list.click({timeout:8000});
       }
       res.clickedSchoolZoneFeatures=await page.evaluate(()=>typeof zoneGroup!=='undefined'&&zoneGroup?
         zoneGroup.getLayers().reduce((n,x)=>n+(typeof x.getLayers==='function'?x.getLayers().length:1),0):0);
      }
      if(data.district!==test.district)res.warnings.push('District mismatch or address crosses city/ISD border; do not force to stated district');
      if(!data.geometry)res.warnings.push('No automatic polygon drawn; may be fail-closed on vintage/ambiguous/feeder');
      if(res.schoolCandidates.length===0)res.warnings.push('No confirmed campus polygons; do not infer campus from nearest marker');
      if(test.id.endsWith('baldwin')||test.id.endsWith('hamilton')||test.id.endsWith('sunflower'))
       await page.screenshot({path:path.join(OUT,test.id+'-'+width+'.png'),fullPage:true,timeout:30000});
    }catch(e){res.errors.push(clean(e.message,450))}
    report.samples.push(res);
   }
  }catch(e){errors.push(clean(e.message,500))}
  finally{if(errors.length)report.errors.push({width,errors});await page.close();}
 }
}
async function officialPages(browser){
 for(const source of sources){
  const page=await browser.newPage({viewport:{width:1366,height:900},locale:'en-US',timezoneId:'America/Chicago'});
  const entry={district:source.district,url:source.url,source:source.name,status:'NOT_CHECKED',webError:[],controls:[],sampleSourceInput:false,
    independentOfficialSchoolResults:false};
  page.on('pageerror',e=>entry.webError.push(clean(e.message,140)));
  try{
   const response=await page.goto(source.url,{waitUntil:'domcontentloaded',timeout:60000});
   entry.http=response?.status()||null;
   await page.waitForTimeout(4000);
   entry.title=clean(await page.title(),100);
   entry.controls=await Promise.all(page.frames().slice(0,6).map(scanFrame));
   if(source.district==='LISD'){
    const link=page.getByRole('link',{name:/VIEW 2026-2027 SCHOOL LOCATOR/i});
    entry.locatorLink=await link.first().getAttribute('href').catch(()=>null);
    entry.linkHostname=entry.locatorLink?safeUrl(entry.locatorLink):null;
    // Do not follow injected secure-web proxy: record official href and research
    // the direct district-issued public locator URL separately.
   }
   const publicSample=samples.find(s=>s.district===source.district);
   const address=publicSample.address,num=address.match(/^\d+/)?.[0],road=address.split(' ')[1];
   const candidates=[];
   for(const frame of page.frames().slice(0,6)){
    for(const item of (await scanFrame(frame)).inputs){
     if(!item.visible||!['text','search',''].includes(item.type))continue;
     const hint=(item.id+' '+item.placeholder+' '+item.aria).toLowerCase();
     if(!/address|street|find.*school|search.*home/.test(hint))continue;
     const loc=item.id?frame.locator('[id="'+item.id+'"]'):frame.locator('input').filter({visible:true}).first();
     candidates.push({frame,input:loc.first(),item});
    }
   }
   entry.probeInputs=candidates.map(x=>({frame:safeUrl(x.frame.url()),id:x.item.id,placeholder:x.item.placeholder}));
   if(candidates.length===1){
    const chosen=candidates[0];
    await chosen.input.fill(num+' '+road,{timeout:10000});
    await page.waitForTimeout(2200);
    entry.sampleSourceInput=true;
    const lookupText=await chosen.frame.locator('body').innerText().catch(()=>'');
    entry.sourceExcerpt=lookupText.split('\n').filter(x=>new RegExp(num+'|'+road+'|assigned|school|feeder|zone','i').test(x)).slice(-27).map(x=>clean(x,140));
    entry.status='PARTIAL_ADDRESS_TYPED_OFFICIAL_RESULT_NOT_CERTIFIED';
   }else entry.status='NEED_FINDER_UI_WORKFLOW';
   await page.screenshot({path:path.join(OUT,'official-'+source.district+'.png'),fullPage:true,timeout:30000}).catch(()=>{});
  }catch(e){entry.status='OFFICIAL_BROWSER_ERROR';entry.error=clean(e.message,450)}
  report.official.push(entry);
  console.log('OFFICIAL_BROWSER_TRIAGE '+JSON.stringify({district:entry.district,http:entry.http,status:entry.status,inputs:entry.probeInputs,link:entry.locatorLink,controlCount:entry.controls.length,error:entry.error}));
  await page.close();
 }
}
(async()=>{
 let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await actualApp(browser);
 await officialPages(browser);
 }catch(e){report.errors.push({fatal:clean(e.message,450)})}
 finally{
  await browser?.close().catch(()=>{});
  if(server.listening)await new Promise(done=>server.close(done));
  report.summary={actualAppAddressAndSchoolMapRendered:report.samples.filter(x=>x.addressResolved&&x.renderedPolygonFeatures>0&&x.clickedSchoolZoneFeatures>0).length,
    sampledViews:report.samples.length,officialSitesReached:report.official.filter(x=>x.http===200).length,
    independentFinderAssignmentMatches:0,wholeResidentialGate:'NO_GO'};
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('NEXT3_REAL_RESIDENCE_TRIAGE '+JSON.stringify(report.summary));
  if(report.errors.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exitCode=1});
