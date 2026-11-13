'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const loader=fs.readFileSync(path.join(__dirname,'..','features/cfb-approved-zone-atlas.js'),'utf8');
const EXPECTED='./features/cfb-approved-zone-atlas-renderer.js?v=1';
function setup(){
 class Element {
  constructor(tag){this.tagName=tag;this.parentNode=null;this.children=[];this.isConnected=false;this.dataset={};this.events={};this.open=false;this.textContent='';this.id='';}
  appendChild(child){return this.insertBefore(child,null)}
  append(...nodes){nodes.forEach(x=>this.appendChild(x))}
  insertBefore(child,next){
   if(child.parentNode)child.remove();
   const index=next?this.children.indexOf(next):this.children.length;
   if(index<0)throw Error('Invalid insertion');
   this.children.splice(index,0,child);child.parentNode=this;child.isConnected=true;return child;
  }
  remove(){if(!this.parentNode)return;const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;this.isConnected=false}
  setAttribute(k,v){this[k]=v}
  addEventListener(k,fn){this.events[k]=fn}
  walk(id){if(this.id===id)return this;for(const c of this.children){const found=c.walk(id);if(found)return found}return null}
 }
 const parent=new Element('section');parent.id='cfbOfficialFinderPanel';parent.isConnected=true;
 const manual=new Element('div');manual.id='cfbOfficialManualBridge';parent.appendChild(manual);
 const scripts=[];
 const document={
  readyState:'complete',
  getElementById:id=>parent.walk(id),
  createElement:tag=>new Element(tag),
  head:{appendChild:s=>{scripts.push(s);s.parentNode=this;}}
 };
 vm.runInNewContext(loader,{document,Promise,Error});
 const open=()=>{const atlas=parent.walk('cfbAtlas');atlas.open=true;atlas.events.toggle();return atlas};
 return {parent,manual,scripts,open,Element};
}
test('unopened source atlas keeps explicit 2025–26 no-GIS warning and does not download renderer',()=>{
 const h=setup(),panel=h.parent.walk('cfbAtlas');
 assert.equal(h.scripts.length,0);
 assert.equal(panel.open,false);
 assert.match(panel.children[0].textContent,/2025–26/);
 assert.match(panel.children[1].children[0].textContent,/집 주소별 학교 배정 확정 자료가 아닙니다/);
 assert.equal(h.parent.children[0],panel,'Panel must stay immediately before manual school bridge');
});
test('first expansion uses one immutable same-origin script; opened state survives renderer replacement',async()=>{
 const h=setup(),stub=h.open();
 assert.equal(h.scripts.length,1);
 const s=h.scripts[0];
 assert.equal(s.src,EXPECTED);assert.equal(s.async,true);
 assert.equal(stub.isConnected,false,'Original source renderer requires placeholder absent');
 const real=new h.Element('details');real.id='cfbAtlas';h.parent.insertBefore(real,h.manual);
 s.onload();await Promise.resolve();
 assert.equal(real.open,true,'User must not have to click a second time');
 assert.equal(h.scripts.length,1);
});
test('network error restores source warning and allows another explicit expansion',async()=>{
 const h=setup(),stub=h.open(),s=h.scripts[0];
 assert.equal(h.scripts.length,1);
 s.onerror();await Promise.resolve();
 assert.equal(h.parent.walk('cfbAtlas'),stub);
 assert.match(stub.children[1].children[1].textContent,/불러오지 못했습니다/);
 stub.open=false;stub.events.toggle();
 stub.open=true;stub.events.toggle();
 assert.equal(h.scripts.length,2,'Retry only follows an explicit second opening');
});
test('script source fixed; no dynamic URL, executable HTML or client persistence',()=>{
 assert.match(loader,/const RENDERER='\.\/features\/cfb-approved-zone-atlas-renderer\.js\?v=1'/);
 assert.doesNotMatch(loader,/innerHTML|eval\(|new Function|localStorage|sessionStorage|location\.search/);
 assert.match(loader,/script\.src=RENDERER/);
});
