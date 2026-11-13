'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createClient,ProviderRequestError,assertDestination}=require('../features/commute/provider-requests.js');
const root=path.resolve(__dirname,'..');
const paths={
 home:fs.readFileSync(path.join(root,'home-lookup-v2.js'),'utf8'),
 main:fs.readFileSync(path.join(root,'dashboard-main.js'),'utf8'),
 reviewed:fs.readFileSync(path.join(root,'features/reviewed-bootstrap.js'),'utf8'),
 index:fs.readFileSync(path.join(root,'index.html'),'utf8'),
 reviewedHTML:fs.readFileSync(path.join(root,'reviewed.html'),'utf8')
};
const NOM='https://nominatim.openstreetmap.org/search?q=public+office';
const OSRM='https://router.project-osrm.org/route/v1/driving/-96.8,33.1;-96.7,33.2';
function mockResponse(status=200,value={code:'Ok'}){
 return {ok:status>=200&&status<300,status,json:async()=>value};
}
test('allowlist permits only exact canonical provider origins and scoped route/search paths',()=>{
 assert.doesNotThrow(()=>assertDestination('nominatim',NOM));
 assert.doesNotThrow(()=>assertDestination('osrm',OSRM));
 for(const [p,url] of [
  ['nominatim','http://nominatim.openstreetmap.org/search?q=a'],
  ['nominatim','https://nominatim.openstreetmap.org.evil.example/search?q=a'],
  ['nominatim','https://nominatim.openstreetmap.org/reverse?q=a'],
  ['osrm','https://router.project-osrm.org/nearest/v1/driving/a'],
  ['osrm','https://router.project-osrm.org@evil.example/route/v1/driving/a'],
  ['arbitrary',OSRM],
  ['osrm',OSRM+'#hash']
 ]) assert.throws(()=>assertDestination(p,url),ProviderRequestError,url);
});
test('429 is a safe user-visible warning, with no automatic retries or leaked address',async()=>{
 let calls=0;
 const client=createClient({fetcher:async()=>{calls++;return mockResponse(429)}});
 await assert.rejects(()=>client.requestJson('nominatim',NOM),error=>{
  assert.equal(error.code,'rate_limited');assert.doesNotMatch(error.message,/public.office|\/search\?|q=/);return true;
 });
 assert.equal(calls,1);
});
test('502/503/504 are fail-closed no-retry outcomes with Google Maps fallback message',async()=>{
 for(const code of [502,503,504]){
  let calls=0;const client=createClient({fetcher:async()=>{calls++;return mockResponse(code)}});
  await assert.rejects(()=>client.requestJson('osrm',OSRM),e=>e.code==='unavailable'&&e.message.includes('Google Maps'));
  assert.equal(calls,1);
 }
});
test('unexpected response, bad JSON, or network errors do not print raw destination',async()=>{
 for(const [fetcher,code] of [
  [async()=>mockResponse(403),'http'],
  [async()=>({ok:true,status:200,json:async()=>{throw Error('user data in malformed JSON')}}),'invalid_json'],
  [async()=>{throw Error('internal URL '+NOM)},'network']
 ]){
  const client=createClient({fetcher});
  await assert.rejects(()=>client.requestJson('nominatim',NOM),e=>{
   assert.equal(e.code,code);assert.ok(!e.message.includes(NOM));return true;
  });
 }
});
test('per-tab minimum 1.1s provider gap; Nominatim and OSRM have independent slots',async()=>{
 let clock=10_000,delays=[],calls=[];
 const client=createClient({clock:()=>clock,sleep:async ms=>{delays.push(ms);clock+=ms},
  fetcher:async url=>{calls.push(url);return mockResponse()}});
 await client.requestJson('nominatim',NOM);
 await client.requestJson('nominatim',NOM);
 await client.requestJson('nominatim',NOM);
 await client.requestJson('osrm',OSRM);
 assert.deepEqual(delays,[1100,1100]);
 assert.equal(calls.length,4);
});
test('already aborted request is never sent; an in-flight fetch can time out',async()=>{
 let count=0;
 const ctrl=new AbortController();ctrl.abort();
 const client=createClient({fetcher:async()=>{count++;return mockResponse()}});
 await assert.rejects(()=>client.requestJson('osrm',OSRM,{signal:ctrl.signal}),e=>e.code==='cancelled');
 assert.equal(count,0);
 const stalled=createClient({fetcher:async(_url,init)=>new Promise((_resolve,reject)=>{
  init.signal.addEventListener('abort',()=>reject(Error('abort')), {once:true});
 })});
 await assert.rejects(()=>stalled.requestJson('osrm',OSRM,{timeoutMs:1000}),e=>e.code==='timeout');
});
test('both public entry points load guard before commute client code',()=>{
 const idxGuard=paths.index.indexOf('features/commute/provider-requests.js');
 const idxMain=paths.index.indexOf('dashboard-main.js?v=6');
 const reviewedGuard=paths.reviewedHTML.indexOf('features/commute/provider-requests.js');
 const reviewedRuntime=paths.reviewedHTML.indexOf('features/reviewed-bootstrap.js');
 assert.ok(idxGuard>=0&&idxGuard<idxMain);
 assert.ok(reviewedGuard>=0&&reviewedGuard<reviewedRuntime);
 for(const s of [paths.main,paths.home,paths.reviewed])assert.match(s,/TxProviderRequests\.requestJson/);
});
test('every current public Nominatim/OSRM fetch in commute code uses the shared guard',()=>{
 for(const source of [paths.main,paths.home,paths.reviewed]){
  assert.doesNotMatch(source,/fetch\s*\(\s*['"]https:\/\/(?:nominatim\.openstreetmap\.org|router\.project-osrm\.org)/);
  assert.match(source,/TxProviderRequests\.requestJson\('osrm'/);
 }
 assert.match(paths.main,/TxProviderRequests\.requestJson\('nominatim'/);
 assert.match(paths.reviewed,/TxProviderRequests\.requestJson\('nominatim'/);
});
test('both entrypoints disclose destination/route transmission and third party privacy caveat',()=>{
 assert.match(paths.main,/Nominatim/);
 assert.match(paths.index,/Nominatim/);
 assert.match(paths.reviewedHTML,/Nominatim/);
 assert.match(paths.reviewedHTML,/OSRM/);
 assert.match(paths.reviewedHTML,/로그 보존·삭제/);
});
