'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('features/compact-footnotes.js','utf8');
const css=html;
test('production loads CSP-compatible compact-footnote assets',()=>{
  assert.match(html,/\.footnote-original-hidden/);
  assert.match(html,/features\/compact-footnotes\.js\?v=1/);
  assert.doesNotMatch(js,/\b(eval|new Function)\s*\(/);
});
test('original sources remain available, status and map controls are preserved',()=>{
  assert.match(js,/source\.classList\.add\('footnote-original-hidden'\)/);
  assert.match(js,/source\.classList\.remove\('footnote-original-hidden'\)/);
  assert.match(js,/\.source:not\(\[id\]\)/);
  assert.match(js,/\[role="status"\]/);
  assert.match(js,/\.leaflet-container/);
  assert.match(js,/source\.before\(trigger\)/);
  assert.match(js,/panel\.open = true/);
  assert.match(css,/\.footnote-original-hidden\s*\{\s*display:\s*none\s*!important/);
});
test('dynamic updates, required attribution, mobile and dark are supported',()=>{
  assert.match(html,/© OpenStreetMap contributors/);
  assert.match(js,/MutationObserver/);
  assert.match(js,/#detailContent/);
  assert.match(js,/#homeSchoolInfo/);
  assert.match(js,/copyContent\(source, entry\)/);
  assert.match(css,/html\[data-theme="dark"\] \.footnote-ref/);
  assert.match(css,/@media \(max-width: 720px\)/);
});