'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('features/cfb-official-bridge.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const CFB=[
 {district:'CFB',type:'elementary',name:'Carrollton Elementary',ll:[32.98,-96.9]},
 {district:'CFB',type:'middle',name:'Perry Middle School',ll:[32.97,-96.89]},
 {district:'CFB',type:'high',name:'Newman Smith High School',ll:[32.96,-96.91]},
 {district:'FISD',type:'high',name:'Frisco High School',ll:[33.1,-96.8]}
];
function fakeNode(id){
 return {id,value:'',children:[],events:{},textContent:'',
  addEventListener(k,cb){this.events[k]=cb},
  replaceChildren(...children){this.children=children},
  append(...children){this.children.push(...children)},
  appendChild(child){this.children.push(child)},
  click(){this.events.click?.()}
 };
}
function setup(schools=CFB){
 const ids=['cfbOfficialFinderPanel','cfbManualApply','cfbManualReset',
  'cfbOpenInlineFinder','cfbCloseInlineFinder','cfbManualStatus','cfbManualSchoolCards',
  'cfbManualElementary','cfbManualMiddle','cfbManualHigh','homeAddress','homeClear','homeForm'];
 const elements=Object.fromEntries(ids.map(id=>[id,fakeNode(id)]));
 const doc={readyState:'loading',events:{},addEventListener(k,f){this.events[k]=f},
  getElementById(k){return elements[k]},
  createElement(tag){const e=fakeNode('new-'+tag);e.tagName=tag;return e}
 };
 const clicked=[];
 const ctx={document:doc,state:{schools},Option:function(text,value){this.text=text;this.value=value;},
  scoreRecord(){return {rating:'A',score:90}},
  ratingText(){return 'A · 90'},
  schoolClicked(s){clicked.push(s.name)}
 };
 vm.runInNewContext(script,ctx,{timeout:2000});
 doc.events.DOMContentLoaded();
 return {elements,clicked};
}

test('UI is an explicit, labeled user-selected bridge, not a claimed automatic school assignment',()=>{
 assert.match(html,/id="cfbOfficialManualBridge"/);
 assert.match(html,/id="cfbManualElementary"/);
 assert.match(html,/id="cfbManualMiddle"/);
 assert.match(html,/id="cfbManualHigh"/);
 assert.match(html,/features\/cfb-official-bridge\.js\?v=2/);
 assert.doesNotMatch(script,/fetch\(|XMLHttpRequest|\.postMessage\(|localStorage|sessionStorage|document\.querySelector\([^)]*iframe/);
 assert.doesNotMatch(script,/APPROVED_AUTO_DISTRICTS|home\.assignment\s*=|resolveAssignment\(/);
});

test('manual Finder transcription maps only uniquely matched CFB schools, never nearby non-CFB campuses',()=>{
 const {elements:el,clicked}=setup();
 el.cfbOpenInlineFinder.click();
 assert.equal(el.cfbManualHigh.children.length,2,'Only CFB high school must be listed');
 el.cfbManualElementary.value='Carrollton Elementary';
 el.cfbManualMiddle.value='Perry Middle School';
 el.cfbManualHigh.value='Newman Smith High School';
 el.cfbManualApply.click();
 const cards=el.cfbManualSchoolCards.children;
 assert.equal(cards.length,3);
 assert.match(el.cfbManualStatus.textContent,/독립 확인한 결과가 아니라|자동 검증이나/);
 assert.match(cards[0].children[1].textContent,/사용자가 공식 Finder에서 직접 선택한 참고 정보/);
 cards[0].children[2].click();
 assert.equal(clicked[0],'Carrollton Elementary');
});

test('unknown school fails closed, home input invalidates old manual selections',()=>{
 const {elements:el}=setup();
 el.cfbManualElementary.value='Unverified Campus';
 el.cfbManualApply.click();
 assert.equal(el.cfbManualSchoolCards.children.length,0);
 assert.match(el.cfbManualStatus.textContent,/일치하지 않습니다/);
 el.cfbManualElementary.value='Carrollton Elementary';
 el.cfbManualApply.click();
 assert.equal(el.cfbManualSchoolCards.children.length,1);
 el.homeAddress.events.input();
 assert.equal(el.cfbManualSchoolCards.children.length,0);
 assert.equal(el.cfbManualElementary.value,'');
});
