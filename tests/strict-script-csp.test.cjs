'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const csp=html=>{
 const match=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i);
 assert.ok(match,'CSP meta is required');
 const policy=match[1];
 for(const directive of ["script-src-attr 'none'","object-src 'none'","base-uri 'self'","form-action 'self'"])assert.ok(policy.includes(directive));
 const script=policy.split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src '));
 assert.ok(script,'script-src required');
 assert.doesNotMatch(script,/unsafe-inline|unsafe-eval/);
 return policy;
};
const inlineScripts=html=>[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
 .filter(m=>!/\bsrc\s*=/.test(m[1]));

test('index.html uses zero-hash external same-origin main bootstrap',()=>{
 const html=read('index.html'),policy=csp(html),scripts=inlineScripts(html);
 assert.equal(scripts.length,0,'Main must have no inline executable scripts');
 assert.match(html,/<script src="\.\/dashboard-main\.js\?v=\\d+"><\/script>/,'External main bootstrap must retain a versioned same-origin script URL');
 assert.doesNotMatch(policy,/'sha256-/);
 assert.ok(policy.includes("script-src 'self' https://unpkg.com;"));
 assert.ok(read('dashboard-main.js').includes('button[data-clear-school]'));
});

test('reviewed.html is external-script-only with no inline handlers',()=>{
 const html=read('reviewed.html'),policy=csp(html);
 assert.equal(inlineScripts(html).length,0,'reviewed page cannot execute inline scripts');
 assert.match(policy,/script-src 'self' https:\/\/unpkg\.com;/);
 assert.doesNotMatch(policy,/'sha256-/);
 assert.ok(html.includes('<script src="./features/geojson-upload-guard.js?v=1"></script>'));
 assert.ok(html.includes('<script src="./features/reviewed-bootstrap.js?v=1"></script>'));
 assert.doesNotMatch(html,/\s(?:onclick|onload|onerror|oninput|onchange|onsubmit)\s*=\s*["']/i);
 const src=read('features/reviewed-bootstrap.js');
 assert.ok(src.includes('SchoolGeoJSONGuard.assertFileSize'));
 assert.ok(src.includes('SchoolGeoJSONGuard.validate'));
 assert.ok(src.includes('button[data-clear-school]'));
});

test('pinned external Leaflet script uses SRI in both entry pages',()=>{
 for(const p of ['index.html','reviewed.html'])
  assert.match(read(p),/<script\s+src="https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js"\s+integrity="sha256-[A-Za-z0-9+/]+=*"/i);
});
