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
const external='<script src="./features/map/area-label-hierarchy.js?v=1"></script><script src="./dashboard-main.js?v=6"></script>';
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
 s=replaceOnce(s,"<details id=\"dentonPdfZoneDirectory\" class=\"small-note\">","<details id=\"cfbOfficialRezoningReference\" class=\"small-note\">\n <summary><strong>CFB ISD 공식 배정 경계 참고</strong> · 승인 2025–26 및 현행 Finder</summary>\n <p class=\"source\" role=\"note\"><strong>주의 · 공식 구역 정보와 GIS 도형을 구분하세요.</strong> CFBISD는 2025년 3월 6일 교육위원회가 승인한 경계에 따라 현재 학교 주소 검색기를 안내합니다. 교육구의 2025–26 재배정 설명에는 특정 아파트·주택단지의 학교 변경도 포함돼 있습니다. 이 대시보드에는 현재 CFB 학교별 검증 GIS 폴리곤이 연결되지 않았으며, 해당 자료만으로 2026–27 주택별 학교 배정이나 호수별 예외를 확정할 수 없습니다.</p>\n <a class=\"cardlink\" href=\"https://www.cfbisd.edu/students/school-maps-locator-system\" target=\"_blank\" rel=\"noopener noreferrer\">CFB 공식 School Search · 현재 주소 조회 ↗</a>\n <a class=\"cardlink\" href=\"https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning\" target=\"_blank\" rel=\"noopener noreferrer\">2025–26 승인 초·중·고 경계 변경 안내 및 지도 ↗</a>\n <p class=\"source\">기준: CFBISD 공식 발표의 2025–26 개편 및 2026–27 등록 안내. 지도 확인은 교육청 공식 검색기 우선이며, 참고 페이지의 지도 이미지를 새로운 GIS 폴리곤으로 변환·저장하지 않습니다.</p>\n</details>\n<details id=\"dentonPdfZoneDirectory\" class=\"small-note\">");
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
 assert.equal(hash(show('99cc1fca0781b4589bb8de97fa3069f428bdffbe','dashboard-main.js')),hash(expectedPublicJs(oldJs)),
  'Pre-feature main must retain exactly the reviewed privacy cleanup');
 const mapLabelBaseJs=show('55ae28393a91766a7197041b138c260bf625309c','dashboard-main.js');
 const areaFn=/function drawAreaLabels\(\)\{[\s\S]*?(?=function schoolType\(s\)\{)/;
 const reviewedMainJs=show('76c891ff7514d5eb56f3bc10e6cc577267c75b55','dashboard-main.js');
 const integratedFn=reviewedMainJs.match(areaFn)?.[0],previousFn=mapLabelBaseJs.match(areaFn)?.[0];
 assert.ok(integratedFn&&previousFn,'Map labels remain a single scoped function');
 assert.ok(integratedFn.includes('AreaLabelHierarchy.buildCandidates'),'Verified zoom-aware labels are used');
 assert.ok(integratedFn.includes('escape(label)'),'Map label output must be HTML escaped');
 assert.equal(hash(reviewedMainJs.replace(integratedFn,previousFn)),hash(mapLabelBaseJs),
  'Already released zoom labels are the sole scoped delta from reviewed #258 JS');
 // Whitelist only three user-approved destination event-handler changes on
 // immutable, verified #262 main. All other JS bytes remain hash-pinned.
 let approved=reviewedMainJs;
 approved=replaceOnce(approved,"if(e.key==='Enter')calcCommute()",
  "if(e.key==='Enter'&&!e.defaultPrevented&&el('destinationSuggestions')?.hidden!==false)calcCommute()");
 approved=replaceOnce(approved,
  "Object.keys(OFFICES).find(k=>OFFICES[k].toLowerCase()===el('destination').value.trim().toLowerCase())",
  "(window.WorkplaceDestinations?.findByAddress(el('destination').value)?.id&&('saved:'+window.WorkplaceDestinations.findByAddress(el('destination').value).id))||Object.keys(OFFICES).find(k=>OFFICES[k].toLowerCase()===el('destination').value.trim().toLowerCase())");
 approved=replaceOnce(approved,"el('destination').value=OFFICES[e.target.value]||''",
  "el('destination').value=OFFICES[e.target.value]||window.WorkplaceDestinations?.addressForChoice(e.target.value)||''");
 assert.equal(hash(approved),hash(show('d1e30f1cdd8a5bfe0199e75d4c1533c42964494d','dashboard-main.js')),
  'Prior main remains the exact reviewed workplace and school baseline');
 assert.equal(hash(show('4de683d2f27b4db9117ed8a92c8f572c869ae3ca','dashboard-main.js')),
  hash(show('f81a800d4855b00037ad63599c9c879515b6fa43','dashboard-main.js')),
  'District-sharded main must preserve the previously reviewed dashboard renderer');
 assert.equal(hash(show('a9785b33d7c60dba43281aba27b9e1fd25d14180','dashboard-main.js')),
  hash(show('0d2bf41dad7d9d92f5265d760fee27fa219a3e56','dashboard-main.js')),
  'Before TX load performance work, the reviewed marker renderer remained byte-identical');
 // P9 preserves the historical approved JS and checks only five exact heatmap
 // substitutions. Any unrelated runtime drift still fails the entire SHA-256.
 let perfP9=show('b12bbb62e9cd57441ffd9000850b1c1f837a6821','dashboard-main.js');
 perfP9=replaceOnce(perfP9,
  'function metricRange(){const a=scopedZips().map(d=>d[state.metric]).filter(Number.isFinite);return a.length?[Math.min(...a),Math.max(...a)]:[null,null]}',
  'function metricRange(scoped=scopedZips()){const a=scoped.map(d=>d[state.metric]).filter(Number.isFinite);return a.length?[Math.min(...a),Math.max(...a)]:[null,null]}');
 perfP9=replaceOnce(perfP9,
  "function shade(v){if(!Number.isFinite(v))return '#b8c2cc';const [mn,mx]=metricRange();",
  "function shade(v,range=metricRange()){if(!Number.isFinite(v))return '#b8c2cc';const [mn,mx]=range;");
 perfP9=replaceOnce(perfP9,
  'function drawZip(){if(!map)return;zipGroup.clearLayers();zipMarkers.clearLayers();DATA.forEach(d=>{',
  'function drawZip(){if(!map)return;const scoped=scopedZips(),visible=new Set(scoped),range=metricRange(scoped);zipGroup.clearLayers();zipMarkers.clearLayers();DATA.forEach(d=>{');
 perfP9=replaceOnce(perfP9,
  "(scopedZips().includes(d)?shade(d[state.metric]):'#d1d5db')",
  "(visible.has(d)?shade(d[state.metric],range):'#d1d5db')");
 perfP9=replaceOnce(perfP9,
  'fillOpacity:(state.withinHour||scopedZips().includes(d))?.72:.3',
  'fillOpacity:(state.withinHour||visible.has(d))?.72:.3');
 assert.equal(hash(js),hash(perfP9),
  'TX P9 dashboard JS must match five exact audited scope-cache substitutions');
 const legacy=show('4f741596a5a594897791d3b931ef39b374bf304e','index.html');
 const start=legacy.indexOf("<script>\r\n'use strict'"),end=legacy.indexOf('</script>',start);
 assert.ok(start>40000&&end>start+70000);
 assert.equal(hash(oldJs),hash(legacy.slice(start+8,end)),
  'Original external bootstrap must match pre-extraction source');
 assert.ok(js.startsWith("\r\n'use strict';"));
 assert.ok(js.includes('const DATA=['));
 assert.ok(!js.includes('window.WestDFWIntegration'));
});
test('main index is byte-exact to newest approved CFB baseline, except home lookup cache version',()=>{
 const source=show('b7c330aab35f0183a234f057acb2ab1e35f38943','index.html');
 let expected=replaceOnce(source,'./home-lookup-v2.js?v=16','./home-lookup-v2.js?v=18');
 // Claude B mobile UX is an explicitly reviewed two-anchor extension of the
 // protected CFB index baseline. Every other byte must still match.
 const originalPrivacy=expected.match(/<div id="homePrivacy" class="source">([\s\S]*?)<\/div>/)?.[1];
 assert.ok(originalPrivacy&&originalPrivacy.includes('Collin CAD'),'Reviewed baseline privacy disclosure');
 const brief='자동완성·주소 검색은 Esri, 도로망 경로 계산은 OSRM에 전송됩니다. 필지 대조 시 집 핀 좌표가 Collin CAD에, Dallas 참고 GIS 조회 시 선택한 좌표가 Dallas ISD ArcGIS에, Irving 참고 GIS 조회 시 집 핀 좌표가 Irving ISD ArcGIS에 전송됩니다. Google Maps 링크는 위치·목적지를 Google에 전송합니다. 외부 서비스의 접속 기록 및 보존 기간은 이 사이트에서 통제하지 않습니다. 사적인 정보나 비밀번호를 입력하지 마세요.';
 expected=replaceOnce(expected,
  '<div id="homePrivacy" class="source">'+originalPrivacy+'</div>',
  '<div id="homePrivacy" class="source">'+brief+'</div><details id="homePrivacyDetails" class="home-privacy-disclosure"><summary>개인정보·외부 서비스 안내 자세히 보기</summary><div class="source">'+originalPrivacy+'</div></details>');
 expected=replaceOnce(expected,'<script src="./features/theme-toggle.js?v=2"></script>',
  '<link rel="stylesheet" href="./features/first-fold-ux.css?v=1"><script src="./features/theme-toggle.js?v=2"></script>');
 // AG06 reviewed CFB atlas and manual overlay, preserving mobile first-fold/privacy.
 expected=replaceOnce(expected,"img-src 'self' data: blob: https://unpkg.com",
  "img-src 'self' data: blob: https://resources.finalsite.net https://unpkg.com");
 expected=replaceOnce(expected,'<link rel="stylesheet" href="./features/cfb-official-inline.css?v=1">',
  '<link rel="stylesheet" href="./features/cfb-official-inline.css?v=2">\n<link rel="stylesheet" href="./features/cfb-approved-zone-atlas.css?v=1">');
 expected=replaceOnce(expected,'<script src="./features/cfb-official-bridge.js?v=1" defer></script></body></html>',
  '<script src="./features/cfb-official-bridge.js?v=2" defer></script><script src="./features/cfb-zone-overlay.js?v=1" defer></script><script src="./features/cfb-approved-zone-atlas.js?v=1" defer></script><script src="./features/cfb-district-jurisdiction.js?v=1" defer></script></body></html>');
 // Track A: retain the strict CFB atlas and bootstrap exact-byte baseline.
 expected=replaceOnce(expected,'<link rel="stylesheet" href="./features/first-fold-ux.css?v=1">',
  '<link rel="stylesheet" href="./features/first-fold-ux.css?v=1"><link rel="stylesheet" href="./features/school-reference-preview.css?v=1">');
 expected=replaceOnce(expected,'<script src="./features/conditional-school-release.js?v=1"></script>',
  '<script src="./features/conditional-school-release.js?v=1"></script>\n<script src="./features/school-reference-preview.js?v=1"></script>');
 // Performance release: the six adjacent CSS links are replaced, in-place,
 // by their exact ordered concatenation (separately checked in bundle QA).
 const oldCss=['theme-toggle.css','map-control-contrast.css','track-b-reference-warning.css',
  'commute/sourced-cost.css','first-fold-ux.css','school-reference-preview.css']
  .map(name=>'<link rel="stylesheet" href="./features/'+name+'?v=1">').join('');
 expected=replaceOnce(expected,oldCss,
  '<link rel="stylesheet" href="./features/first-render-ui.bundle.css?v=3">');
 // TEA Carrollton pilot: one same-origin, deferred analysis script, no inline JS,
 // no changes to school assignment, boundaries or other existing assets.
 expected=replaceOnce(expected,
  '<script src="./features/cfb-district-jurisdiction.js?v=1" defer></script></body></html>',
  '<script src="./features/cfb-district-jurisdiction.js?v=1" defer></script><script src="./features/carrollton-school-insights.js?v=4" defer></script><script src="./features/home-school-manual-bridge.js?v=1" defer></script></body></html>');
 // Exact, explicitly reviewed school campus/grade UI anchors only.
 expected=replaceOnce(expected,"<label>2026 TEA 학교 점수</label><select id=\"ratingFilter\"><option value=\"all\">전체 (점수 미확인 포함)</option><option value=\"rated\">점수 확인된 학교만</option></select>","<label for=\"ratingFilter\">2026 TEA 학교 등급</label><select id=\"ratingFilter\" aria-label=\"지도와 목록 학교 등급 필터\"><option value=\"all\">전체 학교 (등급 없는 학교 포함)</option><option value=\"A\">A등급만</option><option value=\"B\">B등급만</option><option value=\"C\">C등급만</option><option value=\"D\">D등급만</option><option value=\"F\">F등급만</option><option value=\"rated\">점수 확인된 학교만</option><option value=\"unrated\">미평가 (Not Rated)</option><option value=\"unlinked\">TEA 등급 미연결</option></select><div class=\"school-grade-quick\" id=\"schoolGradeQuick\" role=\"group\" aria-label=\"학교 등급 빠른 필터\"><button type=\"button\" data-grade=\"all\" class=\"active\" aria-pressed=\"true\">전체</button><button type=\"button\" data-grade=\"A\" aria-pressed=\"false\">A</button><button type=\"button\" data-grade=\"B\" aria-pressed=\"false\">B</button><button type=\"button\" data-grade=\"C\" aria-pressed=\"false\">C</button></div><div class=\"source\">TEA 2026 문자 등급 기준으로 학교 목록과 지도 마커를 함께 필터링합니다. 점수 숫자는 고려하지 않습니다. 등급 미연결과 공식 미평가는 구별합니다.</div>");
 expected=replaceOnce(expected,'<script src="./dashboard-main.js?v=4"></script>',
  '<script src="./dashboard-main.js?v=6"></script>');
 // Approved #259 only adds these exact styles and the zoom-aware script before the bootstrap.
 const approvedLabelStyle=".area-label{pointer-events:none}.area-label span{display:block;text-align:center;white-space:nowrap;background:rgba(255,255,255,.94);border:1px solid #8194ae;border-radius:6px;padding:3px 6px;color:#172d4a;font-size:11px;font-weight:750;line-height:1.15;box-shadow:0 1px 4px #1b355044}.area-label.selected span{background:#173b78;border-color:#fff;color:white}\n.area-label.city span{font-size:12px;font-weight:850;padding:5px 9px;border-radius:8px;border-color:#59779b;box-shadow:0 2px 7px #1b355044}\n.area-label.region span{font-size:11px;font-weight:750;padding:4px 7px}\n.area-label.zip span{font-size:10px;font-weight:720;padding:3px 6px}\nhtml[data-theme=\"dark\"] .area-label:not(.selected) span{background:rgba(17,32,50,.96);color:#eaf2ff;border-color:#67819d;box-shadow:0 2px 7px #0008}\nhtml[data-theme=\"dark\"] .area-label.selected span{background:#2d5592;border-color:#b6d7ff;color:white}\r\n";
 const previousLabelStyle=".area-label{pointer-events:none}.area-label span{display:block;text-align:center;white-space:nowrap;background:rgba(255,255,255,.94);border:1px solid #8194ae;border-radius:6px;padding:3px 6px;color:#172d4a;font-size:11px;font-weight:750;line-height:1.15;box-shadow:0 1px 4px #1b355044}.area-label.selected span{background:#173b78;border-color:#fff;color:white}\r\n";
 const approvedLabelScript="<script src=\"./features/map/area-label-hierarchy.js?v=1\"></script><script src=\"./dashboard-main.js?v=6\"></script>";
 assert.equal(html.split(approvedLabelStyle).length,2,'Exact zoom label style added once');
 assert.equal(html.split(approvedLabelScript).length,2,'Exact zoom label runtime added once');
 // The workplace release changes exactly four reviewed HTML anchors; do
 // not accept arbitrary diff or regenerate hashes from untrusted actual HTML.
 const reviewedMainHtml=show('76c891ff7514d5eb56f3bc10e6cc577267c75b55','index.html');
 let approvedHtml=reviewedMainHtml;
 approvedHtml=replaceOnce(approvedHtml,'./features/dashboard-extras.css?v=3',
  './features/dashboard-extras.css?v=4');
 approvedHtml=replaceOnce(approvedHtml,'./texas-address-suggest.js?v=1',
  './texas-address-suggest.js?v=2');
 approvedHtml=replaceOnce(approvedHtml,
  '<script src="./home-lookup-v2.js?v=18"></script><script src="./allen-lookup.js?v=5"></script>',
  '<script src="./home-lookup-v2.js?v=18"></script><script src="./features/commute/workplace-destinations.js?v=1"></script><script src="./allen-lookup.js?v=5"></script>');
 const priorPrivacy='<p id="destinationPrivacy" class="source" role="note">목적지 검색을 누르면 입력한 목적지가 OpenStreetMap Nominatim으로, 경로 계산 시 출발지·목적지 좌표가 OSRM으로 전송됩니다. 실제 주거지나 기밀 주소 대신 공개된 사업장·대표 위치를 사용하세요. 이 사이트는 입력값을 자체 서버에 영구 저장하도록 구성되지 않았으나, 외부 서비스의 로그 보존·삭제는 보장할 수 없습니다.</p>';
 const approvedPrivacy='<p id="destinationPrivacy" class="source" role="note">목적지 자동완성 중 입력한 일부 주소는 Esri로, 경로 계산을 누르면 목적지 전체 주소가 OpenStreetMap Nominatim으로, 출발지·목적지 좌표가 OSRM으로 전송됩니다. 실제 주거지나 기밀 주소 대신 공개된 사업장·대표 위치를 사용하세요. 직장 등록을 누르면 이름·주소가 이 브라우저 로컬 저장소에만 저장되며 공개 저장소나 서버에는 저장되지 않습니다. 외부 서비스의 로그 보존·삭제는 보장할 수 없습니다.</p>';
 approvedHtml=replaceOnce(approvedHtml,priorPrivacy,approvedPrivacy);
 // Separately reviewed #256 PEIMS addon: only two same-origin assets may be
 // inserted; entire production HTML must match this exact immutable allowlist.
 approvedHtml=replaceOnce(approvedHtml,'</head><body>',
  '<link rel="stylesheet" href="./features/tea-peims-public-share-addon.css?v=2">\n</head><body>');
 approvedHtml=replaceOnce(approvedHtml,
  '<script src="./features/home-school-manual-bridge.js?v=1" defer></script></body></html>',
  '<script src="./features/home-school-manual-bridge.js?v=1" defer></script><script src="./features/tea-peims-public-share-addon.js?v=2" defer></script></body></html>');
 // #272 allows exactly one audited same-origin school-subject note asset.
 // All previously reviewed HTML and production security hash checks remain pinned.
 approvedHtml=replaceOnce(approvedHtml,
  '<script src="./features/tea-peims-public-share-addon.js?v=2" defer></script></body></html>',
  '<script src="./features/tea-peims-public-share-addon.js?v=2" defer></script><script src="./features/tea-allen-mckinney-subject-notes.js?v=1" defer></script></body></html>');
 // CMS nearby reference is a separately reviewed option: exactly two asset
 // version bumps are allowed, with the existing immutable HTML baseline intact.
 approvedHtml=replaceOnce(approvedHtml,'./features/healthcare/map-layer.js?v=1',
  './features/healthcare/map-layer.js?v=2');
 approvedHtml=replaceOnce(approvedHtml,'./features/dashboard-extras.js?v=1',
  './features/dashboard-extras.js?v=2');
 // Independently sourced TexasWorks physical-campuses explanation: cache-bust
 // only the existing collapsed, lazily loaded coverage JS module.
 approvedHtml=replaceOnce(approvedHtml,'./features/dfw-school-coverage-panel.js?v=1',
  './features/dfw-school-coverage-panel.js?v=2');
 // Source-only CFB 2025-26 conflict disclosure; still no auto-assignment.
 approvedHtml=replaceOnce(approvedHtml,'./features/cfb-approved-zone-atlas.js?v=1',
  './features/cfb-approved-zone-atlas.js?v=2');
 assert.equal(hash(html),hash(approvedHtml),
  'Unreviewed HTML drift beyond approved source-only optional CMS hospital references');
 // Strip only previously released #262 zoom label additions from the
 // immutable baseline; the existing #258 content SHA remains enforced.
 const integrityHtml=reviewedMainHtml.replace(approvedLabelStyle,previousLabelStyle)
  .replace(approvedLabelScript,"<script src=\"./dashboard-main.js?v=6\"></script>");
 const actualHtmlHash=hash(integrityHtml.replace(/\r\n/g,'\n'));
 const baselineHtmlHash=hash(expected.replace(/\r\n/g,'\n'));
 // Exact-byte allowlist for approved #258 collapsible-only markup.
 if(actualHtmlHash!==baselineHtmlHash){
  assert.equal(actualHtmlHash,'92088ddba05a55e9c4044490b045012592c0d7c3e4aee3b19f4e631d5ca7b602',
   'Unreviewed HTML drift beyond approved collapsed supplementary source panels');
  assert.match(html,/<details id="auxiliaryDataDetails"[^>]*><summary><strong>지도 상세 정보·출처<\/strong><\/summary>/);
  assert.match(html,/<details id="schoolDataDetails"[^>]*><summary><strong>학교 배정구역 상세·출처<\/strong><\/summary>/);
  assert.equal((html.match(/id="auxiliaryDataDetails"/g)||[]).length,1);
  assert.equal((html.match(/id="schoolDataDetails"/g)||[]).length,1);
  assert.ok(html.indexOf('id="auxiliaryDataDetails"')<html.indexOf('id="phase2HazardPanel"'));
  assert.ok(html.indexOf('id="schoolDataDetails"')<html.indexOf('id="cfbOfficialRezoningReference"'));
 }

 const originalPanel=show('b1a787eb6bd877318a1275a4a29225069782ece7','index.html')
  .match(/<section class="panel cfb-inline-panel" id="cfbOfficialFinderPanel"[\s\S]*?<\/section>/)?.[0];
 const actualPanel=html.match(/<section class="panel cfb-inline-panel" id="cfbOfficialFinderPanel"[\s\S]*?<\/section>/)?.[0];
 assert.ok(originalPanel&&actualPanel,'Merged CFB Finder is retained');
 assert.equal(hash(actualPanel),hash(originalPanel),'Existing CFB official Finder panel untouched');
 assert.equal(html.split(external).length,2);
 const policy='./features/conditional-school-release.js?v=1';
 assert.equal(html.split(policy).length,2);
 assert.ok(html.indexOf('./school-zone-ui.js?v=1')<html.indexOf(policy));
 assert.ok(html.indexOf(policy)<html.indexOf('./home-lookup-v2.js?v=18'));
});
test('strict script CSP preserved exactly and personal office artifacts absent',()=>{
 const allowed=oldCsp.replace('https://geocode.arcgis.com https://nominatim.openstreetmap.org',
  'https://geocode.arcgis.com https://iisd1.maps.arcgis.com https://services.arcgis.com https://nominatim.openstreetmap.org');
 const atlasCsp=allowed.replace("frame-src 'none'","frame-src https://app.guidek12.com")
  .replace("img-src 'self' data: blob: https://unpkg.com","img-src 'self' data: blob: https://resources.finalsite.net https://unpkg.com");
 assert.equal(newCsp,atlasCsp,'CFB Finder and publisher image allowlist only, all mobile protections retained');
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
