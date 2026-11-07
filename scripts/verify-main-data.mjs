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
const prosper = readJson('prosper-celina-reference-2026.geojson');
const prosperCurrent = readJson('prosper-attendance-2026.geojson');
const officialChecks = readJson('tests/prosper-official-location-checks-2026.json');
const require=createRequire(import.meta.url);
const {resolveAssignment}=require('../school-assignment.js');
const {matchAllenAddress}=require('../allen-lookup.js');
const {isRetiredCampus, RETIRED_CAMPUSES_2026}=require('../school-lifecycle.js');
const {assessResidentialGeocode}=require('../geocode-quality.js');
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
  for (const name of ['rating-context.js','school-identity.js','school-assignment.js','home-lookup-v2.js','allen-lookup.js','candidate-compare.js','school-lifecycle.js','geocode-quality.js','school-zone-risk.js','collin-parcel-check.js','official-school-review.js']) {
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
 assert.ok(html.includes('GIS 연도 최신성은 미입증'));
 assert.ok(html.includes('자동 해석 가능한 1,687행'));
 assert.ok(html.includes('Moss Haven Pl'));
 assert.ok(html.includes('Crestview Heights'));
 assert.ok(html.includes('Jackson Elementary 진학 경로 예외'));
 assert.ok(html.includes('Coit Rd 동쪽'));
 assert.ok(html.includes('Plano West Senior'));
 assert.ok(html.includes('2026–27 공식 SchoolFinder가 기존 2025–26 FeatureServer를 사용함 확인'));
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
  assert.ok(html.includes('공식 진학표 21개 경로') && html.includes('두 공식 진학표 충돌'));
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
 assert.equal(audit.districts.find(x=>x.code==='CFB').feederReference.autoAssignmentAllowed,false);
 assert.ok(html.includes('Farmers Branch Elementary의 두 공식 진학표 충돌'));
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
 assert.ok(h.includes("status:'boundary-review'"));
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
