'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ROWS,DEFAULT_ZIPS,uniqueCandidates,buildColumn,pct,dollars}=require('../features/region-compare-core.js');
const assessment=require('../features/area-assessment-core.js');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const regions=read('dfw-demographics.json').data;
const crime=read('data/dfw-crime-zip-cities-2023-2025.json');
const noaa=read('data/area-noaa-counts-2024-2025.json');
const county=read('county-scopes.json');
const zip=z=>regions.find(d=>d.z===z);
const build=z=>buildColumn(zip(z),{crime,noaa,county,assessment,hasDestination:false});
test('three default regions are distinct and included in sourced ZIP data',()=>{
 assert.deepEqual(DEFAULT_ZIPS,['75013','75034','75093']);
 assert.ok(DEFAULT_ZIPS.every(z=>zip(z)));
 assert.deepEqual(uniqueCandidates(['75013','75013','75034'],regions.map(d=>d.z)),['75013','75034']);
 assert.deepEqual(uniqueCandidates(['99999','75034'],regions.map(d=>d.z)),['75034','75013']);
 assert.equal(ROWS.length,10);
});
test('ACS 2024 demographics and rates display correct original units',()=>{
 const a=build('75013');
 assert.equal(a.rows.population.value,zip('75013').pop.toLocaleString('en-US'));
 assert.match(a.rows.kids.value,/^\d+\.\d%$/);
 assert.equal(a.rows.income.value,'$'+zip('75013').income.toLocaleString('en-US'));
 assert.match(a.rows.asian.value,/한국계.*인도계.*중국계/);
 assert.equal(pct(null),'자료 없음');
 assert.equal(dollars(NaN),'자료 없음');
});
test('FBI city-level data never pretends to be a ZIP safety rating',()=>{
 const expected={75013:'Allen',75034:'Frisco',75093:'Plano',75006:'Carrollton'};
 for(const [z,city] of Object.entries(expected)){
  const c=build(z);
  assert.match(c.rows.violent.note,new RegExp(city+' 시 전체'));
  assert.match(c.rows.property.note,/FBI 2025/);
  assert.match(c.rows.violent.value,/건 \/ 10만 명/);
 }
 const mixed=build('75056');
 assert.equal(mixed.rows.violent.value,'확인 필요');
 assert.match(mixed.rows.violent.note,/여러 관할/);
});
test('NOAA county totals remain identical across ZIPs sharing Collin; no address risk inferred',()=>{
 const a=build('75013'),b=build('75034'),c=build('75093');
 assert.equal(a.rows.weather.value,b.rows.weather.value);
 assert.equal(b.rows.weather.value,c.rows.weather.value);
 for(const col of [a,b,c]){
   assert.match(col.rows.weather.note,/Collin County/);
   assert.match(col.rows.weather.note,/ZIP 위험도 아님/);
 }
 const carrollton=build('75006');
 assert.match(carrollton.rows.weather.note,/Dallas County/);
});
test('schools are only campus-location facts; commute only user-computed for current destination',()=>{
 const d=zip('75013');
 const absent=buildColumn(d,{assessment});
 assert.equal(absent.rows.school.value,'확인 필요');
 assert.equal(absent.rows.commute.value,'직접 계산 필요');
 const present=buildColumn(d,{assessment,school:{status:'available',count:14,ab:9,rated:11},commute:19.4,hasDestination:true});
 assert.equal(present.rows.school.value,'A/B 9곳 · 소재 14곳');
 assert.equal(present.rows.commute.value,'19분');
 assert.match(present.rows.school.note,/주소|ZIP 내 위치/);
});
test('responsive UI is independent from home candidate comparison and preserves script CSP',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','features/region-compare-renderer.js'),'utf8');
  const loader=fs.readFileSync(path.join(__dirname,'..','features/region-compare.js'),'utf8');
  assert.equal(require('node:child_process').execFileSync('git',['hash-object','features/region-compare-renderer.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8'}).trim(),
   '5e45b2e8d10f440626afe1bdaf7748f23131deeb','ZIP comparison renderer must remain byte-identical to audited baseline');
  assert.match(loader,/const RENDERER='\.\/features\/region-compare-renderer\.js\?v=1'/);
  assert.match(loader,/section\.addEventListener\('toggle'/);
  assert.doesNotMatch(loader,/\.innerHTML|localStorage|sessionStorage|fetch\(/);
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'..','features/region-compare.css'),'utf8');
 for(const script of ['./features/region-compare-core.js?v=1','./features/region-compare.js?v=1'])
   assert.ok(html.includes(script),'missing source '+script);
 assert.ok(html.includes('./features/region-compare.css?v=1'));
 assert.match(html,/script-src-attr 'none'/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|document\.cookie|schoolGroup\.clearLayers|map\.setView|map\.fitBounds/);
 assert.ok(source.includes('main.before(section)')||source.includes('quick.after(section)'));
 assert.ok(css.includes('overflow-x:auto'));
 assert.ok(fs.readFileSync(path.join(__dirname,'..','candidate-compare.js'),'utf8').includes('function addCandidate('));
});
