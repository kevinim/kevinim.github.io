'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const html=readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=readFileSync(path.join(__dirname,'../ui-action-buttons.css'),'utf8');
function unique(s,label){const n=html.split(s).length-1;assert.equal(n,1,label+' should occur exactly once');}
function tag(id){const m=html.match(new RegExp('<button\\b[^>]*id="'+id+'"[^>]*>[\\s\\S]*?<\\/button>'));assert.ok(m,'missing button '+id);return m[0];}
for(const id of ['homeSearch','homeClear','addComparison','calcCommute','crimeMapToggle'])unique('id="'+id+'"',id);
for(const id of ['femaHazardEnabled','femaHazardType','hazardMapQuickToggle','schoolOverlay','zipOverlay','oneHourOverlay'])unique('id="'+id+'"',id);
for(const kind of ['ifld','wfir','hrcn'])unique('data-hazard="'+kind+'"',kind);
assert.match(html,/<link rel="stylesheet" href="\.\/ui-action-buttons\.css\?v=1">/);
assert.ok(html.indexOf('ui-action-buttons.css?v=1')>html.indexOf('phase2HazardStyles'),'override stylesheet must load after existing CSS');
for(const [id,text] of [['homeSearch','주소 검색'],
 ['addComparison','집 비교함에 추가'],['calcCommute','자동차 출퇴근 시간 확인']]){
 const button=tag(id);
 assert.match(button,/class="[^"]*action-btn[^"]*"/,id+' style class');
 assert.match(button,/class="action-icon"/,id+' icon');
 assert.match(button,/aria-hidden="true"/,id+' decorative SVG accessibility');
 assert.ok(button.includes('<span>'+text+'</span>'),id+' user label');
}
const clearButton=tag('homeClear');
assert.match(clearButton,/class="home-input-clear"/);
assert.match(clearButton,/type="button"/);
assert.match(clearButton,/aria-label="검색한 주소와 지도 집 표시 지우기"/);
assert.match(clearButton,/hidden>/);
assert.match(clearButton,/aria-hidden="true"/);
assert.match(css,/\.home-address-autocomplete \.home-input-clear\[hidden\]/);
assert.match(css,/\.home-address-autocomplete #homeAddress\{padding-right:54px\}/);
assert.match(html,/<div class="home-address-autocomplete"><input id="homeAddress"[\s\S]*?<button id="homeClear"[\s\S]*?<div id="homeSuggestions"/);
assert.ok(!html.includes('btn secondary action-btn action-clear" type="button"'),'duplicate standalone reset control was not removed');
assert.match(tag('homeSearch'),/type="submit"/);
assert.match(tag('calcCommute'),/type="button"/);
for(const text of ['홍수 위험','산불 위험','폭풍 위험','범죄 정보']){
 assert.ok(html.includes('<span>'+text+'</span></button>'),'map button accessible label '+text);
}
assert.match(tag('crimeMapToggle'),/aria-pressed="false"/);
for(const kind of ['ifld','wfir','hrcn','crime'])assert.ok(css.includes('.maphead .hazard-chip.'+kind),'theme missing '+kind);
assert.match(css,/\.maphead \.hazard-chip\[aria-pressed="true"\]/);
assert.match(css,/\.maphead \.hazard-chip:focus-visible/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(css,/@media\(max-width:540px\)/);
assert.match(html,/<h2 class="feature-heading home">/);
assert.match(html,/<h2 class="feature-heading commute">/);
for(const id of ['zipSelect','metric','heatScope','levels','ratingFilter','zipOverlay','oneHourOverlay',
  'schoolOverlay','historicOverlay','referenceBoundaryOverlay'])unique('id="'+id+'"',id);
const groupStart=html.indexOf('<section class="filter-settings-group school-settings" id="schoolSettings"');
const groupEnd=html.indexOf('</section>',groupStart);
assert.ok(groupStart>0&&groupEnd>groupStart,'school control section must exist');
const schoolMarkup=html.slice(groupStart,groupEnd);
for(const id of ['levels','ratingFilter','schoolOverlay','historicOverlay','referenceBoundaryOverlay']){
  assert.ok(schoolMarkup.includes('id="'+id+'"'),'missing grouped school control '+id);
}
assert.ok(!schoolMarkup.includes('id="oneHourOverlay"'),'commute control should not be in school group');
assert.ok(!schoolMarkup.includes('id="zipOverlay"'),'demographic ZIP overlay should not be in school group');
assert.ok(html.includes('aria-labelledby="schoolSettingsTitle"'),'school group accessible title missing');
assert.match(css,/\.filter-panel \.school-visibility-options/);
assert.match(css,/@media\(max-width:480px\)/);
assert.ok(!html.includes('id="healthcareToggle"'),'do not add dead control for unimplemented features');
assert.ok(!html.includes('id="gridPowerToggle"'),'do not add dead control for unimplemented features');
console.log('UI button quality check PASS — source IDs, labels, icons, state styles, accessibility, responsive CSS');
