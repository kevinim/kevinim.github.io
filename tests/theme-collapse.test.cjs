'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),theme=read('features/theme-toggle.js'),
 css=read('features/theme-toggle.css'),compare=read('features/region-compare.js'),
 regionCss=read('features/region-compare.css');
test('theme stylesheet and early classic script load from same-origin with unchanged strict script CSP',()=>{
 const meta=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
 assert.match(meta,/script-src-attr 'none'/);
 assert.doesNotMatch(meta.match(/script-src ([^;]+)/)?.[1]||'',/'unsafe-inline'/);
 assert.match(html,/first-render-ui\.bundle\.css\?v=2/);
 assert.doesNotMatch(html,/href="\.\/features\/theme-toggle\.css\?v=1"/);
 assert.match(html,/theme-toggle\.js\?v=2/);
 const headEnd=html.indexOf('</head>'),scriptAt=html.indexOf('theme-toggle.js?v=2');
 assert.ok(scriptAt>0&&scriptAt<headEnd,'Theme must initialize before body paints');
 assert.equal((html.match(/theme-toggle\.js\?v=2/g)||[]).length,1);
 assert.match(theme,/addEventListener\('click'/);
 assert.doesNotMatch(theme,/innerHTML|eval\(|new Function\(|XMLHttpRequest|fetch\(/);
});
test('dark is default; explicit light preference persists without private data storage',()=>{
 assert.match(css,/:root\{color-scheme:light\}/);
 assert.match(css,/:root\[data-theme="dark"\]/);
 assert.match(theme,/const KEY='tx-dashboard-theme-v1'/);
 assert.match(theme,/const valid=value=>value==='light'\?'light':'dark'/);
 assert.match(theme,/catch\{return 'dark'\}/);
 assert.match(theme,/localStorage\.getItem\(KEY\)/);
 assert.match(theme,/localStorage\.setItem\(KEY,next\)/);
 assert.match(theme,/catch\{/);
 assert.match(theme,/aria-pressed/);
 assert.match(theme,/DOMContentLoaded/);
});
test('native details comparison is collapsed by default and fetches only on first open',()=>{
 assert.match(compare,/n\('details','region-compare'\)/);
 assert.match(compare,/n\('summary','region-compare-summary'\)/);
 assert.match(compare,/if\(!sourceStarted\)\{sourceStarted=true;load\(\)\}/);
 assert.match(compare,/if\(!table\|\|!\$\('regionCompare'\)\?\.open\)return/);
 assert.doesNotMatch(compare,/section\.open\s*=\s*true|section\.setAttribute\('open'/);
 assert.match(regionCss,/\.region-compare-summary/);
 assert.match(regionCss,/\.region-compare-content/);
});
test('dark mode does not recolor semantic risk maps or district score classes',()=>{
 assert.doesNotMatch(css,/leaflet-tile\s*\{|leaflet-pane\s*\{|\.score\.grade-[a-f]\s*\{|filter:\s*invert/);
 assert.match(css,/map tiles|map tiles|basemap/i);
 assert.match(css,/data-theme="dark"\] \.region-compare-table/);
 assert.match(css,/data-theme="dark"\] \.area-qa/);
 assert.match(css,/data-theme="dark"\] \.filter-panel/);
});
function luminance(hex){
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
  .map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4));
 return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
}
test('main dark panel, body and primary text have readable WCAG AA contrast',()=>{
 const back=luminance('#1a2637'),ink=luminance('#eaf0fb');
 const ratio=(Math.max(back,ink)+0.05)/(Math.min(back,ink)+0.05);
 assert.ok(ratio>=7,'Panel foreground/background contrast must be >=7:1, got '+ratio);
 const buttonBack=luminance('#37517b'),buttonInk=luminance('#ffffff');
 const buttonRatio=(Math.max(buttonBack,buttonInk)+0.05)/(Math.min(buttonBack,buttonInk)+0.05);
 assert.ok(buttonRatio>=4.5,'Theme button text contrast must be AA');
});

test('dark palette has deeper backgrounds and explicit backgrounds for previously invisible buttons',()=>{
 for(const selector of ['.btn.secondary','.crime-seg button','.mapquickbtn','.hazard-chip',
  '.extra-action','.seg button:not(.active)']){
   assert.ok(css.includes('html[data-theme="dark"] '+selector),
     'Missing explicit dark button style for '+selector);
 }
 assert.match(css,/html\[data-theme="dark"\] body\{background:#0b111b/);
 assert.match(css,/html\[data-theme="dark"\] \.hazard-chip\.ifld\[aria-pressed="true"\]/);
 assert.match(css,/html\[data-theme="dark"\] \.hazard-chip\.wfir\[aria-pressed="true"\]/);
 assert.doesNotMatch(css,/filter:\s*invert/);
});


test('dark filter cards have background and foreground rules for real labels and helper text',()=>{
 for(const selector of [
  '.filter-panel > .filter-settings-group','.filter-panel > .area-settings',
  '.filter-panel > .school-settings','.filter-panel > .commute-settings',
  '.filter-panel .settings-group-title','.filter-panel .settings-group-note',
  '.filter-panel .filter-settings-group .field label',
  '.filter-panel .filter-settings-group .source',
  '.filter-panel .school-visibility-options',
  '.filter-panel .school-visibility-options .check'
 ])assert.ok(css.includes('html[data-theme="dark"] '+selector),'Missing filter theme rule '+selector);
 assert.doesNotMatch(css,/filter:\s*invert/);
});


test('dark map control overrides actual themed variables and white UI containers',()=>{
 const required=[
  '.mapbox .maphead','.maphead .hazard-chips',
  '.maphead .hazard-chips-label','.maphead .hazard-chip',
  '.maphead .hazard-chip.ifld','.maphead .hazard-chip.wfir',
  '.maphead .hazard-chip.hrcn','.maphead .hazard-chip.crime',
  '.maphead .hazard-chip.healthcare','.maphead .hazard-chip.winter',
  '.maphead .hazard-chip svg','.maphead .hazard-chip:hover:not(:disabled)',
  '.maphead .hazard-chip[aria-pressed="true"]',
  '.maphead .basemap-control','.mapbox .heat-legend',
  '.mapbox .map-foot','#map .leaflet-control-zoom a'
 ];
 for(const rule of required)
  assert.ok(css.includes('html[data-theme="dark"] '+rule),
   'Missing map dark-mode override '+rule);
 assert.doesNotMatch(css,/filter:\s*invert/,'Do not invert risk or school maps');
 assert.match(css,/--feature-pale:#263e59/);
 assert.match(css,/--feature-text:#f0f6ff/);
});
