'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {extractCspMeta,parseDirectives}=require('../scripts/audit-csp-readiness.cjs');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const mainConnect=[
 'https://geocode.arcgis.com',
 'https://iisd1.maps.arcgis.com',
 'https://services.arcgis.com',
 'https://nominatim.openstreetmap.org',
 'https://router.project-osrm.org',
 'https://static.friscoisd.org',
 'https://portal.metrostudygis.com',
 'https://services4.arcgis.com',
 'https://services2.arcgis.com',
 'https://www.infofinderi.com',
 'https://gismaps.cityofallen.org',
 'https://hazards.fema.gov',
 'https://www.fueleconomy.gov',
 'https://fueleconomy.gov'
];
const reviewedConnect=[
 'https://nominatim.openstreetmap.org',
 'https://router.project-osrm.org',
 'https://gismaps.cityofallen.org'
];
const mainImage=[
 'https://resources.finalsite.net',
 'https://unpkg.com',
 'https://tile.openstreetmap.org',
 'https://a.tile.openstreetmap.org',
 'https://b.tile.openstreetmap.org',
 'https://c.tile.openstreetmap.org',
 'https://server.arcgisonline.com',
 'https://gis.texaswildfirerisk.com'
];
const reviewedImage=mainImage.filter(x=>!x.includes('arcgisonline.com')&&!x.includes('texaswildfirerisk.com')&&!x.includes('finalsite.net'));
const get=(name,key)=>{
 const policy=extractCspMeta(read(name))?.value;
 assert.ok(policy,name+' must have source CSP');
 return parseDirectives(policy).get(key);
};
test('index and reviewed CSP expose only enumerated fetch and image origins',()=>{
 for(const [page,connect,img] of [
  ['index.html',mainConnect,mainImage],
  ['reviewed.html',reviewedConnect,reviewedImage]
 ]){
  assert.deepEqual(get(page,'default-src'),["'self'"]);
  assert.deepEqual(get(page,'connect-src'),["'self'",...connect],page+' connect-src drift');
  assert.deepEqual(get(page,'img-src'),["'self'",'data:','blob:',...img],page+' img-src drift');
  assert.deepEqual(get(page,'style-src'),["'self'","'unsafe-inline'",'https://unpkg.com']);
  assert.deepEqual(get(page,'font-src'),["'self'",'data:']);
  assert.deepEqual(get(page,'frame-src'),page==='index.html'?['https://app.guidek12.com']:["'none'"]);
  assert.deepEqual(get(page,'media-src'),["'none'"]);
  assert.deepEqual(get(page,'script-src-attr'),["'none'"]);
  assert.deepEqual(get(page,'object-src'),["'none'"]);
  assert.ok(get(page,'script-src').includes('https://unpkg.com'));
  assert.ok(!get(page,'script-src').includes("'unsafe-inline'"));
  assert.ok(!get(page,'script-src').includes("'unsafe-eval'"));
 }
});
test('all live vendor endpoints remain reachable under index connect-src',()=>{
 const sourceNames=[
  ['home-lookup-v2.js','https://geocode.arcgis.com'],
  ['irving-official-spatial.js','https://iisd1.maps.arcgis.com'],
  ['dallas-attendance-live.js','https://services.arcgis.com'],
  ['texas-address-suggest.js','https://geocode.arcgis.com'],
  ['collin-parcel-check.js','https://services2.arcgis.com'],
  ['plano-finder-live.js','https://services4.arcgis.com'],
  ['official-school-review.js','https://www.infofinderi.com'],
  ['phase2a-nfhl-flood.js','https://hazards.fema.gov'],
  ['features/reviewed-bootstrap.js','https://gismaps.cityofallen.org'],
  ['dashboard-main.js','https://static.friscoisd.org'],
  ['dashboard-main.js','https://portal.metrostudygis.com'],
  ['dashboard-main.js','https://nominatim.openstreetmap.org'],
  ['dashboard-main.js','https://router.project-osrm.org'],
  ['features/commute/sourced-cost-core.js','https://www.fueleconomy.gov']
 ];
 const origins=new Set(get('index.html','connect-src'));
 for(const [file,origin] of sourceNames){
  assert.ok(read(file).includes(origin),file+' endpoint changed without CSP review');
  assert.ok(origins.has(origin),file+' is blocked by connect-src');
 }
});
test('legacy reviewed.html uses narrower but sufficient service origins',()=>{
 const legacy=read('features/reviewed-bootstrap.js'),approved=get('reviewed.html','connect-src');
 for(const origin of reviewedConnect){
  assert.ok(legacy.includes(origin),origin+' missing from active legacy file');
  assert.ok(approved.includes(origin));
 }
 for(const origin of ['https://services2.arcgis.com','https://geocode.arcgis.com','https://hazards.fema.gov'])
  assert.ok(!approved.includes(origin),'legacy page must not gain unnecessary '+origin);
});
test('map tile URLs remain allowed while data APIs are not blanket image hosts',()=>{
 const tiles=[
  ['dashboard-main.js','https://tile.openstreetmap.org'],
  ['dashboard-main.js','https://server.arcgisonline.com'],
  ['txwrap-wildfire-potential.js','https://gis.texaswildfirerisk.com'],
  ['features/reviewed-bootstrap.js','https://{s}.tile.openstreetmap.org']
 ];
 for(const [file,origin] of tiles)assert.ok(read(file).includes(origin),file+' tile URL changed');
 for(const host of ['https://evil.example','http:','https:','*']){
  assert.ok(!get('index.html','connect-src').includes(host));
  assert.ok(!get('reviewed.html','connect-src').includes(host));
  assert.ok(!get('index.html','img-src').includes(host));
 }
});
