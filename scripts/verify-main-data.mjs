import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const readText = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const readJson = name => JSON.parse(readText(name));
const html = readText('index.html');
const audit = readJson('school-data-provenance.json');
const plano = readJson('plano-locator-reference.geojson');
const allen = readJson('allen-attendance-historical.geojson');
const prosper = readJson('prosper-celina-reference-2026.geojson');
const demographics = readJson('dfw-demographics.json');
const rating = readJson('tea-ratings-2026.json');
const location = readJson('nces-locations-2024.json');
const zips = readJson('dfw-zcta-boundaries.geojson');
const school = readJson('schools.json');
let total = 0;
const test = (name, fn) => {
  fn();
  total++;
  console.log('PASS ' + name);
};

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(x => x[1]).filter(Boolean);

test('main page inline JavaScript compiles', () => {
  assert.ok(inlineScripts.length >= 1);
  inlineScripts.forEach((script, i) => new Script(script, { filename: 'inline-' + i }));
});
test('all main application JS modules compile', () => {
  for (const name of ['rating-context.js','school-identity.js','school-assignment.js','home-lookup-v2.js','allen-lookup.js','candidate-compare.js']) {
    new Script(readText(name), {filename:name});
    assert.ok(html.includes('./' + name), name + ' not loaded');
  }
});
test('home-search, candidate comparison and commute preserved', () => {
  for (const id of ['homeForm','homeAddress','homeCandidates','candidateCards','destination','calcCommute','officeSelect','schoolList','zoneDatasetStatus','districtZoneAudit','map']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  for (const x of ['jpm-60min-isochrone-2026-11-04.geojson','county-scopes.json','dfw-zcta-boundaries.geojson','home-lookup-v2.js','candidate-compare.js']) {
    assert.ok(html.includes(x), x);
  }
});
test('no duplicate HTML ID', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size);
});
test('six distinct district records and exact evidence vintages', () => {
  assert.equal(audit.districts.length,6);
  assert.equal(new Set(audit.districts.map(x=>x.code)).size,6);
  const byCode = Object.fromEntries(audit.districts.map(x=>[x.code,x]));
  assert.equal(byCode.FISD.geometryYear,'2026–27');
  assert.equal(byCode.PISD.geometryYear,'2025–26');
  assert.ok(byCode.AISD.geometryYear.includes('2019'));
  assert.ok(byCode.LISD.geometryYear.includes('2025–26'));
  assert.equal(audit.districts.filter(x=>x.status==='current-source').length,1);
});
test('old Plano 2019 boundary removed from active code paths',()=>{
  const inline = inlineScripts.join('\n');
  assert.ok(inline.includes('./plano-locator-reference.geojson'));
  assert.ok(!inline.includes("url:'./plano-attendance-2019.geojson'"));
  assert.ok(!inline.includes('state.zoneData.PISD||[]'));
  assert.ok(inline.includes("s.district==='PISD'?state.zoneData.PISD_LOOKUP"));
});
test('Plano official 2025-26 contains 64 geometries',()=>{
  assert.equal(plano.type,'FeatureCollection');
  assert.equal(plano.features.length,64);
  assert.ok(plano.features.every(x=>x.geometry && x.properties.school && x.properties.sourceVintage?.includes('2025–26')));
});
test('Allen GIS remains historical (never falsely current)',()=>{
  assert.equal(allen.type,'FeatureCollection');
  assert.equal(allen.features.length,20);
  assert.ok(allen.features.every(x=>x.properties.current===false));
});
test('Prosper/Celina government GIS is validated as partial, never current',()=>{
  assert.equal(prosper.type,'FeatureCollection');
  assert.equal(prosper.features.length,13);
  assert.equal(prosper.metadata.sourceOwner,'City of Celina, TX / lisakasemodel-celinatx ArcGIS Online');
  assert.equal(prosper.metadata.schoolYearConfirmed,false);
  assert.equal(prosper.metadata.coverage,'partial-Celina');
  assert.equal(prosper.metadata.doNotUseForAddressAssignment,true);
  const levels={elementary:7,middle:3,high:3};
  for(const [level,count] of Object.entries(levels))assert.equal(prosper.features.filter(x=>x.properties.gradeLevel===level).length,count,level);
  assert.equal(new Set(prosper.features.map(x=>x.properties.gradeLevel+'|'+x.properties.school)).size,13);
  assert.equal(new Set(prosper.features.map(x=>x.properties.sourceUrl)).size,3);
  let vertices=0;
  function walk(x){if(typeof x[0]==='number'){const [lon,lat]=x;assert.ok(Number.isFinite(lon)&&lon>-97.3&&lon< -96.3);assert.ok(Number.isFinite(lat)&&lat>32.8&&lat<33.6);vertices++;return;}x.forEach(walk);}
  for(const f of prosper.features){
    assert.equal(f.properties.current,false);
    assert.equal(f.properties.sourceDistrict,'PROSPER');
    assert.ok(f.properties.sourceVintage.includes('학년도 미확인'));
    assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));
    walk(f.geometry.coordinates);
  }
  assert.ok(vertices>1100);
});
test('Prosper reference never enters address assignment',()=>{
  const inline=inlineScripts.join('\n');
  const home=readText('home-lookup-v2.js');
  assert.ok(inline.includes("district:'PROSPER_REF'"));
  assert.ok(inline.includes("s.district==='PROSPER'?state.zoneData.PROSPER_REF"));
  assert.ok(inline.includes("sources[i].district!=='PROSPER_REF'"));
  assert.ok(!home.includes("homeZoneMatches(item.ll,'PROSPER_REF')"));
  assert.ok(!home.includes("prosper:homeZoneMatches"));
});
test('Prosper new Jim Bridges school listed with no guessed coordinates',()=>{
  assert.ok(inlineScripts.join('\n').includes("name:'Jim Bridges Middle School',type:'middle',district:'PROSPER'"));
  assert.ok(inlineScripts.join('\n').includes("source:'Prosper ISD 2026–27 new campus"));
});
test('CFB official current GuideK12 locator linked',()=>{
  assert.ok(html.includes('https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/'));
});
test('6 school-district rows and provenance date visible on site',()=>{
  for (const name of ['Frisco','Plano','Allen','Lewisville','Prosper','Carrollton–Farmers Branch']) assert.ok(html.includes('<b>' + name + '</b>'));
  assert.ok(html.includes('학군별 배정 경계 최신성 · 2026-11-06'));
  assert.ok(html.includes('2019–20 경계를 대신 적용하지 않습니다'));
});
test('DFW demographic rows retain 2020-2024 ACS ZIP coverage',()=>{
  assert.ok(demographics.data?.length>=290);
  assert.equal(new Set(demographics.data.map(x=>x.z)).size,demographics.data.length);
  assert.ok(demographics.data.every(x=>/^\d{5}$/.test(x.z) && Number.isFinite(x.pop) && x.pop>=0));
});
test('2026 TEA campus ratings are source-linked and unique by ID',()=>{
  assert.equal(rating.year,2026);
  assert.ok(rating.data.length>=2200);
  assert.equal(new Set(rating.data.map(x=>x.id)).size,rating.data.length);
  assert.ok(rating.data.every(x=>/^\d{9}$/.test(x.id)));
  for(const d of ['PISD','FISD','AISD','PROSPER','LISD','CFB']) assert.ok(rating.data.some(x=>x.district===d),d);
});
test('NCES locations remain independent of school zoning',()=>{
  assert.ok(location.data.length>=2200);
  assert.ok(location.data.every(x=>Array.isArray(x.ll)&&x.ll.length===2&&Number.isFinite(x.ll[0])&&Number.isFinite(x.ll[1])));
});
test('ZIP map data and Plano school identity preserved',()=>{
  assert.equal(zips.type,'FeatureCollection');
  assert.ok(zips.features.length>=290);
  assert.ok(school.schools.length>=73);
});
console.log('Main website QA: ' + total + ' tests passed.');
