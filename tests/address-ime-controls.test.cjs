'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function element(id=''){
 const handlers=new Map(),attrs=new Map();
 return {id,value:'',hidden:true,children:[],classList:{toggle(){}},
  setAttribute(k,v){attrs.set(k,v)},removeAttribute(k){attrs.delete(k)},getAttribute:k=>attrs.get(k),
  addEventListener(k,v){handlers.set(k,v)},removeEventListener(k,v){if(handlers.get(k)===v)handlers.delete(k)},
  emit(k,e={}){handlers.get(k)?.(e)},replaceChildren(){this.children=[]},appendChild(v){this.children.push(v)},contains(v){return this.children.includes(v)}};
}
function harness(fetch){
 const input=element('homeAddress'),list=element('suggestions'),document=element();
 document.activeElement=input;document.createElement=()=>element();
 const ctx={document,fetch,URLSearchParams,AbortController,setTimeout,clearTimeout};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'texas-address-suggest.js'),'utf8'),ctx);
 const chosen=[];const api=ctx.attachTexasAddressSuggestions(input,list,item=>chosen.push(item));
 return {input,list,document,chosen,api};
}
test('IME composition suppresses prefix requests and composition Enter selection; committed text resumes suggestions',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let calls=0;
 const h=harness(async()=>{calls++;return {ok:true,json:async()=>({suggestions:[{text:'123 Main St, Plano, TX, 75093',magicKey:'synthetic'}]})}});
 h.input.value='123 Main';h.input.emit('compositionstart');h.input.emit('input',{isComposing:true});
 t.mock.timers.tick(400);await flush();assert.equal(calls,0);
 h.input.emit('compositionend');t.mock.timers.tick(320);await flush();assert.equal(calls,1);assert.equal(h.list.hidden,false);
 h.input.emit('keydown',{key:'ArrowDown',preventDefault(){}});
 h.input.emit('keydown',{key:'Enter',isComposing:true,preventDefault(){throw Error('composition key consumed')}});
 assert.equal(h.chosen.length,0);
 h.input.emit('keydown',{key:'Enter',keyCode:229,preventDefault(){throw Error('legacy composition key consumed')}});
 assert.equal(h.chosen.length,0);
 h.input.emit('keydown',{key:'Enter',preventDefault(){}});assert.equal(h.chosen.length,1);
 h.api.dispose();
});
test('composition start aborts an outstanding request and prevents its late result from opening the list',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let complete,signal;
 const h=harness((_url,opts)=>{signal=opts.signal;return new Promise(resolve=>{complete=resolve})});
 h.input.value='123 Main';h.input.emit('input');t.mock.timers.tick(320);await flush();
 h.input.emit('compositionstart');assert.equal(signal.aborted,true);
 complete({ok:true,json:async()=>({suggestions:[{text:'123 Main St, Plano, TX, 75093',magicKey:'late'}]})});await flush();
 assert.equal(h.list.hidden,true);assert.equal(h.list.children.length,0);
 h.api.dispose();h.input.emit('compositionend');t.mock.timers.tick(400);await flush();assert.equal(h.list.hidden,true);
});
test('all dashboard entry points name ZIP and metric selects and expose the selected school level',()=>{
 for(const file of ['index.html','reviewed.html','rent-map-uat.html','redfin-uat.html','school-grade-uat.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,/<label for="zipSelect">[^<]+<\/label><select id="zipSelect"/,file);
  assert.match(html,/<label for="metric">[^<]+<\/label><select id="metric"/,file);
  const levels=html.match(/<div class="seg" id="levels"[^>]*>.*?<\/div>/)?.[0];assert.ok(levels,file);
  assert.match(levels,/role="group" aria-label="[^"]+"/,file);
  assert.equal((levels.match(/aria-pressed="true"/g)||[]).length,1,file);
  assert.equal((levels.match(/aria-pressed="false"/g)||[]).length,3,file);
 }
});
