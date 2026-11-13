'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const loader=fs.readFileSync(path.join(__dirname,'..','features/region-compare.js'),'utf8');
const EXPECTED='./features/region-compare-renderer.js?v=1';

function harness(){
 class Node{
  constructor(tag){this.tagName=tag;this.id='';this.className='';this.textContent='';this.children=[];this.parentNode=null;this.events={};this.open=false;this.isConnected=false;}
  append(...children){for(const child of children)this.appendChild(child)}
  appendChild(child){return this.insertBefore(child,null)}
  insertBefore(child,ref){
   if(child.parentNode)child.remove();
   const index=ref?this.children.indexOf(ref):this.children.length;
   if(index<0)throw Error('Reference node missing');
   this.children.splice(index,0,child);child.parentNode=this;child.isConnected=true;return child;
  }
  after(node){
   if(!this.parentNode)throw Error('Node not mounted');
   const index=this.parentNode.children.indexOf(this);
   this.parentNode.insertBefore(node,this.parentNode.children[index+1]||null);
  }
  before(node){if(!this.parentNode)throw Error('Node not mounted');this.parentNode.insertBefore(node,this)}
  remove(){if(!this.parentNode)return;const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;this.isConnected=false}
  setAttribute(name,value){this[name]=String(value)}
  addEventListener(type,fn){this.events[type]=fn}
  walk(id){if(this.id===id)return this;for(const child of this.children){const found=child.walk(id);if(found)return found}return null}
  querySelector(selector){
   const expected=selector.toLowerCase();
   function visit(node){for(const child of node.children){if(child.tagName.toLowerCase()===expected)return child;const found=visit(child);if(found)return found}return null}
   return visit(this);
  }
  focus(){this.document.activeElement=this}
 }
 const main=new Node('main');main.className='main';main.isConnected=true;
 const quick=new Node('section');quick.id='areaQuickAssessment';main.appendChild(quick);
 const scripts=[];
 const document={
  activeElement:null,
  readyState:'complete',
  querySelector:selector=>selector==='.main'?main:null,
  getElementById:id=>main.walk(id),
  createElement:tag=>{const el=new Node(tag);el.document=document;return el},
  head:{appendChild:script=>{scripts.push(script)}}
 };
 quick.document=document;main.document=document;
 vm.runInNewContext(loader,{document,Promise,Error});
 const panel=()=>main.walk('regionCompare')||main.walk('regionCompareLoading');
 const open=()=>{const el=panel();el.open=true;el.events.toggle();return el};
 return {main,quick,document,scripts,panel,open,Node};
}
test('default ZIP comparison is collapsed, readable and has not downloaded renderer',()=>{
 const h=harness(),panel=h.panel();
 assert.equal(h.scripts.length,0);
 assert.equal(panel.id,'regionCompare');
 assert.equal(panel.open,false);
 assert.equal(h.main.children[1],panel);
 assert.equal(panel.querySelector('summary')?.id,'regionCompareTitle');
 assert.match(panel.querySelector('summary')?.textContent||panel.querySelector('summary').children[0].textContent,/지역 나란히 비교/);
 assert.match(loader,/if\(quick\)quick\.after\(section\)/);
});
test('clicking expands and loads exactly one same-origin renderer; preserves open state and keyboard focus',async()=>{
 const h=harness(),stub=h.panel(),summary=stub.querySelector('summary');
 h.document.activeElement=summary;
 h.open();
 assert.equal(h.scripts.length,1);
 const script=h.scripts[0];
 assert.equal(script.src,EXPECTED);
 assert.equal(script.async,true);
 assert.equal(stub.id,'regionCompareLoading');
 const replacement=new h.Node('details');replacement.id='regionCompare';replacement.document=h.document;
 const realSummary=new h.Node('summary');realSummary.document=h.document;replacement.appendChild(realSummary);
 h.quick.after(replacement);
 script.onload();await Promise.resolve();
 assert.equal(h.panel(),replacement);
 assert.equal(replacement.open,true);
 assert.equal(stub.isConnected,false);
 assert.equal(h.document.activeElement,realSummary);
 // Old loader listeners were attached only to the removed stub.
 assert.equal(h.scripts.length,1);
});
test('network failure restores heading and allows retry only on a later click',async()=>{
 const h=harness(),stub=h.open();
 assert.equal(h.scripts.length,1);
 h.scripts[0].onerror();await Promise.resolve();
 assert.equal(stub.id,'regionCompare');
 assert.match(stub.children[1].children[0].textContent,/불러오지 못했습니다/);
 stub.open=false;stub.events.toggle();
 stub.open=true;stub.events.toggle();
 assert.equal(h.scripts.length,2);
 assert.equal(h.scripts[1].src,EXPECTED);
});
test('renderer mounting failure restores original safe panel rather than empty shell',async()=>{
 const h=harness(),stub=h.open();
 h.scripts[0].onload();await Promise.resolve();
 assert.equal(stub.id,'regionCompare');
 assert.match(stub.children[1].children[0].textContent,/열지 못했습니다/);
 assert.equal(h.scripts[0].parentNode,null);
});
test('script URL is immutable; no untrusted URL, dynamic HTML or address persistence',()=>{
 assert.match(loader,/const RENDERER='\.\/features\/region-compare-renderer\.js\?v=1'/);
 assert.match(loader,/script\.src=RENDERER/);
 assert.doesNotMatch(loader,/innerHTML|eval\(|new Function|localStorage|sessionStorage|location\.search|window\.location/);
 assert.doesNotMatch(loader,/fetch\(|\.setView\(|\.fitBounds\(|schoolGroup\.clearLayers/);
});
