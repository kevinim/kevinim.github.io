'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const loader=fs.readFileSync(path.join(__dirname,'..','features/dfw-school-coverage-panel.js'),'utf8');
const RENDERER='./features/dfw-school-coverage-renderer.js?v=1';

function setup(){
 const mount={textContent:''},handlers={},scripts=[];
 const panel={open:false,addEventListener(name,fn){handlers[name]=fn}};
 const document={
  readyState:'complete',
  getElementById(id){return id==='dfwSchoolCoveragePanel'?panel:id==='dfwSchoolCoverageContent'?mount:null},
  createElement(tag){
   assert.equal(tag,'script');
   const el={src:'',async:false,removed:false,remove(){this.removed=true}};
   scripts.push(el);return el;
  },
  head:{appendChild(el){assert.ok(scripts.includes(el))}}
 };
 vm.runInNewContext(loader,{document,Promise,Error});
 return {panel,mount,scripts,open(){panel.open=true;handlers.toggle()},close(){panel.open=false;handlers.toggle()}};
}
test('collapsed DFW coverage panel does not fetch or insert any renderer script',()=>{
 const h=setup();
 assert.equal(h.scripts.length,0);
});
test('first open creates only approved same-origin script; repeated open reuses it',async()=>{
 const h=setup();
 h.open();
 assert.equal(h.scripts.length,1);
 const script=h.scripts[0];
 assert.equal(script.src,RENDERER);
 assert.equal(script.async,true);
 script.onload();
 await Promise.resolve();
 h.close();h.open();
 assert.equal(h.scripts.length,1,'No new network request on reopen');
});
test('network failure is visible, fail-closed and retryable on the next expansion',async()=>{
 const h=setup();h.open();
 assert.equal(h.scripts.length,1);
 h.scripts[0].onerror();
 await Promise.resolve();
 assert.equal(h.scripts[0].removed,true);
 assert.match(h.mount.textContent,/불러오지 못했습니다/);
 h.close();h.open();
 assert.equal(h.scripts.length,2);
 assert.equal(h.scripts[1].src,RENDERER);
});
test('renderer injection is fixed, never built from user input or unsafe markup',()=>{
 assert.match(loader,/const SOURCE='\.\/features\/dfw-school-coverage-renderer\.js\?v=1'/);
 assert.doesNotMatch(loader,/innerHTML|eval\(|new Function|location\.search/);
 assert.match(loader,/panel\.addEventListener\('toggle'/);
});
