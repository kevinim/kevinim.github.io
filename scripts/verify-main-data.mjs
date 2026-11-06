import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const readText = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const readJson = name => JSON.parse(readText(name));
const html = readText('index.html');
const audit = readJson('school-data-provenance.json');
const plano = readJson('plano-locator-reference.geojson');
const allen = readJson('allen-attendance-historical.geojson');
const prosper = readJson('prosper-celina-reference-2026.geojson');
const prosperCurrent = readJson('prosper-attendance-2026.geojson');
const officialChecks = readJson('tests/prosper-official-location-checks-2026.json');
const require=createRequire(import.meta.url);
const {resolveAssignment}=require('../school-assignment.js');
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
  assert.equal(audit.districts.filter(x=>x.status==='current-source').length,2);
  assert.equal(byCode.PROSPER.geometryYear,'2026–27');
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
test('all 31 Prosper ISD 2026–27 school zones acquired from official live locator',()=>{
  assert.equal(prosperCurrent.type,'FeatureCollection');
  assert.equal(prosperCurrent.metadata.district,'PROSPER');
  assert.equal(prosperCurrent.metadata.sourceYear,'2026–27');
  assert.equal(prosperCurrent.metadata.currentYearConfirmed,true);
  assert.equal(prosperCurrent.metadata.recordCount,31);
  assert.equal(prosperCurrent.metadata.polygonPartCount,33);
  assert.equal(prosperCurrent.metadata.ringCount,35);
  assert.equal(prosperCurrent.metadata.vertexCount,1706);
  assert.deepEqual(prosperCurrent.metadata.gradeCounts,{elementary:20,middle:7,high:4});
  assert.ok(prosperCurrent.metadata.officialLocator.includes('infofinderi.com/ifi/?cid=PI5FFG7RYZ1'));
  assert.ok(prosperCurrent.metadata.sourceGroupNames.every(x=>x.startsWith('2026-2027')));
  assert.equal(prosperCurrent.features.length,31);
});
test('Prosper official current boundaries are full, valid and source ID-linked',()=>{
  const seen=new Set(),grades={elementary:0,middle:0,high:0},ratingById=new Map(rating.data.filter(x=>x.district==='PROSPER').map(x=>[x.id,x]));
  let vertices=0,rings=0,parts=0;
  for(const f of prosperCurrent.features){
    const p=f.properties;
    assert.equal(f.type,'Feature');
    assert.equal(p.sourceDistrict,'PROSPER');
    assert.equal(p.current,true);
    assert.equal(p.sourceYearConfirmed,true);
    assert.equal(p.sourceVintage,'2026–27');
    assert.equal(p.schoolYear,'2026–27');
    assert.ok(/^043912\d{3}$/.test(p.campusId));
    assert.ok(!seen.has(p.campusId));seen.add(p.campusId);
    assert.ok(ratingById.has(p.campusId)||(p.campusId==='043912048'&&p.school==='Jim Bridges Middle School'));
    grades[p.gradeLevel]++;
    assert.equal(f.geometry.type,'MultiPolygon');
    assert.ok(f.geometry.coordinates.length);
    for(const polygon of f.geometry.coordinates){
      parts++;assert.ok(polygon.length);
      for(const ring of polygon){
        rings++;vertices+=ring.length;
        assert.ok(ring.length>=4);
        assert.deepEqual(ring[0],ring.at(-1));
        for(const [x,y] of ring){
          assert.ok(Number.isFinite(x)&&x > -97.5&&x < -96.2);
          assert.ok(Number.isFinite(y)&&y >32.8&&y<33.6);
        }
      }
    }
  }
  assert.deepEqual(grades,{elementary:20,middle:7,high:4});
  assert.deepEqual([parts,rings,vertices],[33,35,1706]);
});
test('cross-validated Prosper 2026-27 source is live in campus map and home assignment',()=>{
  const inline=inlineScripts.join('\n'),home=readText('home-lookup-v2.js');
  assert.ok(readText('scripts/fetch-prosper-2026-zones.mjs').includes('GetRedistricts'));
  assert.ok(readText('scripts/check-prosper-official-locator.mjs').includes('SearchLocation'));
  assert.ok(inline.includes("district:'PROSPER',url:'./prosper-attendance-2026.geojson'"));
  assert.ok(!inline.includes("{district:'PROSPER_REF'"));
  assert.ok(!inline.includes("url:'./prosper-celina-reference-2026.geojson'"));
  assert.ok(inline.includes("s.district==='PROSPER'?state.zoneData.PROSPER"));
  assert.ok(inline.includes("s.district==='FISD'||s.district==='PROSPER'"));
  assert.ok(inline.includes('new Set(j.features.map(f=>f.properties?.campusId)).size!==31'));
  assert.ok(home.includes("prosper:homeZoneMatches(item.ll,'PROSPER')"));
  assert.ok(home.includes("최신 경계상 후보 · 프로스퍼 2026–27"));
  const sample=prosperCurrent.features[0];
  assert.equal(resolveAssignment({prosper:[sample]}).status,'current');
  assert.equal(resolveAssignment({prosper:[sample]}).district,'PROSPER');
  assert.equal(resolveAssignment({frisco:[sample],prosper:[sample]}).status,'conflict');
  assert.equal(resolveAssignment({prosper:[],ready:false}).status,'loading');
  assert.equal(resolveAssignment({prosper:[],ready:true,failed:true}).status,'error');
});
test('43 independently checked official Prosper interior and border coordinates match GIS',()=>{
  assert.equal(officialChecks.metadata.schoolYear,'2026–27');
  assert.equal(officialChecks.metadata.count,43);
  assert.equal(officialChecks.cases.filter(x=>x.type==='interior').length,31);
  assert.equal(officialChecks.cases.filter(x=>x.type==='boundary').length,12);
  const interiorCodes=new Set(officialChecks.cases.filter(x=>x.type==='interior').map(x=>x.gradeLevel+'|'+x.expectedCode));
  assert.equal(interiorCodes.size,31);
  function ringHas(point,ring){let odd=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])odd=!odd;}return odd}
  function contains(point,g){return g.coordinates.some(poly=>ringHas(point,poly[0])&&!poly.slice(1).some(r=>ringHas(point,r)));}
  for(const t of officialChecks.cases){
    assert.equal(t.officialQueryMatched,true);
    assert.ok(['elementary','middle','high'].includes(t.gradeLevel));
    assert.ok(t.position.length===2 && t.position.every(Number.isFinite));
    const matched=prosperCurrent.features.filter(f=>f.properties.gradeLevel===t.gradeLevel&&contains(t.position,f.geometry));
    assert.equal(matched.length,1,'Expected exactly 1 '+t.gradeLevel+' school at '+JSON.stringify(t.position));
    assert.equal(matched[0].properties.schoolCode,t.expectedCode,'Source lookup mismatch');
  }
  const boundary=officialChecks.cases.filter(x=>x.type==='boundary');
  assert.equal(new Set(boundary.map(x=>x.transition)).size,6);
  for(let i=1;i<=6;i++)assert.equal(boundary.filter(x=>x.transition===i).length,2);
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
test('Prosper archival Celina reference stays disabled',()=>{
  const inline=inlineScripts.join('\n'),home=readText('home-lookup-v2.js');
  assert.ok(!inline.includes("district:'PROSPER_REF'"));
  assert.ok(!inline.includes("state.zoneData.PROSPER_REF"));
  assert.ok(!home.includes("homeZoneMatches(item.ll,'PROSPER_REF')"));
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
  assert.ok(html.includes('교차 검증 통과'));
  assert.ok(html.includes('Frisco·Prosper 2곳'));
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
