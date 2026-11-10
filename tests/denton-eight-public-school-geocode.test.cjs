'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const mod=require('../scripts/probe-denton-eight-public-school-geocodes.cjs');
const eight=require('../data/denton-eight-campus-coordinate-exceptions-2026.json');
test('exact public school address geocoder URLs contain no household data',()=>{
 for(const r of eight.exceptions){
  const a=new URL(mod.esriUrl(r)),c=new URL(mod.censusUrl(r));
  assert.equal(a.origin,'https://geocode.arcgis.com');
  assert.equal(c.origin,'https://geocoding.geo.census.gov');
  assert.ok(a.searchParams.get('SingleLine').includes(r.publicCampusAddress.street));
  assert.ok(c.searchParams.get('address').includes(r.publicCampusAddress.street));
  assert.equal(a.searchParams.get('maxLocations'),'1');
 }
});
test('independent provider disagreement or publisher postal ZIP contradiction never certifies a site',()=>{
 const row=eight.exceptions[0],e={ll:[33.2,-97.1],score:99,type:'PointAddress'},c={ll:[33.2001,-97.1001]};
 const same=mod.disposition(row,e,c,{ll:[33.1999,-97.1001]});
 assert.equal(same.reviewStatus,'two-service-address-geocode-review-candidate');
 assert.equal(same.currentSchoolSiteCoordinateCertified,false);
 assert.equal(same.schoolAttendancePolygonCertified,false);
 assert.equal(same.residentialAssignmentApproved,false);
 const diff=mod.disposition(row,e,{ll:[33.5,-97.5]},{ll:[33.1999,-97.1001]});
 assert.equal(diff.reviewStatus,'independent-point-evidence-incomplete');
 const hill=eight.exceptions.find(x=>x.currentYearOfficialPdfAddressDiscrepancy);
 const postal=mod.disposition(hill,e,c,null);
 assert.equal(postal.reviewStatus,'district-postal-conflict');
 assert.equal(postal.readyForProduction,false);
});
test('all eight continue after provider failure, even partial results remain unapproved',async()=>{
 const fetchFn=async url=>{
  const u=new URL(url);
  if(u.hostname==='geocoding.geo.census.gov')throw Error('Census temporary source outage');
  return {ok:true,json:async()=>({candidates:[{location:{y:33.2,x:-97.1},score:99,
   attributes:{Addr_type:'PointAddress',Postal:'76207'},address:'public school street'}]})};
 };
 const result=await mod.run(fetchFn);
 assert.equal(result.count,8);
 assert.equal(result.providerResponseCount,8);
 assert.equal(result.reviewCandidateCount,0);
 assert.equal(result.currentSchoolSiteCoordinateCertifiedCount,0);
 assert.equal(result.schoolZoneApprovedCount,0);
 assert.equal(result.results.every(x=>x.residentialAssignmentApproved===false),true);
});
