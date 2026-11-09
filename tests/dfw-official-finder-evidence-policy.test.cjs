'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {resolveApartmentPolicy,compareFinderToDashboard}=require('../scripts/dfw-official-finder-evidence-policy.cjs');
const f=require('./dfw-public-leasing-address-e2e-2026.json');
test('all six apartment complexes are street/complex eligible without a unit',()=>{
 assert.equal(f.schemaVersion,2);
 assert.equal(f.apartmentPolicy.unitRequiredByDefault,false);
 for(const c of f.cases){
  assert.equal(c.propertyType,'apartment-complex');
  assert.ok(c.complexName);
  const p=resolveApartmentPolicy(c);
  assert.equal(p.unitRequired,false,c.id);
  assert.equal(p.exception,false,c.id);
  assert.equal(p.lookup,c.districtHint==='LISD'?'DISTRICT_APARTMENT_COMPLEX_PICKER':'STREET_ADDRESS_OR_COMPLEX');
 }
});
test('district-published split alone requires unit, not a generic apartment',()=>{
 const sample=f.cases.find(c=>c.districtHint==='LISD');
 const noSource=resolveApartmentPolicy(sample,{district:sample.districtHint,complexId:sample.id,scope:'UNIT',verified:false,officialUrl:'https://www.lisd.net/'});
 assert.equal(noSource.unitRequired,false);
 const wrongComplex=resolveApartmentPolicy(sample,{district:sample.districtHint,complexId:'other',scope:'UNIT',verified:true,officialUrl:'https://www.lisd.net/'});
 assert.equal(wrongComplex.unitRequired,false);
 const official=resolveApartmentPolicy(sample,{district:'LISD',complexId:sample.id,scope:'UNIT',verified:true,officialUrl:'https://www.lisd.net/resources/families/school-locator'});
 assert.equal(official.unitRequired,true);
 assert.equal(official.lookup,'UNIT_EXCEPTION');
});
test('a map-only GIS match remains unverified, never counted as district Finder proof',()=>{
 const sample=f.cases[0];
 const got=compareFinderToDashboard({sample,official:null,display:{district:'043907',grades:{elementary:[{school:'McGowen'}]}}});
 assert.equal(got.status,'UNVERIFIED_OFFICIAL_FINDER');
 assert.equal(got.unitRequired,false);
});
test('unverified 2025-26 map year never becomes 2026-27 certification',()=>{
 const sample=f.cases.find(c=>c.id==='plano-bridge');
 const official={verified:true,method:'OFFICIAL_FINDER_UI',district:'PISD',schoolYear:'2026–27',
  sourceUrl:'https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder',
  schools:{elementary:'Sigler Elementary',middle:'Wilson Middle',high:'Vines High',senior:'Plano Senior High'}};
 const grades=Object.fromEntries(Object.entries(official.schools).map(([k,s])=>[k,[{school:s,year:'Current district Finder (source layer 2025–26)'}]]));
 const got=compareFinderToDashboard({sample,official,display:{district:'PISD',grades,renderedPolygonFeatures:4,matchedMarkers:4}});
 assert.equal(got.status,'FINDER_MATCH_BUT_GIS_YEAR_UNVERIFIED');
});
test('real current-year Finder discrepancy is a mismatch, not a synthetic pass',()=>{
 const sample=f.cases[0];
 const official={verified:true,method:'OFFICIAL_FINDER_UI',district:'043907',
  schoolYear:'2026-27',sourceUrl:'https://www.mckinneyisd.net/page/attendance-zones-maps/',
  schools:{elementary:'Other Elementary',middle:'Evans',high:'McKinney'}};
 const grades={elementary:[{school:'McGowen',year:'2026-27'}],
  middle:[{school:'Evans',year:'2026-27'}],high:[{school:'McKinney',year:'2026-27'}]};
 const got=compareFinderToDashboard({sample,official,display:{district:'043907',grades,renderedPolygonFeatures:3,matchedMarkers:3}});
 assert.equal(got.status,'OFFICIAL_FINDER_MISMATCH');
});
test('current-year same school and all three geometry links can corroborate, but no global release',()=>{
 const sample=f.cases[0];
 const official={verified:true,method:'OFFICIAL_FINDER_UI',district:'043907',
  schoolYear:'2026-27',sourceUrl:'https://www.mckinneyisd.net/page/attendance-zones-maps/',
  schools:{elementary:'McGowen',middle:'Evans',high:'McKinney'}};
 const grades={elementary:[{school:'McGowen',year:'2026–27'}],
  middle:[{school:'Evans',year:'2026–27'}],high:[{school:'McKinney',year:'2026–27'}]};
 const got=compareFinderToDashboard({sample,official,display:{district:'043907',grades,renderedPolygonFeatures:3,matchedMarkers:3}});
 assert.equal(got.status,'CURRENT_FINDER_AND_MAP_CORROBORATED');
 assert.equal(f.releaseGate,'NO_GO','individual corroboration cannot override seven-ISD gate');
});
