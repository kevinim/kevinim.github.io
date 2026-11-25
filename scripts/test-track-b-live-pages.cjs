#!/usr/bin/env node
'use strict';
// Strict read-only smoke against the ACTUALLY DEPLOYED GitHub Pages site.
// Never submits residential addresses, records students, or rehosts GIS.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=(process.env.DASHBOARD_BASE_URL||'https://kevinim.github.io/').replace(/\/?$/,'/');
const outdir='artifacts/track-b-live-pages';fs.mkdirSync(outdir,{recursive:true});
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={target:base,checkedAt:new Date().toISOString(),status:'running',checks:[],errors:[]};
 try{
  for(const width of [1366,390]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
   await page.goto(base+'?track-b-live-qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>{
    if(typeof state==='undefined'||!state?.ratingIndex||!window.DentonCampusMarkerInfo)return false;
    return window.DentonCampusMarkerInfo.loadState==='ready'&&
     typeof map!=='undefined'&&!!map&&!!window.DallasAttendanceLive&&
     window.DentonZonePdfReference?.ROWS?.length===39&&
     typeof schoolClicked==='function'&&state.schools.length>1500;
   },null,{timeout:100000});
   const theme=await page.evaluate(()=>document.documentElement.dataset.theme);
   assert.equal(theme,'dark',width+': default dark theme disappeared');
   const permits=await page.evaluate(()=>window.ConditionalSchoolRelease.releaseSummary().currentYearResidentialDistrictApprovals);
   assert.equal(permits,0,'Uncertified residential assigned-school results must remain disabled');
   // Ensure real Allen ISD markers remain visible on the selected ZIP, not only other ISDs.
   await page.locator('#zipSelect').selectOption('75013');
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.zip==='75013'&&
    schoolGroup.getLayers().length>0,null,{timeout:30000});
   const allen=await page.evaluate(()=>{
    const layers=schoolGroup.getLayers();
    const represented=layers.flatMap(x=>x.options?.schoolMembers||[]);
    // Before rollout Pages may still serve the previous one-marker-per-school
    // code, while preview/after rollout uses member-preserving clusters.
    const oldSchoolTitles=new Set(layers.map(x=>x.options?.title));
    const inside=state.schools.filter(s=>s.district==='AISD'&&s.ll&&
     ['elementary','middle','high'].includes(s.type)&&map.getBounds().contains(s.ll));
    return {inside:inside.length,drawn:inside.filter(s=>represented.includes(s)||oldSchoolTitles.has(s.name)).length};
   });
   assert.ok(allen.inside>0,'No Allen campus in selected ZIP bounds');
   assert.equal(allen.drawn,allen.inside,'Allen visible school markers regressed');
   // McKinney regression: synthetic E/M/H GIS candidates must ALL show
   // building pins, without turning reference data into certified enrollment.
   // Runs against Pages-loaded code, uses no resident address or network lookup.
   const mckinney=await page.evaluate(()=>{
    const previous={assignmentFor:schoolAssignmentFor,schools:state.schools,
     ratings:state.ratings,liveFinder:state.liveFinder['043907'],homeValue:home,
     center:map.getCenter(),zoom:map.getZoom()};
    try{
     const names=[
      ['elementary','BENNETT','DEAN AND MILDRED BENNETT EL','043907120','B',[33.186041,-96.717459]],
      ['middle','DOWELL','DOWELL MIDDLE','043907043','A',[33.196628,-96.695767]],
      ['high','BOYD','MCKINNEY BOYD H S','043907007','A',[33.202935,-96.678444]]
     ];
     const polygon={type:'MultiPolygon',coordinates:[[[[-96.8,33.1],[-96.6,33.1],
      [-96.6,33.3],[-96.8,33.1]]]]};
     const raw={district:'043907',status:'finder-current',features:names.map(
      ([level,short])=>({type:'Feature',properties:{gradeLevel:level,school:short,
       sourceYearRaw:level==='elementary'?'2026-27':null,
       ...(level==='elementary'?{verifiedYear:'2026-27'}:{})},
       geometry:polygon}))};
     schoolAssignmentFor=()=>raw;
     state.liveFinder['043907']=true;
     state.schools=names.map(([type,,name,,,ll])=>({name,type,district:'043907',ll}));
     state.ratings=names.map(([, ,name,id,rating])=>({id,name,district:'043907',
      rating,score:rating==='A'?92:87}));
     home={address:'SYNTHETIC TEST LOCATION — NOT A RESIDENCE',
      ll:[33.19,-96.7],geocodeQuality:{usableForSchoolCandidate:true},
      parcel:{status:'idle'}};
     map.setView([33.19,-96.7],12,{animate:false});
     renderHome();drawSchools();drawList();
     const cards=[...document.querySelectorAll(
      '#homeAssignmentPrioritySchools .home-assignment-school')];
     const view=addressSchoolView();
     return {labels:cards.map(c=>c.querySelector('strong')?.textContent),
      buttons:cards.filter(c=>!!c.querySelector('button.home-school-map-button')).length,
      pins:referenceCampusGroup?.getLayers().length||0,
      linked:referenceCandidateSchoolLocations(view).map(s=>s.name),
      certified:view.schools.length};
    }finally{
     schoolAssignmentFor=previous.assignmentFor;
     state.schools=previous.schools;state.ratings=previous.ratings;
     state.liveFinder['043907']=previous.liveFinder;
     home=previous.homeValue;
     map.setView(previous.center,previous.zoom,{animate:false});
     renderHome();drawSchools();drawList();
    }
   });
   assert.deepEqual(mckinney.labels,['BENNETT','DOWELL','BOYD'],
    'Live McKinney E/M/H GIS reference cards are incomplete');
   assert.equal(mckinney.buttons,3,'All three McKinney reference cards need map buttons');
   assert.equal(mckinney.pins,3,'All three McKinney campus pins must render');
   assert.deepEqual(mckinney.linked,
    ['DEAN AND MILDRED BENNETT EL','DOWELL MIDDLE','MCKINNEY BOYD H S']);
   assert.equal(mckinney.certified,0,'GIS references are not enrollment certification');
   // Prosper regression: exercise the actual Pages-loaded 2026-27 E/M/H
   // district GIS and rendered address-first reference cards at both widths.
   // Use a PUBLIC district office point, never a residential address.
   await page.waitForFunction(()=>window.schoolBoundaryAuditReady===true&&
    state.zoneData?.PROSPER?.length===31,null,{timeout:30000});
   const prosper=await page.evaluate(()=>{
    const zones=state.zoneData.PROSPER;
    const counts={elementary:0,middle:0,high:0};
    for(const zone of zones)counts[zone.properties.gradeLevel]++;
    const codes=new Set(zones.map(z=>z.properties.campusId));
    const linked=zones.filter(z=>state.ratings.some(r=>r.district==='PROSPER'&&
     r.id===z.properties.campusId)).length;
    const bridge=state.schools.find(s=>s.district==='PROSPER'&&
     s.name==='Jim Bridges Middle School');
    const bridgeMatch=bridge&&window.SchoolBoundaryMatch.findSchoolBoundary(
     bridge,zones,(name,district)=>scoreRecord(name,district));
    // District headquarters: 605 E 7th St, Prosper. The saved official
    // Infofinder point-query fixture expects Rucker/Reynolds/Prosper.
    const facility=[33.239374474268,-96.794813152773];
    const matches=homeZoneMatches(facility,'PROSPER');
    const expectedCodes=matches.map(z=>z.properties.schoolCode).sort();
    const reference=window.SchoolReferencePreview?.plan(
     {district:'PROSPER',status:'current',features:matches},
     DISTRICT_REGISTRY,url=>window.TrustedLinkPolicy?.official(url));
    const previousHome=home;
    try{
     home={address:'PUBLIC PROSPER ISD HQ — NOT A RESIDENCE',ll:facility,
      geocodeQuality:{usableForSchoolCandidate:true},
      assignment:{status:'conditional-finder-only'},
      schoolReferencePlan:reference};
     renderAddressSchoolPriority();
     const view=addressSchoolView();
     const cards=[...document.querySelectorAll(
      '#homeAssignmentPrioritySchools .home-assignment-school')];
     return {counts,uniqueCampuses:codes.size,teaLinked:linked,
      bridgeHasNoFabricatedPin:!!bridge&&!Array.isArray(bridge.ll),
      bridgeZoneMatched:bridgeMatch?.status==='matched'&&bridgeMatch.features.length===1,
      expectedCodes,referenceKind:reference?.kind,
      levels:reference?.candidates.map(c=>c.level).sort(),
      cardNames:cards.map(c=>c.querySelector('strong')?.textContent),
      referenceNames:reference?.candidates.map(c=>c.school),
      referenceEntries:reference?.candidates.map(c=>({school:c.school,level:c.level})),
      certified:view?.schools.length,
      cardBadges:cards.map(c=>c.querySelector('.home-school-grade')?.textContent),
      warning:document.getElementById('homeAssignmentPriorityStatus')?.textContent};
    }finally{
     home=previousHome;renderAddressSchoolPriority();drawSchools();drawList();
    }
   });
   assert.deepEqual(prosper.counts,{elementary:20,middle:7,high:4});
   assert.equal(prosper.uniqueCampuses,31);
   assert.equal(prosper.teaLinked,30,'New 2026-27 Bridges campus lacks a 2026 TEA rating');
   assert.ok(prosper.bridgeHasNoFabricatedPin,'Never invent the new middle building location');
   assert.ok(prosper.bridgeZoneMatched,'Bridges official 2026-27 middle zone must remain selectable');
   assert.deepEqual(prosper.expectedCodes,['001','042','102'],
    'District headquarters public point must map to all three official school codes');
   assert.equal(prosper.referenceKind,'reference-only');
   assert.deepEqual(prosper.levels,['고등','중등','초등']);
   // The UX-01 address-first rail intentionally sorts campus cards by grade
   // band, while Infofinder's source response can use an unrelated order.
   const bandRank={'초등':0,'중등':1,'9학년':2,'고등':3,'Senior High':4};
   const expectedCardNames=prosper.referenceEntries.slice().sort((a,b)=>
    (bandRank[a.level]??99)-(bandRank[b.level]??99)).map(x=>x.school);
   assert.deepEqual(prosper.cardNames,expectedCardNames,
    'Actual Pages must retain all Prosper schools in E/M/H presentation order');
   assert.deepEqual([...prosper.cardNames].sort(),[...prosper.referenceNames].sort(),
    'Presentation order must never change the official candidate membership');
   assert.equal(prosper.certified,0,'GIS reference must not become a residential assignment');
   assert.match(prosper.warning,/배정 미인증/);
   assert.equal(prosper.cardBadges.length,3,'Each level needs an explicit TEA grade badge');
   // Official source-only CFB disclosure.
   if(await page.locator('#schoolDataDetails').count())await page.locator('#schoolDataDetails > summary').click();
   const cfb=page.locator('#cfbOfficialRezoningReference');
   await cfb.locator('summary').click();
   const cfbLinks=await cfb.locator('a').evaluateAll(all=>all.map(a=>a.href));
   assert.equal(cfbLinks.length,2);
   assert.ok(cfbLinks.every(x=>x.startsWith('https://www.cfbisd.edu/')));
   assert.match(await cfb.innerText(),/학교별 검증 GIS 폴리곤이 연결되지 않았으며/);
   // Public Denton 39-school official PDF references, exact campus ID.
   const zone=page.locator('#dentonPdfZoneDirectory');
   await zone.locator(':scope > summary').click();
   assert.equal(await page.locator('#dentonPdfCampusSelect option').count(),40);
   await page.locator('#dentonPdfCampusSelect').selectOption('061901127');
   const bellPdf=await page.locator('#dentonPdfCampusLink').getAttribute('href');
   assert.match(bellPdf,/^https:\/\/resources\.finalsite\.net\/images\/.+BellES-ZoneMap_26-27\.pdf$/);
   await page.evaluate(()=>{
    const s=state.schools.find(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id==='061901127');
    if(!s||!s.ll)throw Error('Original NCES Bell campus point not found');
    schoolClicked(s);
   });
   await page.waitForFunction(()=>document.getElementById('dentonCampusProvenance')?.dataset.campusId==='061901127',null,{timeout:25000});
   const bell=await page.evaluate(()=>{
    const node=document.getElementById('dentonCampusProvenance');
    return {status:node.dataset.pointStatus,text:node.textContent,
     pdf:node.querySelector('a')?.href,
     originalMarkerCount:state.schools.filter(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id==='061901127').length};
   });
   assert.equal(bell.status,'historical-two-source');
   assert.match(bell.pdf,/BellES-ZoneMap_26-27\.pdf$/);
   assert.equal(bell.originalMarkerCount,1,'Never duplicate Denton campus marker');
   await page.evaluate(()=>{
    const s=state.schools.find(x=>x.district==='061901'&&scoreRecord(x.name,x.district)?.id==='061901051');
    if(!s||!s.ll)throw Error('Original NCES Cheek campus marker missing');
    schoolClicked(s);
   });
   await page.waitForFunction(()=>document.getElementById('dentonCampusProvenance')?.dataset.campusId==='061901051',null,{timeout:25000});
   const cheek=await page.evaluate(()=>{
    const n=document.getElementById('dentonCampusProvenance');
    return {status:n.dataset.pointStatus,text:n.textContent,url:n.querySelector('a')?.href};
   });
   assert.equal(cheek.status,'historical-exception');
   assert.match(cheek.text,/마커 좌표 미인증/);
   assert.match(cheek.url,/CheekMS-ZoneMap_26-27\.pdf$/);
   // Dallas direct publisher GIS and Irving module must still be present without current-year enrollment certification.
   const sources=await page.evaluate(()=>({
    dallas:window.DallasAttendanceLive?.SOURCES?.length||0,
    irving:!!window.IrvingOfficialSpatial,
    dallasUnverified:window.DallasAttendanceLive?.SOURCES?.every(x=>!!x.level),
    globalWarning:document.querySelector('.reference-gis-global-warning')?.textContent||'',
    overflow:document.documentElement.scrollWidth-innerWidth
   }));
   assert.equal(sources.dallas,3);assert.equal(sources.irving,true);
   assert.match(sources.globalWarning,/학교 배정 확정 정보가 아닙니다/);
   if(width<=390)assert.ok(sources.overflow<=4,'Mobile page horizontal overflow '+sources.overflow);
   assert.deepEqual(errors,[],'Live Pages browser page errors '+errors.join('; '));
   await page.screenshot({path:path.join(outdir,'track-b-live-'+width+'.png'),timeout:25000});
   report.checks.push({width,defaultDark:true,allen,cfbOfficialLinks:2,
    dentonPdfCatalog:39,mckinneyPins:mckinney.pins,prosperLevels:prosper.counts,prosperPublicSchoolCodes:prosper.expectedCodes,bellStatus:bell.status,cheekStatus:cheek.status,
    dallasSourceLayers:3,irvingModule:true,residentialGrants:0,mobileOverflowPx:sources.overflow});
   await page.close();
  }
  report.status='PASS';
  console.log('TRACK_B_LIVE_PRODUCTION_PASS '+JSON.stringify(report.checks));
 }catch(e){report.status='FAIL';report.errors.push(String(e.stack||e));console.error('TRACK_B_LIVE_PRODUCTION_FAIL',String(e.stack||e));process.exitCode=1}
 finally{
  fs.writeFileSync(path.join(outdir,'track-b-live-report.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
