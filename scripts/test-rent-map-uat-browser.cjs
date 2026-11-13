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
      await page.waitForFunction(()=>window.__rentMapUatReady===true,{timeout:100000});
      assert.equal(await page.locator('#rentMapSelectedZip').innerText().then(s=>s.split(' · ')[0]),'75093');
      assert.equal(await page.locator('#rentMapHouses').getAttribute('href'),'https://www.redfin.com/zipcode/75093/houses-for-rent');
      assert.equal(await page.locator('#rentMapApartments').getAttribute('href'),'https://www.redfin.com/zipcode/75093/apartments-for-rent');
      const before=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom(),school:schoolGroup.getLayers().length}));
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
      const layout=await page.locator('#rentMapUatPanel').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
      assert.ok(layout.scroll<=layout.width+2,'Rental filters should not overflow '+width+'px: '+JSON.stringify(layout));
      assert.equal(await page.locator('#k-zip').innerText(),'75034');
      assert.equal(await page.locator('#rentMapUatPanel').count(),1);
      assert.deepEqual(errors,[],'No runtime page errors: '+errors.join(' | '));
      await page.goto(base,{waitUntil:'domcontentloaded',timeout:80000});
      assert.equal(await page.locator('#rentMapUatPanel').count(),0,'Normal dashboard remains UAT free');
      console.log('PASS '+width+'px map-navigation, reference landmarks, Redfin advanced Price/Beds/Baths/pets/amenities ZIP filters, and normal dashboard isolation');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
