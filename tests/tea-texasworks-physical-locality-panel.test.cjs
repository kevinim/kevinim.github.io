'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const ledger=read('data/tea-texasworks-locality-2026.json');
const records=read('tea-ratings-2026.json').data;
const matrix=read('data/dfw-school-coverage-matrix-2026.json');
const schoolIds=records.filter(r=>r.id.startsWith('061806'));
const sourceURL='https://texasworks.com/learning/landing-page-find-a-campus/';

test('all 41 administrative Denton TEA campus records crosswalk one-to-one to operator locality; preserve TEA source',()=>{
 assert.equal(ledger.schemaVersion,1);
 assert.equal(ledger.districtId,'061806');
 assert.equal(ledger.inventoryCount,41);
 assert.equal(ledger.campuses.length,41);
 assert.equal(schoolIds.length,41);
 assert(schoolIds.every(r=>r.districtCounty==='DENTON'));
 const byId=new Map(schoolIds.map(r=>[r.id,r]));
 assert.equal(new Set(ledger.campuses.map(r=>r.campusId)).size,41);
 for(const row of ledger.campuses){
  assert.match(row.campusId,/^061806\d{3}$/);
  assert.equal(byId.get(row.campusId)?.officialName,row.officialCampusName,row.campusId);
  assert.equal(row.sourceURL,sourceURL);
  assert.match(row.operatorZIP,/^\d{5}$/);
  assert.ok(row.operatorLocation.length>2);
 }
 assert.equal(matrix.districts.find(r=>r.code==='061806')?.teaCampusRecords,41);
 assert.equal(matrix.summary.sourceCampusRows,2182,
  'administrative-county proxy stays unchanged pending a full geolocation audit');
});

test('six local, 34 nonlocal, one alias-pending; never infer residential school assignment',()=>{
 const grouped=Object.groupBy(ledger.campuses,x=>x.locationEvidence);
 const inside=grouped['operator-address-in-11-county-msa']||[];
 const outside=grouped['operator-address-outside-11-county-msa']||[];
 const pending=grouped['pending-exact-name-crosswalk']||[];
 assert.deepEqual([inside.length,outside.length,pending.length],[6,34,1]);
 assert.deepEqual(ledger.counts,{
  operatorAddressIn11CountyMSA:6,operatorAddressOutside11CountyMSA:34,pendingExactCampusCrosswalk:1
 });
 assert.deepEqual(inside.map(r=>r.campusId).sort(),
  ['061806018','061806019','061806020','061806021','061806031','061806032']);
 assert.equal(outside.find(x=>x.campusId==='061806015')?.operatorLocation,'San Juan');
 assert.equal(pending[0].campusId,'061806029');
 assert.equal(pending[0].operatorLocation,'Brownwood / Early');
 assert.match(ledger.evidencePolicy,/not a geocoded entrance/);
 assert.match(ledger.evidencePolicy,/residential attendance assignment/);
 for(const entry of ledger.campuses){
  assert(!('homeAssignment' in entry));
  assert(!('attendancePolygon' in entry));
  assert(!('studentAddress' in entry));
 }
});

test('coverage UI has resilient lazy, validated source evidence and no unsafe HTML injection',()=>{
 const ui=fs.readFileSync(path.join(root,'features/dfw-school-coverage-renderer.js'),'utf8');
 const browser=fs.readFileSync(path.join(root,'scripts/test-dfw-school-coverage-browser.cjs'),'utf8');
 assert.match(ui,/const LOCALITY_FILE='\.\/data\/tea-texasworks-locality-2026\.json'/);
 assert.match(ui,/function validTexasWorks\(extra,district\)/);
 assert.match(ui,/ids\.has\(entry\.campusId\)/);
 assert.match(ui,/entry\.sourceURL!=='https:\/\/texasworks\.com\/learning\/landing-page-find-a-campus\/'/);
 assert.match(ui,/if\(validTexasWorks\(extra,data\.districts\.find/);
 assert.match(ui,/locationEvidence/);
 assert.match(ui,/집 주소의 배정학교/);
 assert(!ui.includes('.innerHTML'),'textContent and DOM nodes only');
 assert.match(browser,/texasworks-physical-locality/);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/\.\/features\/dfw-school-coverage-panel\.js\?v=2/);
});
