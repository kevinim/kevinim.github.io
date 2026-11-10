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
 s=replaceOnce(s,"비교함은 이 화면을 닫거나 새로고침하면 지워집니다. 주소 검색: © Esri.","비교함은 이 화면을 닫거나 새로고침하면 지워집니다. 주소 검색: © Esri. 외부 서비스의 접속 기록 및 보존 기간은 이 사이트에서 통제하지 않습니다. 사적인 정보나 비밀번호를 입력하지 마세요.");
 s=replaceOnce(s,"<input id=\"destination\" value=\"\" placeholder=\"예: 5000 Legacy Dr, Plano, TX\" autocomplete=\"street-address\">","<input id=\"destination\" value=\"\" placeholder=\"예: 5000 Legacy Dr, Plano, TX\" autocomplete=\"street-address\"><p id=\"destinationPrivacy\" class=\"source\" role=\"note\">목적지 검색을 누르면 입력한 목적지가 OpenStreetMap Nominatim으로, 경로 계산 시 출발지·목적지 좌표가 OSRM으로 전송됩니다. 실제 주거지나 기밀 주소 대신 공개된 사업장·대표 위치를 사용하세요. 이 사이트는 입력값을 자체 서버에 영구 저장하도록 구성되지 않았으나, 외부 서비스의 로그 보존·삭제는 보장할 수 없습니다.</p>");
 // The Conditional GO integration adds exactly one first-party, non-inline
 // fail-closed policy script. All other HTML remains hash-pinned to baseline.
 s=replaceOnce(s,'<script src="./school-zone-ui.js?v=1"></script>',
  '<script src="./school-zone-ui.js?v=1"></script>\r\n<script src="./features/conditional-school-release.js?v=1"></script>');
 // One separately reviewed Agent05 CSS link; no other HTML baseline differences are allowed.
 s=replaceOnce(s,'<link rel="stylesheet" href="./features/theme-toggle.css?v=1">',
  '<link rel="stylesheet" href="./features/theme-toggle.css?v=1"><link rel="stylesheet" href="./features/map-control-contrast.css?v=1"><link rel="stylesheet" href="./features/track-b-reference-warning.css?v=1">');
 // Exactly this publisher source, privacy sentence and same-origin script.
 s=replaceOnce(s,'https://geocode.arcgis.com https://nominatim.openstreetmap.org',
  'https://geocode.arcgis.com https://iisd1.maps.arcgis.com https://services.arcgis.com https://nominatim.openstreetmap.org');
 s=replaceOnce(s,'주소 검색: © Esri. 외부 서비스의',
  '주소 검색: © Esri. Dallas 참고 GIS 버튼을 누르면 선택한 좌표만 Dallas ISD ArcGIS 원본 서비스에 전송하며 결과 도형은 현재 브라우저에서만 표시합니다. Irving 참고 GIS 버튼을 누르면 집 핀 좌표만 Irving ISD 연계 ArcGIS 서비스에 전송되며 이 사이트는 경계 결과를 저장하지 않습니다. 외부 서비스의');
 s=replaceOnce(s,'<script src="./home-lookup-v2.js?v=15"></script>',
  '<script src="./irving-official-spatial.js?v=1"></script><script src="./dallas-attendance-live.js?v=1"></script><script src="./home-lookup-v2.js?v=15"></script>');
 s=replaceOnce(s,'<label class="check"><input type="checkbox" id="referenceBoundaryOverlay"> 과거 GIS 참고 경계선 표시</label></div>',
  '<label class="check"><input type="checkbox" id="referenceBoundaryOverlay"> 과거 GIS 참고 경계선 표시</label></div><p class="reference-gis-global-warning" role="note"><strong>지도 경계는 학교 배정 확정 정보가 아닙니다.</strong> 연도가 오래되거나 현행성이 확인되지 않은 GIS는 참고용입니다. 입학·배정은 반드시 해당 학군의 공식 주소 검색기에서 확인하세요.</p>');
 s=replaceOnce(s,"<h2>학교 배정구역 (자동 연결)</h2>\r\n","<h2>학교 배정구역 (자동 연결)</h2>\r\n<details id=\"dentonPdfZoneDirectory\" class=\"small-note\">\n <summary><strong>Denton ISD 2026–27 공식 학교별 PDF 경계 지도 39개</strong> · GIS와 배정 미인증</summary>\n <p class=\"source\" role=\"note\"><strong>주의 · 공식 PDF 참고 지도입니다.</strong> 학교별 원본 PDF는 공개돼 있으나 이 대시보드에 현행 학교별 GIS 도형이 연결됐다는 뜻이 아닙니다. 실제 거주지의 배정학교와 2026–27 예외는 공식 School Locator로 확인해야 합니다.</p>\n <label for=\"dentonPdfCampusSelect\">초등 26 · 중등 9 · 고등 4 학교별 공식 지도 선택</label>\n <select id=\"dentonPdfCampusSelect\" aria-label=\"Denton 학교별 공식 2026–27 PDF 지도\"></select>\n <a class=\"cardlink\" id=\"dentonPdfCampusLink\" hidden target=\"_blank\" rel=\"noopener noreferrer\"></a>\n <a class=\"cardlink\" href=\"https://webquery-2-denton-tx.etstack.io/\" target=\"_blank\" rel=\"noopener noreferrer\">Denton 공식 School Locator ↗</a>\n <a class=\"cardlink\" href=\"https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27\" target=\"_blank\" rel=\"noopener noreferrer\">2026–27 변경 안내 ↗</a>\n</details>\n");
 s=replaceOnce(s,'<script src="./school-boundary-match.js?v=3"></script>',
  '<script src="./school-boundary-match.js?v=3"></script>\n<script src="./denton-official-zone-references.js?v=1"></script>');
 s=replaceOnce(s,"<script src=\"./denton-official-zone-references.js?v=1\"></script>","<script src=\"./denton-official-zone-references.js?v=1\"></script>\n<script src=\"./denton-campus-point-quality.js?v=1\"></script>\n<script src=\"./features/denton-campus-marker-info.js?v=1\"></script>");
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
 s=replaceOnce(s,"L.map(\'map\',{zoomControl:true,preferCanvas:true}).setView",
  "L.map(\'map\',{zoomControl:true,preferCanvas:true,zoomAnimation:false}).setView");
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
 const conditional='./features/conditional-school-release.js?v=1';
 assert.equal(html.split(conditional).length,2,'conditional school policy is loaded exactly once');
 assert.ok(html.indexOf('./school-zone-ui.js?v=1')<html.indexOf(conditional));
 assert.ok(html.indexOf(conditional)<html.indexOf('./home-lookup-v2.js?v='));
 const scriptIndex=html.indexOf(external);
 assert.ok(html.indexOf('./plano-finder-live.js')<scriptIndex);
 assert.ok(html.indexOf('./features/commute/workplace-marker.js')>scriptIndex);
});
test('strict script CSP preserved exactly and personal office artifacts absent',()=>{
 const allowed=oldCsp.replace('https://geocode.arcgis.com https://nominatim.openstreetmap.org',
  'https://geocode.arcgis.com https://iisd1.maps.arcgis.com https://services.arcgis.com https://nominatim.openstreetmap.org');
 assert.equal(newCsp,allowed,'Irving ArcGIS exact origin is the only allowed new CSP endpoint');
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
 'features/dfw-school-coverage-panel.js','irving-official-spatial.js','dallas-attendance-live.js']){
  assert.equal(html.split(name).length,2,name);
 }
});
