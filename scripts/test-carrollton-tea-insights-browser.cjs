#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT='http://127.0.0.1:8765/';
const ARTIFACTS='artifacts/carrollton-tea-insights';
const CASES=[
  ['061902118','STEM Academy at Hebron Valley Elementary'],
  ['061902008','Hebron High School'],
  ['057903102','Carrollton Elementary'],
  ['043901001','Allen High School'],
  ['043901105','Alvis C Story Elementary'],
  ['043907002','McKinney High School'],
  ['043907043','Dowell Middle School']
];
fs.mkdirSync(ARTIFACTS,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[],csp=[];
      page.on('pageerror',e=>errors.push(String(e.message||e)));
      await page.addInitScript(()=>{
        window.__carrolltonCsp=[];
        document.addEventListener('securitypolicyviolation',e=>window.__carrolltonCsp.push(e.violatedDirective+':'+e.blockedURI));
      });
      try{
        await page.goto(ROOT,{waitUntil:'domcontentloaded',timeout:90000});
        await page.waitForFunction(()=>typeof state!=='undefined'&&state.schools.length>1500&&state.ratingIndex?.size>100&&window.CarrolltonSchoolInsights?.count===18,
          null,{timeout:110000});
        const coverage=page.locator('#tea-data-progress');
        assert.equal(await coverage.count(),1,'single TEA progress disclosure beside school directory');
        await coverage.locator('summary').click();
        await page.waitForFunction(()=>document.querySelector('#tea-data-progress .tea-data-progress-content')
          ?.textContent.includes('2,282'),null,{timeout:15000});
        const progressText=await coverage.locator('.tea-data-progress-content').textContent();
        assert.ok(progressText.includes('18 / 2,282'),'curated analysis still only 18, not implied complete');
        assert.ok(progressText.includes('4 / 2,282'),'verified ethnicity must not be overstated');
        await coverage.locator('summary').click();
        assert.equal(await coverage.evaluate(el=>el.open),false,'progress notes collapsed by default again');
        const results=[];
        for(const [id,label] of CASES){
          const chosen=await page.evaluate(id=>{
            const s=state.schools.find(s=>scoreRecord(s.name,s.district)?.id===id);
            if(!s)return null;
            document.getElementById('schoolScope').value='all';
            state.schoolQuery=s.name.toLowerCase();
            state.level='all';state.ratingFilter='all';
            drawList();
            return {name:s.name,district:s.district};
          },id);
          assert.ok(chosen,'campus missing from live directory '+id);
          const card=page.locator('#schoolList button.school[data-sid]');
          assert.equal(await card.count(),1,'one and only one exact campus listing '+id);
          await card.click();
          await page.waitForFunction(id=>document.querySelector('#detailContent .tea-insights-panel')?.dataset.campus===id,id,{timeout:15000});
          await page.waitForFunction(()=>[...document.styleSheets].some(s=>(s.href||'').includes('carrollton-school-insights.css?v=4')),
            null,{timeout:15000});
          const found=await page.evaluate(()=>({
            inlineCampus:document.querySelector('#schoolList .tea-school-inline-preview')?.dataset.campus,
            inlineFacts:document.querySelectorAll('#schoolList .tea-school-inline-preview .tea-insights-fact').length,
            inlineChart:document.querySelector('#schoolList .tea-school-inline-stack')?.getAttribute('aria-label'),
            searchPlaceholder:document.getElementById('schoolSearch')?.placeholder,
            id:document.querySelector('.tea-insights-panel')?.dataset.campus,
            summary:document.querySelector('.tea-insights-summary')?.textContent,
            factLabels:[...document.querySelectorAll('#detailContent .tea-insights-fact-label')].map(x=>x.textContent),
            factTones:[...document.querySelectorAll('#detailContent .tea-insights-fact')].map(x=>x.className),
            factColors:[...document.querySelectorAll('#detailContent .tea-insights-fact')].map(x=>getComputedStyle(x).color),
            years:[...document.querySelectorAll('#detailContent .tea-insights-vintage')].map(x=>({
              text:x.textContent,size:parseFloat(getComputedStyle(x).fontSize)
            })),
            titleSize:parseFloat(getComputedStyle(document.querySelector('.tea-insights-title')).fontSize),
            notesCollapsed:!document.querySelector('.tea-insights-provenance').open,
            warningOutsideNotes:!!document.getElementById('zoneNotice')&&!document.querySelector('.tea-insights-provenance').contains(document.getElementById('zoneNotice')),
            domainCount:document.querySelectorAll('.tea-insights-domains dd').length,
            raceCount:document.querySelectorAll('.tea-insights-legend li').length,
            missingRace:[...document.querySelectorAll('#detailContent .tea-insights-missing')].some(el=>el.textContent.includes('학생 인종·민족 구성')),
            missingDomain:[...document.querySelectorAll('#detailContent .tea-insights-missing')].some(el=>el.textContent.includes('영역별 점수')),
            link:[...document.querySelectorAll('.tea-insights-panel a')].map(a=>({label:a.textContent,url:a.href})),
            chart:document.querySelector('.tea-insights-stack')?.getAttribute('aria-label'),
            selected:!!state.selectedSchool,
            mapMarkers:schoolGroup.getLayers().length,
            viewport:innerWidth,
            scrollWidth:document.documentElement.scrollWidth,
            csp:window.__carrolltonCsp||[]
          }));
          assert.equal(found.id,id,'correct school joins to exact TEA ID');
          assert.ok(found.summary.length>20,'Korean insight summary visible');
          assert.ok(found.selected,'existing campus selection intact');
          assert.equal(found.inlineCampus,id,'selected school preview inserted next to its search result');
          assert.equal(found.inlineFacts,2,'inline profile shows strength and improvement labels');
          assert.ok(found.searchPlaceholder.includes('학교 이름 검색'),'search tells the user it only matches names');
          assert.equal(found.factLabels.length,2,'both evidence fields shown');
          assert.notEqual(found.factColors[0],found.factColors[1],'strong point and improvement must use different text colors');
          assert.ok(found.years[0]?.text.includes('2026')&&found.years[0].size<found.titleSize,'evaluation year is a small label');
          assert.equal(found.notesCollapsed,true,'technical footnotes are closed by default');
          assert.equal(found.warningOutsideNotes,true,'important school assignment warning remains visible');
          assert.ok(found.link.some(x=>x.url.startsWith('https://txschools.gov/')),'official campus source included');
          const reviewed=['061902118','061902008'].includes(id);
          const raceVerified=['061902118','061902008','043901001','043907002'].includes(id);
          assert.equal(found.domainCount,reviewed?3:0,'domain scores must not be invented '+id);
          if(raceVerified){
            assert.equal(found.years.length,2,'evaluation and ethnicity years displayed separately');
            assert.notEqual(found.years[0].text,found.years[1].text,'different vintages must remain distinct');
            assert.ok(found.years[1].size<found.titleSize,'demographic year is a small label');
            assert.equal(found.raceCount,7,'seven verified demographic groups for '+id);
            assert.ok(found.inlineChart?.includes('아시아계'),'in-list chart must show verified race distribution');
            assert.equal(found.missingRace,false);
            assert.ok(found.chart?.includes('아시아계'),'chart needs accessible ethnic names and shares');
          }else{
            assert.equal(found.raceCount,0,'unknown student ethnicity must remain absent for '+id);
            assert.equal(found.inlineChart,undefined,'unverified race cannot render in-list chart');
            assert.equal(found.missingRace,true);
          }
          if(!reviewed)assert.equal(found.missingDomain,true,'grade-only campus must show missing domain notice');
          assert.deepEqual(found.csp,[],'CSP violation detected '+JSON.stringify(found.csp));
          if(width===390)assert.ok(found.scrollWidth<=width+5,'mobile horizontal overflow '+found.scrollWidth);
          if(id===CASES[0][0]){
            await page.locator('.tea-insights-provenance summary').click();
            assert.equal(await page.locator('.tea-insights-provenance').evaluate(el=>el.open),true,'notes expand on click');
            await page.locator('.tea-insights-provenance summary').click();
            assert.equal(await page.locator('.tea-insights-provenance').evaluate(el=>el.open),false,'notes collapse again');
          }
          results.push({school:label,...found});
          if(id==='061902118')await page.screenshot({path:path.join(ARTIFACTS,'campus-'+width+'.png'),fullPage:true,timeout:40000});
        }
        assert.deepEqual(errors,[],'runtime exceptions '+errors.join(','));
        fs.writeFileSync(path.join(ARTIFACTS,'qa-'+width+'.json'),JSON.stringify(results,null,2)+'\n');
        console.log('PASS Carrollton TEA campus profiles '+width+'px, '+results.length+' school selections');
      }finally{await page.close();}
    }
  }finally{await browser.close();}
})().catch(error=>{console.error('FAIL Carrollton TEA browser QA:',error.stack||error);process.exitCode=1;});
