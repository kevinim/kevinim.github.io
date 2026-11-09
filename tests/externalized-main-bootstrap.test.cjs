'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const main=fs.readFileSync(path.join(root,'dashboard-main.js'));
const SCRIPT_SHA='4cd7fe2eee376ed48e2298cbec63cb84f853677a';
function gitBlobSha(buf){
 return crypto.createHash('sha1').update('blob '+buf.byteLength+'\0').update(buf).digest('hex');
}

test('extracted classic JS is byte-for-byte identical to original inline bootstrap Git blob',()=>{
 // Original script was copied as a standalone file with no modifications.
 assert.equal(gitBlobSha(main),SCRIPT_SHA);
 assert.match(main.toString('utf8'),/^(\r?\n)'use strict';/);
 assert.match(main.toString('utf8'),/const DATA=\[/);
 assert.match(main.toString('utf8'),/document\.addEventListener\('DOMContentLoaded'/);
});
test('main HTML has zero executable inline script bodies',()=>{
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
 assert.ok(scripts.length>=20);
 assert.equal(scripts.filter(m=>m[1].trim()).length,0);
});
test('main bootstrap is a classic local script loaded synchronously at the original position',()=>{
 assert.match(html,/<script src="\.\/dashboard-main\.js\?v=1"><\/script>/);
 assert.doesNotMatch(html,/<script[^>]+(?:async|defer|type="module")[^>]*src="\.\/dashboard-main\.js/);
 const script=html.indexOf('src="./dashboard-main.js?v=1"');
 const before=html.indexOf('src="./plano-finder-live.js?v=1"');
 const after=html.indexOf('src="./features/commute/workplace-marker.js?v=1"');
 assert.ok(before>=0 && before<script && script<after);
});
test('existing CSP retained until all inline handlers can migrate safely',()=>{
 assert.match(html,/<meta http-equiv="Content-Security-Policy" content="script-src 'self' https:\/\/unpkg\.com 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'">/);
 assert.ok(/\bonclick\s*=|\bonchange\s*=|\boninput\s*=/.test(html),
   'remaining inline event attributes must be migrated before removing unsafe-inline');
});
test('same-origin source remains actual application entrypoint, not a second separately initialized app',()=>{
 assert.match(html,/<script src="\.\/dashboard-main\.js\?v=1"><\/script>/);
 assert.equal(html.split('dashboard-main.js?v=1').length,2);
 assert.doesNotMatch(html,/<script\s*>\s*['"]use strict['"]/);
});
