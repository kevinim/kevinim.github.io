'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const d=require('../denton-official-zone-references.js');
const ratings=require('../tea-ratings-2026.json').data;
test('39 school-specific 2026-27 Denton PDF source URLs and exact 9-digit TEA IDs',()=>{
 const types={elementary:0,middle:0,high:0},ids=new Set();
 for(const row of d.ROWS){
  assert.ok(!ids.has(row.id),'duplicate zone ID '+row.id);ids.add(row.id);
  assert.ok(ratings.some(x=>x.id===row.id),'TEA campus code missing '+row.id);
  assert.ok(d.validPdf(row.url),'unapproved source URL '+row.id);
  types[row.level]++;
 }
 assert.deepEqual(types,{elementary:26,middle:9,high:4});
 for(const url of Object.values(d.ALL))assert.ok(d.validPdf(url));
 assert.equal(d.YEAR,'2026-27');
});
test('Denton specific PDF link only when exact campus ID and school level agree',()=>{
 const e={district:'061901',type:'elementary',name:'Catherine Bell Elementary School'};
 const found=d.lookup(e,'061901127');
 assert.equal(found.id,'061901127');assert.match(found.url,/BellES-ZoneMap_26-27\.pdf$/);
 assert.equal(found.assignmentVerified,false);assert.equal(found.polygonReady,false);
 assert.equal(d.lookup(e,'061901003').id,null,'high-campus PDF must not be linked for elementary');
 assert.equal(d.lookup(e,null).id,null,'no ID -> full elementary map, not guessed campus');
 assert.match(d.lookup(e,null).url,/AllElementaryMap_26-27\.pdf/);
 assert.equal(d.lookup({...e,district:'CFB'},'061901127'),null);
 assert.equal(d.lookup({...e,type:'other'},'061901127'),null);
});
test('Paloma Creek 2026-27 retired from standard zone, Ginnings unlisted',()=>{
 assert.ok(!d.ROWS.some(x=>x.id==='061901120'),'2025-26 Paloma Creek zone must not be mapped');
 assert.ok(!d.ROWS.some(x=>/ginnings/i.test(x.name)),'Ginnings construction closure cannot inherit old zone');
 const old=d.lookup({district:'061901',type:'elementary'},'061901120');
 assert.equal(old.id,null);assert.match(old.warning,/Paloma Creek/);
});
test('host and path validation refuses cross-district URLs and query injection',()=>{
 for(const url of ['javascript:alert(1)','http://resources.finalsite.net/images/v123/dentonisdorg/a/a.pdf',
  'https://resources.finalsite.net.evil.com/images/v123/dentonisdorg/a/a.pdf',
  'https://resources.finalsite.net/images/v123/anotherisd/a/a.pdf',
  'https://resources.finalsite.net/images/v123/dentonisdorg/a/a.pdf?q=1',
  'https://resources.finalsite.net/images/v123/dentonisdorg/a/../a.pdf',
  'https://resources.finalsite.net/images/v123/dentonisdorg/a/a.pdf%0a'])
  assert.equal(d.validPdf(url),false,url);
});
test('browser-facing module is loaded before main dashboard and has no automatic home assignment',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('index.html','utf8');
 const app=fs.readFileSync('dashboard-main.js','utf8');
 assert.ok(html.includes('<script src="./denton-official-zone-references.js?v=1"></script>'));
 assert.ok(html.indexOf('denton-official-zone-references.js')<html.indexOf('dashboard-main.js'));
 assert.ok(html.includes('id="dentonPdfZoneDirectory"'));
 assert.match(html,/GIS와 배정 미인증/);
 assert.ok(app.includes('L.map('),'existing map bootstrap remains present');
 const gate=require('../features/conditional-school-release.js');
 assert.equal(gate.releaseSummary().currentYearResidentialDistrictApprovals,0);
 assert.ok(!app.includes('denton-polygon-estimate'));
});
