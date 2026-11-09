import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleApiRequest} from '../backend/api.mjs';
import {createLocalServer} from '../backend/local-server.mjs';

const BASE='https://api.example.test';
const validEnv=()=>({
  RUNTIME_MODE:'cloudflare',
  API_OWNER_APPROVED:'confirmed',
  API_PROVIDER_TERMS_APPROVED:'confirmed',
  API_DATA_LICENSES_CONFIRMED:'confirmed',
  API_RATE_LIMITER:{limit:async()=>({success:true})},
});
const provider={
  suggest:async({query})=>[{address:'Example, Texas',location:{lat:33.02,lon:-96.74}}],
  route:async()=>({durationMinutes:21.367,distanceKm:16.21,trafficIncluded:false})
};
async function request(path,method='GET',body,env={},providers={}){
  const headers={};
  if(body!==undefined)headers['Content-Type']='application/json';
  const r=new Request(BASE+path,{method,headers,
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  return handleApiRequest(r,env,providers);
}
async function postRaw(path,body,headers={}){
  return handleApiRequest(new Request(BASE+path,{
    method:'POST',body,headers
  }));
}
test('health is account free, has no server secrets or provider calls',async()=>{
  const r=await request('/api/v1/health');
  assert.equal(r.status,200);
  assert.equal((await r.json()).status,'ok');
  assert.equal(r.headers.get('cache-control'),'no-store, max-age=0');
  assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  assert.equal(r.headers.get('content-security-policy'),"default-src 'none'; frame-ancestors 'none'");
});
test('readiness fails safely while external accounts/providers are absent',async()=>{
  const r=await request('/api/v1/ready');
  assert.equal(r.status,503);
  assert.equal((await r.json()).status,'not_configured');
});
test('method and route allowlist reject unrecognized requests',async()=>{
  assert.equal((await request('/admin')).status,404);
  assert.equal((await request('/api/v1/health','POST',{})).status,405);
  assert.equal((await request('/api/v1/health?debug=1')).status,400);
  assert.equal((await request('/api/v1/addresses/suggest','GET')).status,405);
});
test('browser cross-origin reads are denied unless exact HTTPS origin is allowed',async()=>{
  const origin='https://public.example.test';
  const a=new Request(BASE+'/api/v1/health',{headers:{Origin:origin}});
  assert.equal((await handleApiRequest(a)).status,403);
  const good=await handleApiRequest(a,{API_ALLOWED_ORIGINS:origin});
  assert.equal(good.status,200);
  assert.equal(good.headers.get('access-control-allow-origin'),origin);
  const fake=new Request(BASE+'/api/v1/health',{headers:{Origin:'https://public.example.test.evil.io'}});
  assert.equal((await handleApiRequest(fake,{API_ALLOWED_ORIGINS:origin})).status,403);
  const wild=await handleApiRequest(a,{API_ALLOWED_ORIGINS:'*'});
  assert.equal(wild.status,403);
});
test('CORS preflight is scoped to known APIs and exact allowed origin',async()=>{
  const r=await handleApiRequest(new Request(BASE+'/api/v1/addresses/suggest',{
    method:'OPTIONS',headers:{Origin:'https://public.example.test'}
  }),{API_ALLOWED_ORIGINS:'https://public.example.test'});
  assert.equal(r.status,204);
  assert.equal(r.headers.get('access-control-allow-headers'),'Content-Type');
  assert.equal((await handleApiRequest(new Request(BASE+'/api/v1/missing',{
    method:'OPTIONS',headers:{Origin:'https://public.example.test'}
  }),{API_ALLOWED_ORIGINS:'https://public.example.test'})).status,404);
});
test('POST parser blocks wrong MIME, excessive payload, JSON arrays and bad JSON',async()=>{
  assert.equal((await postRaw('/api/v1/addresses/suggest','hello',{'Content-Type':'text/plain'})).status,415);
  assert.equal((await postRaw('/api/v1/addresses/suggest','X'.repeat(3000),{'Content-Type':'application/json'})).status,413);
  assert.equal((await postRaw('/api/v1/addresses/suggest','not-json',{'Content-Type':'application/json'})).status,400);
  assert.equal((await postRaw('/api/v1/addresses/suggest','[]',{'Content-Type':'application/json'})).status,400);
});
test('address lookup rejects malformed, oversized and control character inputs',async()=>{
  for(const body of [{query:'a'},{query:'x'.repeat(161)},{query:'\nAbc'},{query:'https://evil.example'},{query:123},{query:'Plano',extra:1}]){
    const r=await request('/api/v1/addresses/suggest','POST',body);
    assert.equal(r.status,422);
  }
});
test('address/geocoding and routing are disabled before provider approval',async()=>{
  let calls=0;
  const deps={suggest:async()=>{calls++;return [];},route:async()=>{calls++;return null;}};
  assert.equal((await request('/api/v1/addresses/suggest','POST',{query:'Plano Texas'}, {},deps)).status,503);
  assert.equal((await request('/api/v1/routes/estimate','POST',{
    origin:{lat:33,lon:-96},destination:{lat:33.2,lon:-96.6}
  },{},deps)).status,503);
  assert.equal(calls,0);
});
test('an enabled provider without a distributed rate limiter remains disabled',async()=>{
  let calls=0;
  const env=validEnv();delete env.API_RATE_LIMITER;
  const r=await request('/api/v1/addresses/suggest','POST',{query:'Plano Texas'},env,{
    suggest:async()=>{calls++;return [];}
  });
  assert.equal(r.status,503);
  assert.equal(calls,0);
});
test('valid route payload requires two finite lat/lon pairs',async()=>{
  for(const body of [
    {origin:{lat:NaN,lon:-96},destination:{lat:33,lon:-96}},
    {origin:{lat:99,lon:-96},destination:{lat:33,lon:-96}},
    {origin:{lat:33,lon:'-96'},destination:{lat:33,lon:-96}},
    {origin:{lat:33,lon:-96},destination:{lat:33,lon:-96},debug:true}
  ]){
    assert.equal((await request('/api/v1/routes/estimate','POST',body)).status,422);
  }
});
test('fake X-Forwarded-For never overrides the Cloudflare edge source for rate key',async()=>{
  const keys=[];
  const env=validEnv();
  env.API_RATE_LIMITER.limit=async({key})=>{keys.push(key);return {success:true};};
  const r=await handleApiRequest(new Request(BASE+'/api/v1/addresses/suggest',{
    method:'POST',
    headers:{'Content-Type':'application/json',
      'CF-Connecting-IP':'203.0.113.15','X-Forwarded-For':'1.2.3.4'},
    body:JSON.stringify({query:'Plano Texas'})
  }),env,provider);
  assert.equal(r.status,200);
  assert.deepEqual(keys,['203.0.113.15']);
  assert.deepEqual((await r.json()).suggestions,[{address:'Example, Texas',location:{lat:33.02,lon:-96.74}}]);
});
test('configured provider without edge IP cannot silently bypass rate limit',async()=>{
  const r=await request('/api/v1/addresses/suggest','POST',{query:'Plano Texas'},validEnv(),provider);
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'rate_limiter_unavailable');
});
test('distributed rate limit rejects before provider work',async()=>{
  const env=validEnv();env.API_RATE_LIMITER.limit=async()=>({success:false});
  let hits=0;
  const r=await handleApiRequest(new Request(BASE+'/api/v1/addresses/suggest',{
    method:'POST',
    headers:{'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.22'},
    body:JSON.stringify({query:'Plano Texas'})
  }),env,{suggest:async()=>{hits++;return [];}});
  assert.equal(r.status,429);
  assert.equal(hits,0);
});
test('response normalizes valid route and never exposes exact provider response internals',async()=>{
  const r=await handleApiRequest(new Request(BASE+'/api/v1/routes/estimate',{
    method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.22'},
    body:JSON.stringify({origin:{lat:33,lon:-96},destination:{lat:33.2,lon:-96.6}})
  }),validEnv(),provider);
  assert.equal(r.status,200);
  assert.deepEqual((await r.json()).route,{durationMinutes:21.4,distanceKm:16.2,trafficIncluded:false});
});
test('upstream failures return generic errors and do not echo private search text',async()=>{
  const phrase='123 Private Test Address, Texas';
  const r=await handleApiRequest(new Request(BASE+'/api/v1/addresses/suggest',{
    method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.22'},
    body:JSON.stringify({query:phrase})
  }),validEnv(),{suggest:async()=>{throw Error('provider error '+phrase);}});
  assert.equal(r.status,502);
  const t=await r.text();
  assert.equal(t.includes(phrase),false);
  assert.deepEqual(JSON.parse(t),{error:'upstream_unavailable'});
});
test('local HTTP harness binds to loopback and never activates upstream',async()=>{
  const server=createLocalServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    assert.equal(server.address().address,'127.0.0.1');
    const base='http://127.0.0.1:'+server.address().port;
    const r=await fetch(base+'/api/v1/health');
    assert.equal(r.status,200);
    assert.equal((await r.json()).status,'ok');
    const blocked=await fetch(base+'/api/v1/addresses/suggest',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({query:'Plano Texas'})
    });
    assert.equal(blocked.status,503);
    assert.equal((await blocked.json()).error,'provider_not_configured');
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
test('source core never logs raw addresses or coordinates',()=>{
  const s=fs.readFileSync('backend/api.mjs','utf8');
  assert.equal(/\bconsole\.(?:log|error|warn|debug)\s*\(/.test(s),false);
  assert.equal(/x-forwarded-for/i.test(s),true); // documentary denial, never used as key
});
