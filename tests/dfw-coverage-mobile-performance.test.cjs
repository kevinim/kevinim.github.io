'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const renderer=fs.readFileSync(path.join(__dirname,'../features/dfw-school-coverage-renderer.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../features/dfw-school-coverage-panel.css'),'utf8');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this.dataset={};this.style={};this.value='';this.hidden=false;this.textContent='';}
 append(...children){this.children.push(...children)}
 appendChild(child){this.children.push(child);return child}
 replaceChildren(...children){this.children=children}
 setAttribute(key,value){this.attributes[key]=String(value)}
 addEventListener(event,handler){this.listeners[event]=handler}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(coreOk=true){
 const panel=new Element('details'),mount=new Element('div');
 const pending=[],requests=[];
 const document={
  readyState:'complete',
  createElement:tag=>new Element(tag),
  getElementById:id=>id==='dfwSchoolCoveragePanel'?panel:id==='dfwSchoolCoverageContent'?mount:null
 };
 const data={schemaVersion:1,districts:[],priorityQueue:[],summary:{
  teaDistrictCodes:0,publicISDsWithRegisteredParentRoute:0,publicISDs:0,
  registeredParentRouteRatePublicISDPercent:0,publicISDsMissingRegisteredParentRoute:0,otherLEAs:0
 }};
 const fetch=url=>{
  requests.push(url);
  if(url.includes('coverage-matrix'))return Promise.resolve({ok:coreOk,status:503,json:async()=>data});
  return new Promise((resolve,reject)=>pending.push({url,resolve,reject}));
 };
 vm.runInNewContext(renderer,{document,window:{},fetch,console},{timeout:3000});
 return {panel,mount,pending,requests};
}
test('opt-in panel starts four independent evidence requests in parallel and announces short status',async()=>{
 const {panel,mount,pending,requests}=harness();
 assert.equal(requests.length,0,'closed panel must make no requests');
 panel.open=true;panel.listeners.toggle();
 await tick();
 assert.equal(requests.length,5,'one core + four optional sources');
 assert.equal(pending.length,4,'all optional requests begin before any settles');
 assert.equal(mount.attributes['aria-busy'],'true');
 assert.equal(mount.attributes['aria-live'],'off');
 assert.equal(mount.children[0].attributes.role,'status');
 pending[0].reject(new Error('source offline'));
 for(const item of pending.slice(1))item.resolve({ok:false,status:404});
 await tick();
 assert.equal(mount.attributes['aria-busy'],'false');
 assert.equal(mount.children[0].className,'dfw-coverage-stats');
 assert.ok(mount.children.some(c=>c.tagName==='div'&&c.attributes.role==='region'),
  'table remains a keyboard-scrollable named region');
});
test('failed core data reports an alert and clears busy state without requesting evidence',async()=>{
 const {panel,mount,pending,requests}=harness(false);
 panel.open=true;panel.listeners.toggle();
 await tick();
 assert.equal(requests.length,1);
 assert.equal(pending.length,0);
 assert.equal(mount.attributes['aria-busy'],'false');
 assert.equal(mount.children[0].attributes.role,'alert');
});
test('mobile coverage controls and keyboard table have explicit focus and 44px targets',()=>{
 assert.match(css,/#dfwSchoolCoveragePanel>summary\{min-height:44px\}/);
 assert.match(css,/#dfwSchoolCoverageContent \.dfw-coverage-table-wrap:focus-visible/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/#dfwSchoolCoverageContent button\.dfw-coverage-more\{min-height:44px\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('browser audit measures only rendered buttons; hidden More button is not a 0px failure',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../scripts/test-dfw-school-coverage-browser.cjs'),'utf8');
 assert.match(script,/getClientRects\(\)\.length>0/);
 assert.match(script,/controlHeights\.every\(height=>height>=44\)/);
});
