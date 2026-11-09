'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const show=(sha,file)=>cp.execFileSync('git',['show',sha+':'+file],{cwd:root,encoding:'utf8'});
// Pin the independently reviewed, already-externalized pre-commute baseline.
// A moving synthetic PR merge parent would accidentally lose byte-for-byte
// checks when unrelated features are merged into main.
const baseline='d94374e74c87d9d58355bdb0755ec6ade88c2818';
const old=show(baseline,'index.html');
const oldJs=show(baseline,'dashboard-main.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'dashboard-main.js'),'utf8');
const external='<script src="./dashboard-main.js?v=3"></script>';
const oldCsp=old.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
const newCsp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
const officialEpaOrigins=' https://www.fueleconomy.gov https://fueleconomy.gov';
const oldWithEpa=oldCsp?.replace('https://hazards.fema.gov;','https://hazards.fema.gov'+officialEpaOrigins+';');
const legacy=show('4f741596a5a594897791d3b931ef39b374bf304e','index.html');
const oldStart=legacy.indexOf("<script>\r\n'use strict'"),oldEnd=legacy.indexOf('</script>',oldStart);
const original=legacy.slice(oldStart+8,oldEnd);
function hash(buf){return crypto.createHash('sha256').update(buf).digest('hex')}
function exactReplacement(input,from,to){
 assert.equal(input.split(from).length,2,'expected exactly one existing anchor: '+from);
 return input.replace(from,to);
}
test('original externalized classic bootstrap remains byte-identical to approved main and inline source',()=>{
 assert.ok(oldStart>40000&&oldEnd>oldStart+70000);
 assert.equal(hash(js),hash(original));
 assert.equal(hash(js),hash(oldJs),'Commute feature must not modify legacy map/school bootstrap');
 assert.ok(js.startsWith("\r\n'use strict';"));
 assert.ok(js.includes('const DATA=['));
 assert.ok(!js.includes('window.WestDFWIntegration'),'No feature logic injected into legacy main');
});
test('strict script CSP unchanged; only two named EPA fetch origins added',()=>{
 assert.ok(oldCsp&&newCsp);
 assert.notEqual(oldWithEpa,oldCsp,'Approved baseline requires the existing FEMA fetch origin');
 assert.equal(newCsp,oldWithEpa,'Only EPA connect-src origins are permitted to change');
 for(const directive of ["script-src-attr 'none'","object-src 'none'","base-uri 'self'","form-action 'self'"])
  assert.ok(newCsp.includes(directive));
 const script=newCsp.split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src '));
 assert.equal(script,"script-src 'self' https://unpkg.com");
 assert.doesNotMatch(script,/unsafe-inline|unsafe-eval|sha256-/);
 assert.doesNotMatch(newCsp,/'sha256-/);
});
test('main HTML unchanged except explicitly approved commute and DFW coverage assets',()=>{
 const style='<link rel="stylesheet" href="./features/commute/sourced-cost.css?v=1">';
 const assetCore='<script src="./features/commute/sourced-cost-core.js?v=1"></script>';
 const assetUI='<script src="./features/commute/sourced-cost-ui.js?v=1"></script>';
 let expected=exactReplacement(old,oldCsp,oldWithEpa);
 expected=exactReplacement(expected,'<script src="./features/theme-toggle.js?v=2"></script>',
    style+'<script src="./features/theme-toggle.js?v=2"></script>');
 expected=exactReplacement(expected,'<script src="./features/area-assessment-core.js?v=3"></script>',
    assetCore+assetUI+'<script src="./features/area-assessment-core.js?v=3"></script>');
 // The following three exact DFW coverage tags are permitted; no changes to
 // extracted map logic, old script integrity, CSP or other markup are accepted.
 const leaflet='<link rel="stylesheet" href="./vendor/leaflet-1.9.4.css">';
 expected=exactReplacement(expected,leaflet,
  leaflet+'\r\n<link rel="stylesheet" href="./features/dfw-school-coverage-panel.css?v=1">');
 const west='<details id="westDfwPanel" aria-label="DFW 서부 학군 및 지역 탐색">';
 expected=exactReplacement(expected,west,`<details id="dfwSchoolCoveragePanel" aria-label="DFW 전체 학군별 학교 배정 안내 연결 현황">
<summary>DFW 전체 학군 연결 현황 · 미연결 사유와 우선순위 보기</summary>
<div id="dfwSchoolCoverageContent" role="region" aria-label="DFW 학군 연결 현황" aria-live="polite">현황표를 불러올 준비가 되었습니다.</div>
</details>
`+west);
 expected=exactReplacement(expected,'</body></html>',
  '<script src="./features/dfw-school-coverage-panel.js?v=1" defer></script></body></html>');
 const actualText=html.replace(/\r\n/g,'\n'),expectedText=expected.replace(/\r\n/g,'\n');
 assert.equal(actualText,expectedText,'Only reviewed EPA/commute and exact DFW school coverage additions may differ from approved baseline');
 assert.equal(html.split(external).length,2);
 const scriptIndex=html.indexOf(external);
 assert.ok(html.indexOf('./plano-finder-live.js')<scriptIndex);
 assert.ok(html.indexOf('./features/commute/workplace-marker.js')>scriptIndex);
 assert.doesNotMatch(external,/\bdefer\b|\basync\b|type=/);
});
test('all application scripts external, no inline executable tags or event handlers in HTML',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 assert.ok(scripts.length>20);
 assert.equal(scripts.filter(s=>!/\bsrc\s*=/.test(s[1])&&s[2].trim()).length,0);
 assert.doesNotMatch(html,/\s(?:onclick|onload|onerror|onchange|onsubmit)\s*=/i);
});
test('existing West DFW / area / schools / risk scripts remain loaded once',()=>{
 for(const asset of ['features/west-dfw/attach.js','features/area-assessment.js',
 'features/resilience/winter-map.js','school-boundary-match.js','home-lookup-v2.js']){
  assert.equal(html.split(asset).length,2,asset);
 }
});
