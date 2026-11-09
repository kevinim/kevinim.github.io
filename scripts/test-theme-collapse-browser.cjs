#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const base=(process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8765/').replace(/\/?$/,'/');
const report={viewports:[]};
const rgbValue=raw=>(raw.match(/\d+(?:\.\d+)?/g)||[]).slice(0,3).map(Number);
const brightness=raw=>{
 const a=rgbValue(raw);
 return a.length===3?a.reduce((s,v)=>s+v,0)/3:NaN;
};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route(/tile\.openstreetmap\.org|server\.arcgisonline\.com/,route=>
     route.fulfill({status:200,body:'',contentType:'image/png'}));
   await page.goto(base+'?theme-test='+width,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#dashboardThemeToggle').waitFor({state:'visible',timeout:30000});
   await page.locator('#regionCompare').waitFor({state:'visible',timeout:30000});
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),false,'default folded');
   assert.equal(await page.locator('.region-compare-table-scroll').isVisible(),false,'folded table hidden');
   const headerHeight=(await page.locator('#regionCompare').boundingBox()).height;
   assert.ok(headerHeight<125,'folded header too large: '+headerHeight);
   const initial=await page.evaluate(()=>({
     theme:document.documentElement.dataset.theme,
     label:document.querySelector('#dashboardThemeToggle .theme-toggle-label')?.textContent,
     aria:document.querySelector('#dashboardThemeToggle')?.getAttribute('aria-pressed'),
     bg:getComputedStyle(document.body).backgroundColor
   }));
   assert.equal(initial.theme,'dark','first visit must default to dark');
   assert.equal(initial.aria,'true');
   assert.ok(brightness(initial.bg)<40,'default dark body must be deep');
   const dark=await page.evaluate(()=>({
     theme:document.documentElement.dataset.theme,
     label:document.querySelector('#dashboardThemeToggle .theme-toggle-label')?.textContent,
     aria:document.querySelector('#dashboardThemeToggle')?.getAttribute('aria-pressed'),
     saved:localStorage.getItem('tx-dashboard-theme-v1'),
     bg:getComputedStyle(document.body).backgroundColor,
     panelBg:getComputedStyle(document.querySelector('.area-qa')).backgroundColor,
     mapFilter:getComputedStyle(document.querySelector('#map')).filter
   }));
   assert.equal(dark.theme,'dark');
   assert.equal(dark.aria,'true');assert.equal(dark.saved,null,'default dark does not require writing storage');
   assert.equal(dark.label,'일반 모드');
   assert.ok(brightness(dark.bg)<90,'dark body not applied');
   assert.ok(brightness(dark.panelBg)<95,'dashboard cards still white');
   assert.equal(dark.mapFilter,'none','risk map must not be inverted');
   // CSS computed style audit: reproduce formerly invisible white-on-white
   // secondary and crime buttons, plus default and pressed map controls.
   const contrast=await page.evaluate(()=>{
     const host=document.createElement('div');
     host.id='themeContrastFixtures';
     host.style.cssText='position:absolute;top:0;left:0;z-index:-1;pointer-events:none';
     document.body.append(host);
     const samples=[
      ['.btn.secondary','보조 버튼'],
      ['.btn','주요 버튼'],
      ['.mapquickbtn','지도 기본'],
      ['.mapquickbtn[aria-pressed=true]','지도 선택'],
      ['.hazard-chip','위험 기본'],
      ['.hazard-chip.ifld[aria-pressed=true]','홍수 선택'],
      ['.hazard-chip.wfir[aria-pressed=true]','산불 선택'],
      ['.hazard-chip.hrcn[aria-pressed=true]','허리케인 선택'],
      ['.hazard-chip.crime[aria-pressed=true]','범죄 선택'],
      ['.crime-seg button','범죄 필터 기본'],
      ['.crime-seg button[aria-pressed=true]','범죄 필터 선택'],
      ['.extra-action','출퇴근 계산 버튼'],
      ['.seg button','지도 필터 기본'],
      ['.seg button.active','지도 필터 선택']
     ];
     const cssColor=(value)=>{
       const m=value.match(/^rgba?\(([^)]+)\)$/);
       return m?m[1].split(',').slice(0,3).map(v=>Number(v.trim())):null;
     };
     const luminance=rgb=>{
       const ch=rgb.map(v=>v/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
       return .2126*ch[0]+.7152*ch[1]+.0722*ch[2];
     };
     const results=[];
     for(const [selector,label] of samples){
       const wrapper=document.createElement('div');
       const isCrime=selector.startsWith('.crime-seg'),isSeg=selector.startsWith('.seg ');
       if(isCrime)wrapper.className='crime-seg';
       if(isSeg)wrapper.className='seg';
       const el=document.createElement('button');
       el.type='button';el.textContent=label;
       if(selector.includes('.btn.secondary'))el.className='btn secondary';
       else if(selector.startsWith('.btn'))el.className='btn';
       else if(selector.includes('.mapquickbtn'))el.className='mapquickbtn';
       else if(selector.includes('.hazard-chip')){
        el.className='hazard-chip'+(selector.includes('.ifld')?' ifld':selector.includes('.wfir')?' wfir':
          selector.includes('.hrcn')?' hrcn':selector.includes('.crime')?' crime':'');
       }
       else if(isCrime)el.className='';
       else if(selector.startsWith('.extra-action'))el.className='extra-action';
       else if(isSeg)el.className=selector.endsWith('.active')?'active':'';
       if(selector.includes('aria-pressed=true'))el.setAttribute('aria-pressed','true');
       wrapper.append(el);host.append(wrapper);
       const style=getComputedStyle(el),fg=cssColor(style.color),bg=cssColor(style.backgroundColor);
       const lo=Math.min(luminance(fg),luminance(bg)),hi=Math.max(luminance(fg),luminance(bg));
       results.push({label,selector,ratio:Math.round(((hi+.05)/(lo+.05))*100)/100,
         foreground:style.color,background:style.backgroundColor});
     }
     host.remove();
     return results;
   });
   for(const sample of contrast)
     assert.ok(sample.ratio>=4.5,'Unreadable dark button '+sample.label+': '+JSON.stringify(sample));
   assert.ok(brightness(dark.bg)<40,'User requested visibly deeper dark body');

   // Audit the REAL map toolbar, its selected/unselected chips and legends.
   // Earlier fixture-only checks missed ui-action-buttons.css white overrides.
   const mapTheme=await page.evaluate(()=>{
     const rgb=s=>(s.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);
     const lum=a=>{
       const c=a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
       return c[0]*.2126+c[1]*.7152+c[2]*.0722;
     };
     const contrast=(fg,bg)=>{
       const a=lum(fg),b=lum(bg);
       return Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*100)/100;
     };
     const bg=el=>{
       for(let e=el;e;e=e.parentElement){
         const value=(getComputedStyle(e).backgroundColor.match(/[0-9.]+/g)||[]).map(Number);
         if(value.length>=3&&(value.length===3||value[3]>=.999))return value.slice(0,3);
       }
       return [255,255,255];
     };
     const css=sel=>{
       const el=document.querySelector(sel);
       if(!el)return {selector:sel,missing:true};
       const fg=rgb(getComputedStyle(el).color),back=bg(el);
       return {selector:sel,foreground:fg,background:back,ratio:contrast(fg,back)};
     };
     const nodes=[
       '.maphead .hazard-chips-label',
       '.maphead .basemap-control',
       '.maphead .legend',
       '.mapbox .map-foot summary',
       '.mapbox .heat-legend',
       '.maphead .hazard-chip.ifld',
       '.maphead .hazard-chip.wfir',
       '.maphead .hazard-chip.hrcn',
       '.maphead .hazard-chip.crime',
       '.maphead .hazard-chip.healthcare',
       '.maphead .hazard-chip.winter'
     ];
     const samples=nodes.map(css);
     const chips=[...document.querySelectorAll('.maphead .hazard-chip')];
     const selected=chips.map(el=>{
       const prior=el.getAttribute('aria-pressed');
       el.setAttribute('aria-pressed','true');
       const foreground=rgb(getComputedStyle(el).color),background=bg(el);
       const result={name:el.className,ratio:contrast(foreground,background),foreground,background};
       el.setAttribute('aria-pressed',prior||'false');
       return result;
     });
     return {
       header:bg(document.querySelector('.maphead')),
       groups:[...document.querySelectorAll('.maphead .hazard-chips')].map(bg),
       samples,selected,
       zoom:css('#map .leaflet-control-zoom a'),
       tileFilter:getComputedStyle(document.querySelector('#map')).filter,
       mapBackdrop:bg(document.querySelector('#map')),
       hoverBackground:getComputedStyle(chips[0]).backgroundColor
     };
   });
   assert.ok(brightness('rgb('+mapTheme.header.join(',')+')')<95,'Map header is not dark');
   assert.equal(mapTheme.groups.length,4,'Map should have 4 hazard/medical/winter groups');
   for(const group of mapTheme.groups)
     assert.ok(group.reduce((a,b)=>a+b,0)/3<100,'White group backdrop in dark toolbar: '+group);
   for(const node of mapTheme.samples)
     assert.ok(!node.missing&&node.ratio>=4.5,'Unreadable map control '+JSON.stringify(node));
   assert.equal(mapTheme.selected.length,6,'All six thematic map chips must be covered');
   for(const node of mapTheme.selected)
     assert.ok(node.ratio>=4.5,'Unreadable active map button '+JSON.stringify(node));
   if(!mapTheme.zoom.missing)
     assert.ok(mapTheme.zoom.ratio>=4.5&&mapTheme.zoom.background.reduce((a,b)=>a+b,0)/3<110,
       'Bright map zoom control '+JSON.stringify(mapTheme.zoom));
   assert.equal(mapTheme.tileFilter,'none','Map tiles and risk colors must remain unfiltered');
   await page.locator('.maphead .hazard-chip.ifld').hover();
   const hoveredMapChip=await page.locator('.maphead .hazard-chip.ifld').evaluate(el=>({
     background:getComputedStyle(el).backgroundColor,
     color:getComputedStyle(el).color
   }));
   assert.ok(brightness(hoveredMapChip.background)<120,'Hover state reverted to white map button');
   mkdirSync('artifacts/theme-ui',{recursive:true});
   await page.locator('.maphead').screenshot({path:'artifacts/theme-ui/map-toolbar-'+width+'.png'});


   // Screen regression: test *real* labels on grouped filter cards, not just button fixtures.
   const groupAudit=await page.evaluate(()=>{
     const rgb=raw=>(raw.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);
     const lum=a=>{
       const c=a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
       return c[0]*.2126+c[1]*.7152+c[2]*.0722;
     };
     const bg=el=>{
       for(let e=el;e;e=e.parentElement){
         const v=(getComputedStyle(e).backgroundColor.match(/[0-9.]+/g)||[]).map(Number);
         if(v.length>=3&&(v.length===3||v[3]>=.999))return v.slice(0,3);
       }
       return [255,255,255];
     };
     const samples=[
       ['지역 선택','.area-settings .field label'],
       ['ZIP 안내','.area-settings .source'],
       ['지역 제목','.area-settings .settings-group-title'],
       ['학교 제목','.school-settings .settings-group-title'],
       ['학교 안내','.school-settings .settings-group-note'],
       ['학교 점수','.school-settings .field label'],
       ['학교 토글','.school-visibility-options .check'],
       ['통근 제목','.commute-settings .settings-group-title'],
       ['통근 안내','.commute-settings .source']
     ];
     return {cards:[...document.querySelectorAll('.filter-panel > .filter-settings-group')]
       .map(e=>({name:e.className,bg:bg(e)})),
       samples:samples.map(([name,sel])=>{
         const e=document.querySelector('.filter-panel '+sel);
         if(!e)return {name,missing:true};
         const fg=rgb(getComputedStyle(e).color),back=bg(e),a=lum(fg),b=lum(back);
         return {name,fg,back,ratio:Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*100)/100};
       })}
   });
   assert.equal(groupAudit.cards.length,3,'Area, school and commute cards present');
   for(const card of groupAudit.cards)
     assert.ok(card.bg.reduce((a,b)=>a+b,0)/3<95,'Grouped filter card stayed light '+JSON.stringify(card));
   for(const item of groupAudit.samples)
     assert.ok(!item.missing&&item.ratio>=4.5,'Unreadable dark filter text '+JSON.stringify(item));

   // Native summary supports keyboard activation, and table is only rendered when opened.
   await page.locator('#regionCompare > summary').focus();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),true);
   await page.waitForFunction(()=>document.querySelectorAll('#regionCompareTable thead th').length===4,null,{timeout:30000});
   const darkTable=await page.evaluate(()=>({
     bg:getComputedStyle(document.querySelector('.region-compare-table thead th')).backgroundColor,
     raw:getComputedStyle(document.querySelector('.region-compare-table .region-compare-value')).color
   }));
   assert.ok(brightness(darkTable.bg)<130,'comparison header still too bright');
   assert.ok(brightness(darkTable.raw)>160,'comparison text contrast too low');
   await page.locator('#regionCompare > summary').click();
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),false);
   assert.equal(await page.locator('.region-compare-table-scroll').isVisible(),false);
   await page.locator('#dashboardThemeToggle').click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
   assert.equal(await page.evaluate(()=>localStorage.getItem('tx-dashboard-theme-v1')),'light');
   assert.equal(await page.locator('#dashboardThemeToggle').getAttribute('aria-pressed'),'false');
   await page.reload({waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('#dashboardThemeToggle').waitFor({state:'visible',timeout:30000});
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light','explicit user selection must persist');
   assert.equal(await page.locator('#regionCompare').evaluate(el=>el.open),false,'comparison must default collapsed after reload');
   await page.locator('#dashboardThemeToggle').click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
   assert.equal(await page.evaluate(()=>localStorage.getItem('tx-dashboard-theme-v1')),'dark');
   await page.evaluate(()=>localStorage.removeItem('tx-dashboard-theme-v1'));
   await page.reload({waitUntil:'domcontentloaded',timeout:90000});
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','cleared preference reverts to dark');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'horizontal viewport overflow '+overflow+' at '+width);
   assert.equal(errors.length,0,'JS errors: '+errors.join(' | '));
   mkdirSync('artifacts/theme-ui',{recursive:true});
   const screenshot='artifacts/theme-ui/'+width+'.png';
   await page.locator('#regionCompare').screenshot({path:screenshot});
   report.viewports.push({width,headerHeight,darkBg:dark.bg,contrast,overflow,screenshot});
   await page.close();
  }
 }finally{
   await browser.close();
   mkdirSync('artifacts/theme-ui',{recursive:true});
   writeFileSync('artifacts/theme-ui/qa.json',JSON.stringify(report,null,2));
 }
 console.log('Dark theme and compact comparison QA passed:',JSON.stringify(report.viewports));
})().catch(error=>{console.error(error);process.exitCode=1});
