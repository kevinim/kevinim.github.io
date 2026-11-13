'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const core=require('../features/redfin-uat-core.js');
const sample='https://www.redfin.com/TX/Plano/4652-Phillip-Dr-75024/home/123456';
test('normal property path is only a suggested address, never verified',()=>{
 const x=core.parseRedfinUrl(sample+'?utm_source=ref#details');
 assert.equal(x.ok,true);assert.equal(x.sourceUrl,sample);
 assert.equal(x.suggestedAddress,'4652 Phillip Dr, Plano, TX 75024');
 assert.equal(x.needsConfirmation,true);
});
test('apartment/property-name URL needs manual address',()=>{
 const x=core.parseRedfinUrl('https://www.redfin.com/TX/Dallas/Example-Apartments/apartment/987');
 assert.equal(x.ok,true);assert.equal(x.suggestedAddress,null);
});
test('never classify a Redfin URL as an available rental',()=>{
 const x=core.parseRedfinUrl(sample);assert.equal('availability' in x,false);assert.equal('rent' in x,false);
});
test('reject host spoofing, credentials, HTTP, ports, non-TX and browsing URLs',()=>{
 for(const u of [
  'http://www.redfin.com/TX/Plano/4652-Phillip-Dr-75024/home/123',
  'https://www.redfin.com.evil.net/TX/Plano/4652-Phillip-Dr-75024/home/123',
  'https://redfin.com@attacker.com/TX/Plano/4652-Phillip-Dr-75024/home/123',
  'https://user:pass@www.redfin.com/TX/Plano/4652-Phillip-Dr-75024/home/123',
  'https://www.redfin.com:443/TX/Plano/4652-Phillip-Dr-75024/home/123',
  'https://www.redfin.com/rentals',
  'https://www.redfin.com/city/30868/TX/Plano/houses-for-rent',
  'https://www.redfin.com/CA/Plano/4652-Phillip-Dr-75024/home/123',
  'https://www.redfin.com/TX/Plano/a%2fb/home/12',
  'javascript:alert(1)'
 ]){assert.equal(core.parseRedfinUrl(u).ok,false,u);}
});
test('strip tracking parameters, avoid guessed addresses',()=>{
 const x=core.parseRedfinUrl('https://redfin.com/TX/Frisco/Some-Property-75035/home/123?source=private');
 assert.equal(x.ok,true);assert.equal(x.suggestedAddress,null);assert.equal(x.sourceUrl.includes('?'),false);
});
test('DFW street address validation is explicit and strict',()=>{
 assert.equal(core.validateAddress('4652 Phillip Dr, Plano, TX 75024'),'4652 Phillip Dr, Plano, TX 75024');
 for(const x of ['Plano TX 75024','123 Unknown, Plano TX','1 Example Dr, Plano, CA 75024','1 Example Dr, Tulsa, OK 74001',
  '1 Example Dr, Plano, TX 00000','<img src=x>, Plano, TX 75024','1 Example Dr, Plano, TX 75024\nx'])
  assert.equal(core.validateAddress(x),null,x);
});
test('manual monthly rent is optional and never inferred',()=>{
 assert.equal(core.validateRent(''),null);assert.equal(core.validateRent('2500'),2500);
 for(const x of ['-1','0','100000','foo','$2500','3.5'])assert.equal(core.validateRent(x),false);
});
test('UAT feature opt-in, no Redfin network access, no local persistence, no iframe',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../redfin-uat.html'),'utf8');
 const production=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.doesNotMatch(production,/redfin-uat(?:\.js|\.css|-core\.js)/,'Production entry stays byte-exact and UAT-free');
 const runtime=fs.readFileSync(path.join(__dirname,'../features/redfin-uat.js'),'utf8');
 assert.match(html,/redfin-uat-core\.js\?v=1/);assert.match(html,/redfin-uat\.js\?v=1/);
 assert.match(html,/redfin-uat\.css\?v=1/);
 assert.match(runtime,/redfin-uat/);assert.match(runtime,/location\.pathname/);
 assert.doesNotMatch(runtime,/fetch\(['"]https?:\/\/(?:www\.)?redfin\.com|<iframe|localStorage|sessionStorage|document\.cookie|innerHTML\s*=\s*[a-z]+\.address/i);
 assert.match(runtime,/noopener noreferrer/);
});
