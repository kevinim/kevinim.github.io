'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {run,checkSource}=require('../scripts/probe-prosper-second-zip-public-homes.cjs');
const fixture=()=>JSON.parse(fs.readFileSync('tests/prosper-second-zip-public-candidates-2026.json','utf8'));
test('two public 75035 addresses are explicitly candidates and are not auto-approved',()=>{
 const f=fixture();assert.doesNotThrow(()=>checkSource(f));
 assert.equal(f.candidates.length,2);
 assert.equal(f.candidates.every(x=>x.zip==='75035'),true);
 assert.equal(f.independentOfficialFinderUiVerified,false);
 assert.equal(f.productionApproved,false);
});
test('fake or undisclosed third-party source cannot silently become a verified public sample',()=>{
 const f=fixture();f.candidates[1].zip='75078';
 assert.throws(()=>checkSource(f),/INVALID_PUBLIC_SECOND_ZIP_SOURCE/);
 const g=fixture();g.candidates[0].publicListingUrl='https://evil.example/not-listing';
 assert.throws(()=>checkSource(g),/INVALID_PUBLIC_SECOND_ZIP_SOURCE/);
});
test('a missing live geocode leaves no invented school code, GIS, or GO',async()=>{
 const r=await run({request:async()=>({ok:true,json:async()=>({candidates:[]})})});
 assert.equal(r.corrobated,undefined);
 assert.equal(r.corroborated,0);
 assert.equal(r.independentlyVerifiedResidentialAssignments,0);
 assert.equal(r.level2PromotionAllowed,false);
 assert.equal(r.level1PromotionAllowed,false);
 assert.equal(r.schoolEnrollmentCertified,false);
 assert.equal(r.release,'NO_GO');
 assert.ok(r.cases.every(x=>x.status==='INCONCLUSIVE'&&x.officialSchoolCodes.length===0));
 assert.ok(r.cases.every(x=>!('address' in x)&&!('coordinates' in x)));
});
