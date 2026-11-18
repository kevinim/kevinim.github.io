'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const main=read('dashboard-main.js');
const css=read('features/dashboard-quick-layout.css');
const layout=read('features/dashboard-quick-layout.js');
const rent=read('features/dfw-rent-map-uat.js');
const compare=read('features/region-compare.js');
const renderer=read('features/region-compare-renderer.js');
test('six-section home-first layout preserves original map, form, and filter IDs',()=>{
 const expected=['homeForm','homeAssignmentPriority','map','txRentSection','txCompareSection','txStatsSection'];
 let last=-1;
 for(const id of expected){
  const i=html.indexOf('id="'+id+'"');
  assert.ok(i>last,'missing or out-of-order section: '+id);
  last=i;
 }
 assert.match(html,/class="tx-jump-nav"/);
 assert.match(html,/dashboard-quick-layout\.css\?v=1/);
 assert.match(html,/dashboard-quick-layout\.js\?v=1/);
 assert.match(css,/\.home-school-grade\.grade-a/);
 assert.match(css,/\.home-school-grade\.grade-b/);
 assert.match(css,/\.home-school-grade\.grade-c/);
 assert.match(css,/\.tx-reference-campus-pin/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(layout,/stats\.appendChild\(node\)/);assert.match(layout,/MutationObserver/);
 assert.doesNotMatch(layout,/localStorage|sessionStorage|fetch\(|\.setView\(|\.fitBounds\(/);
});
test('Redfin and comparison mount under distinct ordered hosts',()=>{
 assert.match(rent,/mapBox\.before\(panel\)/);
 assert.match(compare,/if\(quick\)quick\.after\(section\)/);
 assert.match(renderer,/if\(quick\)quick\.after\(section\)/);
 assert.match(rent,/rentMapFilters/);
 assert.match(compare,/const RENDERER='\.\/features\/region-compare-renderer\.js\?v=1'/);
});
function candidateHarness(){
 const begin=main.indexOf('function referenceCandidateSchoolLocations(view){');
 const end=main.indexOf('function renderAddressSchoolPriority(){',begin);
 assert.ok(begin>0&&end>begin,'isolated reference marker functions');
 const school={name:'BENNETT',district:'043907',type:'elementary',ll:[33.2,-96.65]};
 const unlocated={name:'DOWELL',district:'043907',type:'middle',ll:null};
 const unrelated={name:'ZIP_ONLY',district:'043907',type:'high',ll:[33.3,-96.7]};
 const markers=[],group={clearLayers(){markers.length=0},addTo(){return this}};
 const ctx={
  state:{schools:[school,unlocated,unrelated],showSchools:true},
  home:{geocodeQuality:{usableForSchoolCandidate:true}},
  map:{},
  L:{
   layerGroup:()=>group,divIcon:o=>o,
   marker:(coords,options)=>({
    coords,options,addTo(){markers.push(this);return this},
    bindTooltip(message){this.tooltip=message;return this},
    on(){return this}
   })
  },
  scoreRecord:(name)=>({rating:name==='BENNETT'?'B':null}),
  escape: s=>String(s).replace(/</g,'&lt;'),schoolClicked(){}
 };
 vm.runInNewContext(main.slice(begin,end),ctx);
 return {ctx,markers,school,unlocated,unrelated};
}
test('reference markers show only linked coordinate-backed campuses, never nearby ZIP schools',()=>{
 const {ctx,markers,school,unlocated,unrelated}=candidateHarness();
 const view={kind:'mckinney-reference',schools:[],candidates:[
  {name:'BENNETT',school},{name:'DOWELL',school:unlocated},
  {name:'UNLINKED',school:null},{name:'BENNETT DUPLICATE',school}
 ]};
 assert.equal(ctx.referenceCandidateSchoolLocations(view).length,1);
 assert.equal(ctx.drawReferenceCampusMarkers(view),1);
 assert.equal(markers.length,1);
 assert.equal(markers[0].coords[0],33.2);
 assert.match(markers[0].tooltip,/배정 미인증/);
 assert.match(markers[0].options.icon.html,/grade-b/);
 assert.ok(!markers.some(m=>m.options.title.includes(unrelated.name)));
 assert.equal(ctx.drawReferenceCampusMarkers({kind:'unverified',schools:[],candidates:[]}),0);
 assert.equal(markers.length,0,'reference markers cleared after source change');
});
test('candidate pins stay separate from certified school list and preserve safety messaging',()=>{
 assert.match(main,/referenceCandidateSchoolLocations\(view\)/);
 assert.match(main,/const eligible=addressView\?addressView\.schools/);
 assert.match(main,/GIS 참고 학교 위치/);
 assert.match(main,/배정 미인증/);
 assert.match(main,/badge\.setAttribute\('aria-label'/);
 assert.match(main,/name\.textContent=entry\.name/);
 assert.match(main,/explanation\.textContent=extras\.join/);
 assert.doesNotMatch(main.slice(main.indexOf('function renderAddressSchoolPriority(){'),main.indexOf('function drawSchools(){')),/innerHTML\s*=/);
});
