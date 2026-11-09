'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const west=require('../features/west-dfw/panel.js');
const districts=require('../district-registry.js');
const meta=JSON.parse(fs.readFileSync('data/west-dfw-districts-2026.json','utf8'));
const idSet=new Set(['220919','220907','061911','220906']);

test('the four western district IDs are official TEA-format and distinct',()=>{
 assert.deepEqual(new Set(meta.districts.map(d=>d.code)),idSet);
 assert.equal(west.validateConfig(meta),meta);
 for(const district of meta.districts){
  const d=districts.districtInfo(district.code);
  assert.ok(d);
  assert.equal(d.zoneKey,null,'do not invent map geometry');
  assert.equal(d.address,null,'cannot pretend to assign a residence automatically');
  assert.equal(d.currency,null,'source year is not proven current for app zone polygon');
  assert.equal(d.official,district.officialUrl);
  assert.equal(district.localSchoolPolygonCount,0);
 }
});
test('all chosen west ZIP shortcuts are source dataset values and cannot be treated as district assignment',()=>{
 const rows=JSON.parse(fs.readFileSync('dfw-demographics.json','utf8')).data;
 const zips=new Set(rows.map(d=>d.z));
 for(const area of meta.areas){
  assert.ok(zips.has(area.zip),'ZIP missing from ACS dataset: '+area.zip);
  assert.match(area.note,/ZIP|district|boundary|Town/);
 }
 assert.equal(meta.areas.length,7);
 assert.ok(meta.areas.some(a=>a.zip==='76262'&&/Westlake/.test(a.label)));
});
test('verified official source links must use HTTPS and exact expected domain',()=>{
 assert.equal(west.safeLink('https://www.nisdtx.org/departments/facilities/attendance-boundaries','www.nisdtx.org'),true);
 for(const url of [
  'http://www.nisdtx.org/departments/facilities/attendance-boundaries',
  'https://www.nisdtx.org.evil.test/',
  'https://attacker@www.nisdtx.org/',
  'https://www.nisdtx.org/?token=secret',
  'javascript:alert(1)'
 ])assert.equal(west.safeLink(url,'www.nisdtx.org'),false,url);
});
test('malformed or forged district JSON fails closed',()=>{
 for(const edit of [
  p=>p.districts.pop(),
  p=>p.districts[0].code='ZZ99',
  p=>p.districts[0].officialUrl='https://bad.test/evil',
  p=>p.districts[0].boundaryStatus='current-polygon-ready',
  p=>p.districts[1].localSchoolPolygonCount=1,
  p=>p.areas[1].zip='99999',
  p=>p.specialSchool.type='automatic-residence-school'
 ]){
  const altered=structuredClone(meta);edit(altered);
  assert.throws(()=>west.validateConfig(altered));
 }
});
test('west school counts include only primary campus type entries for the correct district',()=>{
 assert.equal(west.schoolCount('220919',[
  {district:'220919',type:'elementary'},
  {district:'220919',type:'high'},
  {district:'220919',type:'other'},
  {district:'220907',type:'elementary'}]),2);
});
test('all west TEA district campuses have available historical NCES point candidates',()=>{
 const scores=JSON.parse(fs.readFileSync('tea-ratings-2026.json','utf8')).data;
 const nces=JSON.parse(fs.readFileSync('nces-locations-2024.json','utf8')).data;
 const located=new Map(nces.filter(x=>Array.isArray(x.ll)).map(x=>[x.id,x]));
 for(const id of idSet){
  const records=scores.filter(x=>x.district===id);
  assert.ok(records.length>=10,'district TEA campus rows absent '+id);
  const matched=records.filter(x=>located.has(x.id));
  assert.ok(matched.length>=10,'no source coordinates for '+id);
 }
});
test('Westlake Academy is explicitly charter admissions, not an automatic ZIP assignment',()=>{
 assert.equal(meta.specialSchool.type,'public-charter-not-neighborhood-assignment');
 assert.match(meta.specialSchool.note,/76262/);
 assert.match(meta.specialSchool.officialUrl,/westlakeacademy\.org/);
});
