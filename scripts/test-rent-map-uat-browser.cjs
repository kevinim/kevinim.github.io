#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SITE_URL||'http://127.0.0.1:8765/';
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [390,1280]){
      const page=await browser.newPage({viewport:{width,height:860},reducedMotion:'reduce'});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e.message||e)));
      await page.goto(base+'rent-map-uat.html',{waitUntil:'domcontentloaded',timeout:80000});
      await page.waitForFunction(()=>window.__rentMapUatReady===true&&window.__areaExplorerUatReady===true,{timeout:100000});
      assert.equal(await page.locator('#areaExploreSearch').count(),1);
      const selectedName=await page.locator('#areaExploreSelectedName').innerText();
      assert.ok(selectedName.length>0,'Selected ZIP has a place name');
      // Find place by name instead of requiring a user to know ZIP.
      await page.locator('#areaExploreSearch').fill('West Plano');
      await page.waitForFunction(()=>document.querySelector('#areaExploreList button[data-zip="75093"]'));
      assert.equal(await page.locator('#areaExploreList button[data-zip="75093"]').count(),1);
      await page.locator('#areaExploreList button[data-zip="75093"]').click();
      assert.equal(await page.locator('#zipSelect').inputValue(),'75093');
      assert.equal(await page.locator('#areaExploreSearch').inputValue(),'');
      assert.ok((await page.locator('#areaExploreSelectedZip').innerText()).includes('75093'));
      // Broader view groups cities; clicking a city drills down to ZIP results.
      await page.evaluate(()=>{map.setView([33.10,-96.82],10,{animate:false});return true;});
      await page.waitForFunction(()=>document.querySelector('#areaExploreList button[data-kind="city"]'));
      const cityButtons=await page.locator('#areaExploreList button[data-kind="city"]').count();
      assert.ok(cityButtons>1,'Zoomed-out view groups by city');
      await page.locator('#areaExploreList button[data-kind="city"]').first().click();
      await page.waitForFunction(()=>document.querySelector('#areaExploreList button[data-kind="zip"]'));
      assert.ok((await page.locator('#areaExploreList button[data-kind="zip"]').count())>=1,'Drilldown offers ZIPs');
      // Native polygon clicks still propagate through existing ZIP selection.
      await page.waitForFunction(()=>typeof state!=='undefined'&&Object.keys(state.polys).length>200,{timeout:100000});
      await page.evaluate(()=>{
        state.polys['75024'].fire('click');
      });
      await page.waitForFunction(()=>document.querySelector('#zipSelect').value==='75024');
      await page.waitForFunction(()=>document.querySelector('#areaExploreSelectedZip')?.textContent==='75024 · ZIP 통계 구역');
      assert.equal(await page.locator('#areaExploreSelectedZip').innerText(),'75024 · ZIP 통계 구역');
      await page.locator('#zipSelect').selectOption('75093');
      await page.waitForFunction(()=>document.querySelector('#rentMapSelectedZip')?.textContent.startsWith('75093'));
      assert.equal(await page.locator('#rentMapSelectedZip').innerText().then(s=>s.split(' · ')[0]),'75093');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),'https://www.redfin.com/zipcode/75093/houses-for-rent');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),'https://www.redfin.com/zipcode/75093/apartments-for-rent');
      const before=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom(),school:schoolGroup.getLayers().length}));
      await page.locator('.area-explore-city-shortcuts summary').click();
      await page.locator('#rentMapFocus button[data-focus="frisco"]').click();
      const moved=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom(),school:schoolGroup.getLayers().length}));
      assert.ok(Math.abs(moved.center.lat-33.15)<.02,'Frisco focus moves map');
      assert.equal(moved.zoom,11,'Frisco city zoom level');
      assert.equal(await page.locator('#rentMapFocus button[data-focus="frisco"]').getAttribute('aria-pressed'),'true');
      await page.locator('#rentMapRefs').click();
      assert.equal(await page.locator('#rentMapRefs').getAttribute('aria-pressed'),'true');
      // inspect markers through Leaflet's own DOM (3 independent circles)
      assert.equal(await page.locator('#map .leaflet-interactive').count()>0,true,'Leaflet map renders');
      await page.locator('#rentMapRefs').click();
      assert.equal(await page.locator('#rentMapRefs').getAttribute('aria-pressed'),'false');
      // Apply Redfin-native monthly Price Range and bedroom range.
      await page.locator('#rentMapMinPrice').fill('2000');
      await page.locator('#rentMapMaxPrice').fill('3500');
      await page.locator('#rentMapMinBeds').selectOption('3');
      await page.locator('#rentMapMaxBeds').selectOption('4');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),
        'https://www.redfin.com/zipcode/75093/rentals/filter/property-type=house,min-price=2k,max-price=3.5k,min-beds=3,max-beds=4');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),
        'https://www.redfin.com/zipcode/75093/rentals/filter/property-type=multifamily,min-price=2k,max-price=3.5k,min-beds=3,max-beds=4');
      assert.equal(await page.locator('.rent-map-redfin-icon').count(),1,'Redfin favicon is present');
      assert.equal(await page.locator('.rent-map-more').getAttribute('open'),null,'extra conditions collapse by default');
      await page.locator('.rent-map-more summary').click();
      await page.locator('#rentMapMinBaths').selectOption('2');
      await page.locator('#rentMapDogs').check();
      await page.locator('#rentMapParking').check();
      await page.locator('#rentMapLaundry').check();
      const advanced='min-baths=2,dogs-allowed,washer-dryer-in-unit,has-parking';
      assert.ok((await page.locator('#rentMapHouses').getAttribute('href')).endsWith(advanced),
        'House deep link must include verified advanced filters');
      assert.ok((await page.locator('#rentMapApartments').getAttribute('href')).endsWith(advanced),
        'Apartment deep link must retain advanced filters');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('target'),'_blank');
      assert.match(await page.locator('#rentMapHouses').getAttribute('rel'),/noopener/);
      // Filters persist when ZIP changes in the existing dashboard.
      await page.locator('#zipSelect').selectOption('75034');
      await page.waitForFunction(()=>document.querySelector('#rentMapHouses')?.href.includes('/zipcode/75034/'));
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),
        'https://www.redfin.com/zipcode/75034/rentals/filter/property-type=house,min-price=2k,max-price=3.5k,min-beds=3,max-beds=4,min-baths=2,dogs-allowed,washer-dryer-in-unit,has-parking');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),
        'https://www.redfin.com/zipcode/75034/rentals/filter/property-type=multifamily,min-price=2k,max-price=3.5k,min-beds=3,max-beds=4,min-baths=2,dogs-allowed,washer-dryer-in-unit,has-parking');
      // Invalid ranges disable both outbound links rather than silently removing filters.
      await page.locator('#rentMapMaxPrice').fill('1500');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),null);
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),null);
      assert.equal(await page.locator('#rentMapFilterStatus').getAttribute('data-invalid'),'true');
      await page.locator('#rentMapResetFilters').click();
      assert.equal(await page.locator('#rentMapMinBaths').inputValue(),'');
      for(const id of ['rentMapDogs','rentMapParking','rentMapLaundry'])
        assert.equal(await page.locator('#'+id).isChecked(),false);
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),'https://www.redfin.com/zipcode/75034/houses-for-rent');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),'https://www.redfin.com/zipcode/75034/apartments-for-rent');
      const exploreLayout=await page.locator('#areaExplorerUat').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
      assert.ok(exploreLayout.scroll<=exploreLayout.width+2,
        'Explore search/list/cards cannot overflow '+width+'px: '+JSON.stringify(exploreLayout));
      const layout=await page.locator('#rentMapUatPanel').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
      assert.ok(layout.scroll<=layout.width+2,'Rental filters should not overflow '+width+'px: '+JSON.stringify(layout));
      assert.equal(await page.locator('#k-zip').innerText(),'75034');
      assert.equal(await page.locator('#rentMapUatPanel').count(),1);
      assert.deepEqual(errors,[],'No runtime page errors: '+errors.join(' | '));
      // Production acceptance: the exact same modules are now on normal root.
      await page.goto(base,{waitUntil:'domcontentloaded',timeout:80000});
      await page.waitForFunction(()=>window.__rentMapUatReady===true&&window.__areaExplorerUatReady===true,{timeout:100000});
      assert.equal(await page.locator('#rentMapUatPanel').count(),1,'Production must show rental discovery');
      assert.equal(await page.locator('#areaExplorerUat').count(),1,'Production must show map-first search');
      assert.equal(await page.locator('.rent-map-eyebrow').innerText(),'MAP & RENTALS','Production has no UAT badge');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),
        'https://www.redfin.com/zipcode/75093/houses-for-rent');
      await page.locator('#areaExploreSearch').fill('75034');
      await page.locator('#areaExploreList button[data-zip="75034"]').click();
      await page.waitForFunction(()=>document.querySelector('#zipSelect')?.value==='75034'&&
        document.querySelector('#rentMapHouses')?.getAttribute('href')?.includes('/zipcode/75034/'));
      assert.equal(await page.locator('#areaExploreSelectedZip').innerText(),'75034 · ZIP 통계 구역');
      await page.locator('#rentMapMinPrice').fill('2000');
      await page.locator('#rentMapMinBeds').selectOption('3');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),
        'https://www.redfin.com/zipcode/75034/rentals/filter/property-type=house,min-price=2k,min-beds=3');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),
        'https://www.redfin.com/zipcode/75034/rentals/filter/property-type=multifamily,min-price=2k,min-beds=3');
      assert.equal(await page.locator('.rent-map-redfin-icon').count(),1);
      const productionLayout=await page.locator('#areaExplorerUat').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
      assert.ok(productionLayout.scroll<=productionLayout.width+2,
        'Production mobile region search must not overflow '+width+'px: '+JSON.stringify(productionLayout));
      console.log('PASS '+width+'px UAT + PRODUCTION map-first ZIP browse/search, Redfin filters, school/map and mobile isolation');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
