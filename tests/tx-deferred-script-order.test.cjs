'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
test('TX dashboard preserves deployed synchronous and deferred script dependency order',()=>{
 assert.equal(scripts.length,62,'Unexpected script inventory; review dependency ordering before bundling');
 assert.match(scripts[0][1],/features\/theme-toggle\.js/);
 assert.doesNotMatch(scripts[0][0],/\sdefer\b/);
 assert.equal(scripts.slice(1).filter(m=>/\sdefer\b/.test(m[0])).length,11,'11 reviewed, late CFB and TEA addons remain deferred');
 assert.equal(scripts.slice(1).filter(m=>!/\sdefer\b/.test(m[0])).length,50,'Do not broaden defer until all source/CSP guards are updated and proven');
 assert.ok(scripts.every(m=>!/\sasync\b/.test(m[0])),'Never async-load dependent school modules');
 assert.equal(scripts.map(m=>m[1]).length,new Set(scripts.map(m=>m[1])).size,'No duplicate JS');
});
test('Leaflet and shared GIS modules evaluate before main bootstrap',()=>{
 const order=scripts.map(m=>m[1]);
 const index=pattern=>order.findIndex(x=>x.includes(pattern));
 assert.ok(index('leaflet@1.9.4')>0);
 assert.ok(index('leaflet@1.9.4')<index('dashboard-main.js'));
 assert.ok(index('district-registry.js')<index('dashboard-main.js'));
 assert.ok(index('school-boundary-match.js')<index('dashboard-main.js'));
 assert.ok(index('area-label-hierarchy.js')<index('dashboard-main.js'));
 assert.ok(index('dashboard-main.js')<index('carrollton-school-insights.js'));
 assert.ok(index('carrollton-school-insights.js')<index('tea-peims-public-share-addon.js'));
 assert.equal(index('compact-footnotes.js'),order.length-1,'Footnotes enhance the final rendered DOM without changing school module order');
});
test('CSP forbids inline script and no inline handler introduced',()=>{
 const csp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
 assert.ok(csp?.includes("script-src 'self' https://unpkg.com"));
 assert.ok(csp?.includes("script-src-attr 'none'"));
 assert.equal((html.match(/<script\b/g)||[]).length,scripts.length);
 assert.doesNotMatch(html,/\s(?:onclick|onerror|onload)\s*=/i);
});
