'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {summarizeSchools,summarizeNoaa,summarizeCrime,summarizeCommute}=require('../features/area-assessment-core.js');
const root=path.join(__dirname,'..');
test('school summary only counts located and verified A/B campuses, not assigned schools',()=>{
  const campuses=[{name:'A',ll:[33,-96]},{name:'B',ll:[33.1,-96]},{name:'C',ll:[33.2,-96]},{name:'unlocated'}];
  const grades={A:'A',B:'Not Rated',C:'D'};
  const r=summarizeSchools(campuses,ll=>ll[0]<33.15,s=>grades[s.name]);
  assert.deepEqual({count:r.count,rated:r.rated,ab:r.ab},{count:2,rated:1,ab:1});
  assert.match(r.message,/소재 학교/);
  assert.equal(summarizeSchools(campuses,null,()=>null).status,'unknown');
  const empty=summarizeSchools(campuses,()=>false,()=>null);
  assert.equal(empty.status,'empty');
  assert.match(empty.message,/배정 학교가 없다는 뜻은 아님/);
});
test('NOAA primary-county event counts do not equal probability',()=>{
  const rows=[{county:'COLLIN',year:2024,category:'hail',count:3},{county:'COLLIN',year:2025,category:'flood',count:2},
    {county:'COLLIN',year:2023,category:'hail',count:88},{county:'DALLAS',year:2025,category:'hail',count:9}];
  const r=summarizeNoaa(rows,'Collin County');
  assert.equal(r.hail,3);assert.equal(r.flood,2);
  assert.equal(summarizeNoaa(rows,'Tarrant County').status,'unknown');
  assert.doesNotMatch(r.message,/안전|위험 낮음/);
});
test('FBI rates are municipal and fail closed for ZIP mixed jurisdiction / missing rates',()=>{
  const base={metadata:{years:[2023,2024,2025]},zips:{'75013':{cities:[{ori:'A',share:0.96}],outsideCityShare:0.04},
    '75099':{cities:[{ori:'A',share:0.49},{ori:'B',share:0.3}],outsideCityShare:0.21}},
    cities:{A:{city:'Allen',years:{'2025':{violentRate:156,propertyRate:1234,violentMonths:12,propertyMonths:12}}},
      B:{city:'Example',years:{'2025':{violentRate:null,propertyRate:null,violentMonths:0,propertyMonths:0}}}}};
  const r=summarizeCrime(base,'75013');
  assert.equal(r.status,'available');assert.equal(r.city,'Allen');assert.match(r.message,/10만 명당/);
  assert.equal(summarizeCrime(base,'75099').status,'mixed');
  assert.equal(summarizeCrime(base,'00000').status,'unknown');
  base.cities.A.years['2025'].violentMonths=11;
  assert.equal(summarizeCrime(base,'75013').status,'unknown');
  base.cities.A.years['2025'].violentMonths=12;
  base.cities.A.years['2025'].violentRate=null;
  assert.equal(summarizeCrime(base,'75013').status,'unknown');
  base.cities.A.years['2025'].violentRate=156;
  base.zips['75013'].outsideCityShare=null;
  assert.equal(summarizeCrime(base,'75013').status,'unknown');
  base.zips['75013'].outsideCityShare=0.04;
  assert.equal(summarizeCrime(base,'75013').status,'available');
});
test('commute summary shows only the user-calculated travel time, no fixed office data',()=>{
  assert.equal(summarizeCommute(18,true).minutes,18);
  assert.match(summarizeCommute(18,true).message,/ZIP 대표점/);
  assert.equal(summarizeCommute(null,true).status,'unknown');
  assert.equal(summarizeCommute(40,false).status,'unknown');
  assert.equal(summarizeCommute(-1,true).status,'unknown');
});
test('visible assessment is placed across the main width before the map',()=>{
  const src=fs.readFileSync(path.join(root,'features/area-assessment.js'),'utf8');
  assert.match(src,/document\.querySelector\('\.main'\)/);
  assert.match(src,/main\.before\(section\)/);
  assert.doesNotMatch(src,/\.home-controls'\)/);
});
test('main page keeps legacy data-binding IDs but loads standalone assessment',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const id of ['k-zip','k-area','k-korean','k-households','k-income','schoolOverlay','map','homeForm'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/\.\/features\/area-assessment-core\.js/);
  assert.match(html,/\.\/features\/area-assessment\.js/);
  assert.match(html,/\.\/features\/area-assessment\.css/);
  const module=fs.readFileSync(path.join(root,'features/area-assessment.js'),'utf8');
  assert.doesNotMatch(module,/schoolGroup\.(?:clearLayers|addLayer)|zoneGroup\.(?:clearLayers|addLayer)|map\.setView|map\.fitBounds/);
  assert.doesNotMatch(module,/localStorage|sessionStorage|fetch\(['"]https?:\/\//);
});

test('every quick check labels its real data geography and snapshot year',()=>{
 const {regionEvidenceMeta}=require('../features/area-assessment-core.js');
 for(const id of ['schools','hazards','crime','commute'])
   assert.ok(regionEvidenceMeta(id).length>12,id);
 assert.match(regionEvidenceMeta('schools'),/2026.*배정 아님/);
 assert.match(regionEvidenceMeta('hazards'),/2024–25.*카운티.*FEMA/);
 assert.match(regionEvidenceMeta('crime'),/2025.*도시.*ZIP 범죄율 아님/);
 assert.doesNotMatch(regionEvidenceMeta('commute'),/JPM|jpm/);
});
test('new UI does not silently claim a NOAA county report equals the FEMA risk layer',()=>{
 const ui=fs.readFileSync(path.join(root,'features/area-assessment.js'),'utf8');
 assert.match(ui,/NOAA는 2024–25 카운티 과거 기록/);
 assert.match(ui,/FEMA 2025 홍수 상대 위험도/);
 assert.match(ui,/noaaStormHistoryPanel/);
 assert.match(ui,/areaQaActionStatus/);
 assert.doesNotMatch(ui,/schoolGroup\.(?:clearLayers|addLayer)|map\.fitBounds|map\.setView/);
});
