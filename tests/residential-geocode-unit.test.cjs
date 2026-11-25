'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {residentialUnit,assessResidentialGeocode,rankTexasHomeCandidates}=require('../geocode-quality.js');
const requested='1234 Synthetic Lane Apt 4B, Prosper, TX 75078';
function candidate(type='PointAddress',unit='',score=100){
 return {address:'1234 Synthetic Lane'+(unit?' Apt '+unit:'')+', Prosper, TX 75078',
  score,location:{x:-96.8,y:33.24},
  attributes:{Region:'TX',Postal:'75078',Addr_type:type}};
}
test('building-only Esri match must not authorize a typed apartment unit',()=>{
 const r=assessResidentialGeocode(requested,candidate());
 assert.equal(r.usableForSchoolCandidate,false);
 assert.match(r.reason,/호수/);
});
test('subaddress is accepted only when the returned unit matches the request',()=>{
 assert.equal(residentialUnit(requested),'4B');
 assert.equal(residentialUnit('1234 Synthetic Lane #4-B, Prosper TX'),'4B');
 assert.equal(assessResidentialGeocode(requested,candidate('Subaddress','4B')).usableForSchoolCandidate,true);
 assert.equal(assessResidentialGeocode(requested,candidate('Subaddress','4A')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(requested,candidate('Subaddress')).usableForSchoolCandidate,false);
 assert.equal(assessResidentialGeocode(requested,candidate('PointAddress','4B')).usableForSchoolCandidate,false);
});
test('Esri matched-address attribute can confirm an exact returned unit',()=>{
 const c=candidate('Subaddress');
 c.attributes.Match_addr='1234 Synthetic Lane, Unit 4B, Prosper, TX 75078';
 assert.equal(assessResidentialGeocode(requested,c).usableForSchoolCandidate,true);
});
test('unmatched unit is never promoted by ranking even with a 100-point address score',()=>{
 const c=candidate('PointAddress','',100);
 const ranked=rankTexasHomeCandidates(requested,[c]);
 assert.equal(ranked.candidates.length,1);
 assert.equal(assessResidentialGeocode(requested,ranked.candidates[0]).usableForSchoolCandidate,false);
});
test('ordinary detached-home point address remains eligible; ZIP and score still enforced',()=>{
 const plain='1234 Synthetic Lane, Prosper TX 75078';
 assert.equal(assessResidentialGeocode(plain,candidate()).usableForSchoolCandidate,true);
 assert.equal(assessResidentialGeocode(plain,candidate('PointAddress','',90)).usableForSchoolCandidate,false);
});
test('missing unit identifier fails closed',()=>{
 assert.equal(assessResidentialGeocode('1234 Synthetic Lane Apt, Prosper TX 75078',candidate()).usableForSchoolCandidate,false);
});
