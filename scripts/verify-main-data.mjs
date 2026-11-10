import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const readText = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const readJson = name => JSON.parse(readText(name));
const pageHtml = readText('index.html');
const mainBootstrap = readText('dashboard-main.js');
// Assert against actual HTML while retaining existing source-level assertions
// for formerly inline application logic in the separate exact-byte JS module.
const html = pageHtml + '\n' + mainBootstrap;
const audit = readJson('school-data-provenance.json');
const plano = readJson('plano-locator-reference.geojson');
const allen = readJson('allen-attendance-historical.geojson');
const allenAddress = readJson('allen-address-schools.json');
const allenAddressAudit = readJson('allen-official-address-source-audit-2026.json');
const planoFeeder = readJson('plano-official-feeder-reference-2026.json');
const cfbFeeder = readJson('cfb-official-feeder-reference-2026.json');
const residentFinderAudit = readJson('official-resident-finder-audit-2026-11-07.json');
const cfbBrowserAudit = readJson('tests/cfb-public-schoolsearch-browser-audit-2026-11-07.json');
const cfbNativeFinder = readJson('tests/cfb-official-resident-finder-verified-2026-11-07.json');
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
const {boundarySchoolKey,boundaryGradeLevels,boundarySchoolSource,findSchoolBoundary,boundaryMissingExplanation}=require('../school-boundary-match.js');
const {FEMA_HAZARD_TYPES,FEMA_RISK_COLORS,femaHazardMetric,femaHazardStyle,validateFemaHazardGeojson}=require('../phase2a-fema-hazards.js');
const {NFHL_LAYER_ENDPOINT,NFHL_WHERE,NFHL_MAX_RECORDS,NFHL_MIN_ZOOM,NFHL_FETCH_TIMEOUT_MS,NFHL_RETRY_DELAYS_MS,nfhlClassify,nfhlLayerStyle,validateNfhlResponse,nfhlQueryUrl}=require('../phase2a-nfhl-flood.js');
const {TXWRAP_WHP_TILES,TXWRAP_WHP_SERVICE,TXWRAP_WHP_EXPLAINER,TXWRAP_WHP_MAX_NATIVE_ZOOM}=require('../txwrap-wildfire-potential.js');
const {NOAA_STORM_DATA_URL,validateNoaaStormSnapshot,summarizeNoaaStormSnapshot}=require('../noaa-storm-history.js');
const {parseCSV:parseNoaaCSV,summarizeRecords:summarizeNoaaRecords}=require('./refresh-noaa-storm-events.cjs');
const {buildCollinParcelUrl,parcelStreetKey,assessCollinParcelResult}=require('../collin-parcel-check.js');
const demographics = readJson('dfw-demographics.json');
const rating = readJson('tea-ratings-2026.json');
const location = readJson('nces-locations-2024.json');
const zips = readJson('dfw-zcta-boundaries.geojson');
const femaHazards=readJson('data/phase2a-fema-nri-dfw-2025.geojson');
const noaaStorms=readJson('data/noaa-storm-events-dfw-2024-2025.json');
const school = readJson('schools.json');
let total = 0;
const asyncChecks=[];
const test = (name, fn) => {
  const result=fn();
  if(result&&typeof result.then==='function') {
    asyncChecks.push(result.then(()=>{total++;console.log('PASS '+name)}));
  } else {total++;console.log('PASS '+name)}
};

const inlineScripts = [mainBootstrap];
test('external main application bootstrap compiles with no inline HTML execution',()=>{
 assert.ok(pageHtml.includes('<script src="./dashboard-main.js?v=4"></script>'));
 assert.equal([...pageHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!/\bsrc\s*=/.test(x[1])&&x[2].trim()).length,0);
 new Script(mainBootstrap,{filename:'dashboard-main.js'});
});

test('all main application JS modules compile', () => {
  for (const name of ['rating-context.js','school-identity.js','school-assignment.js','home-lookup-v2.js','allen-lookup.js','candidate-compare.js','school-lifecycle.js','geocode-quality.js','school-zone-risk.js','school-boundary-match.js','phase2a-fema-hazards.js','phase2a-nfhl-flood.js','txwrap-wildfire-potential.js','noaa-storm-history.js','collin-parcel-check.js','official-school-review.js','texas-address-suggest.js','allen-apartment-exceptions.js','plano-finder-live.js']) {
    new Script(readText(name), {filename:name});
    assert.ok(html.includes('./' + name), name + ' not loaded');
  }
});
test('optional LISD/CFB reference widgets are not loaded on the main page',()=>{
 for(const name of ['lewisville-apartments.js','cfb-feeder-lookup.js']){
  new Script(readText(name),{filename:name}); // retained only as reference tooling
  assert.equal(html.includes('./'+name),false,name+' should not be requested by the browser');
 }
 assert.equal(html.includes('id="lisdApartmentSection"'),false);
 assert.equal(html.includes('id="cfbFeederSection"'),false);
 assert.ok(html.includes('https://www.lisd.net/resources/families/school-locator'));
 assert.ok(html.includes('https://www.cfbisd.edu/students/school-maps-locator-system'));
});
test('home-search, candidate comparison and commute preserved', () => {
  for (const id of ['homeForm','homeAddress','homeCandidates','candidateCards','destination','calcCommute','officeSelect','schoolList','zoneDatasetStatus','districtZoneAudit','map']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  for (const x of ['dfw-outside-public.json','county-scopes.json','dfw-zcta-boundaries.geojson','home-lookup-v2.js','candidate-compare.js']) {
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
test('school selection auto-displays available source polygons with a specific missing-boundary footnote',()=>{
 const inline=inlineScripts.join('\n');
 assert.ok(html.includes('<script src="./school-boundary-match.js?v=3"></script>'));
 assert.ok(html.includes('id="schoolBoundaryCoverageAudit"'));
 assert.ok(inline.includes('state.showOldZones=true;state.showHistoric=true;'));
 assert.ok(inline.includes("el('referenceBoundaryOverlay').checked=true"));
 assert.ok(inline.includes("el('historicOverlay').checked=true"));
 assert.ok(inline.includes('renderSchoolBoundaryCoverageAudit()'));
 assert.ok(inline.includes('window.getSchoolBoundaryCoverage='));
 assert.ok(inline.includes('SchoolBoundaryMatch.findSchoolBoundary(s,geo'));
 assert.ok(inline.includes('boundaryMissingExplanation(s,match,sourceVintage,loadError)'));
 assert.ok(inline.includes('경계 미표시 각주'));
 assert.ok(!inline.includes('현행 공식 Finder와 연결되지 않은 과거 배정선입니다. 참고 경계선 표시를 선택하세요.')); 
 const area={type:'high',district:'AISD',name:'Allen High School'};
 const polygon={type:'Feature',geometry:{type:'Polygon',coordinates:[]},properties:{school:'Allen High School',gradeLevel:'high'}};
 assert.equal(findSchoolBoundary(area,[polygon]).status,'matched');
 assert.equal(findSchoolBoundary(area,[]).status,'no-district-polygon-source');
 assert.equal(findSchoolBoundary({...area,type:'elementary'},[polygon]).status,'no-grade-polygon-source');
 assert.equal(findSchoolBoundary({...area,name:'Unknown School'},[polygon]).status,'school-not-in-polygon-source');
 assert.equal(findSchoolBoundary({...area,type:'other'},[polygon]).status,'not-a-zoned-campus');
 assert.deepEqual(boundaryGradeLevels('high'),['high','senior']);
 assert.equal(boundarySchoolSource('PISD'),'PISD_LOOKUP');
 assert.equal(boundarySchoolKey('Plano West Senior High School'),'plano west');
 assert.equal(boundarySchoolKey('Isbell K-4 Elementary'),'isbell');
 assert.equal(boundarySchoolKey('Isbell K-5 Elementary'),'isbell');
 assert.equal(findSchoolBoundary({district:'FISD',name:'Isbell Elementary School',type:'elementary'},
  [{type:'Feature',properties:{school:'Isbell K-4 Elementary',gradeLevel:'elementary',grades:'K-4'}}]).status,'matched');
 assert.equal(findSchoolBoundary({district:'PISD',name:'Academy High School',type:'high'},[polygon]).status,'special-campus-no-standard-zone');
 assert.equal(findSchoolBoundary({district:'AISD',name:'Lowery Freshman Center',type:'high'},[polygon]).status,'special-campus-no-standard-zone');
 assert.equal(findSchoolBoundary({district:'LISD',name:'Mill Street El',type:'elementary'},[polygon]).status,'special-campus-no-standard-zone');
 assert.ok(boundaryMissingExplanation({district:'LISD',name:'Mill Street El',type:'elementary'},
  findSchoolBoundary({district:'LISD',name:'Mill Street El',type:'elementary'},[polygon]),'2025–26').sourceUrl.includes('lisd.net'));
 assert.ok(inline.includes('Isbell 세부 학년 주의'));
 assert.ok(inline.includes('미표시 원인 공식 근거 확인'));
 assert.ok(boundaryMissingExplanation({district:'CFB',name:'Any Elementary',type:'elementary'},findSchoolBoundary({district:'CFB',name:'Any Elementary',type:'elementary'},[]),'').footnote.includes('GuideK12'));
 const cfbChoice={district:'CFB',name:'EARLY COLLEGE H S',type:'high'};
 assert.equal(boundarySchoolKey(cfbChoice.name),'early college');
 assert.equal(findSchoolBoundary(cfbChoice,[]).status,'special-campus-no-standard-zone');
 const cfbChoiceReason=boundaryMissingExplanation(cfbChoice,findSchoolBoundary(cfbChoice,[]),'');
 assert.ok(cfbChoiceReason.sourceUrl.includes('earlycollege.cfbisd.edu'));
 assert.ok(cfbChoiceReason.footnote.includes('lottery'));
 assert.ok(cfbChoiceReason.sourceLinkLabel.includes('입학'));
 const cfbNeighborhood={district:'CFB',name:'BLAIR EL',type:'elementary'};
 assert.equal(findSchoolBoundary(cfbNeighborhood,[]).status,'no-district-polygon-source');
 const cfbNeighborhoodReason=boundaryMissingExplanation(cfbNeighborhood,findSchoolBoundary(cfbNeighborhood,[]),'');
 assert.ok(cfbNeighborhoodReason.footnote.includes('2025-03-06'));
 assert.ok(cfbNeighborhoodReason.sourceUrl.includes('cfbisd.edu/students/school-maps-locator-system'));
 assert.equal(cfbNeighborhoodReason.sourceLinkLabel,'CFB 공식 주소별 배정 조회기');
 assert.ok(inline.includes('failure.sourceLinkLabel'));

 assert.ok(boundaryMissingExplanation(area,findSchoolBoundary(area,[]),'','network down').reason.includes('로딩되지'));
});
test('old Plano 2019 boundary removed from active code paths',()=>{
  const inline = inlineScripts.join('\n');
  assert.ok(inline.includes('./plano-locator-reference.geojson'));
  assert.ok(!inline.includes("url:'./plano-attendance-2019.geojson'"));
  assert.ok(!inline.includes('state.zoneData.PISD||[]'));
  assert.ok(inline.includes("state.zoneData[districtZoneKey(s.district)]"),'Plano reads PISD_LOOKUP through the district registry');
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
 const app=(readText('home-lookup-v2.js')+' '+readText('district-registry.js')),cmp=readText('candidate-compare.js');
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
 const home=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
 assert.ok(home.includes('schoolLevelMatchesAssignment(s,f.properties.gradeLevel)'));
 assert.ok(home.includes("result.district!==s.district)return false"));
 assert.ok(html.includes('./school-assignment.js?v=6'));
 assert.ok(html.includes('./home-lookup-v2.js?v=17'));
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
 const app=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
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
  const inline=inlineScripts.join('\n'),home=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
  assert.ok(readText('scripts/fetch-prosper-2026-zones.mjs').includes('GetRedistricts'));
  assert.ok(readText('scripts/check-prosper-official-locator.mjs').includes('officialSearchUrl'));
  assert.ok(officialChecks.metadata.officialSearchUrl.endsWith('/SearchLocation'));
  assert.ok(inline.includes("district:'PROSPER',url:'./prosper-attendance-2026.geojson'"));
  assert.ok(!inline.includes("{district:'PROSPER_REF'"));
  assert.ok(!inline.includes("url:'./prosper-celina-reference-2026.geojson'"));
  assert.ok(inline.includes("state.zoneData[districtZoneKey(s.district)]")&&readText('district-registry.js').includes("PROSPER:{en:'Prosper',ko:'프로스퍼',zoneKey:'PROSPER'"),'Prosper zones via registry');
  assert.ok(inline.includes("s.district==='FISD'||s.district==='PROSPER'"));
  assert.ok(inline.includes('new Set(j.features.map(f=>f.properties?.campusId)).size!==31'));
  assert.ok(home.includes("homeZoneMatches(item.ll,d.zoneKey)")&&home.includes('districtPolygonStatus(code,state.liveFinder)'),'Prosper and every polygon district come from the registry');
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
  const inline=inlineScripts.join('\n'),home=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
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
 assert.equal(cfbFinder.status,'official-current-finder-address-school-result-verified');
 assert.equal(cfbFinder.publicFacilityTestsCompleted,2);
 assert.equal(cfbFinder.uniquePropertyZonedResultsObserved,2);
 assert.equal(cfbFinder.currentYearGeometryVerified,false);
 assert.ok(html.includes('공식 주민용 Find-A-School 주소 검색 정상 작동'));
 assert.ok(html.includes('CFB 공식 주소 Finder 작동 검증 완료'));
 assert.ok(html.includes('CFB 공식 주소 Finder 작동 검증 완료'));
 assert.ok(html.includes('GIS 자체가 독립 검증된 학군은 Frisco·Prosper 2곳'));
});
test('CFB GuideK12 official native address selection really returns assigned K-5 / 6-8 / 9-12 schools',()=>{
 assert.equal(cfbNativeFinder.auditDate,'2026-11-07');
 assert.equal(cfbNativeFinder.status,'public-address-school-lookup-operational');
 assert.equal(cfbNativeFinder.samples.length,2);
 assert.equal(cfbNativeFinder.nativeAutocompleteRequired,true);
 assert.equal(cfbNativeFinder.samples[0].assigned.elementary,'McLaughlin Strickland Elementary (K-5)');
 assert.equal(cfbNativeFinder.samples[0].assigned.middle,'Perry Middle School (6-8)');
 assert.equal(cfbNativeFinder.samples[0].assigned.high,'Turner High School (9-12)');
 assert.equal(cfbNativeFinder.samples[1].candidateSelected,'1011 S MAIN ST Carrollton, TX 75006');
 assert.equal(cfbNativeFinder.samples[1].assigned.elementary,'Carrollton Elementary (K-5)');
 assert.equal(cfbNativeFinder.samples[1].assigned.middle,'Perry Middle School (6-8)');
 assert.equal(cfbNativeFinder.samples[1].assigned.high,'Newman Smith High School (9-12)');
 assert.ok(cfbNativeFinder.samples.every(x=>x.elementaryMiddleHighVerified));
 assert.equal(cfbNativeFinder.sourceGeometryCurrentYearIndependent,false);
 assert.equal(cfbNativeFinder.localAutomaticHouseAssignmentIntegrated,false);
 const finder=audit.districts.find(x=>x.code==='CFB').residentFinderVerification;
 assert.equal(finder.status,'official-current-finder-address-school-result-verified');
 assert.equal(finder.verifiedPublicAddressSchoolResults.length,2);
 assert.equal(finder.currentYearGISIndependentVerification,false);
 assert.equal(finder.propertyApartmentUnitAssignmentCertified,false);
 assert.equal(finder.initialTrials.uniqueZonedCampusSetsObserved,0);
 assert.ok(html.includes('1011 S Main St'));
 assert.ok(html.includes('Carrollton·Perry·Newman Smith'));
 assert.ok(html.includes('초·중·고 Assigned school 3단계'));
 assert.ok(!html.includes('id="cfbFeederSection"'));
 assert.ok(!html.includes('id="lisdApartmentSection"'));
});
test('CFB feeder source data stays auditable but optional UI is removed',()=>{
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
 assert.ok(!html.includes('id="cfbFeederSection"'));
 assert.ok(!html.includes('id="cfbElementary"'));
 assert.ok(!html.includes('./cfb-feeder-lookup.js'));
 assert.ok(!html.includes('id="cfbFeederAll"'));
 const staticHelper=readText('cfb-feeder-lookup.js');
 assert.ok(staticHelper.includes('function renderAll()'));
 assert.ok(staticHelper.includes("node('td','공식 자료 충돌 · 확인 필요')"));
 assert.ok(staticHelper.includes("select.addEventListener('input',render)"));
 const feederUi=readText('cfb-feeder-lookup.js');
 assert.ok(feederUi.includes("select.addEventListener('focus',load)"));
 assert.ok(feederUi.includes('load();\n}'));
 assert.ok(!html.includes('CFB 2026–27 진학표 조회 · 배정된 초등학교를 아는 경우'));
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
  assert.ok(html.includes('2026–27 진학표 20/21행 일치, Farmers Branch Elementary 자료 충돌 별도'));
});
test('active 2026-27 campus selection excludes 17 officially inactive schools',()=>{
 assert.equal(RETIRED_CAMPUSES_2026.length,17);
  for(const id of ['061901120','220906103','220906108']){
   const item=rating.data.find(x=>x.id===id);
   assert.ok(item,'TEA campus record missing '+id);
   assert.equal(isRetiredCampus({...item,district:id.slice(0,6)}),true,'repurposed/consolidated campus still appears '+id);
  }
  assert.equal(isRetiredCampus({district:'220919',id:'220919106',name:'DON T DURHAM INT'}),false);
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
 const src=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
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
 assert.ok(html.includes('Farmers Branch Elementary 자료 충돌'));
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
 const h=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
 assert.ok(h.includes("'boundary-review':'finder-boundary-review'"));
 assert.ok(h.includes('zoneBoundaryProximity([item.ll[1],item.ll[0]],found.features,undefined,found.features.map('));
 assert.ok(html.includes('./school-zone-risk.js?v=2'));
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
 const h=(readText('home-lookup-v2.js')+' '+readText('district-registry.js')),cmp=readText('candidate-compare.js');
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
 const h=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
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
 const ui=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
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
 const mod=readText('texas-address-suggest.js'),src=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
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
test('CFB free Playwright public-apartment and campus lookup diagnostics never auto-assign schools',()=>{
 assert.equal(cfbBrowserAudit.checkedAt,'2026-11-07');
 assert.equal(cfbBrowserAudit.samples.length,2);
 assert.equal(cfbBrowserAudit.status,'property-specific-zoned-school-output-not-observed');
 assert.equal(cfbBrowserAudit.samples[1].type,'public-apartment-complex');
 assert.equal(cfbBrowserAudit.samples[1].address,'1011 S Main St, Carrollton, TX 75006');
 assert.equal(cfbBrowserAudit.limitations.length,3);
 assert.ok(html.includes('1011 S Main St'));
 const district=audit.districts.find(x=>x.code==='CFB');
 assert.equal(district.residentFinderVerification.browserProbe.uniquePropertyZonedResults,0);
 assert.equal(district.residentFinderVerification.browserProbe.didSearchResultListChangeAcrossAddresses,false);
 const probe=readText('scripts/probe-cfb-public-finder-browser.cjs');
 const workflow=readText('.github/workflows/probe-cfb-public-finder.yml');
 assert.ok(probe.includes("propertyZonedCampusResultsVerified:false"));
 assert.ok(probe.includes("const publicApartment='1011 S Main St, Carrollton, TX 75006'"));
 assert.ok(workflow.includes('workflow_dispatch:'));
 assert.ok(workflow.includes('playwright@1.65.0'));
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
 assert.equal(c.status,'official-property-school-names-confirmed');
 assert.equal(c.addressSamples.length,2);
 assert.equal(c.safeFeederPaths,20);
 assert.equal(c.conflictingFeederPaths,1);
 assert.equal(audit.districts.find(x=>x.code==='CFB').residentFinderVerification.uniqueZonedCampusSetsObserved,2);
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
test('LISD apartment source remains auditable but optional UI is removed',()=>{
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
 assert.ok(!html.includes('./lewisville-apartments.js'));
 assert.ok(readText('lewisville-apartments.js').includes("rec.zoneAudit?.status==='internal-map-conflict'"));
 assert.ok(!html.includes('Lewisville 아파트별 학교 참고 검색 (174개 항목)'));
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
 assert.ok(!html.includes('id="lisdApartmentSection"'));
 assert.ok(!html.includes('id="lisdApartmentQuery"'));
 assert.ok(html.includes('https://www.lisd.net/resources/families/school-locator'));
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
 const web=html,home=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
 assert.ok(web.includes('id="referenceBoundaryOverlay"'));
 assert.ok(web.includes('loadPlanoLiveFinder(zoneFetch)'));
 assert.ok(web.includes('state.liveFinder.PISD_LOOKUP=true'));
 assert.ok(web.includes('state.liveFinder.LISD=true'));
 assert.ok(web.includes('historical&&!state.showOldZones'));
 assert.ok(web.includes("finderLinked?'#285ac0'"));
 assert.ok(web.includes('현재 학군 Finder 연결 배정선은 Plano·Lewisville까지 4곳'));
 assert.ok(web.includes('CFB 승인 배정선 3종'));
 assert.ok(home.includes("'finder-boundary-review'"));
 assert.ok(home.includes('districtPolygonStatus(code,state.liveFinder)'),'Plano finder-live status via registry');
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
test('Phase2A NOAA official 2024/2025 county-coded historical storm snapshot source and monthly totals',()=>{
 assert.equal(NOAA_STORM_DATA_URL,'./data/noaa-storm-events-dfw-2024-2025.json');
 assert.equal(validateNoaaStormSnapshot(noaaStorms),true);
 assert.equal(noaaStorms.metadata.selectedEvents,1169);
 assert.equal(noaaStorms.metadata.aggregatedRows,90);
 assert.equal(noaaStorms.metadata.counties.length,12);
 assert.deepEqual(noaaStorms.metadata.analyzedYears,[2024,2025]);
 assert.deepEqual(noaaStorms.metadata.sourceFiles.map(s=>s.selectedCountyRows),[563,606]);
 assert.deepEqual(noaaStorms.metadata.sourceFiles.map(s=>s.revision),['20260728','20260819']);
 assert.ok(noaaStorms.metadata.sourceFiles.every(s=>s.sha256?.length===64 && s.bytes>10000000 && s.rawRows>10000));
 assert.equal(summarizeNoaaStormSnapshot(noaaStorms,2024,'ALL','ALL').total,563);
 assert.equal(summarizeNoaaStormSnapshot(noaaStorms,2025,'ALL','ALL').total,606);
 assert.equal(summarizeNoaaStormSnapshot(noaaStorms,2024,'COLLIN','hail').total,34);
 assert.equal(summarizeNoaaStormSnapshot(noaaStorms,2025,'COLLIN','hail').total,33);
 assert.equal(summarizeNoaaStormSnapshot(noaaStorms,2025,'ALL','ALL').monthly.reduce((a,b)=>a+b,0),606);
 const corrupt=structuredClone(noaaStorms);corrupt.summary[0].monthly[0]++;
 assert.equal(validateNoaaStormSnapshot(corrupt),false,'Corrupt NOAA monthly source must fail closed');
 const parsed=[];parseNoaaCSV('A,B,C\n1,"2,3","line1\nline2"\n4,5,6\n',row=>parsed.push(row));
 assert.deepEqual(parsed,[['A','B','C'],['1','2,3','line1\nline2'],['4','5','6']]);
 assert.deepEqual(summarizeNoaaRecords([{county:'COLLIN',year:2025,category:'hail',month:3}])[0].monthly[2],1);
 assert.ok(html.includes('id="noaaStormHistoryPanel"'));
 assert.ok(html.includes('id="noaaStormMonthly"'));
 assert.ok(html.includes('noaa-storm-history.js?v=1'));
 assert.ok(html.includes('createNoaaStormHistory?.(document)'));
 assert.ok(html.includes('실제 보고된 사건 수'));
});
test('Allen school markers are automatic at wide zoom; independent FEMA quick toggle is preserved',()=>{
 assert.ok(!html.includes('id="allenSchoolsShortcut"'),'Do not require user to click an Allen button');
 assert.ok(html.includes('id="hazardMapQuickToggle"'));
 assert.ok(html.includes('id="schoolMapStatus"'));
 assert.ok(html.includes('const eligible=state.schools.filter('));
 assert.ok(html.includes('bounds.contains(s.ll)'));
 assert.ok(!html.includes('const visible=zoom<11?allenItems:items.slice(0,limit);'));
 assert.ok(html.includes('class="hazard-chip ifld"')&&html.includes('class="hazard-chip wfir"')&&html.includes('class="hazard-chip hrcn"'));
 assert.ok(html.includes("toggle.dispatchEvent(new Event('change',{bubbles:true}))"));
 assert.ok(html.includes('aria-label="자연재해 위험 지도"'));
 assert.ok(!html.includes('Phase 2A ·'),'No developer phase label in visible hazard UI');
});
test('Phase2A official TxWRAP Wildfire Hazard Potential raster remains distinct from modeled NRI and NFHL',()=>{
 assert.equal(TXWRAP_WHP_TILES,TXWRAP_WHP_SERVICE+'/tile/{z}/{y}/{x}');
 assert.equal(TXWRAP_WHP_MAX_NATIVE_ZOOM,17);
 assert.ok(TXWRAP_WHP_EXPLAINER.includes('tfsweb.tamu.edu'));
 assert.ok(html.includes('id="txwrapWHPPanel"'));
 assert.ok(html.includes('id="txwrapWHPEnabled"'));
 assert.ok(html.includes('id="txwrapWHPStatus"'));
 assert.ok(html.includes('id="txwrapWHPOpacity"'));
 assert.ok(html.includes('id="txwrapWHPLegend"'));
 assert.ok(html.includes('txwrap-wildfire-potential.js?v=1'));
 assert.ok(html.includes('createTxWrapWHPOverlay?.(map,document)'));
 assert.ok(html.includes('원본 개정연도는 이 서비스에서 확인되지 않아'));
 assert.ok(readText('txwrap-wildfire-potential.js').includes("txwrapWHPEnabled"));
 assert.ok(readText('phase2a-fema-hazards.js').includes("d.getElementById('txwrapWHPEnabled')"));
 assert.ok(readText('phase2a-nfhl-flood.js').includes("d.getElementById('txwrapWHPEnabled')"));
 assert.ok(!html.includes('TxWRAP 원본은 FEMA NRI 2025'));
});
test('Phase2A FEMA official NFHL live flood map filters, two red intensities and no-flood-is-not-safe caveats',()=>{
 assert.equal(NFHL_LAYER_ENDPOINT,'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query');
 assert.ok(NFHL_WHERE.includes("SFHA_TF = 'T'"));
 assert.ok(NFHL_WHERE.includes('ZONE_SUBTY'));
 assert.equal(NFHL_MIN_ZOOM,14);
 assert.equal(NFHL_MAX_RECORDS,1000);
 assert.ok(NFHL_FETCH_TIMEOUT_MS>=8000&&NFHL_FETCH_TIMEOUT_MS<=25000);
 assert.deepEqual(NFHL_RETRY_DELAYS_MS,[0,900,1800]);
 assert.ok(readText('phase2a-nfhl-flood.js').includes('setTimeout(()=>{timedOut=true;current.abort()}'));
 assert.ok(readText('phase2a-nfhl-flood.js').includes('request!==seq||!enabled.checked'));
 assert.ok(readText('phase2a-nfhl-flood.js').includes('clearTimeout(timeout)'));
 const bounds={getWest:()=>-96.83,getSouth:()=>32.76,getEast:()=>-96.79,getNorth:()=>32.80};
 const url=new URL(nfhlQueryUrl(bounds));
 assert.equal(url.searchParams.get('f'),'geojson');
 assert.equal(url.searchParams.get('where'),NFHL_WHERE);
 assert.equal(url.searchParams.get('geometryType'),'esriGeometryEnvelope');
 assert.equal(url.searchParams.get('inSR'),'4326');
 assert.equal(url.searchParams.get('returnGeometry'),'true');
 assert.equal(url.searchParams.get('resultRecordCount'),'1000');
 const high={type:'Feature',geometry:{type:'Polygon',coordinates:[]},
  properties:{SFHA_TF:'T',FLD_ZONE:'AE',ZONE_SUBTY:null}};
 const moderate={type:'Feature',geometry:{type:'Polygon',coordinates:[]},
  properties:{SFHA_TF:'F',FLD_ZONE:'X',ZONE_SUBTY:'0.2 PCT ANNUAL CHANCE FLOOD HAZARD'}};
 const unknown={type:'Feature',geometry:{type:'Polygon',coordinates:[]},
  properties:{SFHA_TF:'F',FLD_ZONE:'X',ZONE_SUBTY:'AREA OF MINIMAL FLOOD HAZARD'}};
 assert.equal(nfhlClassify(high).kind,'sfha');
 assert.equal(nfhlClassify(moderate).kind,'moderate');
 assert.equal(nfhlClassify(unknown).kind,'none');
 assert.equal(nfhlLayerStyle(high).fillColor,'#b91c1c');
 assert.equal(nfhlLayerStyle(moderate).fillColor,'#ffabab');
 assert.equal(nfhlLayerStyle(unknown).fillOpacity,0);
 assert.equal(nfhlLayerStyle(unknown).interactive,false);
 assert.equal(validateNfhlResponse({type:'FeatureCollection',features:[high,moderate]}),true);
 assert.equal(validateNfhlResponse({type:'FeatureCollection',features:new Array(1000).fill(high)}),false);
 assert.equal(validateNfhlResponse({error:{message:'fail'},type:'FeatureCollection',features:[]}),false);
 assert.ok(html.includes('id="nfhlFloodPanel"'));
 assert.ok(html.includes('id="nfhlEnabled"'));
 assert.ok(html.includes('id="nfhlStatus"'));
 assert.ok(html.includes('id="nfhlLegend"'));
 assert.ok(html.includes('phase2a-nfhl-flood.js?v=2'));
 assert.ok(html.includes('최대 3회 재시도'));
 assert.ok(html.includes('createNFHLFloodOverlay?.(map,document)'));
 assert.ok(html.includes('FEMA Map Service Center'));
 assert.ok(html.includes('이 화면에서 보이지 않는다고 홍수 위험이 없다는 뜻은 아닙니다.')||readText('phase2a-nfhl-flood.js').includes('이 화면에서 보이지 않는다고 홍수 위험이 없다는 뜻은 아닙니다.'));
 assert.ok(!html.includes('회색은 데이터 부족입니다'));
});
test('Phase2A FEMA December 2025 v1.20 source snapshot is real and separate from school/ZIP data',()=>{
 assert.equal(femaHazards.type,'FeatureCollection');
 assert.equal(validateFemaHazardGeojson(femaHazards),true);
 assert.equal(femaHazards.metadata.snapshotSourceVersion,'December 2025');
 assert.equal(femaHazards.metadata.sourceDataset,'2025 NRI v1.20.0');
 assert.equal(femaHazards.metadata.modelReleased,'2025-12');
 assert.equal(femaHazards.metadata.notParcelFloodplain,true);
 assert.equal(femaHazards.metadata.scale,'census-tract');
 assert.equal(Object.keys(femaHazards.metadata.coverageCounties).length,12);
 assert.equal(femaHazards.features.length,1734);
 assert.equal(Object.values(femaHazards.metadata.countyTractCounts).reduce((a,b)=>a+b,0),femaHazards.features.length);
 const seen=new Set();
 for(const feature of femaHazards.features){
  const p=feature.properties;
  assert.ok(/^48\d{9}$/.test(p.tract));
  assert.equal(feature.id,p.tract);
  assert.equal(seen.has(feature.id),false);
  seen.add(feature.id);
  assert.equal(p.version,'December 2025');
  assert.ok(femaHazards.metadata.coverageCounties[p.countyFips]);
  assert.ok(['Polygon','MultiPolygon'].includes(feature.geometry.type));
  for(const kind of ['ifld','wfir','hrcn']){
   assert.ok(Number.isFinite(p[kind].score)&&p[kind].score>=0&&p[kind].score<=100);
   assert.ok(typeof p[kind].rating==='string');
  }
 }
 assert.equal(Object.keys(FEMA_HAZARD_TYPES).join(','),'ifld,wfir,hrcn');
 assert.equal(Object.keys(FEMA_RISK_COLORS).includes('No Rating'),true);
 const expectedReds=['#fff1f1','#ffd1d1','#ff9e9e','#ef5858','#b91c1c'];
 assert.deepEqual(['Very Low','Relatively Low','Relatively Moderate','Relatively High','Very High'].map(k=>FEMA_RISK_COLORS[k]),expectedReds);
 assert.equal(FEMA_RISK_COLORS['No Rating'],null);
 assert.equal(FEMA_RISK_COLORS['Insufficient Data'],null);
 assert.equal(femaHazardStyle(null,'ifld').fillOpacity,0);
 assert.equal(femaHazardStyle(null,'ifld').weight,0);
 assert.equal(femaHazardStyle(null,'ifld').interactive,false);
 assert.ok(html.includes('phase2a-fema-hazards.js?v=3'));
 assert.ok(html.includes('fema-legend-absent'));

 assert.equal(femaHazards.features.filter(f=>f.properties.wfir.rating==='No Rating').length,228);
 assert.equal(femaHazardMetric(femaHazards.features[0],'ifld').rating,femaHazards.features[0].properties.ifld.rating);
 const noRating=femaHazards.features.find(f=>f.properties.wfir.rating==='No Rating');
 assert.ok(noRating);
 assert.equal(femaHazardMetric(noRating,'wfir').rating,'No Rating');
 assert.equal(femaHazardMetric(noRating,'wfir').score,0);
 const noRatingStyle=femaHazardStyle(noRating,'wfir');
 assert.equal(noRatingStyle.fillOpacity,0);
 assert.equal(noRatingStyle.weight,0);
 assert.equal(noRatingStyle.interactive,false);

 assert.equal(femaHazardMetric(null,'ifld').rating,'Insufficient Data');
 assert.equal(femaHazardMetric(femaHazards.features[0],'not-a-source').score,null);
 assert.equal(femaHazardStyle(femaHazards.features[0],'ifld',0.6).pane,'femaHazardPane');
 assert.equal(femaHazardStyle(femaHazards.features[0],'ifld',0.6).fillOpacity,0.6);
 assert.ok(html.includes('id="phase2HazardPanel"'));
 assert.ok(html.includes('id="femaHazardEnabled"'));
 assert.ok(html.includes('id="femaHazardType"'));
 assert.ok(html.includes('id="femaHazardLegend"'));
 assert.ok(html.includes('id="femaHazardStatus"'));
 assert.ok(html.includes('createFemaHazardOverlay?.(map,document)'));
 assert.ok(html.includes('Census tract'));
 assert.ok(html.includes('FEMA 2025'));
 assert.ok(html.includes('https://www.fema.gov/flood-maps'));
 assert.ok(!html.includes('id="cfbFeederSection"'));
 assert.ok(!html.includes('id="lisdApartmentSection"'));
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
test('Middle Eastern / Arab ancestry (ACS B04006) covers every dashboard ZIP and stays separate from race',()=>{
 const mena=readJson('data/dfw-mena-ancestry-2024.json');
 const rows=[...readJson('dfw-demographics.json').data,...readJson('dfw-outside-public.json').data];
 assert.ok(mena.source.includes('B04006'));
 assert.deepEqual(mena.missing,[]);
 assert.equal(Object.keys(mena.data).length,new Set(rows.map(d=>d.z)).size);
 const subs=['egyptian','iraqi','jordanian','lebanese','moroccan','palestinian','syrian','arabOther','otherArab'];
 for(const d of rows){
  const r=mena.data[d.z];assert.ok(r,'missing ZIP '+d.z);
  assert.equal(r.total[0],d.pop,'B04006 total must equal dashboard population (same ACS release) for '+d.z);
  for(const k of ['arab','iranian','turkish','israeli','armenian',...subs])assert.equal(r[k].length,2);
  // The Arab subtotal counts people once; subgroups may double count two answers.
  assert.ok(r.arab[0]<=subs.reduce((a,k)=>a+(r[k][0]||0),0),'Arab subtotal exceeds subgroups for '+d.z);
 }
 assert.ok(html.includes("fetch('./data/dfw-mena-ancestry-2024.json')"));
 assert.ok(html.includes('중동·아랍계 (조상 응답)'));
 assert.ok(html.includes('항목끼리 더하지 않습니다'),'UI must say ancestry rows are not summed');
});
test('McKinney ISD 2026-27 official finder zones are wired with year and count guards',()=>{
 assert.ok(html.includes('23b28d101ba947498650f6c7b9ef251b/data?f=json'),'McKinney 2627 School Zone Finder webmap');
 assert.ok(html.includes("elem.some(f=>f.attributes?.SCHL_YEAR!=='2026-27')"),'reject non 2026-27 elementary pieces');
 assert.ok(html.includes("count('middle')!==5||count('high')!==3"));
 assert.ok(html.includes("state.zoneData.LISD=convertMetrostudyZones(j,LEWISVILLE_FINDER)"),'Lewisville keeps its own config');
 const require=createRequire(import.meta.url);
 const match=require('../school-boundary-match.js');
 for(const n of ['ARTHUR H MCNEIL EL','C T EDDINS EL','EARL & LOTTIE WOLFORD EL','CALDWELL EL','SERENITY HIGH'])
  assert.ok(match.knownBoundaryException({district:'043907',name:n}),'McKinney special campus explained: '+n);
 assert.equal(match.knownBoundaryException({district:'043907',name:'FINCH EL'}),null);
 assert.ok(!/[\x00-\x08]/.test(readText('school-boundary-match.js')),'no control characters in matcher');
});
test('Allen address-table result highlights exactly its four campuses (270 S Watters Rd)',()=>{
 const require=createRequire(import.meta.url);
 const {allenRowMatchesSchool}=require('../school-assignment.js');
 const canonical=n=>String(n||'').toLowerCase().replace(/\bh\.?\s*s\.?\b/g,'high').replace(/\bm\.?\s*s\.?\b/g,'middle').replace(/\bsr\.?\b/g,'senior').replace(/\b(?:elem|el)\b/g,'elementary').replace(/\bschool\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const row=matchAllenAddress('270 S Watters Rd, Allen, Texas, 75013',allenAddress.rows,true);
 assert.deepEqual(row.slice(2),['Norton','Ereckson','Lowery','Allen High School']);
 const schools=[['Frances E Norton Elementary School','elementary'],['Ereckson Middle School','middle'],['Lowery Freshman Center','high'],['Allen High School','high'],
  ['LOWERY ROAD','elementary'],['Boyd Elementary School','elementary'],['Ford Middle School','middle']].map(([name,type])=>({name,type,district:'AISD'}));
 const hit=schools.filter(s=>allenRowMatchesSchool(s,row,schools,canonical)).map(s=>s.name);
 assert.deepEqual(hit,['Frances E Norton Elementary School','Ereckson Middle School','Lowery Freshman Center','Allen High School']);
 assert.equal(allenRowMatchesSchool({name:'Norton',type:'elementary',district:'PISD'},row,schools,canonical),false);
 assert.ok((readText('home-lookup-v2.js')+' '+readText('district-registry.js')).includes("result.status==='unverified-year')return allenRowMatchesSchool("));
});
test('Address results: piece-internal edges are not boundaries; near-boundary and McKinney results highlight',()=>{
 const sq=(x0,y0,x1,y1,school)=>({type:'Feature',properties:{school,gradeLevel:'elementary'},geometry:{type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}});
 // Two ~1.1 km pieces of zone A share the edge x=-96.70; the point is ~19 m west of it.
 const a1=sq(-96.71,33.00,-96.70,33.01,'A'),a2=sq(-96.70,33.00,-96.69,33.01,'A'),b=sq(-96.70,33.00,-96.69,33.01,'B');
 const p=[-96.7002,33.005];
 assert.equal(zoneBoundaryProximity(p,[a1]).review,true,'single piece: shared edge looks like a boundary');
 const internal=zoneBoundaryProximity(p,[a1],undefined,[[a1,a2]]);
 assert.equal(internal.review,false,'same-school piece edge must be ignored: '+JSON.stringify(internal));
 assert.ok(internal.distanceMeters>400);
 assert.equal(zoneBoundaryProximity(p,[a1],undefined,[[a1]]).review,true,'edge shared with a different school (b) still counts');
 const require=createRequire(import.meta.url);
 const {resolveAssignment}=require('../school-assignment.js');
 const mk=[{properties:{school:'FINCH',gradeLevel:'elementary'}}];
 assert.equal(resolveAssignment({mckinney:mk,mckinneyFinderLive:true}).district,'043907');
 assert.equal(resolveAssignment({mckinney:mk,mckinneyFinderLive:false}).status,'unavailable','McKinney only from the verified live 2026-27 finder');
 const home=(readText('home-lookup-v2.js')+' '+readText('district-registry.js'));
 assert.ok(home.includes("['current','finder-current','boundary-review','finder-boundary-review'].includes(result.status)"),'near-boundary candidates highlighted like the panel lists them');
 assert.ok(readText('district-registry.js').includes("'finder-current':'2026–27 공식 Finder 경계 · 매키니'")&&home.includes('districtInfo(result.district)?.label?.[result.status]'),'McKinney label from registry, never the Lewisville fallback');
});
test('District registry is the single source of per-district capabilities',()=>{
 const require=createRequire(import.meta.url);
 const R=require('../district-registry.js');
 const web=html,home=readText('home-lookup-v2.js'),match=readText('school-boundary-match.js');
 for(const [code,d] of Object.entries(R.DISTRICT_REGISTRY)){
  assert.ok(d.en&&d.ko,'names for '+code);
  assert.ok(/^https:\/\//.test(d.official),'official finder link for '+code);
  if(d.zoneKey)assert.ok(web.includes("{district:'"+d.zoneKey+"',"),'zone data loader for '+code);
  if(['polygon','frisco'].includes(d.address))assert.ok(['always','live','finder'].includes(d.currency),'address lookup needs a currency rule: '+code);
 }
 // Old hard-coded capability lists must not come back.
 for(const [name,src] of [['index.html',web],['home-lookup-v2.js',home],['school-boundary-match.js',match]])
  for(const bad of ["['LISD','PROSPER'","{FISD:'","'AISD','PISD','FISD','LISD','PROSPER'","const officialYear=s.district===","const current=s.district==='FISD'"])
   assert.ok(!src.includes(bad),name+' still hard-codes a district list: '+bad);
 assert.equal(R.districtPolygonStatus('FISD',{}),'current');
 assert.equal(R.districtPolygonStatus('PISD',{}),'reference');
 assert.equal(R.districtPolygonStatus('PISD',{PISD_LOOKUP:true}),'finder-current');
 assert.equal(R.districtPolygonStatus('043907',{}),null,'McKinney never from a stale copy');
 assert.equal(R.districtPolygonStatus('043907',{'043907':true}),'finder-current');
 assert.equal(R.districtPolygonStatus('AISD',{}),null,'Allen uses its address table, not polygons');
 assert.equal(R.districtZoneDisplay('043907',{'043907':true}),'official','McKinney 2026-27 zones are not "past GIS"');
 assert.equal(R.districtZoneDisplay('LISD',{LISD:true}),'finder');
 assert.equal(R.districtZoneDisplay('AISD',{}),'historical');
 assert.match(web, /<script src="\.\/district-registry\.js\?v=[1-9]\d*"><\/script>/);
});
test('City crime map: FBI NIBRS city rates on city limits, complete years only, never ZIP-smeared',()=>{
 const require=createRequire(import.meta.url);
 const {crimeRateClass,crimeCityRate,validateCrimeGeojson,CRIME_CATEGORIES}=require('../crime-city-map.js');
 const crime=readJson('data/dfw-crime-city-2023-2025.geojson');
 assert.ok(validateCrimeGeojson(crime));
 assert.ok(crime.features.length>=150,'city coverage');
 assert.deepEqual(crime.metadata.years,[2023,2024,2025]);
 for(const y of crime.metadata.years)for(const c of ['violent','property'])assert.ok(Number.isFinite(crime.metadata.reference[y][c].texas),'Texas reference '+y+' '+c);
 for(const f of crime.features){
  const p=f.properties;
  assert.ok(/^TX/.test(p.ori)&&/^48\d{5}$/.test(p.placeGeoid),'agency ORI and Texas place GEOID: '+p.city);
  assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));
  for(const [y,v] of Object.entries(p.years))for(const c of ['violent','property']){
   const rate=v[c+'Rate'];
   if(v[c+'Months']===12&&v.population>0)assert.equal(rate,Math.round(v[c]/v.population*1e5),p.city+' '+y+' '+c+' rate');
   else assert.equal(rate,null,p.city+' '+y+' '+c+' must not show a rate without 12 reported months');
  }
 }
 for(const city of ['Plano','Frisco','Allen','McKinney','Richardson','Dallas','Carrollton','Lewisville','Prosper','Garland','Wylie'])
  assert.ok(Number.isFinite(crime.features.find(f=>f.properties.city===city)?.properties.years[2025].violentRate),'2025 rate for '+city);
 assert.equal(crimeRateClass(null,'violent'),-1,'missing data is never class 0');
 assert.equal(crimeRateClass(99,'violent'),0);assert.equal(crimeRateClass(100,'violent'),1);assert.equal(crimeRateClass(5000,'property'),4);
 assert.equal(CRIME_CATEGORIES.violent.breaks.length,4);
 const plano=crime.features.find(f=>f.properties.city==='Plano');
 assert.equal(crimeCityRate(plano,'violent',2025).rate,plano.properties.years[2025].violentRate);
 const web=html;
 assert.ok(web.includes('id="crimeMapToggle"')&&web.includes('id="crimeLegend"')&&web.includes('<details id="crimePanel"'));
 assert.ok(web.includes('<script src="./crime-city-map.js?v=3"></script>')&&web.includes('window.createCrimeCityMap?.(map,document)'));
 assert.ok(web.includes('ZIP·동네·주소별 위험이 아닙니다'),'caveat: not ZIP/address risk');
});
test('Crime trends per ZIP: city-level 3-year counts and direction, never ZIP-allocated counts',()=>{
 const require=createRequire(import.meta.url);
 const {crimeTrend,crimeZipHtml}=require('../crime-city-map.js');
 const zc=readJson('data/dfw-crime-zip-cities-2023-2025.json');
 const rows=[...readJson('dfw-demographics.json').data,...readJson('dfw-outside-public.json').data];
 assert.equal(Object.keys(zc.zips).length,new Set(rows.map(d=>d.z)).size,'every dashboard ZIP has an overlap entry');
 for(const [zip,z] of Object.entries(zc.zips)){
  const total=z.cities.reduce((a,c)=>a+c.share,0)+z.outsideCityShare;
  assert.ok(total<=1.02,'shares <= 100% for '+zip);
  for(const c of z.cities){assert.ok(zc.cities[c.ori],'city data for '+c.ori);assert.ok(c.share>=0.05)}
 }
 assert.equal(zc.cities[zc.zips['75093'].cities[0].ori].city,'Plano');
 assert.equal(zc.cities[zc.zips['75013'].cities[0].ori].city,'Allen');
 const yrs=(a,b,c)=>({2023:{violentRate:a,violent:100},2024:{violentRate:b,violent:100},2025:{violentRate:c,violent:100}});
 assert.equal(crimeTrend({2023:{violentRate:20,violent:1},2024:{violentRate:40,violent:2},2025:{violentRate:140,violent:7}},'violent').dir,'small','1 -> 7 cases is not a trend');
 assert.equal(crimeTrend(yrs(100,105,120),'violent').dir,'up');
 assert.equal(crimeTrend(yrs(100,90,85),'violent').dir,'down');
 assert.equal(crimeTrend(yrs(100,130,105),'violent').dir,'flat','within +/-10% is flat');
 assert.equal(crimeTrend(yrs(null,90,85),'violent').dir,'unknown','incomplete first year: no trend');
 const html=crimeZipHtml('75093',zc);
 assert.ok(html.includes('Plano')&&/[▲▼―]/.test(html)&&html.includes('이 ZIP 안의 건수가 아닙니다'),'ZIP panel: city, trend, caveat');
 assert.ok(crimeZipHtml('75002',zc).includes('시 경찰 자료가 없는 지역'),'county/unincorporated share disclosed');
 assert.ok(!readText('index.html').includes('id="crimeYear"'),'heatmap uses the latest year; no year selector');
});
test('Layout: ZIP subgroup details live in the wide card under the map, not the right column',()=>{
 const web=html;
 assert.ok(web.includes('<div class="mapcol"><div class="mapbox">')&&web.includes('id="zipInsights"'),'map and insights card share one column');
 assert.ok(web.includes('function drawZipInsights(d)')&&web.includes('function drawDetail(){const d=getZip();drawZipInsights(d);'),'insights refresh with every detail redraw');
 assert.ok(!web.includes("+menaHtml(d.z);el('detailContent').innerHTML=html;"),'subgroups no longer appended to the narrow right column');
 assert.ok(web.includes('.main>.section{grid-column:1 / -1'),'school finder + comparison use the full width');
 assert.ok(web.includes('repeat(auto-fit,minmax(200px,1fr))'),'3 insight cards fit one row even with a classic 15px desktop scrollbar (724px card)');
});
test('Security baseline (#77/#74): CSP on both entry pages, Esri input limit, destination disclosure',()=>{
 const web=html,rev=readText('reviewed.html');
 for(const [name,src] of [['index.html',web],['reviewed.html',rev]]){
  const csp=(src.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)||[])[1]||'';
  assert.ok(csp,'CSP meta present in '+name);
  for(const d of ["script-src 'self' https://unpkg.com","object-src 'none'","base-uri 'self'"])assert.ok(csp.includes(d),name+' CSP has '+d);
  assert.ok(src.includes('OpenStreetMap Nominatim')&&src.includes('OSRM'),'destination search disclosure in '+name);
 }
 assert.ok(web.includes('aria-describedby="homeSuggestHint homePrivacy" maxlength="200"'),'home address limited to Esri 200-char SingleLine');
});
await Promise.all(asyncChecks);
console.log('Main website QA: ' + total + ' tests passed.');
