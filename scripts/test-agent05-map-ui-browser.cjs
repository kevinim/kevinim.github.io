#!/usr/bin/env node
'use strict';
// Agent 05 real Chromium regression against the checked-out PR website.
// Public school data and synthetic address-only UI checks; NO residence enrollment claims.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const current=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const baseline=process.env.AGENT05_BASELINE_URL||'';
const output=path.join('artifacts','agent05-map-ui');
fs.mkdirSync(output,{recursive:true});
const report={base:baseline||null,current,results:[],sourceGate:'NO_GO: residential enrollment not independently verified',issues:[]};
const widths=[390,1366];
function rectangle(el){
 if(!el)return null;
 const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
}
function parseColor(s){
 const m=String(s||'').match(/rgba?\(([^)]+)\)/);
 if(!m)throw Error('Unsupported computed CSS color: '+s);
 const n=m[1].split(',').map(x=>Number.parseFloat(x));
 if(n[3]!==undefined&&n[3]<0.99)throw Error('Translucent contrast target: '+s);
 return n.slice(0,3);
}
function lum(rgb){
 const channel=n=>{const x=n/255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4};
 return 0.2126*channel(rgb[0])+0.7152*channel(rgb[1])+0.0722*channel(rgb[2]);
}
function ratio(a,b){const [hi,lo]=[lum(parseColor(a)),lum(parseColor(b))].sort((x,y)=>y-x);return (hi+0.05)/(lo+0.05)}
async function load(page,base,width){
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof map!=='undefined'&&!!map&&typeof state!=='undefined'&&
  state.schools.some(s=>s.district==='AISD'&&Array.isArray(s.ll)),null,{timeout:90000});
 await page.waitForFunction(()=>map.getSize().x>200&&map.getSize().y>200,null,{timeout:30000});
 await page.locator('#zipSelect').selectOption('75013');
 await page.waitForTimeout(750);
}
async function captureBaseline(browser,width){
 if(!baseline)return;
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 try{
  await load(page,baseline,width);
  await page.screenshot({path:path.join(output,'before-'+width+'.png'),fullPage:true,timeout:45000});
  report.results.push({width,kind:'baseline',note:'Visual-only reference; no PASS claimed for old code'});
 }catch(e){report.results.push({width,kind:'baseline',error:String(e)});}
 finally{await page.close();}
}
async function audit(browser,width){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 const entry={width,kind:'current',checks:{}};
 try{
  await load(page,current,width);
  const allen=await page.evaluate(()=>{
   const origin=DATA.find(d=>d.z==='75013');
   const seen=state.schools.filter(s=>s.district==='AISD'&&s.ll&&map.getBounds().contains(s.ll));
   const pins=schoolGroup.getLayers().filter(m=>seen.some(s=>s.name===m.options?.title));
   return {zip:state.zip,zoomAnimation:map.options.zoomAnimation,active:map._animatingZoom||false,
    centerInMap:map.getBounds().contains(origin.ll),qualified:seen.length,markers:pins.length,
    viewport:map.getSize(),status:document.getElementById('schoolMapStatus')?.textContent||''};
  });
  assert.equal(allen.zip,'75013');
  assert.equal(allen.zoomAnimation,false,'Leaflet zoom animation reintroduces Allen viewport race');
  assert.equal(allen.active,false,'Map must not be stuck animating');
  assert.equal(allen.centerInMap,true,'Explicit Allen selection must focus chosen region');
  assert.ok(allen.qualified>0,'Allen 75013 has zero eligible campus points in map viewport');
  assert.ok(allen.markers>0,'P0 Allen school marker regression: displayed count is zero');
  assert.match(allen.status,/학교 마커/,'Nonzero markers must have a visible status');
  entry.checks.allen=allen;
  // Exercise the actual school-type and visibility controls, not a class-only snapshot.
  await page.locator('#levels button[data-v="elementary"]').click();
  const elementary=await page.evaluate(()=>({
   value:state.level,visible:schoolGroup.getLayers().map(m=>m.options?.title),
   types:schoolGroup.getLayers().map(m=>state.schools.find(s=>s.name===m.options?.title)?.type)
  }));
  assert.equal(elementary.value,'elementary');
  assert.ok(elementary.types.every(t=>t==='elementary'),'Wrong school type after elementary filter');
  await page.locator('#levels button[data-v="all"]').click();
  await page.locator('#schoolOverlay').uncheck();
  assert.equal(await page.evaluate(()=>schoolGroup.getLayers().length),0,'School toggle off must clear markers');
  await page.locator('#schoolOverlay').check();
  assert.ok(await page.evaluate(()=>schoolGroup.getLayers().length)>0,'School toggle on must restore map markers');
  entry.checks.filters='PASS elementary/all and school visibility off/on';
  // Click a *real* district campus from the map layer; the displayed GIS status
  // is still historical/Finder-qualified, never a current assignment assertion.
  const click=await page.evaluate(async()=>{
   const s=state.schools.find(s=>s.district==='AISD'&&s.ll&&map.getBounds().contains(s.ll));
   await schoolClicked(s);
   return {selected:state.selectedSchool?.name,oldChecked:document.getElementById('referenceBoundaryOverlay').checked,
    historicChecked:document.getElementById('historicOverlay').checked,
    polygons:zoneGroup.getLayers().length,note:document.getElementById('zoneNotice')?.textContent||'',
    hint:document.getElementById('schoolZoneMapHint')?.textContent||''};
  });
  assert.ok(click.selected,'School click must select the campus');
  assert.equal(click.oldChecked,true,'School click must enable reference polygon toggle');
  assert.equal(click.historicChecked,true,'School click must enable historic boundary toggle');
  assert.ok(click.polygons>0||click.note.length>0||click.hint.length>0,
   'School click must display a polygon or explicit missing-boundary explanation');
  entry.checks.schoolClick=click;
  // Sourced GIS branch: a candidate may render, but a source/year failure must not
  // render polygons as authoritative residence assignments.
  const provenance=await page.evaluate(()=>{
   const zone=window.SchoolZoneUI.classify({matchStatus:'matched',sourceReady:true,
    sourceFailed:false,displayMode:'historical',schoolType:'elementary'});
   const missing=window.SchoolZoneUI.classify({matchStatus:'none',sourceReady:true,
    sourceFailed:false,schoolType:'elementary'});
   const unavailable=window.HomeAssignmentMap.plan({status:'needs-address-verification'},'official');
   return {historical:zone.label,missing:missing.label,features:unavailable.features.length};
  });
  assert.match(provenance.historical,/과거/);
  assert.match(provenance.missing,/미연결/);
  assert.equal(provenance.features,0,'Unverified address must draw no candidate zone');
  entry.checks.provenance=provenance;
  await page.locator('#homeAddress').fill('5515 Ohio Dr, Frisco, TX 75035');
  assert.equal(await page.locator('#homeClear').isVisible(),true);
  await page.locator('#homeClear').click();
  assert.equal(await page.locator('#homeAddress').inputValue(),'');
  assert.equal(await page.locator('#homeClear').isVisible(),false);
  assert.equal(await page.evaluate(()=>home===null&&homeZoneGroup.getLayers().length===0),true);
  entry.checks.clear='PASS input X clears address and home overlays';
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','Dark is default');
  const contrast=await page.evaluate(()=>{
   const selectors=['.maphead .hazard-chip.ifld','.maphead .hazard-chip.wfir',
    '#map .leaflet-control-zoom-in','.filter-panel .school-settings .seg button.active'];
   return selectors.map(selector=>{
    const element=document.querySelector(selector);if(!element)throw Error('Missing contrast target '+selector);
    const style=getComputedStyle(element);
    let back=element,background='rgb(17, 25, 37)';
    while(back){
      const value=getComputedStyle(back).backgroundColor;
      const open=value.indexOf('('),close=value.lastIndexOf(')');
      const parts=open>=0&&close>open?value.slice(open+1,close).split(',').map(Number):[];
      if(parts.length===3||(parts.length===4&&parts[3]>=0.99)){
        background=value;break;
      }
      back=back.parentElement;
    }
    return {selector,color:style.color,background};
   });
  });
  console.log('Computed map-control contrast',width,JSON.stringify(contrast));
  for(const item of contrast){
   const value=ratio(item.color,item.background);
   assert.ok(value>=4.5, 'WCAG normal-text contrast <4.5: '+item.selector+' '+value.toFixed(2));
   item.contrastRatio=Number(value.toFixed(2));
  }
  entry.checks.contrast=contrast;
  if(width<=720){
   const layout=await page.evaluate(()=>{
    const rectangle=el=>{
     if(!el)return null;
     const r=el.getBoundingClientRect();
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    };
    const filter=rectangle(document.querySelector('.filter-panel'));
    const mapbox=rectangle(document.querySelector('.mapbox'));
    const detail=rectangle(document.querySelector('.main>.detail'));
    const control=rectangle(document.querySelector('#map .leaflet-control-zoom'));
    const canvas=rectangle(document.querySelector('#map'));
    return {screen:innerWidth,scroll:document.documentElement.scrollWidth,
     filter,mapbox,detail,control,canvas};
   });
   assert.ok(layout.scroll<=width+2,'Horizontal document overflow');
   assert.ok(layout.filter.bottom<=layout.mapbox.top+3,'Filter panel overlaps map panel');
   assert.ok(layout.mapbox.bottom<=layout.detail.top+3,'Map overlaps detail panel');
   assert.ok(layout.control.left>=layout.canvas.left-2&&layout.control.right<=layout.canvas.right+2,
    'Map controls outside the map viewport');
   entry.checks.mobileLayout=layout;
  }
  await page.screenshot({path:path.join(output,'after-'+width+'.png'),fullPage:true,timeout:45000});
  report.results.push(entry);
  console.log('PASS Agent05 '+width+'px: Allen markers/zoom, school filter/click, clear, source status, WCAG contrast');
 }catch(e){
  entry.error=e.stack||String(e);
  report.issues.push({width,error:entry.error});
  report.results.push(entry);
  try{await page.screenshot({path:path.join(output,'failure-'+width+'.png'),fullPage:true,timeout:30000});}catch{}
  console.error('FAIL Agent05 '+width+'px:',entry.error);
 }finally{await page.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of widths){await captureBaseline(browser,width);await audit(browser,width);}
 }finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
 assert.equal(report.issues.length,0,'Agent 05 E2E failures: '+JSON.stringify(report.issues));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
