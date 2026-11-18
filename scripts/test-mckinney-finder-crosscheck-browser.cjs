#!/usr/bin/env node
'use strict';
// Synthetic McKinney Finder GIS browser QA; no real residential address.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())
   return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
   'Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{return res.writeHead(400).end()}
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const base='http://127.0.0.1:'+server.address().port+'/';
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1'||url.hostname==='unpkg.com')return route.continue();
    return route.abort('blockedbyclient');
   });
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>typeof renderHome==='function'&&
    typeof window.McKinneyFinderCrosscheck?.crosscheck==='function'&&
    !!document.getElementById('homeAssignmentPriority')&&!!state.schools,null,{timeout:60000});
   const overview=await page.evaluate(()=>{
    window.__mckinneyPriorAssignment=schoolAssignmentFor;
    const fake=(level,school,id,year='2026-27')=>({
     type:'Feature',properties:{gradeLevel:level,school,campusId:id,
      sourceYearRaw:year,sourceYear:year,
      ...(level==='elementary'?{verifiedYear:'2026-27'}:{})},
     geometry:{type:'MultiPolygon',coordinates:[[[[-96.7,33.1],[-96.6,33.1],[-96.6,33.2],[-96.7,33.1]]]]}
    });
    const records=[
      ['elementary','SYNTHETIC <img src=x onerror=alert(1)> ELEM','043907101'],
      ['middle','SYNTHETIC MID','043907102'],
      ['high','SYNTHETIC HIGH','043907103']
    ];
    window.__mckinneyRaw={
      district:'043907',status:'finder-current',
      features:records.map(([level,school,id])=>fake(level,school,id))
    };
    schoolAssignmentFor=()=>window.__mckinneyRaw;
    state.liveFinder['043907']=true;
    state.schools=records.map(([type,name,id])=>({type,name,id,district:'043907',ll:[33.1,-96.7]}));
    state.ratings=records.map(([type,name,id])=>({type,name,id,district:'043907',
     rating:'A',score:91}));
    home={address:'SYNTHETIC ADDRESS — NO REAL RESIDENCE',ll:[33.15,-96.65],
      geocodeQuality:{usableForSchoolCandidate:true},parcel:{status:'idle'}};
    renderHome();drawSchools();drawList();
    const priority=document.getElementById('homeAssignmentPriority');
    const link=[...priority.querySelectorAll('a')].find(a=>a.href.startsWith('https://portal.metrostudygis.com/arcgis/apps/webappviewer/'));
    return {
     visible:!priority.hidden,
     status:document.getElementById('homeAssignmentPriorityStatus').textContent,
     count:priority.querySelectorAll('.home-assignment-school').length,
     safe:!priority.querySelector('img')&&!priority.querySelector('script'),
     source:priority.textContent.includes('Campus ID')&&priority.textContent.includes('2026–27'),
     officialLink:link?.href,
     listCount:document.querySelectorAll('#schoolList button.school').length,
     railText:document.getElementById('schoolList').textContent,
     verifiedCount:addressSchoolView().schools.length,
     markers:schoolGroup.getLayers().length,
     conditional:home.assignment.status,
     docWidth:document.documentElement.scrollWidth,
     clientWidth:document.documentElement.clientWidth
    };
   });
   assert.equal(overview.visible,true,'McKinney official GIS evidence shown in address priority panel');
   assert.match(overview.status,/GIS 기준 예상 배정학교/);
   assert.equal(overview.count,3,'E/M/H source names are shown individually');
   assert.equal(overview.safe,true,'School name remains inert DOM text');
   assert.equal(overview.source,true);
   assert.match(overview.officialLink,/^https:\/\/portal\.metrostudygis\.com\/arcgis\/apps\/webappviewer\/index\.html\?id=ed198c434d47474b88709e98d1f0a125$/);
   assert.equal(overview.listCount,3,'Vetted GIS reference names appear as separate school-location rows');
   assert.match(overview.railText,/GIS 예상 학교 · 공식 확인 별도/);
   assert.equal(overview.verifiedCount,0,'GIS reference rows must not become residential assignments');
   assert.equal(overview.markers,0,'Reference names never become assigned-school markers');
   assert.equal(overview.conditional,'conditional-finder-only');
   assert.ok(overview.docWidth<=overview.clientWidth+3,'Mobile/desktop width has no overflow');
   // The new handoff must be user-initiated; only a public facility is used
   // in this synthetic browser check, and window.open is intercepted locally.
   const handoff=await page.evaluate(()=>{
    home.address='1400 Wilson Creek Pkwy, McKinney, TX 75069';
    renderHome();
    const selector=document.getElementById('homeFinderDistrict');
    selector.value='043907';
    selector.dispatchEvent(new Event('change',{bubbles:true}));
    const button=document.getElementById('mckinneyOfficialAddressSearch');
    const basic=document.getElementById('homeFinderLaunch');
    const untouched=!basic.href.includes('&find=');
    const disclosure=document.getElementById('mckinneyAddressSearchPrivacy');
    let opened=null;
    window.open=(url,target,features)=>{opened={url,target,features};return null};
    if(button&&!button.hidden)button.click();
    return {buttonVisible:!!button&&!button.hidden,disclosure:disclosure?.textContent,
     untouched,opened,assignment:home.assignment?.status};
   });
   assert.equal(handoff.buttonVisible,true,'Precise selected McKinney address has an optional official search button');
   assert.match(handoff.disclosure,/주소가 MetroStudy/);
   assert.equal(handoff.untouched,true,'Normal Finder link never contains private address');
   assert.equal(handoff.opened?.target,'_blank');
   assert.equal(handoff.opened?.features,'noopener,noreferrer');
   assert.equal(new URL(handoff.opened.url).searchParams.get('find'),
    '1400 Wilson Creek Pkwy, McKinney, TX 75069');
   assert.equal(handoff.assignment,'conditional-finder-only','Opening locator must not certify the assigned campus');
   const stale=await page.evaluate(()=>{
    window.__mckinneyRaw.features[1].properties.sourceYearRaw='2025-26';
    renderHome();drawSchools();drawList();
    return {status:document.getElementById('homeAssignmentPriorityStatus').textContent,
      description:document.getElementById('homeAssignmentPriorityDescription').textContent,
      cards:document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school').length};
   });
   assert.equal(stale.cards,2,'Stale middle school source is removed; current E/H remain');
   assert.match(stale.status,/GIS 기준 예상 배정학교/,'GIS estimate status persists during asynchronous source recheck');
   assert.match(stale.description,/미확인 학교급: 중등/,'Stale middle grade must be disclosed');
   const wrong=await page.evaluate(()=>{
    window.__mckinneyRaw.district='FISD';
    renderHome();drawSchools();drawList();
    return {
      state:home.mckinneyCrosscheck?.code,
      cards:document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school').length};
   });
   assert.equal(wrong.state,'other-district');
   assert.equal(wrong.cards,0,'A McKinney postal city cannot force McKinney ISD');
   // Screenshot regression: GIS BENNETT / DOWELL / BOYD cards must all link
   // to the exact TEA-named school locations, not just the middle school.
   // All records and coordinates below are fixed campus fixtures, no home data.
   const linked=await page.evaluate(()=>{
    const names=[
     ['elementary','BENNETT','DEAN AND MILDRED BENNETT EL','043907120','B',[33.186041,-96.717459]],
     ['middle','DOWELL','DOWELL MIDDLE','043907043','A',[33.196628,-96.695767]],
     ['high','BOYD','MCKINNEY BOYD H S','043907007','A',[33.202935,-96.678444]]
    ];
    window.__mckinneyRaw.district='043907';
    window.__mckinneyRaw.features=names.map(([level,short])=>({type:'Feature',
     properties:{gradeLevel:level,school:short,sourceYearRaw:level==='elementary'?'2026-27':null,
      ...(level==='elementary'?{verifiedYear:'2026-27'}:{})},
     geometry:{type:'MultiPolygon',coordinates:[[[[-96.7,33.1],[-96.6,33.1],[-96.6,33.2],[-96.7,33.1]]]]}
    }));
    state.schools=names.map(([type,,name,id,,ll])=>({name,type,district:'043907',ll}));
    state.ratings=names.map(([, ,name,id,rating])=>({id,name,district:'043907',rating,score:rating==='A'?92:87}));
    renderHome();drawSchools();drawList();
    const view=addressSchoolView();
    const cards=[...document.querySelectorAll('#homeAssignmentPrioritySchools .home-assignment-school')];
    return {labels:cards.map(c=>c.querySelector('strong')?.textContent),
     mapButtons:cards.filter(c=>!!c.querySelector('button.home-school-map-button')).length,
     pins:referenceCampusGroup?.getLayers().length||0,
     linkedNames:referenceCandidateSchoolLocations(view).map(s=>s.name),
     assigned:view.schools.length,
     allSchoolMarkers:schoolGroup.getLayers().length};
   });
   assert.deepEqual(linked.labels,['BENNETT','DOWELL','BOYD']);
   assert.equal(linked.mapButtons,3,'Every GIS card must have a campus map button');
   assert.equal(linked.pins,3,'All E/M/H GIS reference campus markers visible');
   assert.deepEqual(linked.linkedNames,['DEAN AND MILDRED BENNETT EL','DOWELL MIDDLE','MCKINNEY BOYD H S']);
   assert.equal(linked.assigned,0,'GIS campus pins must not be certified residence assignments');
   assert.equal(linked.allSchoolMarkers,0,'Reference pins must stay separate from residential assignment markers');
   await page.evaluate(()=>{
    schoolAssignmentFor=window.__mckinneyPriorAssignment;
    delete window.__mckinneyPriorAssignment;
    delete window.__mckinneyRaw;
    clearHome();
   });
   assert.equal(await page.locator('#homeAssignmentPriority').evaluate(e=>e.hidden),true);
   assert.deepEqual(errors,[],'Unhandled browser exceptions');
   console.log('PASS McKinney Finder GIS source/TEA/label/fallback at '+width+'px');
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(err=>{console.error('FAIL McKinney Finder browser: '+err.message);
 process.exitCode=1;server.close()});
