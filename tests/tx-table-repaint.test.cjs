'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dashboard-main.js'),'utf8');
function getLine(prefix){
 const found=source.split(/\r?\n/).filter(line=>line.startsWith(prefix));
 assert.equal(found.length,1,'Expected exactly one '+prefix);
 return found[0];
}
const body=[
 getLine('let tableSort='),
 getLine('function drawTable()'),
 getLine('function updateTableSelection()'),
 getLine('function renderData(')
].join('\n');
function harness(){
 const DATA=JSON.parse(fs.readFileSync(path.join(root,'dfw-demographics.json'),'utf8')).data;
 const rows=[],labels={};let htmlWrites=0,htmlBytes=0,details=0,commute=0;
 function fakeRow(zip,selected){
  const classes=new Set(selected?['sel']:[]);
  return {dataset:{z:zip},isConnected:true,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)}};
 }
 const tbody={
  contains:x=>rows.includes(x),
  querySelector(sel){
   if(sel==='tr.sel')return rows.find(r=>r.classList.contains('sel'))||null;
   const m=/^tr\[data-z="(\d{5})"\]$/.exec(sel);
   return m?rows.find(r=>r.dataset.z===m[1])||null:null;
  },
  get innerHTML(){return this.html||''},
  set innerHTML(html){
   htmlWrites++;htmlBytes+=html.length;
   rows.forEach(r=>r.isConnected=false);rows.length=0;
   for(const m of html.matchAll(/<tr data-z="(\d{5})" class="([^"]*)">/g))
    rows.push(fakeRow(m[1],m[2].includes('sel')));
   this.html=html;
  }
 };
 const ths=['income','indian','korean'].map(sort=>({
  dataset:{sort},sort:null,removeAttribute(){this.sort=null},
  setAttribute(k,v){this.sort=v}
 }));
 const table={querySelector:s=>s==='tbody'?tbody:null,querySelectorAll:s=>s==='th'?ths:[]};
 const state={zip:'75093',metric:'korean'};
 const el=id=>id==='compareTable'?table:(labels[id]??=( {textContent:''} ));
 const ctx=vm.createContext({
  DATA,state,el,showSavedCommute(){commute++},drawDetail(){details++},
  getZip(){return DATA.find(x=>x.z===state.zip)},
  displayPlace:name=>name,escape:text=>String(text).replace(/</g,'&lt;'),
  pct:value=>value==null?'미공개':value.toFixed(1)+'%',
  money:value=>value==null?'미공개':'$'+value.toLocaleString('en-US')
 });
 vm.runInContext(body,ctx,{timeout:2000});
 const act=src=>vm.runInContext(src,ctx,{timeout:2000});
 return {DATA,state,rows,tbody,ths,labels,act,get writes(){return htmlWrites},get bytes(){return htmlBytes},get details(){return details},get commute(){return commute}};
}
test('ZIP selection updates only highlighted table row, never rebuilds all 292 records',()=>{
 const h=harness();assert.equal(h.DATA.length,292);
 h.act('renderData()');
 assert.equal(h.writes,1);
 assert.equal(h.rows.length,292);
 const original=h.rows.find(r=>r.dataset.z==='75013');
 for(const zip of ['75013','75034','75093','75024']){
  h.state.zip=zip;h.act('renderData(true)');
  assert.equal(h.writes,1,'ZIP navigation may not regenerate table HTML');
  assert.equal(h.rows.filter(r=>r.classList.contains('sel')).length,1);
  assert.equal(h.rows.find(r=>r.classList.contains('sel')).dataset.z,zip);
 }
 assert.equal(h.rows.find(r=>r.dataset.z==='75013'),original,'Row DOM and existing listeners remain stable');
 assert.equal(h.labels['k-zip'].textContent,'75024');
});
test('Sort and full data refresh still regenerate table with correct content and selection',()=>{
 const h=harness();h.act('renderData()');
 h.state.zip='75013';h.act('renderData(true)');
 h.act("tableSort.key='income';tableSort.dir=-1;drawTable()");
 assert.equal(h.writes,2);
 assert.equal(h.rows.filter(x=>x.classList.contains('sel')).length,1);
 assert.equal(h.rows.find(x=>x.classList.contains('sel')).dataset.z,'75013');
 assert.equal(h.ths[0].sort,'descending');
 h.DATA.find(x=>x.z==='75013').name='Updated verified name';
 h.act('renderData()');
 assert.equal(h.writes,3);
 assert.match(h.tbody.innerHTML,/Updated verified name/);
});
test('After sort, selection-only path highlights the new row without re-sorting/re-rendering',()=>{
 const h=harness();h.act('drawTable()');
 h.act("tableSort.key='indian';tableSort.dir=1;drawTable()");
 const first=h.rows[0].dataset.z,writes=h.writes;
 h.state.zip='75034';h.act('updateTableSelection()');
 assert.equal(h.writes,writes);
 assert.equal(h.rows[0].dataset.z,first);
 assert.equal(h.rows.find(x=>x.classList.contains('sel')).dataset.z,'75034');
});
test('Destination typing, routing and metric changes cannot reconstruct static demographics table',()=>{
 const init=getLine('function init()');
 assert.match(init,/querySelector\('tbody'\)\.onclick=e=>\{const tr=e\.target\.closest\('tr\[data-z\]'\)/);
 assert.doesNotMatch(init,/querySelectorAll\('tr'\)\.forEach\(tr=>tr\.onclick=/);
 assert.match(init,/el\('metric'\)\.onchange=e=>\{state\.metric=e\.target\.value;drawZip\(\);drawDetail\(\)\}/);
 const destination=init.slice(init.indexOf("el('destination').oninput="),init.indexOf("el('officeSelect').onchange="));
 assert.doesNotMatch(destination,/drawTable\(\)/);
 const routeLine=source.split(/\r?\n/).find(x=>x.includes('state.times[d.z]=sec/60'));
 assert.ok(routeLine);
 assert.doesNotMatch(routeLine,/drawTable\(\)/);
 assert.match(getLine('function selectZip('),/renderData\(true\)/);
});
