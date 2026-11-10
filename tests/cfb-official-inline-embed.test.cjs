'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('features/cfb-official-inline.js','utf8');
const css=fs.readFileSync('features/cfb-official-inline.css','utf8');
const FINDER='https://app.guidek12.com/carrolltonfarmersbranchtx/school_search/current/';

test('official source embedded only in one opt-in responsive panel',()=>{
 assert.equal(html.split('id="cfbOfficialFinderPanel"').length-1,1);
 assert.equal(html.split('id="cfbOpenInlineFinder"').length-1,1);
 assert.equal(html.split('id="cfbLoadInlineFinder"').length-1,1);
 assert.match(html,/<section class="panel cfb-inline-panel"[^>]* hidden>/);
 assert.match(html,/<script src="\.\/features\/cfb-official-inline\.js\?v=1" defer><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\.\/features\/cfb-official-inline\.css\?v=1">/);
 assert.doesNotMatch(html,/<iframe\b/i,'No automatic third-party iframe load in page markup');
 assert.match(css,/\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(max-width:720px\)/);
});

test('security: main allows only one vendor frame; reviewed page remains no frames',()=>{
 const csp=html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1]||'';
 assert.match(csp,/(?:^|;) frame-src https:\/\/app\.guidek12\.com;/);
 assert.doesNotMatch(csp,/frame-src[^;]*\*/);
 assert.match(fs.readFileSync('reviewed.html','utf8'),/frame-src 'none'/);
 assert.match(html,/CFB 학교별 검증 GIS 폴리곤이 연결되지 않았으며/);
 assert.equal(require('../features/conditional-school-release.js').releaseSummary().currentYearResidentialDistrictApprovals,0);
});

test('runtime: no third-party load before button click, no geocoded address passed',()=>{
 function element(id){
  return {id,hidden:id==='cfbOfficialFinderPanel',disabled:false,events:{},children:[],
   addEventListener(event,fn){this.events[event]=fn},
   focus(){this.focused=true},
   scrollIntoView(){this.scrolled=true},
   appendChild(child){this.children.push(child)},
   replaceChildren(){this.children=[]},
   querySelector(sel){return this.children.find(x=>x.tagName===sel)||null}
  };
 }
 const ids=['cfbOfficialFinderPanel','cfbOpenInlineFinder','cfbLoadInlineFinder',
  'cfbCloseInlineFinder','cfbInlineFinderFrameHost','cfbInlineFinderStatus'];
 const elements=Object.fromEntries(ids.map(id=>[id,element(id)]));
 const doc={readyState:'loading',events:{},addEventListener(event,fn){this.events[event]=fn},
  getElementById(id){return elements[id]},
  createElement(tag){return {tagName:tag,attrs:{},setAttribute(k,v){this.attrs[k]=v}}}};
 vm.runInNewContext(source,{document:doc},{timeout:2000});
 assert.equal(elements.cfbInlineFinderFrameHost.children.length,0);
 doc.events.DOMContentLoaded();
 elements.cfbOpenInlineFinder.events.click();
 assert.equal(elements.cfbOfficialFinderPanel.hidden,false);
 assert.equal(elements.cfbInlineFinderFrameHost.children.length,0,'opening panel itself must not contact vendor');
 elements.cfbLoadInlineFinder.events.click();
 assert.equal(elements.cfbInlineFinderFrameHost.children.length,1);
 const frame=elements.cfbInlineFinderFrameHost.children[0];
 assert.equal(frame.src,FINDER);
 assert.equal(new URL(frame.src).search,'');
 assert.equal(frame.attrs.referrerpolicy,'no-referrer');
 assert.match(frame.attrs.sandbox,/allow-scripts/);
 assert.equal(elements.cfbLoadInlineFinder.disabled,true);
 elements.cfbLoadInlineFinder.events.click();
 assert.equal(elements.cfbInlineFinderFrameHost.children.length,1,'duplicate click must not create another iframe');
 elements.cfbCloseInlineFinder.events.click();
 assert.equal(elements.cfbOfficialFinderPanel.hidden,true);
 assert.equal(elements.cfbInlineFinderFrameHost.children.length,0);
 assert.equal(elements.cfbLoadInlineFinder.disabled,false);
});
