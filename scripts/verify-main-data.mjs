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
const allenAddress = readJson('allen-address-schools.json');
const allenAddressAudit = readJson('allen-official-address-source-audit-2026.json');
const planoFeeder = readJson('plano-official-feeder-reference-2026.json');
const cfbFeeder = readJson('cfb-official-feeder-reference-2026.json');
const residentFinderAudit = readJson('official-resident-finder-audit-2026-11-07.json');
const remainingP0Audit = readJson('tests/remaining-p0-finder-audit-2026-11-07.json');
const prosper = readJson('prosper-celina-reference-2026.geojson');
const prosperCurrent = readJson('prosper-attendance-2026.geojson');
const officialChecks = readJson('tests/prosper-official-location-checks-2026.json');
const require=createRequire(import.meta.url);
const {resolveAssignment,schoolLevelMatchesAssignment}=require('../school-assignment.js');
const {inRing,inGeometry,inFriscoBorder,schoolKey,interiorPoints}=require('../scripts/attendance-geo-audit.cjs');
const publicAddressAudit=readJson('tests/public-address-finder-crosscheck-2026.json');
const planoGeometryAudit=readJson('tests/plano-feeder-geometry-audit-2026.json');
const {PLANO_LAYERS,PLANO_SERVICE,planoLiveUrl,convertPlanoLive,loadPlanoLiveFinder}=require('../plano-finder-live.js');
const {planoFeederKey,validPlanoFeederReference,evaluatePlanoFeederAssignment}=require('../plano-feeder-guard.js');
const {matchAllenAddress,normalizeAllenStreet}=require('../allen-lookup.js');
const {allenSplitApartmentException,ALLEN_SPLIT_APARTMENTS}=require('../allen-apartment-exceptions.js');
const {isRetiredCampus, RETIRED_CAMPUSES_2026}=require('../school-lifecycle.js');
const {isTexasGeocode,assessResidentialGeocode,rankTexasHomeCandidates}=require('../geocode-quality.js');
const {findLisdApartments,lisdKey}=require('../lewisville-apartments.js');
const {cfbFeederKey,cfbOfficialFeederValid,cfbFeederByElementary}=require('../cfb-feeder-lookup.js');
const lisdApartmentData=readJson('lewisville-official-apartments.json');
const {buildTexasSuggestUrl,isTexasStreetSuggestion,filterTexasStreetSuggestions}=require('../texas-address-suggest.js');
const {addCandidate}=require('../candidate-compare.js');
const {compareManualSchoolResult,compareProsperOfficialPoint,buildProsperOfficialPointUrl,officialReviewCandidates,officialReviewName,PLANO_2026_27_EXPERIENCE}=require('../official-school-review.js');
const {zoneBoundaryProximity,distancePointToSegmentMeters}=require('../school-zone-risk.js');
const {buildCollinParcelUrl,parcelStreetKey,assessCollinParcelResult}=require('../collin-parcel-check.js');
const demographics = readJson('dfw-demographics.json');
const rating = readJson('tea-ratings-2026.json');
const location = readJson('nces-locations-2024.json');
const zips = readJson('dfw-zcta-boundaries.geojson');
const school = readJson('schools.json');
let total = 0;
const asyncChecks=[];
const test = (name, fn) => {
  const result=fn();
  if(result&&typeof result.then==='function') {
    asyncChecks.push(result.then(()=>{total++;console.log('PASS '+name)}));
  } else {total++;console.log('PASS '+name)}
};

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(x => x[1]).filter(Boolean);

test('main page inline JavaScript compiles', () => {
  assert.ok(inlineScripts.length >= 1);
  inlineScripts.forEach((script, i) => new Script(script, { filename: 'inline-' + i }));
});
test('all main application JS modules compile', () => {
  for (const name of ['rating-context.js','school-identity.js','school-assignment.js','home-lookup-v2.js','allen-lookup.js','candidate-compare.js','school-lifecycle.js','geocode-quality.js','school-zone-risk.js','collin-parcel-check.js','official-school-review.js','texas-address-suggest.js','lewisville-apartments.js','cfb-feeder-lookup.js','allen-apartment-exceptions.js','plano-finder-live.js']) {
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
test('Allen official street-level source reconciled with 2 malformed-range exceptions',()=>{
 assert.equal(allenAddressAudit.streetRangesInOfficialTable,1689);
 assert.equal(allenAddressAudit.currentCachedRows,1688);
 assert.equal(allenAddressAudit.liveRecheck.liveOfficialRows,1689);
 assert.equal(allenAddressAudit.liveRecheck.rowsFullyMatchingAfterMarkdownEscapingNormalization,1688);
 assert.equal(allenAddressAudit.liveRecheck.schoolAssignmentChanges,0);
 assert.equal(allenAddressAudit.liveRecheck.academicYearExplicit,null);
 assert.equal(audit.districts.find(x=>x.code==='AISD').addressTableRevalidation.officialChangesInCachedAssignments,0);
 assert.equal(audit.districts.find(x=>x.code==='AISD').infofinderManifestRecheck.found2026_27,false);
 assert.equal(audit.districts.find(x=>x.code==='LISD').infofinderManifestRecheck.found2026_27,false);
 assert.equal(allenAddressAudit.currentCachedUsableRows,1687);
 assert.equal(allenAddressAudit.officialMalformedRows,2);
 assert.equal(allenAddress.rows.length,1688);
 assert.equal(allenAddress.schoolYear,null); // source school-year NOT explicitly stated
 const regex=/^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*(\(even numbers only\))?\s*$/i;
 const acceptable=allenAddress.rows.filter(x=>regex.test(x[1]));
 assert.equal(acceptable.length,1687);
 assert.deepEqual(allenAddress.rows.filter(x=>x[0]==='Peak St'),[['Peak St','2050','Evans','Ereckson','Lowery','Allen High School']]);
 assert.ok(!allenAddress.rows.some(x=>x[0]==='Moss Haven PL'));
 assert.equal(allenAddress.rows.filter(x=>!regex.test(x[1]))[0][0],'Crestview Heights');
 assert.equal(allenAddressAudit.quarantined[0].automaticMatchAllowed,false);
});
test('Allen numeric street lookup adds Peak while refusing malformed and apartment exceptions',()=>{
 const ok=matchAllenAddress('2050 Peak St, Allen, TX 75002',allenAddress.rows,true);
 assert.ok(ok);assert.deepEqual(ok.slice(2),['Evans','Ereckson','Lowery','Allen High School']);
 assert.equal(matchAllenAddress('2050 Peak St, Plano, TX',allenAddress.rows,false),null);
 assert.equal(matchAllenAddress('2009 Moss Haven Pl, Allen, TX',allenAddress.rows,true),null);
 assert.equal(matchAllenAddress('2050 Crestview Heights, Allen, TX',allenAddress.rows,true),null);
 assert.equal(matchAllenAddress('4450 S Ridge Rd, Allen, TX',allenAddress.rows,true),null);
 assert.equal(matchAllenAddress('4700 S Ridge Rd, Allen, TX',allenAddress.rows,true),null);
});
test('Allen official street name variants: suffix and direction, fail closed on competing ranges',()=>{
 assert.equal(normalizeAllenStreet('N Alder Drive'),normalizeAllenStreet('Alder Dr N'));
 assert.equal(normalizeAllenStreet('North Arbor Ridge Drive'),normalizeAllenStreet('Arbor Ridge Dr  N'));
 assert.equal(normalizeAllenStreet('Rivercrest Boulevard'),normalizeAllenStreet('Rivercrest Blvd'));
 assert.equal(normalizeAllenStreet('Mckinney Ranch Parkway'),'MCKINNEY RANCH PKWY');
 const river=matchAllenAddress('701 Rivercrest Boulevard, Allen, Texas 75002',allenAddress.rows,true);
 assert.ok(river);assert.equal(river[0],'Rivercrest Blvd');
 const alder=matchAllenAddress('100 N Alder Drive, Allen, TX 75002',allenAddress.rows,true);
 assert.ok(alder);assert.equal(alder[0],'Alder Dr  N');
 const peak=matchAllenAddress('2050 Peak Street, Allen, TX 75002',allenAddress.rows,true);
 assert.equal(peak?.[2],'Evans');
 assert.equal(matchAllenAddress('2050 Peak Street, Plano, TX 75002',allenAddress.rows,false),null);
 assert.equal(matchAllenAddress('4700 S Ridge Road, Allen, TX 75002',allenAddress.rows,true),null);
 assert.equal(matchAllenAddress('7830 Van Tuyl Parkway, Allen, TX 75002',allenAddress.rows,true),null);
 // Survey the entire published numeric-range snapshot: no silent campus changes.
 const numeric=/^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*(\(even numbers only\))?\s*$/i;
 let accepted=0,unresolved=0,checked=0;
 for(const row of allenAddress.rows){
  const range=row[1].match(numeric);if(!range)continue;
  let number=Number(range[1]);if(range[3]&&number%2)number++;
  const actual=matchAllenAddress(number+' '+row[0]+', Allen, TX 75002',allenAddress.rows,true);
  checked++;
  if(actual){assert.deepEqual(actual.slice(2),row.slice(2));accepted++}
  else unresolved++;
 }
 assert.equal(checked,1687);
 assert.equal(accepted,1680); // 3 overlapping source ranges + 4 published split-apartment rows are blocked
 assert.equal(unresolved,7);
 assert.ok(readText('index.html').includes('./allen-lookup.js?v=5'));
});

test('P0 Allen four published split apartments halt automatic Frisco/Allen campus highlighting',()=>{
 const cases=[
 ['4450 S Ridge Rd Apt 8202, McKinney, TX 75070','4450 S Ridge Rd'],
 ['4700 S Ridge Road Apt 501, McKinney, TX 75070','4700 S Ridge Rd'],
 ['6551 McKinney Ranch Pkwy Unit 611, McKinney, TX 75070','6551 McKinney Ranch Pkwy'],
 ['7830 Van Tuyl Parkway #118, McKinney, TX 75070','7830 Van Tuyl Pkwy']
 ];
 assert.equal(ALLEN_SPLIT_APARTMENTS.length,4);
 for(const [address,key] of cases){
  const found=allenSplitApartmentException(address);
  assert.ok(found,key);assert.equal(found.key,key);assert.equal(found.status,'unit-specific-district-boundary');
  assert.equal(found.source,'https://www.allenisd.org/page/findaschool');
 }
 assert.equal(allenSplitApartmentException('4450 S Ridge Ln, McKinney, TX'),null);
 assert.equal(allenSplitApartmentException('4451 S Ridge Rd, McKinney, TX'),null);
 assert.equal(allenSplitApartmentException('123 Main Street, Allen, TX'),null);
 const app=readText('home-lookup-v2.js'),cmp=readText('candidate-compare.js');
 assert.ok(app.includes("status:'apartment-split-review'"));
 assert.ok(app.includes('allenSplitApartmentException(item.typedAddress)||allenSplitApartmentException(item.address)'));
 assert.ok(app.includes("if(result.status==='apartment-split-review')"));
 assert.ok(app.includes('학군 경계가 건물·호수에 따라 갈리는 주소'));
 assert.ok(app.includes("typedAddress:candidate.savedTypedAddress||"));
 assert.ok(cmp.includes("typedAddress:candidate.typedAddress||candidate.address"));
 assert.ok(cmp.includes("savedTypedAddress:item.typedAddress"));
 assert.ok(html.includes('./allen-apartment-exceptions.js?v=1'));
});
test('P0 Plano senior-high home marker and map source legend are accurate',()=>{
 assert.equal(schoolLevelMatchesAssignment({district:'PISD',type:'high'},'high'),true);
 assert.equal(schoolLevelMatchesAssignment({district:'PISD',type:'high'},'senior'),true);
 assert.equal(schoolLevelMatchesAssignment({district:'PISD',type:'middle'},'senior'),false);
 assert.equal(schoolLevelMatchesAssignment({district:'LISD',type:'high'},'senior'),false);
 assert.equal(schoolLevelMatchesAssignment({district:'FISD',type:'high'},'senior'),false);
 const home=readText('home-lookup-v2.js');
 assert.ok(home.includes('schoolLevelMatchesAssignment(s,f.properties.gradeLevel)'));
 assert.ok(home.includes("result.district!==s.district)return false"));
 assert.ok(html.includes('./school-assignment.js?v=3'));
 assert.ok(html.includes('./home-lookup-v2.js?v=10'));
 assert.ok(html.includes('현행 공식 Finder가 사용하는 플레이노·루이스빌 경계는 파란색'));
 assert.ok(html.includes('플레이노 저장본과 앨런 과거 GIS는 주황색 점선 참고'));
});

test('P0 Plano four-level feeder guard detects Jackson Coit split and blocks mismatches',()=>{
 assert.equal(validPlanoFeederReference(planoFeeder),true);
 assert.equal(validPlanoFeederReference({...planoFeeder,feeders:[]}),false);
 assert.equal(planoFeederKey('Plano West Senior High School'),'plano west');
 assert.equal(planoFeederKey('Jackson (west of Coit) Elementary'),'jackson');
 const features=(elementary,middle,high,senior)=>[
  {properties:{gradeLevel:'elementary',school:elementary}},
  {properties:{gradeLevel:'middle',school:middle}},
  {properties:{gradeLevel:'high',school:high}},
  {properties:{gradeLevel:'senior',school:senior}}
 ];
 let evaluated=0;
 for(const row of planoFeeder.feeders)for(const elementary of row.elementary){
  const result=evaluatePlanoFeederAssignment(features(elementary,row.middle,row.high,row.seniorHigh),planoFeeder);
  assert.equal(result.status,'consistent',JSON.stringify({elementary,row,result}));
  assert.equal(result.schoolYearVerified,false);
  evaluated++;
 }
 assert.equal(evaluated,43);
 const west=features('Jackson Elementary School','Frankford Middle School','Shepton High School','Plano West Senior High School');
 const east=features('Jackson Elementary School','Wilson Middle School','Vines High School','Plano Senior High School');
 assert.equal(evaluatePlanoFeederAssignment(west,planoFeeder).status,'consistent');
 assert.equal(evaluatePlanoFeederAssignment(east,planoFeeder).status,'consistent');
 const wrong=features('Jackson Elementary School','Wilson Middle School','Shepton High School','Plano West Senior High School');
 assert.equal(evaluatePlanoFeederAssignment(wrong,planoFeeder).status,'disagreement');
 assert.equal(evaluatePlanoFeederAssignment(west.slice(0,3),planoFeeder).status,'ambiguous');
 assert.equal(evaluatePlanoFeederAssignment([...west,features('Haun','Robinson','Jasper','Plano West')[0]],planoFeeder).status,'ambiguous');
 assert.equal(evaluatePlanoFeederAssignment(west,null).status,'source-unavailable');
 const app=readText('home-lookup-v2.js');
 assert.ok(app.includes("if(found.district==='PISD'&&found.status==='finder-current')"));
 assert.ok(app.includes("status:'feeder-review',feeder"));
 assert.ok(app.includes("if(result.status==='feeder-review')"));
 assert.ok(app.includes("'finder-boundary-review','feeder-review'"));
 assert.ok(html.includes('./plano-feeder-guard.js?v=1'));
 assert.ok(html.includes("state.planoFeederReference=null"));
 assert.ok(html.includes("await feederPromise"));
 assert.ok(html.includes('Plano 공식 진학표 점검'));
});

test('Plano feeder name agreement with 2025–26 ArcGIS does not imply current GIS vintage',()=>{
 assert.equal(planoFeeder.sourceYearUnconfirmed,true);
 assert.equal(planoFeeder.academicYearExplicit,null);
 assert.equal(planoFeeder.counts.feederPaths,11);
 assert.equal(planoFeeder.counts.uniqueElementaryCampuses,42);
 assert.equal(planoFeeder.counts.uniqueMiddle,11);
 assert.equal(planoFeeder.counts.uniqueHigh,6);
 assert.equal(planoFeeder.counts.uniqueSenior,3);
 assert.equal(planoFeeder.feeders.length,11);
 const key=x=>String(x||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/\b(elementary|middle|high|senior|school)\b/g,'').replace(/[^a-z0-9]/g,'');
 const fromGIS=new Set(plano.features.filter(x=>x.properties.gradeLevel==='elementary').map(x=>key(x.properties.school)));
 const fromOfficial=new Set(planoFeeder.feeders.flatMap(x=>x.elementary.map(key)));
 assert.deepEqual([...fromGIS].sort(),[...fromOfficial].sort());
 assert.equal(plano.features.filter(x=>x.properties.gradeLevel==='elementary').length,44); // 42 campuses, 44 polygons
 assert.equal(planoFeeder.feeders.reduce((acc,x)=>acc+x.elementary.length,0),43); // Jackson split into two different feeder paths
 assert.ok(planoFeeder.specialCases.some(x=>x.rule==='east of Coit Road'&&x.middle==='Wilson'));
 assert.ok(planoFeeder.specialCases.some(x=>x.rule==='west of Coit Road'&&x.middle==='Frankford'));
});
test('Production source panels and Jackson overlay identify authoritative exceptions',()=>{
 assert.ok(html.includes('현행 SchoolFinder 연결 GIS 64개 · 5400 Legacy Dr 공식 ArcGIS 주소 좌표 질의 4개 학교 일치'));
 assert.ok(html.includes('공식 주소표 1,689행/유효 1,687행'));
 assert.ok(html.includes('Moss Haven Pl'));
 assert.ok(html.includes('Crestview Heights'));
 assert.ok(html.includes('Jackson Elementary 진학 경로 예외'));
 assert.ok(html.includes('Coit Rd 동쪽'));
 assert.ok(html.includes('Plano West Senior'));
 assert.ok(html.includes('현행 SchoolFinder 연결 GIS 64개 · 5400 Legacy Dr 공식 ArcGIS 주소 좌표 질의 4개 학교 일치'));
 assert.ok(html.includes('Frisco·Prosper 2곳'));
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
  assert.ok(readText('scripts/check-prosper-official-locator.mjs').includes('officialSearchUrl'));
  assert.ok(officialChecks.metadata.officialSearchUrl.endsWith('/SearchLocation'));
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
test('2026-11-07 Allen/CFB resident Finder evidence gates are accurate',()=>{
 assert.equal(residentFinderAudit.auditDate,'2026-11-07');
 assert.equal(residentFinderAudit.districts.length,2);
 const allenFinder=residentFinderAudit.districts.find(x=>x.code==='AISD');
 assert.equal(allenFinder.status,'resident-finder-confirmed');
 assert.equal(allenFinder.observedRow.range,'2050');
 assert.deepEqual([allenFinder.observedRow.elementary,allenFinder.observedRow.middle,allenFinder.observedRow.freshman,allenFinder.observedRow.high],['Evans','Ereckson','Lowery','Allen High School']);
 assert.deepEqual(matchAllenAddress('2050 Peak St, Allen, TX 75002',allenAddress.rows,true)?.slice(2),['Evans','Ereckson','Lowery','Allen High School']);
 const cfbFinder=residentFinderAudit.districts.find(x=>x.code==='CFB');
 assert.equal(cfbFinder.status,'property-specific-lookup-not-independently-confirmed');
 assert.equal(cfbFinder.publicFacilityTestsCompleted,2);
 assert.equal(cfbFinder.uniquePropertyZonedResultsObserved,0);
 assert.equal(cfbFinder.currentYearGeometryVerified,false);
 assert.ok(html.includes('공식 주민용 Find-A-School 주소 검색 정상 작동'));
 assert.ok(html.includes('CFB는 공식 GuideK12에'));
 assert.ok(html.includes('주소별 배정 검증 보류'));
 assert.ok(html.includes('GIS 자체가 독립 검증된 학군은 Frisco·Prosper 2곳'));
});
test('CFB 2026-27 official feeder-only lookup provides 20 reference paths, never property assignments',()=>{
 assert.equal(cfbOfficialFeederValid(cfbFeeder),true);
 assert.equal(cfbFeederKey('Stark Elementary School'),cfbFeederKey('Stark'));
 assert.equal(cfbOfficialFeederValid({...cfbFeeder,academicYearExplicit:'2025–26'}),false);
 assert.equal(cfbFeederByElementary('Stark',null).status,'source-unavailable');
 assert.equal(cfbFeederByElementary('',cfbFeeder).status,'no-school-selected');
 assert.equal(cfbFeederByElementary('Random',cfbFeeder).status,'school-not-found');
 let pass=0,conflicts=0;
 for(const row of cfbFeeder.rows){
  const r=cfbFeederByElementary(row.zonedElementary,cfbFeeder);
  assert.equal(r.propertyAssignmentVerified,false,row.zonedElementary);
  if(row.zonedElementary==='Farmers Branch'){
   assert.equal(r.status,'official-disagreement');
   assert.equal(r.middle,undefined);
   assert.equal(r.high,undefined);
   conflicts++;
  }else{
   assert.equal(r.status,'feeder-reference',row.zonedElementary);
   assert.equal(r.middle,row.middle);
   assert.equal(r.high,row.high);
   assert.equal(r.schoolYear,'2026–27');
   pass++;
  }
 }
 assert.equal(pass,20);
 assert.equal(conflicts,1);
 assert.ok(html.includes('id="cfbFeederSection"'));
 assert.ok(html.includes('id="cfbElementary"'));
 assert.ok(html.includes('./cfb-feeder-lookup.js?v=3'));
 assert.ok(html.includes('id="cfbFeederAll"'));
 const staticHelper=readText('cfb-feeder-lookup.js');
 assert.ok(staticHelper.includes('function renderAll()'));
 assert.ok(staticHelper.includes("node('td','공식 자료 충돌 · 확인 필요')"));
 assert.ok(staticHelper.includes("select.addEventListener('input',render)"));
 const feederUi=readText('cfb-feeder-lookup.js');
 assert.ok(feederUi.includes("select.addEventListener('focus',load)"));
 assert.ok(feederUi.includes('load();\n}'));
 assert.ok(html.includes('진학표입니다. <b>집 주소의 배정 학교를 찾아주는 기능은 아닙니다.'));
});

test('CFB official 2026–27 feeder table is accurate and never treated as GIS',()=>{
  assert.equal(cfbFeeder.academicYearExplicit,'2026–27');
  assert.equal(cfbFeeder.notParcelGeometries,true);
  assert.equal(cfbFeeder.notAddressSchoolLookup,true);
  assert.equal(cfbFeeder.counts.zonedElementary,21);
  assert.equal(cfbFeeder.rows.length,21);
  assert.equal(new Set(cfbFeeder.rows.map(x=>x.zonedElementary)).size,21);
  assert.equal(new Set(cfbFeeder.rows.map(x=>x.middle)).size,5);
  assert.equal(new Set(cfbFeeder.rows.map(x=>x.high)).size,4);
  const sourceCfb=audit.districts.find(x=>x.code==='CFB');
  assert.equal(sourceCfb.status,'lookup-only');
  assert.equal(sourceCfb.feederReference.publishedSchoolYear,'2026–27');
  assert.equal(sourceCfb.feederReference.notBoundaryGeometry,true);
  const m=cfbFeeder.rows.find(x=>x.zonedElementary==='McLaughlin-Strickland');
  assert.equal(m.middle,'Perry');assert.equal(m.high,'Turner');
  const b=cfbFeeder.rows.find(x=>x.zonedElementary==='Blanton');
  assert.equal(b.k5_Bilingual,'Carrollton');
  assert.equal(b.k5,'Blanton');
  assert.ok(html.includes('CFB 2026–27 진학표 A') && html.includes('CFB 2026–27 진학표 B'));
  assert.ok(html.includes('2026–27 공식 진학표 20/21행 일치, Farmers Branch Elementary 충돌'));
});
test('active 2026-27 campus selection excludes 14 officially retired schools',()=>{
 assert.equal(RETIRED_CAMPUSES_2026.length,14);
 const staley=rating.data.find(x=>x.id==='043905041'&&x.district==='FISD');
 assert.ok(staley);assert.equal(isRetiredCampus(staley),true);
 assert.equal(isRetiredCampus({district:'FISD',name:'Nelson Middle School'}),false);
 assert.equal(isRetiredCampus({district:'PROSPER',name:'Jim Bridges Middle School'}),false);
 for(const rec of RETIRED_CAMPUSES_2026)assert.ok(isRetiredCampus(rec),rec.name);
 const app=inlineScripts.join('\n');
 assert.ok(app.includes('if(isRetiredCampus(r))continue'));
 assert.ok(app.includes('if(isRetiredCampus(s))return'));
 assert.ok(html.includes('./school-lifecycle.js?v=1'));
 assert.ok(html.includes('학교 위치 출처:'));
});
test('school assignment candidates require precise residential geocoder results',()=>{
 const q='8181 Communications Pkwy, Plano, TX 75024';
 const make=(score,type,zip='75024',region='TX')=>({score,address:'8181 Communications Pkwy, Plano, TX '+zip,location:{x:-96.8,y:33.1},attributes:{Addr_type:type,Postal:zip,Region:region}});
 assert.equal(assessResidentialGeocode(q,make(100,'PointAddress')).usableForSchoolCandidate,true);
 assert.equal(assessResidentialGeocode(q,make(98,'Subaddress')).usableForSchoolCandidate,true);
 assert.equal(assessResidentialGeocode(q,make(100,'StreetAddress')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(q,make(94,'PointAddress')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(q,make(100,'Locality')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(q,make(100,'PointAddress','75035')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(q,make(100,'PointAddress','75024','OK')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(q,null).usableForSchoolCandidate,false);
 const bad={address:'Bad geocode',ll:[33,-96],geocodeQuality:assessResidentialGeocode(q,make(80,'Locality'))};
 assert.equal(addCandidate([],bad)[0].geocodeQuality.usableForSchoolCandidate,false);
 const src=readText('home-lookup-v2.js');
 assert.ok(src.includes("status:'needs-address-verification'"));
 assert.ok(src.includes('if(!item?.geocodeQuality?.usableForSchoolCandidate)'));
 assert.ok(src.includes('candidate.savedGeocodeQuality||assessResidentialGeocode'));
 assert.ok(html.includes('./geocode-quality.js?v=1'));
});
test('official CFB 2026-27 feeder contradiction is not auto-resolved',()=>{
 const c=cfbFeeder.officialSourceConflicts.find(x=>x.school==='Farmers Branch');
 assert.ok(c);assert.equal(c.middleA,'Field');assert.equal(c.highA,'Turner');
 assert.equal(c.middleB,'Bush');assert.equal(c.highB,'Ranchview');
 assert.equal(c.status,'unresolved-do-not-auto-assign');
 assert.equal(cfbFeeder.rows.find(x=>x.zonedElementary==='Farmers Branch').feederVerification,'conflicting-official-sources');
 assert.equal(cfbFeeder.crossSourceAudit.sourceCount,3);
 assert.equal(cfbFeeder.crossSourceAudit.rowCountPerSource,21);
 assert.equal(cfbFeeder.crossSourceAudit.fullyMatchingRows,20);
 assert.equal(cfbFeeder.crossSourceAudit.conflictingRows,1);
 assert.equal(cfbFeeder.crossSourceAudit.columnsPerRow,7);
 assert.equal(cfbFeeder.crossSourceAudit.sources.length,3);
 assert.ok(cfbFeeder.crossSourceAudit.sources.every(x=>x.startsWith('https://www.cfbisd.edu/')));
 assert.equal(cfbFeeder.crossSourceAudit.conflictSchool,'Farmers Branch');
 assert.equal(audit.districts.find(x=>x.code==='CFB').feederReference.autoAssignmentAllowed,false);
 assert.ok(html.includes('Farmers Branch Elementary 충돌'));
});
test('P0 zone-edge warning uses closest official polygon ring',()=>{
 const p=[-96.7,33.1],d=100/111195;
 const ring=r=>[[p[0]-r,p[1]-r],[p[0]+r,p[1]-r],[p[0]+r,p[1]+r],[p[0]-r,p[1]+r],[p[0]-r,p[1]-r]];
 const near=zoneBoundaryProximity(p,[{geometry:{type:'Polygon',coordinates:[ring(d)]}}]);
 const far=zoneBoundaryProximity(p,[{geometry:{type:'MultiPolygon',coordinates:[[ring(4*d)]]}}]);
 assert.ok(near.review && near.distanceMeters>60 && near.distanceMeters<=105);
 assert.ok(!far.review && far.distanceMeters>270);
 assert.equal(zoneBoundaryProximity(p,[]),null);
 assert.ok(distancePointToSegmentMeters(p,p,p)<0.001);
 const hole=zoneBoundaryProximity(p,[{geometry:{type:'Polygon',coordinates:[ring(5*d),ring(.5*d)]}}]);
 assert.ok(hole.review);
 const h=readText('home-lookup-v2.js');
 assert.ok(h.includes("'boundary-review':'finder-boundary-review'"));
 assert.ok(h.includes('zoneBoundaryProximity([item.ll[1],item.ll[0]],found.features)'));
 assert.ok(html.includes('./school-zone-risk.js?v=1'));
});
test('P0 Collin CAD on-demand parcel crosscheck is address-only, fail closed',()=>{
 const u=new URL(buildCollinParcelUrl([33.10880474891,-96.65977951915]));
 assert.equal(u.host,'services2.arcgis.com');
 assert.equal(u.searchParams.get('geometry'),'-96.65977951915,33.10880474891');
 assert.equal(u.searchParams.get('outFields'),'OBJECTID,situsConcat,propYear');
 assert.equal(u.searchParams.get('returnGeometry'),'false');
 assert.equal(parcelStreetKey('300 Rivercrest Boulevard, Allen, TX 75002'),parcelStreetKey('300 RIVERCREST BLVD , ALLEN, TX 75002'));
 const a='300 Rivercrest Blvd, Allen, TX 75002';
 assert.equal(assessCollinParcelResult(a,{features:[{attributes:{situsConcat:'300 RIVERCREST BLVD , ALLEN, TX 75002',propYear:2027}}]}).status,'matched');
 assert.equal(assessCollinParcelResult(a,{features:[{attributes:{situsConcat:'310 Rivercrest Blvd, Allen, TX 75002'}}]}).status,'mismatch');
 assert.equal(assessCollinParcelResult(a,{features:[]}).status,'not-found');
 assert.equal(assessCollinParcelResult(a,{features:[{attributes:{}},{attributes:{}}]}).status,'ambiguous');
 assert.equal(assessCollinParcelResult(a,{error:{code:400}}).status,'error');
 const h=readText('home-lookup-v2.js'),cmp=readText('candidate-compare.js');
 assert.ok(h.includes('parcelButton.onclick=checkHomeParcel'));
 assert.ok(h.includes('homeParcelRequest?.abort()'));
 assert.ok(h.includes('savedGeocodeQuality'));
 assert.ok(cmp.includes('savedGeocodeQuality:item.geocodeQuality'));
 assert.ok(html.includes('누르면 집 핀 좌표가 Collin CAD에 전송됩니다'));
 assert.ok(html.includes('./collin-parcel-check.js?v=1'));
});
test('official live Prosper point comparison uses current polygon codes, never claims residence verification',()=>{
 const x=prosperCurrent.features.filter(f=>['elementary','middle','high'].includes(f.properties.gradeLevel));
 const sample=[x.find(f=>f.properties.gradeLevel==='elementary'),x.find(f=>f.properties.gradeLevel==='middle'),x.find(f=>f.properties.gradeLevel==='high')];
 const predicted={district:'PROSPER',status:'current',features:sample};
 const payload={resultCode:200,exactAddressMatch:false,schools:sample.map(f=>({schoolCode:String(Number(f.properties.schoolCode))}))};
 const good=compareProsperOfficialPoint(predicted,payload);
 assert.equal(good.status,'official-point-codes-match');
 assert.equal(good.addressExact,false);
 assert.equal(good.pointOnly,true);
 const bad=compareProsperOfficialPoint(predicted,{...payload,schools:payload.schools.slice(0,2)});
 assert.equal(bad.status,'official-code-disagreement');
 const additional=compareProsperOfficialPoint(predicted,{...payload,schools:[...payload.schools,{schoolCode:'999'}]});
 assert.equal(additional.status,'official-code-disagreement');
 assert.deepEqual(additional.unexpected,['999']);
 assert.equal(compareProsperOfficialPoint(predicted,{resultCode:403}).status,'invalid-official-response');
 const u=new URL(buildProsperOfficialPointUrl([33.226183,-96.7847555]));
 assert.equal(u.hostname,'www.infofinderi.com');
 assert.equal(u.searchParams.get('clientId'),'PI5FFG7RYZ1');
 assert.equal(u.searchParams.get('schoolId'),'-1');
 assert.equal(u.searchParams.get('gradeId'),'-1');
 assert.throws(()=>buildProsperOfficialPointUrl([40,-73]));
});
test('official manual result only checks user transcription, never upgrades old GIS vintage',()=>{
 const p={district:'PISD',status:'reference',features:[{properties:{gradeLevel:'elementary',school:'Jackson Elementary'}}]};
 assert.deepEqual(officialReviewCandidates(p,'elementary'),['Jackson Elementary']);
 assert.equal(officialReviewName('Jackson Elementary School'),officialReviewName('Jackson EL'));
 const ok=compareManualSchoolResult(p,{district:'PISD',gradeLevel:'elementary',schoolName:'Jackson Elementary',schoolYear:'2026–27'});
 assert.equal(ok.status,'manually-reported-match');
 assert.equal(ok.geometryCurrent,false);
 assert.equal(ok.sourceKind,'user-transcribed-not-independently-verified');
 assert.equal(compareManualSchoolResult(p,{district:'PISD',gradeLevel:'elementary',schoolName:'Another School',schoolYear:'2026–27'}).status,'manually-reported-mismatch');
 assert.equal(compareManualSchoolResult(p,{district:'PISD',gradeLevel:'elementary',schoolName:'Jackson Elementary',schoolYear:'older'}).status,'year-not-confirmed');
 assert.equal(compareManualSchoolResult(p,{district:'CFB',gradeLevel:'elementary',schoolName:'Jackson Elementary',schoolYear:'2026–27'}).status,'district-disagrees');
 assert.equal(compareManualSchoolResult({status:'unavailable'},{district:'PISD',gradeLevel:'elementary',schoolName:'Jackson Elementary',schoolYear:'2026–27'}).status,'no-candidate');
 const a={district:'AISD',status:'unverified-year',allen:['Peak St','2050','Evans','Ereckson','Lowery','Allen High School']};
 assert.deepEqual(officialReviewCandidates(a,'freshman'),['Lowery']);
 assert.equal(PLANO_2026_27_EXPERIENCE,'https://experience.arcgis.com/experience/73a3f873d9c040348d6e723ed4b48af4');
 const h=readText('home-lookup-v2.js');
 assert.ok(h.includes('officialReviewPanelHtml(home)'));
 assert.ok(h.includes('wireOfficialReviewPanel(home)'));
 assert.ok(h.includes('homeOfficialRequest?.abort()'));
 assert.ok(html.includes('official-school-review.js?v=1'));
 assert.ok(readText('candidate-compare.js').includes('savedOfficialReview:item.officialReview'));
});
test('P0 home geocoding rejects uncertain TX and does not silently choose a tied home',()=>{
 const make=(address,score,region='TX',zip='75024',x=-96.8,y=33.1,type='PointAddress')=>({
  address,score,location:{x,y},attributes:{Region:region,Postal:zip,Addr_type:type}
 });
 const plano=make('3400 Legacy Dr, Plano, TX 75024',99);
 const frisco=make('3400 Legacy Dr, Frisco, TX 75034',99,'TX','75034',-96.82,33.15);
 const outOfState=make('3400 Legacy Dr, Oklahoma City, OK 73102',100,'OK','73102');
 const noRegion=make('3400 Legacy Dr, Plano, TX 75024',100,'','75024');
 const wrongCoords=make('3400 Legacy Dr, Houston, TX 77002',100,'TX','77002',-90,29);
 assert.equal(isTexasGeocode(outOfState),false);
 assert.equal(isTexasGeocode(noRegion),false);
 assert.equal(isTexasGeocode(wrongCoords),false);
 assert.equal(assessResidentialGeocode('3400 Legacy Dr',noRegion).usableForSchoolCandidate,false);
 const tied=rankTexasHomeCandidates('3400 Legacy Dr',[outOfState,noRegion,frisco,plano,plano]);
 assert.equal(tied.candidates.length,2);
 assert.equal(tied.requiresSelection,true);
 assert.equal(tied.candidates.every(isTexasGeocode),true);
 const zipExact=rankTexasHomeCandidates('3400 Legacy Dr, Plano, TX 75024',[frisco,plano]);
 assert.equal(zipExact.candidates[0].address,plano.address);
 assert.equal(zipExact.requiresSelection,false);
 const weak=rankTexasHomeCandidates('3400 Legacy Dr',[plano,make('Legacy Dr, Plano, TX 75024',93,'TX','75024',-96.81,33.12,'StreetName')]);
 assert.equal(weak.requiresSelection,false);
 assert.equal(rankTexasHomeCandidates('123 Main',[outOfState,noRegion]).candidates.length,0);
 const ui=readText('home-lookup-v2.js');
 assert.ok(ui.includes('rankTexasHomeCandidates(address,result)'));
 assert.ok(ui.includes('showHomeCandidateChoices(candidates)'));
 assert.ok(ui.includes('if(requiresSelection)'));
});

test('Texas-only home address suggestions exclude Oklahoma and POIs even inside the Esri bounding box',()=>{
 const u=new URL(buildTexasSuggestUrl('3400 Legacy'));
 assert.equal(u.pathname.endsWith('/suggest'),true);
 assert.equal(u.searchParams.get('countryCode'),'USA');
 assert.equal(u.searchParams.get('sourceCountry'),'USA');
 assert.equal(u.searchParams.get('searchExtent'),'-106.65,25.8,-93.5,36.5');
 assert.equal(u.searchParams.get('maxSuggestions'),'15');
 assert.equal(u.searchParams.get('returnCollections'),'false');
 assert.throws(()=>buildTexasSuggestUrl('300'));
 const raw=[
  {text:'3400 Legacy Dr, Frisco, TX, 75034, USA',magicKey:'frisco',isCollection:false},
  {text:'3400 Legacy Dr, Plano, TX, 75023, USA',magicKey:'plano',isCollection:false},
  {text:'3400 Legacy Pointe, El Reno, OK, 73036, USA',magicKey:'ok',isCollection:false},
  {text:'3400 Legacy Dr, Frisco, TX, 75034, USA',magicKey:'dupe',isCollection:false},
  {text:'School, 3400 Main St, Austin, TX, 78701, USA',magicKey:'poi',isCollection:false},
  {text:'3400 Legacy Ln, Harlingen, TX, 78550, USA',magicKey:'harlingen',isCollection:false},
  {text:'3400 Main St, Irving, TX, 75062, USA',magicKey:'coll',isCollection:true},
  {text:'3400 No Key Dr, Plano, TX, 75024, USA',isCollection:false}
 ];
 const matches=filterTexasStreetSuggestions(raw);
 assert.deepEqual(matches.map(x=>x.magicKey),['frisco','plano','harlingen']);
 assert.equal(isTexasStreetSuggestion(raw[2]),false);
 assert.equal(isTexasStreetSuggestion(raw[0]),true);
 assert.equal(filterTexasStreetSuggestions(raw,2).length,2);
});
test('home autocomplete ARIA, debounced request, magicKey and direct address search are wired',()=>{
 for(const id of ['homeSuggestions','homeSuggestHint'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('aria-autocomplete="list"'));
 assert.ok(html.includes('aria-controls="homeSuggestions"'));
 assert.ok(html.includes('aria-expanded="false"'));
 assert.ok(html.includes('입력 중 주소 일부가 Esri에 전송됩니다'));
 const mod=readText('texas-address-suggest.js'),src=readText('home-lookup-v2.js');
 assert.ok(mod.includes('},320)'));
 assert.ok(mod.includes('controller?.abort()'));
 assert.ok(mod.includes("e.key==='Escape'"));
 assert.ok(mod.includes("e.key==='ArrowDown'"));
 assert.ok(mod.includes("e.key==='Enter'&&active>=0"));
 assert.ok(src.includes('homeAutocomplete=attachTexasAddressSuggestions('));
 assert.ok(src.includes("body.set('magicKey',suggestion.magicKey)"));
 assert.ok(src.includes('geocodeAddress(address,homeRequest.signal,suggestion)'));
 assert.ok(src.includes("homeAutocomplete?.dismiss();clearHome()"));
});
test('P0 CFB/area source drift monitors never promote conflicting feeder or apartment to enrollment truth',()=>{
 const cfbSource=readJson('cfb-official-feeder-reference-2026.json');
 const conflict=cfbSource.officialSourceConflicts.find(x=>x.school==='Farmers Branch');
 assert.ok(conflict);assert.equal(conflict.status,'unresolved-do-not-auto-assign');
 assert.equal(conflict.corroboratingCurrentCampusArticle.published,'2026-11-06');
 assert.equal(conflict.corroboratingCurrentCampusArticle.status,'supporting-context-only-keep-conflict-blocked');
 assert.equal(cfbFeederByElementary('Farmers Branch',cfbSource).status,'official-disagreement');
 const cfb=audit.districts.find(x=>x.code==='CFB');
 const lisd=audit.districts.find(x=>x.code==='LISD');
 assert.equal(cfb.feederReference.additionalCampus2026Context.sourceContradictionStillOpen,true);
 assert.equal(cfb.feederReference.weeklyAutomatedSourceDrift,'scripts/check-cfb-feeder-source-drift-live.mjs');
 assert.equal(lisd.apartmentReference.weeklyAutomatedSourceDrift,'scripts/check-lisd-budget-suites-source-drift-live.mjs');
 const cfbScript=readText('scripts/check-cfb-feeder-source-drift-live.mjs');
 const lisdScript=readText('scripts/check-lisd-budget-suites-source-drift-live.mjs');
 const weekly=readText('.github/workflows/live-official-school-sources.yml');
 assert.ok(cfbScript.includes('autoAssignAllowed:false'));
 assert.ok(cfbScript.includes('source-conflict-possibly-resolved-requires-human-review'));
 assert.ok(lisdScript.includes("officialCampusAssignmentFor5289:'unresolved'"));
 assert.ok(weekly.includes('node scripts/check-cfb-feeder-source-drift-live.mjs'));
 assert.ok(weekly.includes('node scripts/check-lisd-budget-suites-source-drift-live.mjs'));
 assert.ok(weekly.includes('artifacts/cfb-farmers-branch-source-drift.json'));
 assert.ok(weekly.includes('artifacts/lisd-5289-budget-suites-source-drift.json'));
 const health=readText('scripts/check-official-source-health-live.mjs');
 assert.ok(health.includes("kind:'district-linked-legacy-url-advisory-only'"));
});
test('P0 remaining districts retain honest address-level evidence and free live-source monitor',()=>{
 assert.equal(audit.lastVerified,'2026-11-07');
 assert.equal(remainingP0Audit.auditDate,'2026-11-07');
 assert.equal(remainingP0Audit.completionPolicy.includes('official property-specific result'),true);
 assert.deepEqual(remainingP0Audit.samples.map(x=>x.district),['PISD','CFB','LISD']);
 const p=remainingP0Audit.samples[0];
 assert.equal(p.status,'property-school-names-not-independently-confirmed');
 assert.equal(p.existingGISExpected.elementary,'Haun');
 const officialPoint=p.officialFinderLinkedArcGISPublicAddress20261107;
 assert.equal(officialPoint.exactSchoolNamesMatched,4);
 assert.equal(officialPoint.levelsChecked,4);
 assert.equal(officialPoint.officialLiveServiceResults.senior,'Plano West Senior High');
 assert.equal(officialPoint.independentBrowserFinderUiResult,false);
 const districtPoint=audit.districts.find(x=>x.code==='PISD').liveFinderVerification.publicAddressFinderFollowup.officialArcGISPointQuery;
 assert.equal(districtPoint.exactMatches,4);
 assert.equal(districtPoint.siteUiIndependentResults,0);
 assert.equal(districtPoint.yearOfSourceLayer,'2025–26');
 const sourceScript=readText('scripts/check-plano-public-address-layer-live.mjs');
 assert.ok(sourceScript.includes("geometryType:'esriGeometryPoint'"));
 assert.ok(sourceScript.includes("independentFinderUiCampusResultVerified:false"));
 assert.ok(sourceScript.includes("level.level==='senior'&&f.properties?.gradeLevel==='high'"));
 assert.equal(audit.districts.find(x=>x.code==='PISD').liveFinderVerification.publicAddressFinderFollowup.independentlyMatchedAddressSchoolNames,0);
 const c=remainingP0Audit.samples[1];
 assert.equal(c.status,'property-school-names-not-independently-confirmed');
 assert.equal(c.addressSamples.length,2);
 assert.equal(c.safeFeederPaths,20);
 assert.equal(c.conflictingFeederPaths,1);
 assert.equal(audit.districts.find(x=>x.code==='CFB').residentFinderVerification.uniqueZonedCampusSetsObserved,0);
 const l=remainingP0Audit.samples[2];
 assert.equal(l.status,'official-table-vs-current-finder-map-conflict-unresolved');
 assert.ok(l.operatorConfirmedAddress.includes('The Colony'));
 assert.equal(audit.districts.find(x=>x.code==='LISD').liveFinderVerification.apartment5289Followup.findAnApartmentSelectionVerified,false);
 assert.ok(html.includes('5400 Legacy Dr 공식 ArcGIS 주소 좌표 질의 4개 학교 일치'));
 assert.ok(html.includes('GIS 원본 연도는 2025–26이며 공식 Finder 웹 화면에서 독립적으로 읽어낸 학교명은 아닙니다.'));
 assert.ok(html.includes('5289 아파트 표/지도 4단계 충돌은 교육청 확인 전 자동 배정 금지'));
 const schedule=readText('.github/workflows/live-official-school-sources.yml');
 const probe=readText('scripts/check-official-source-health-live.mjs');
 assert.ok(schedule.includes('workflow_dispatch:')&&schedule.includes('schedule:'));
 assert.ok(schedule.includes('node scripts/check-public-address-finders-live.mjs'));
 assert.ok(schedule.includes('node scripts/check-plano-feeder-zones-live.mjs'));
 assert.ok(schedule.includes('node scripts/check-official-source-health-live.mjs'));
 assert.ok(probe.includes('notAddressSchoolVerification:true'));
 assert.ok(probe.includes("propertyAssignmentVerified:false"));
});
test('LISD official locator-linked 174 apartment table and no unsafe vintage promotion',()=>{
 const info=lisdApartmentData.metadata,rows=lisdApartmentData.apartments;
 assert.equal(rows.length,174);assert.equal(info.recordCount,174);
 assert.equal(info.sourceAcademicYear,null);
 assert.equal(info.internalCrossCheck.records,174);
 assert.equal(info.internalCrossCheck.recordsAllFourLevelsMatch,173);
 assert.equal(info.internalCrossCheck.recordsDisputed,1);
 assert.equal(info.internalCrossCheck.publicationYearProven,false);
 const disputed=rows.filter(x=>x.zoneAudit?.status==='internal-map-conflict');
 assert.equal(disputed.length,1);
 assert.equal(disputed[0].name,'Budget Suites of America');
 assert.equal(disputed[0].address,'5289 STATE HIGHWAY 121');
 assert.deepEqual(disputed[0].zoneAudit.polygonAtLocatorPoint,{elementary:'CAMEY',middle:'LAKEVIEW',intermediate:'THE COLONY',high:'THE COLONY'});
 assert.equal(disputed[0].elementary,'SOUTHRIDGE');assert.equal(disputed[0].middle,'DURHAM');
 assert.equal(disputed[0].intermediate,'LEWISVILLE HARMON');assert.equal(disputed[0].high,'LEWISVILLE');
 const operator=disputed[0].zoneAudit.propertyLocationCrosscheck;
 assert.equal(operator.operatorAddress,'5289 S. Highway 121, The Colony, TX 75056');
 assert.equal(operator.schoolsVerifiedByOperator,false);
 assert.equal(operator.confirmsStreetAndCity,true);
 assert.equal(operator.otherSameNameLocatorRecord,'2175 S STATE HIGHWAY 121');
 assert.equal(info.internalCrossCheck.recordsDisputed,1);
 assert.ok(readText('lewisville-apartments.js').includes('운영사 주소는 건물 위치 확인용입니다. 학교 배정 확인 자료가 아닙니다.'));
 assert.ok(html.includes('./lewisville-apartments.js?v=2'));
 assert.ok(readText('lewisville-apartments.js').includes("rec.zoneAudit?.status==='internal-map-conflict'"));
 assert.ok(html.includes('지도와 배정표가 서로 다른 아파트 1곳은 별도 경고'));
 assert.equal(info.uniqueApartmentNames,173);
 assert.equal(rows.filter(r=>!r.address).length,4);
 assert.ok(rows.every(r=>r.name&&r.elementary&&r.middle&&r.intermediate&&r.high));
 assert.equal(new Set(rows.map(r=>lisdKey(r.name))).size,173);
 assert.ok(info.source.includes('apartments_lewisville/FeatureServer/0'));
 assert.ok(findLisdApartments('Arbor Creek',rows).some(r=>r.name==='ARBOR CREEK'));
 assert.ok(findLisdApartments('396 SOUTHWEST',rows).some(r=>r.name==='ARBOR CREEK'));
 assert.ok(findLisdApartments('Vue Castle',rows).some(r=>r.name==='VUE CASTLE HILLS'));
 assert.deepEqual(findLisdApartments('a',rows),[]);
 assert.ok(findLisdApartments('apartment',rows).length<=8);
 assert.ok(html.includes('id="lisdApartmentSection"'));
 assert.ok(html.includes('id="lisdApartmentQuery"'));
 assert.ok(html.includes('공식 Find an Apartment에서 현재 배정 확인'));
 assert.ok(readText('lewisville-apartments.js').includes('sourceAcademicYear!==null'));
 assert.equal(audit.districts.find(d=>d.code==='LISD').status,'official-finder-connected');
});
test('P0 current Plano official Finder zoning GIS is live, all levels complete, original vintage transparent',()=>{
 assert.equal(PLANO_LAYERS.length,4);
 assert.equal(PLANO_LAYERS.map(x=>x.level).join(','),'senior,high,middle,elementary');
 const u=new URL(planoLiveUrl(3));
 assert.ok(u.href.startsWith(PLANO_SERVICE));assert.equal(u.searchParams.get('f'),'geojson');
 assert.equal(u.searchParams.get('resultRecordCount'),'2000');
 assert.throws(()=>planoLiveUrl(5));
 const fake={type:'Feature',geometry:{type:'Polygon',coordinates:[[[-96.7,33],[-96.6,33],[-96.6,33.1],[-96.7,33]]]},properties:{EntityName:'Aldridge Elementary',ELEM2526:'ALDRIDGE',Grade:'KG - 05'}};
 const ff=convertPlanoLive(fake,PLANO_LAYERS[3]);
 assert.equal(ff.properties.school,'Aldridge Elementary');
 assert.equal(ff.properties.currentFinderSource,true);
 assert.equal(ff.properties.yearVerified2627,false);
 assert.ok(ff.properties.sourceVintage.includes('2025–26'));
 const selected=resolveAssignment({plano:[ff],planoFinderLive:true});
 assert.equal(selected.status,'finder-current');
 assert.deepEqual(officialReviewCandidates(selected,'elementary'),['Aldridge Elementary']);
 assert.equal(resolveAssignment({plano:[ff]}).status,'reference');
 assert.equal(resolveAssignment({lewisville:[ff],lewisvilleFinderLive:true}).status,'finder-current');
 assert.equal(resolveAssignment({frisco:[ff],plano:[ff],planoFinderLive:true}).status,'conflict');
 const fakeFetch=async url=>{
  const id=Number(url.match(/FeatureServer\/(\d+)\/query/)[1]),layer=PLANO_LAYERS[id];
  const records=Array.from({length:layer.min+1},(_,i)=>({type:'Feature',geometry:fake.geometry,properties:{EntityName:i===layer.min?('Campus 0'):('Campus '+i)}}));
  return {ok:true,json:async()=>({type:'FeatureCollection',features:records})};
 };
 const dynamic=loadPlanoLiveFinder(fakeFetch);
 return dynamic.then(all=>{
  assert.ok(all.length>=49);
  assert.equal(all.filter(f=>f.properties.gradeLevel==='elementary').length,PLANO_LAYERS[3].min+1);
 });
});
test('P0 current Finder and prior unlinked GIS are visually distinct without falsely promoting year',()=>{
 const web=readText('index.html'),home=readText('home-lookup-v2.js');
 assert.ok(web.includes('id="referenceBoundaryOverlay"'));
 assert.ok(web.includes('loadPlanoLiveFinder()'));
 assert.ok(web.includes('state.liveFinder.PISD_LOOKUP=true'));
 assert.ok(web.includes('state.liveFinder.LISD=true'));
 assert.ok(web.includes('historical&&!state.showOldZones'));
 assert.ok(web.includes("finderLinked?'#285ac0'"));
 assert.ok(web.includes('현재 학군 Finder 연결 배정선은 Plano·Lewisville까지 4곳'));
 assert.ok(web.includes('CFB 승인 배정선 3종'));
 assert.ok(home.includes("'finder-boundary-review'"));
 assert.ok(home.includes('planoFinderLive:!!state.liveFinder.PISD_LOOKUP'));
 assert.equal(audit.districts.find(x=>x.code==='PISD').liveFinderVerification.levels.elementary.distinct,42);
 assert.equal(audit.districts.find(x=>x.code==='PISD').status,'official-finder-connected');
 assert.equal(audit.districts.find(x=>x.code==='LISD').status,'official-finder-connected');
});
test('public facility address-to-official-Finder QA has four verified street-level evidence records',()=>{
 const rows=publicAddressAudit.records;
 assert.equal(publicAddressAudit.metadata.independentlyCheckedAddresses,4);
 assert.equal(publicAddressAudit.metadata.fullMatches,4);
 assert.equal(publicAddressAudit.metadata.testPropertyClass.startsWith('Public'),true);
 assert.equal(rows.length,4);
 assert.equal(rows.filter(x=>x.district==='FISD').length,2);
 assert.equal(rows.filter(x=>x.district==='PROSPER').length,2);
 assert.equal(publicAddressAudit.metadata.cfbPublicHQTrial.status,'inconclusive');
 for(const r of rows){
  assert.equal(r.esriScore,100);assert.equal(r.esriType,'PointAddress');
  assert.equal(r.status,'match');assert.equal(r.residentialEnrolmentVerified,false);
  assert.equal(r.point.length,2);assert.ok(r.point[0]<-96&&r.point[0]>-99&&r.point[1]>32&&r.point[1]<34);
  assert.equal(Object.keys(r.district==='FISD'?r.officialSchools:r.officialCodes).length,3);
  for(const g of ['elementary','middle','high']){
   if(r.district==='FISD')assert.equal(schoolKey(r.officialSchools[g]),schoolKey(r.gisSchools[g]));
   else assert.equal(r.officialCodes[g],r.gisCodes[g]);
  }
 }
 assert.ok(html.includes('4개 공개시설 주소를 공식 Finder와 개별 교차검증'));
 assert.ok(html.includes('공공시설 시험으로 실제 주택 등록 배정을 보장하지 않습니다'));
});
test('official geometry intersection helper handles holes and 50 interior samples',()=>{
 const g={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]};
 assert.equal(inGeometry([2,2],g),true);
 assert.equal(inGeometry([5,5],g),false);
 assert.equal(inGeometry([12,5],g),false);
 assert.equal(inFriscoBorder([2,2],[g.coordinates]),true);
 assert.equal(schoolKey('Jackson (east of Coit)'),schoolKey('Jackson (west of Coit)'));
 const points=interiorPoints(g,50);assert.equal(points.length,50);
 assert.ok(points.every(p=>inGeometry(p,g)));
 assert.equal(planoGeometryAudit.metadata.elementaryPolygons,44);
 assert.equal(planoGeometryAudit.metadata.uniqueElementary,42);
 assert.equal(planoGeometryAudit.metadata.perPolygonSamples,50);
 assert.equal(planoGeometryAudit.metadata.testedInteriorPoints,2200);
 assert.equal(planoGeometryAudit.metadata.pointToFeederDisagreements,0);
 assert.equal(planoGeometryAudit.metadata.polygonsNotCovered,0);
 assert.equal(audit.districts.find(x=>x.code==='PISD').liveFinderVerification.geometryFeederCrosscheck.interiorPoints,2200);
});
test('CFB official current GuideK12 locator linked',()=>{
  assert.ok(html.includes('https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/'));
});
test('6 school-district rows and provenance date visible on site',()=>{
  for (const name of ['Frisco','Plano','Allen','Lewisville','Prosper','Carrollton–Farmers Branch']) assert.ok(html.includes('<b>' + name + '</b>'));
  assert.ok(html.includes('학군별 배정 경계 최신성 · 2026-11-06'));
  assert.ok(html.includes('교차 검증 통과'));
  assert.ok(html.includes('Frisco·Prosper 2곳'));
  assert.ok(html.includes('과거 2019–20 GIS로 대체하지 않습니다'));
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
await Promise.all(asyncChecks);
console.log('Main website QA: ' + total + ' tests passed.');
