'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../features/commute/workplace-destinations.js');

function memoryStorage(){
 const data=new Map();
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
test('no workplace is pre-populated or saved before a deliberate action',()=>{
 const storage=memoryStorage();
 assert.deepEqual(model.loadRecords(storage),[]);
 assert.equal(storage.getItem(model.KEY),null);
});
test('complete Texas street addresses are required; partial or non-Texas entries are rejected',()=>{
 assert.equal(model.validAddress('3400 Legacy'),false);
 assert.equal(model.validAddress('123 Any St, Boston, MA 02111'),false);
 assert.equal(model.validAddress('123 Main Street, Plano, TX 75024'),true);
 assert.equal(model.validAddress('5400 E Mockingbird Ln Unit 207, Dallas, Texas 75206'),true);
 assert.equal(model.validAddress('1'.repeat(201)+' TX'),false);
});
test('records are opt-in, browser-local, and round-trip without leaking other data',()=>{
 const storage=memoryStorage(),rows=[{id:'w123',name:'내 회사',address:'123 Main Street, Plano, TX 75024'}];
 assert.equal(model.saveRecords(storage,rows),true);
 assert.deepEqual(model.loadRecords(storage),rows);
 assert.equal(storage.getItem(model.KEY).includes('내 회사'),true);
 assert.equal(model.saveRecords(storage,[]),true);
 assert.deepEqual(model.loadRecords(storage),[]);
});
test('malformed, duplicated, oversized, or injected saved profiles are sanitized',()=>{
 const arr=[{id:'a',name:' Test ',address:'123 Main Street, Plano, TX 75024'},
  {id:'a',name:'Duplicate',address:'234 Main Street, Allen, TX 75013'},
  {id:'b',name:'Invalid',address:'private location'},
  {id:'c',name:'<img src=x>',address:'234 Main Street, Allen, TX 75013'}];
 assert.deepEqual(model.normalizeRecords(arr).map(r=>r.id),['a','c']);
 assert.equal(model.normalizeRecords(arr)[0].name,'Test');
 assert.deepEqual(model.normalizeRecords(null),[]);
 assert.equal(model.normalizeRecords(Array.from({length:20},(_,i)=>({id:'w'+i,name:'Office',address:'123 Main Street, Plano, TX 75024'}))).length,model.MAX);
});
test('storage failures do not falsely claim the address is saved',()=>{
 const storage={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
 assert.deepEqual(model.loadRecords(storage),[]);
 assert.equal(model.saveRecords(storage,[{id:'x',name:'X',address:'123 Main Street, Plano, TX 75024'}]),false);
});
test('dashboard wiring uses reusable autocomplete and no fixed personal office destination',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const dashboard=fs.readFileSync(path.join(__dirname,'../dashboard-main.js'),'utf8');
 const suggest=fs.readFileSync(path.join(__dirname,'../texas-address-suggest.js'),'utf8');
 assert.match(html,/features\/commute\/workplace-destinations\.js/);
 assert.match(html,/features\/dashboard-extras\.css\?v=4/);
 assert.match(fs.readFileSync(path.join(__dirname,'../features/dashboard-extras.css'),'utf8'),/\.workplaces-panel/);
 assert.match(html,/id="destination" value=""/);
 assert.match(dashboard,/WorkplaceDestinations\?\.addressForChoice/);
 assert.match(suggest,/optionIdPrefix/);
 assert.doesNotMatch(dashboard,/JPM_ADDRESS|JPMC_ADDRESS/);
});
