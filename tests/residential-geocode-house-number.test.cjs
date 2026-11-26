'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assessResidentialGeocode,rankTexasHomeCandidates}=require('../geocode-quality.js');

// Synthetic addresses: no actual household or residential location is queried or stored.
const request='1234 Synthetic Lane, Prosper, TX 75078';
function match(address='1234 Synthetic Lane, Prosper, TX 75078',type='PointAddress',score=100){
 return {address,score,location:{x:-96.8,y:33.24},
  attributes:{Region:'TX',Postal:'75078',Addr_type:type}};
}
test('a precisely matched civic house number remains eligible as a reference candidate',()=>{
 assert.equal(assessResidentialGeocode(request,match()).usableForSchoolCandidate,true);
 assert.equal(assessResidentialGeocode('1234A Synthetic Lane, Prosper TX 75078',
  match('1234A Synthetic Lane, Prosper TX 75078')).usableForSchoolCandidate,true);
});
test('a high-score result for a different house number must fail closed',()=>{
 const r=assessResidentialGeocode(request,match('1235 Synthetic Lane, Prosper TX 75078'));
 assert.equal(r.usableForSchoolCandidate,false);
 assert.match(r.reason,/번지수/);
 assert.equal(assessResidentialGeocode(request,
  match('1234A Synthetic Lane, Prosper TX 75078')).usableForSchoolCandidate,false);
});
test('missing civic number and contradictory returned street metadata both fail closed',()=>{
 assert.equal(assessResidentialGeocode(request,
  match('Synthetic Lane, Prosper TX 75078')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode('Synthetic Lane, Prosper TX 75078',
  match()).usableForSchoolCandidate,false);
 const c=match();
 c.attributes.Match_addr='1235 Synthetic Lane, Prosper TX 75078';
 assert.equal(assessResidentialGeocode(request,c).usableForSchoolCandidate,false);
});
test('candidate ranking prefers correct house-number evidence over a higher-score wrong house',()=>{
 const out=rankTexasHomeCandidates(request,[
  match('1235 Synthetic Lane, Prosper TX 75078','PointAddress',100),
  match('1234 Synthetic Lane, Prosper TX 75078','PointAddress',98)
 ]);
 assert.equal(out.candidates.length,2);
 assert.equal(out.candidates[0].address.startsWith('1234 '),true);
 assert.equal(assessResidentialGeocode(request,out.candidates[1]).usableForSchoolCandidate,false);
});
test('house-number gate does not bypass apartment unit or ZIP safeguards',()=>{
 const a='1234 Synthetic Lane Apt 4B, Prosper, TX 75078';
 assert.equal(assessResidentialGeocode(a,match()).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(a,
  match('1234 Synthetic Lane Apt 4A, Prosper TX 75078','Subaddress')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(a,
  match('1234 Synthetic Lane Apt 4B, Prosper TX 75078','Subaddress')).usableForSchoolCandidate,true);
 const contradictory=match('1234 Synthetic Lane, Prosper TX 75079');
 assert.equal(assessResidentialGeocode(request,contradictory).usableForSchoolCandidate,false);
 contradictory.attributes.Postal='75079';
 assert.equal(assessResidentialGeocode(request,contradictory).usableForSchoolCandidate,false);
});
