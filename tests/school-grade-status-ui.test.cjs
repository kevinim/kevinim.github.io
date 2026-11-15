'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const core=require('../features/school-grade-zones-uat-core.js');
function harness(){
 const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',dataset:{},children:[],replaceChildren(){this.children=[]},append(x){this.children.push(x)}});return elements.get(id)};
 const ctx={SchoolGradeZonesUatCore:core,location:{pathname:'/school-grade-uat.html'},document:{readyState:'loading',addEventListener(){},getElementById:el,createElement:()=>({append(){}})},map:{getZoom(){}},state:{zoneData:{},zoneLoadErrors:{},sourceStatus:{},liveFinder:{},ratings:Array.from({length:101},()=>({}))},console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext('state.ratingIndex=new Map()',ctx);
 let code=fs.readFileSync(require.resolve('../features/school-grade-zones-uat.js'),'utf8');
 code=code.replace(" if(document.readyState==='loading')"," window.testUI={ui,render};if(document.readyState==='loading')");
 vm.runInContext(code,ctx);ctx.testUI.ui.ready=true;ctx.testUI.ui.layer={clearLayers(){}};
 return {ctx,el,render:()=>ctx.testUI.render()};
}
test('grade panel distinguishes loading and source error without declaring no eligible schools',()=>{
 const h=harness();h.ctx.state.sourceStatus['043907']={polygon:'loading'};h.render();assert.equal(h.el('schoolGradeZoneStatus').dataset.state,'loading');
 h.ctx.state.sourceStatus['043907']={polygon:'error'};h.render();assert.equal(h.el('schoolGradeZoneStatus').dataset.state,'error');assert.equal(h.el('schoolGradeRetry').hidden,false);
});
test('partial Carrollton source retains official Finder and does not offer retry for absent authorized GIS',()=>{
 const h=harness();h.ctx.testUI.ui.city='carrollton';h.ctx.state.sourceStatus={CFB:{polygon:'error',errorCode:'no-authorized-source'},LISD:{polygon:'ready'}};
 h.render();assert.equal(h.el('schoolGradeZoneStatus').dataset.state,'partial');assert.equal(h.el('schoolGradeRetry').hidden,true);assert.equal(h.el('schoolGradeSourceIssues').children.length,1);
});
test('a loaded empty source is a successful empty result, separate from missing TEA joins',()=>{
 const h=harness();h.ctx.state.sourceStatus['043907']={polygon:'ready'};h.ctx.L={};h.render();assert.equal(h.el('schoolGradeZoneStatus').dataset.state,'empty');
 h.ctx.state.liveFinder['043907']=true;h.ctx.state.zoneData['043907']=[{type:'Feature',properties:{school:'Synthetic EL',gradeLevel:'elementary',sourceVintage:'2026-27',verifiedYear:'2026-27',yearVerified2627:true},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}];
 h.render();assert.equal(h.el('schoolGradeZoneStatus').dataset.state,'partial');assert.match(h.el('schoolGradeJoinIssues').textContent,/Not Rated 0/);assert.match(h.el('schoolGradeJoinIssues').textContent,/미연결 1/);
});
