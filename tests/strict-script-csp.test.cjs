'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

function verifyPage(name) {
 const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
 const meta=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i);
 assert.ok(meta,name+' must enforce CSP');
 const policy=meta[1];
 assert.ok(!/['"]unsafe-inline['"]|['"]unsafe-eval['"]/.test(policy),name+' permits dangerous CSP script execution');
 assert.match(policy,/script-src 'self' https:\/\/unpkg\.com 'sha256-[A-Za-z0-9+/]+=*'/);
 assert.match(policy,/script-src-attr 'none'/);
 assert.match(policy,/object-src 'none'/);
 assert.match(policy,/base-uri 'self'/);
 assert.match(policy,/form-action 'self'/);
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>! /\bsrc\s*=/.test(m[1]));
 assert.equal(scripts.length,1,name+' must have exactly one hash-locked inline bootstrap');
 // HTML parsing normalizes CRLF to LF before browsers evaluate CSP inline-script hashes.
 const inline=scripts[0][2],browserText=inline.replace(/\r\n?/g,'\n'),hash=crypto.createHash('sha256').update(browserText,'utf8').digest('base64');
 assert.ok(policy.includes("'sha256-"+hash+"'"),name+' inline script differs from CSP hash — update the CSP hash with every bootstrap edit');
 assert.equal((policy.match(/'sha256-/g)||[]).length,1,name+' must allow only its current bootstrap hash');
 assert.ok(!/\s(?:onclick|onload|onerror|oninput|onchange|onsubmit|onkeydown|onkeyup)\s*=\s*["']/i.test(html),name+' retains an inline event attribute');
 assert.ok(inline.includes('button[data-clear-school]'),name+' must delegate the detail back button');
 assert.ok(html.includes('data-clear-school'),name+' must preserve the detail back button');
 assert.ok(!/\bscript-src\b[^;]*\b(?:data:|blob:|https:\*|\*)/.test(policy),name+' has an unsafe script source');
 return {html,inline,browserText,hash};
}

for(const name of ['index.html','reviewed.html']){
 test(name+' CSP locks its exact inline bootstrap and forbids HTML event handlers',()=>{
  const {browserText,hash}=verifyPage(name);
  assert.notEqual(crypto.createHash('sha256').update(browserText+'\n','utf8').digest('base64'),hash,
   'any inline script edit must invalidate the existing hash');
 });
}

test('external Leaflet remains pinned to a Subresource Integrity hash',()=>{
 for(const name of ['index.html','reviewed.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
  assert.match(html,/<script\s+src="https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js"\s+integrity="sha256-[A-Za-z0-9+/]+=*"/i);
 }
});
