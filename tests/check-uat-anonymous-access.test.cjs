'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  REQUIRED_PATHS, httpsOrigin, validateConfig, classifyResponse, probeAnonymous,
} = require('../scripts/check-uat-anonymous-access.cjs');

const placeholder = JSON.parse(fs.readFileSync('deploy/uat-access-targets.example.json','utf8'));
const simulated = () => ({
  schemaVersion: 1,
  state: 'configured',
  projectName: 'dfw-family-uat',
  primaryOrigin: 'https://dfw-family-uat.pages.dev',
  accessLoginOrigin: 'https://test-team.cloudflareaccess.com',
  previewOrigins: [
    { kind: 'branch', origin: 'https://testing.dfw-family-uat.pages.dev' },
    { kind: 'immutable', origin: 'https://abcdef1234.dfw-family-uat.pages.dev' },
  ],
  customOrigins: [],
});
const clone = x => JSON.parse(JSON.stringify(x));
const redirect = (location) => ({
  status: 302,
  headers: { get: header => header === 'location' ? location : null },
});

test('default placeholder reports NOT PROVISIONED and invents no hostname',()=>{
  const plan = validateConfig(placeholder);
  assert.equal(plan.status,'NOT_PROVISIONED');
  assert.equal(plan.targets.length,0);
  assert.equal(plan.loginOrigin,null);
  assert.equal(placeholder.primaryOrigin,null);
  assert.equal(placeholder.accessLoginOrigin,null);
});
test('unprovisioned manifest cannot pass any live check or pre-mark approvals',()=>{
  assert.throws(()=>validateConfig(placeholder,{live:true}),/not provisioned/);
  const p=clone(placeholder);p.primaryOrigin='https://dfw-family-uat.pages.dev';
  assert.throws(()=>validateConfig(p),/no presumed UAT/);
});
test('configured origins require explicit live-mode opt in',()=>{
  assert.throws(()=>validateConfig(simulated()),/explicit --live/);
  const p=validateConfig(simulated(),{live:true});
  assert.equal(p.targets.length,3);
  assert.deepEqual(p.targets.map(x=>x.kind),['primary','branch','immutable']);
});
test('only HTTPS exact origin with no path, credentials, port or query is valid',()=>{
  assert.equal(httpsOrigin('https://dfw-family-uat.pages.dev','test'),'https://dfw-family-uat.pages.dev');
  for(const url of [
    'http://dfw-family-uat.pages.dev',
    'https://dfw-family-uat.pages.dev:443',
    'https://dfw-family-uat.pages.dev/path',
    'https://dfw-family-uat.pages.dev/?secret=1',
    'https://user@dfw-family-uat.pages.dev',
    'https://dfw-family-uat.pages.dev\\@evil.test',
    'https://dfw-family-uat.pages.dev#hash',
    '//dfw-family-uat.pages.dev',
  ]) assert.throws(()=>httpsOrigin(url,'test'),url);
});
test('preview branches and immutable deployment aliases must both be present',()=>{
  const p=simulated();p.previewOrigins=p.previewOrigins.slice(0,1);
  assert.throws(()=>validateConfig(p,{live:true}),/branch AND immutable/);
  const q=simulated();q.previewOrigins[1].kind='branch';
  assert.throws(()=>validateConfig(q,{live:true}),/immutable deployment alias/);
});
test('cross-project, nested alias, fake hash and duplicate origins are rejected',()=>{
  for(const origin of [
    'https://testing.attacker.pages.dev',
    'https://testing.dfw-family-uat.pages.dev.evil.test',
    'https://nested.testing.dfw-family-uat.pages.dev',
  ]){
    const p=simulated();p.previewOrigins[0].origin=origin;
    assert.throws(()=>validateConfig(p,{live:true}),origin);
  }
  const q=simulated();q.previewOrigins[1].origin='https://pretty-name.dfw-family-uat.pages.dev';
  assert.throws(()=>validateConfig(q,{live:true}),/hash-like/);
  const dup=simulated();dup.previewOrigins.push({...dup.previewOrigins[0]});
  assert.throws(()=>validateConfig(dup,{live:true}),/Duplicate/);
});
test('custom domains and Cloudflare team login origins must be explicit, distinct and HTTPS',()=>{
  const p=simulated();p.customOrigins=['https://family-uat.example.org'];
  assert.equal(validateConfig(p,{live:true}).targets.length,4);
  const q=simulated();q.customOrigins=['https://kevinim.github.io'];
  assert.throws(()=>validateConfig(q,{live:true}),/Custom UAT hostname/);
  const r=simulated();r.accessLoginOrigin='https://evil-cloudflareaccess.com';
  assert.throws(()=>validateConfig(r,{live:true}),/team.cloudflareaccess/);
  const s=simulated();s.accessLoginOrigin='https://test-team.cloudflareaccess.com/path';
  assert.throws(()=>validateConfig(s,{live:true}),/exact origin/);
});
test('only an actual Access login redirect is positive evidence',()=>{
  const url='https://dfw-family-uat.pages.dev/schools.json';
  const team='https://test-team.cloudflareaccess.com';
  assert.deepEqual(classifyResponse(redirect(team+'/cdn-cgi/access/login'),url,team),
    {ok:true,reason:'access_login_redirect'});
  assert.equal(classifyResponse(redirect('/cdn-cgi/access/login'),url,team).ok,true);
  for(const location of [
    'https://example.com/auth',
    'https://test-team.cloudflareaccess.com.evil.test/cdn-cgi/access/login',
    'https://dfw-family-uat.pages.dev/schools.json',
    'http://test-team.cloudflareaccess.com/cdn-cgi/access/login',
  ]) assert.equal(classifyResponse(redirect(location),url,team).ok,false,location);
});
test('direct 200 content is a privacy leak; 403 alone is not proof of Access identity',()=>{
  const url='https://dfw-family-uat.pages.dev/';
  const team='https://test-team.cloudflareaccess.com';
  assert.deepEqual(classifyResponse({status:200,headers:{}},url,team),
    {ok:false,reason:'anonymous_content_exposed'});
  assert.deepEqual(classifyResponse({status:403,headers:{}},url,team),
    {ok:false,reason:'denied_but_access_identity_unverified'});
  assert.equal(classifyResponse({status:500,headers:{}},url,team).ok,false);
});
test('mock live sweep tests every required static URL on primary, branch and immutable origin',async()=>{
  let calls=0;const urls=[];
  const output=await probeAnonymous(simulated(),{fetchFn:async (url,options)=>{
    calls++;urls.push(url);
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'manual');
    assert.equal(options.credentials,'omit');
    assert.equal(options.cache,'no-store');
    return redirect('https://test-team.cloudflareaccess.com/cdn-cgi/access/login');
  }});
  assert.equal(output.status,'ANONYMOUS_REDIRECTS_VERIFIED');
  assert.equal(output.checkedRequests,3*REQUIRED_PATHS.length);
  assert.equal(calls,3*REQUIRED_PATHS.length);
  assert.equal(urls.filter(x=>x.endsWith('/schools.json')).length,3);
  assert.deepEqual(output.failures,[]);
});
test('one exposed school JSON or JS file blocks approval despite protected root',async()=>{
  const result=await probeAnonymous(simulated(),{fetchFn:async url=>
    url.endsWith('/schools.json')&&url.includes('abcdef1234.')
      ?{status:200,headers:{get:()=>null}}
      :redirect('/cdn-cgi/access/login'),
  });
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.failures.some(x=>x.reason==='anonymous_content_exposed'));
});
test('network failure or uncertain 401/403 denies UAT access certification',async()=>{
  const r=await probeAnonymous(simulated(),{fetchFn:async url=>{
    if(url.endsWith('index.html'))throw Error('inert offline simulated timeout');
    if(url.endsWith('schools.json'))return {status:401,headers:{get:()=>null}};
    return redirect('/cdn-cgi/access/login');
  }});
  assert.equal(r.status,'BLOCKED');
  assert.ok(r.failures.some(x=>x.reason==='network_or_timeout'));
  assert.ok(r.failures.some(x=>x.reason==='denied_but_access_identity_unverified'));
});
test('unprovisioned configuration never invokes mock transport',async()=>{
  let calls=0;
  await assert.rejects(probeAnonymous(placeholder,{fetchFn:async()=>{calls++;return redirect('/cdn-cgi/access/login');}}),/not provisioned/);
  assert.equal(calls,0);
});
