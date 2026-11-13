'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const code=fs.readFileSync(path.join(__dirname,'..','dashboard-main.js'),'utf8');
const lines=code.split(/\r?\n/);
function sourceFor(name){
 const entry=lines.find(line=>line.startsWith('function '+name+'('));
 assert.ok(entry,'Missing heatmap function '+name);
 return entry;
}
const renderer=['metricRange','shade','drawZip'].map(sourceFor).join('\n');
const values=[
 {z:'75013',name:'Allen',indian:12.1,income:145000},
 {z:'75034',name:'Frisco',indian:12.1,income:110000},
 {z:'75093',name:'Plano',indian:8.3,income:125000},
 {z:'75006',name:'Carrollton',indian:null,income:null},
 {z:'75024',name:'NW Plano',indian:27.8,income:117000}
];

function expectedColor(value,scope,metric){
 if(!Number.isFinite(value))return '#b8c2cc';
 const valid=scope.map(d=>d[metric]).filter(Number.isFinite);
 if(!valid.length)return '#b8c2cc';
 const mn=Math.min(...valid),mx=Math.max(...valid);
 const t=mx===mn?.5:Math.max(0,Math.min(1,(value-mn)/(mx-mn)));
 const lo=[247,251,255],hi=[8,81,156];
 return '#'+lo.map((n,i)=>Math.round(n+(hi[i]-n)*t).toString(16).padStart(2,'0')).join('');
}
function render({ids,metric,withinHour=false}){
 const scope=values.filter(d=>ids.includes(d.z));
 const styles=new Map();
 const polygons={};
 for(const d of values){
  const polygon={
   setStyle(style){styles.set(d.z,style);return this},
   off(){return this},
   on(){return this},
   bindTooltip(){return this}
  };
  polygons[d.z]=polygon;
 }
 let scopeCalls=0,groupAdds=0,legendCalls=0;
 const ctx={
  DATA:values,state:{zip:'75013',metric,polys:polygons,showZip:true,withinHour},map:{},
  zipGroup:{clearLayers(){},addLayer(){groupAdds++}},zipMarkers:{clearLayers(){}},
  scopedZips(){scopeCalls++;return scope},drawAreaLabels(){},drawHeatLegend(){legendCalls++},
  displayPlace(name){return name},escape(value){return String(value)},
  metricLabel(){return metric},niceMetric(value){return String(value)},
  selectZip(){},L:{divIcon(){throw Error('No missing polygons expected')}}
 };
 vm.runInNewContext(renderer+'\ndrawZip();',ctx,{timeout:2000});
 assert.equal(groupAdds,values.length,'ZIP polygons remain available');
 assert.equal(legendCalls,1,'Heat legend remains rendered');
 assert.equal(scopeCalls,1,'Scoped ZIP set must be computed once per heatmap render');
 for(const d of values){
  const style=styles.get(d.z);
  assert.ok(style,'Missing polygon style for '+d.z);
  const visible=ids.includes(d.z);
  assert.equal(style.fillColor,withinHour?'#aab5c0':(visible?expectedColor(d[metric],scope,metric):'#d1d5db'),'Fill color '+d.z);
  assert.equal(style.fillOpacity,(withinHour||visible)?.72:.3,'Fill opacity '+d.z);
  assert.equal(style.color,d.z==='75013'?'#1e4298':'#99a8ba','Selected ZIP outline '+d.z);
 }
}
test('TX ZIP heatmap: all-scope appearance unchanged with one scope calculation',()=>{
 render({ids:values.map(d=>d.z),metric:'indian'});
});
test('TX ZIP heatmap: county-scope appearance and missing metrics unchanged',()=>{
 render({ids:['75013','75093'],metric:'indian'});
});
test('TX ZIP heatmap: equal-value and income recalculation preserve prior colors',()=>{
 render({ids:['75013','75034'],metric:'indian'});
 render({ids:['75013','75034','75024'],metric:'income'});
});
test('TX ZIP heatmap: one-hour overlay keeps neutral fill and full opacity',()=>{
 render({ids:['75013','75093'],metric:'indian',withinHour:true});
});
