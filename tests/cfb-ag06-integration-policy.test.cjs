'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const load=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const html=load('index.html'),count=s=>html.split(s).length-1;
test('AG06 retains CFB atlas, ISD border and AG05 overlay imports exactly once',()=>{
 for(const s of ['./features/cfb-approved-zone-atlas.js?v=1','./features/cfb-district-jurisdiction.js?v=1','./features/cfb-zone-overlay.js?v=1','./features/cfb-official-bridge.js?v=2'])assert.equal(count(s),1,s);
 assert.ok(html.indexOf('cfb-zone-overlay.js')<html.indexOf('cfb-approved-zone-atlas.js'));
});
test('AG03 and AG05 cannot silently approve school-zone geometry',()=>{
 const overlay=require('../features/cfb-zone-overlay.js');
 assert.equal(overlay.getSummary().verified,0);
 assert.equal(overlay.getSummary().automaticAssignmentApproved,false);
 const m=JSON.parse(load('data/cfb-approved-zone-raster-reference-2026.json'));
 assert.equal(m.reconstructedCampusPolygonCount,0);
 assert.equal(m.validForAutomaticResidenceAssignment,false);
 assert.equal(m.rasterReferenceOnly,true);
 assert.match(load('features/conditional-school-release.js'),/APPROVED_AUTO_DISTRICTS/);
});
test('AG01-05 source evidence, isolation and original Allen modules survive',()=>{
 for(const p of ['data/cfb-official-gis-acquisition-2026-11-10.json','scripts/cfb-ag02-georeference-qa.py','scripts/cfb-ag03-reconstruct.py','scripts/cfb-independent-finder-qa.cjs','scripts/test-cfb-zone-overlay-browser.cjs'])assert.ok(fs.existsSync(path.resolve(__dirname,'..',p)),p);
 const bridge=load('features/cfb-official-bridge.js');
 assert.match(bridge,/CFBZoneOverlay\?\.showForSchool/);
 assert.match(bridge,/CFBZoneOverlay\?\.reset/);
 for(const p of ['./allen-lookup.js?v=5','./school-assignment.js?v=6','./features/conditional-school-release.js?v=1','./home-lookup-v2.js?v=17'])assert.equal(count(p),1,p);
 assert.match(html,/frame-src https:\/\/app\.guidek12\.com/);
});
