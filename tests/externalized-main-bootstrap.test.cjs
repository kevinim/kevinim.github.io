'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const show=(sha,file)=>cp.execFileSync('git',['show',sha+':'+file],{cwd:root,encoding:'utf8'});
// Pin reviewed main BEFORE the intentional privacy removal. This guards
// the entire unchanged school/map bootstrap instead of waiving integrity.
const baseline='5a5b3a8fbe1b29ba71797525696d1f092821e6b7';
const old=show(baseline,'index.html'),oldJs=show(baseline,'dashboard-main.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'dashboard-main.js'),'utf8');
const external='<script src="./dashboard-main.js?v=3"></script>';
const oldCsp=old.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
const newCsp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
const hash=buf=>crypto.createHash('sha256').update(buf).digest('hex');
function replaceOnce(source,from,to){
 assert.equal(source.split(from).length,2,'exactly one approved source anchor: '+from.slice(0,90));
 return source.replace(from,to);
}
function replacePatternOnce(source,re,to){
 const matches=[...source.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];
 assert.equal(matches.length,1,'exactly one approved regex anchor: '+re);
 return source.replace(re,to);
}
function expectedPublicHtml(source){
 let s=replaceOnce(source,'<option value="jpm">JPMorgan Chase · Plano</option>','');
 s=replaceOnce(s,'<option value="custom">다른 주소 직접 입력</option>',
  '<option value="custom" selected>다른 주소 직접 입력</option>');
 s=replacePatternOnce(s,/<input id="destination" value="[^"]*"/,
  '<input id="destination" value=""');
 s=replacePatternOnce(s,/<label class="check"><input type="checkbox" id="oneHourOverlay">[\s\S]*?<\/label><div class="source">[^<]*<\/div>/,
  '<input type="checkbox" id="oneHourOverlay" hidden disabled aria-hidden="true"><div class="source">사전 계산된 특정 회사 기준 통근 지도는 제공되지 않습니다. 위 목적지에 주소를 직접 입력하여 경로를 확인하세요.</div>');
 s=replaceOnce(s,'JPM 시간은 ZIP 대표점 기준이고 교통량은 반영하지 않습니다.',
  '통근 시간은 사용자가 선택한 목적지와 ZIP 대표점을 기준으로 계산하며 실시간 교통량은 반영하지 않습니다.');
 // Reviewer-approved Agent01 addition: a single exact Irving ArcGIS tenant
 // origin for OPT-IN coordinate-only lookups. No broader HTTPS permissions.
 s=replaceOnce(s,'https://geocode.arcgis.com https://nominatim.openstreetmap.org',
  'https://geocode.arcgis.com https://iisd1.maps.arcgis.com https://nominatim.openstreetmap.org');
 s=replaceOnce(s,'주소 검색: © Esri.',
  'Irving 공식 GIS 좌표 조회 버튼을 누르면 집 핀 좌표가 Irving ISD가 연결한 ArcGIS 레이어에 전송되며 결과 경계는 현재 브라우저에서만 표시합니다. 정확한 등록학교는 학군 공식 Finder로 확인하세요. 주소 검색: © Esri.');
 s=replaceOnce(s,'<script src="./home-lookup-v2.js?v=15"></script>',
  '<script src="./irving-official-spatial.js?v=1"></script><script src="./home-lookup-v2.js?v=15"></script>');
 return s;
}
function expectedPublicJs(source){
 let s=source;
 const start=s.indexOf("fetch('./jpm-60min-isochrone-");
 const end=s.indexOf("fetch('./data/dfw-mena-ancestry-",start);
 assert.ok(start>5000&&end>start&&end-start<1800,'approved personal fetch section only');
 s=s.slice(0,start)+s.slice(end);
 s=replacePatternOnce(s,/const JPM_ADDRESS='[^']+';\r?\nconst OFFICES=\{jpm:JPM_ADDRESS,/,
  'const OFFICES={');
 s=replacePatternOnce(s,/function savedCommuteFor\(zip\)\{[^\r\n]*\}/,
  'function savedCommuteFor(zip){return null}');
 s=replaceOnce(s,"fetch('./jpm-outside-dfw.json'","fetch('./dfw-outside-public.json'");
 s=replaceOnce(s,'Object.assign(d,outsideData.race[d.z]||{},{jpmMinutes:outsideData.minutes[d.z]??null});',
  'Object.assign(d,outsideData.race[d.z]||{});');
 s=replaceOnce(s,"['JPM 도로망 (교통 미반영)',Number.isFinite(d.jpmMinutes)?d.jpmMinutes+'분':'미확인'],",'');
 s=replaceOnce(s,"state.withinHour?(Number.isFinite(d.jpmMinutes)?(d.jpmMinutes<=60?'#2878ba':'#eef2f5'):'#aab5c0')",
  "state.withinHour?'#aab5c0'");
 s=replaceOnce(s,"JPM 도로망: ${Number.isFinite(d.jpmMinutes)?d.jpmMinutes+'분':'미확인'}",
  '통근 시간: 목적지 검색 후 확인');
 s=s.replaceAll('JPM Plano 도착 · 도로망 추정','통근 지도 · 직접 경로 확인')
  .replaceAll('JPM 도로망 자료 오류','사전 계산 통근 자료 오류')
  .replaceAll('JPM 도착','직장 도착')
  .replaceAll('JPM 시간','사전 계산 통근 시간');
 return s;
}
test('pre-existing dashboard remains byte-exact except approved personal commute removals',()=>{
 assert.equal(hash(js),hash(expectedPublicJs(oldJs)),
  'Unexpected changes in existing map, school, routes or financial calculations');
 const legacy=show('4f741596a5a594897791d3b931ef39b374bf304e','index.html');
 const start=legacy.indexOf("<script>\r\n'use strict'"),end=legacy.indexOf('</script>',start);
 assert.ok(start>40000&&end>start+70000);
 assert.equal(hash(oldJs),hash(legacy.slice(start+8,end)),
  'Original external bootstrap must match pre-extraction source');
 assert.ok(js.startsWith("\r\n'use strict';"));
 assert.ok(js.includes('const DATA=['));
 assert.ok(!js.includes('window.WestDFWIntegration'));
});
test('index changes limited to approved blank destination, hidden precomputed map and neutral text',()=>{
 assert.equal(hash(html.replace(/\r\n/g,'\n')),hash(expectedPublicHtml(old).replace(/\r\n/g,'\n')),
  'Unexpected application HTML modification outside privacy removal');
 assert.equal(html.split(external).length,2);
 const scriptIndex=html.indexOf(external);
 assert.ok(html.indexOf('./plano-finder-live.js')<scriptIndex);
 assert.ok(html.indexOf('./features/commute/workplace-marker.js')>scriptIndex);
});
test('strict script CSP preserved exactly and personal office artifacts absent',()=>{
 const explicitlyReviewed=oldCsp.replace('https://geocode.arcgis.com https://nominatim.openstreetmap.org',
  'https://geocode.arcgis.com https://iisd1.maps.arcgis.com https://nominatim.openstreetmap.org');
 assert.equal(newCsp,explicitlyReviewed,'Only exact district-linked Irving ArcGIS origin is allowed; reject all other CSP changes');
 for(const part of ["script-src-attr 'none'","object-src 'none'","base-uri 'self'","form-action 'self'"])
  assert.ok(newCsp.includes(part));
 assert.ok(newCsp.includes("script-src 'self' https://unpkg.com;"));
 assert.doesNotMatch(newCsp,/unsafe-eval|'sha256-/);
 const all=html+'\n'+js;
 assert.doesNotMatch(all,/\bJPM\b|JPMorgan|JPM_ADDRESS|jpm-|8181\s+Communications|\bjpmMinutes\b/i);
 assert.match(html,/<input id="destination" value=""/);
 assert.ok(html.includes('id="oneHourOverlay" hidden disabled'));
 assert.ok(js.includes("fetch('./dfw-outside-public.json'"));
 assert.ok(!js.includes('fetch(\'./jpm-'));
});
test('HTML has external executable scripts only and no inline handlers',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 assert.ok(scripts.length>20);
 assert.equal(scripts.filter(s=>!/\bsrc\s*=/.test(s[1])&&s[2].trim()).length,0);
 assert.doesNotMatch(html,/\s(?:onclick|onload|onerror|onchange|onsubmit)\s*=/i);
});
test('all school, region and risk modules preserved exactly once',()=>{
 for(const name of ['features/west-dfw/attach.js','features/area-assessment.js',
 'features/resilience/winter-map.js','school-boundary-match.js','home-lookup-v2.js',
 'features/dfw-school-coverage-panel.js','irving-official-spatial.js']){
  assert.equal(html.split(name).length,2,name);
 }
});
