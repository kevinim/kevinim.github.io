'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {INPUTS,OUTPUT,render}=require('../scripts/build-first-render-css.cjs');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('first-render CSS is the exact ordered source concatenation',()=>{
 const actual=fs.readFileSync(path.join(root,OUTPUT),'utf8');
 assert.equal(actual,render());
 assert.equal(INPUTS.length,6);
 for(const p of INPUTS)assert.ok(actual.includes('/* SOURCE: '+p+' */'),p);
});
test('six individual render-blocking stylesheets become exactly one linked asset',()=>{
 assert.equal(html.split('./features/first-render-ui.bundle.css?v=2').length-1,1);
 for(const p of INPUTS)
  assert.equal(html.includes('href="./'+p+'?v=1"'),false,'Old CSS link still loaded: '+p);
 const links=[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)];
 assert.ok(links.length>=7);
 assert.equal(links.length,10,'Expected five fewer render-blocking CSS links than 15');
});
test('style bundle remains safe with no relative imports or remote assets',()=>{
 const compiled=render();
 assert.doesNotMatch(compiled,/@import\b|@charset\b|url\s*\(/i);
 assert.match(compiled,/html\[data-theme="dark"\] \.maphead/);
 assert.match(compiled,/\.reference-gis-warning/);
 assert.match(compiled,/\.home-reference-control/);
 assert.match(compiled,/@media\(max-width:720px\)/);
 assert.match(compiled,/\.smart-commute-panel/);
});
