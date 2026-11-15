'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
function harness(file='dashboard-main.js',{deferRoutes=false,loadHome=false}={}){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const elements=new Map(),requests=[],lines=[],distances=[],pins=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',disabled:false,hidden:true,textContent:'',innerHTML:'',checked:false,addEventListener(){},replaceChildren(){},focus(){}});return elements.get(id)};
 element('destination').value='100 Example A Dr, Plano, TX';element('officeSelect').value='custom';
 const group={clearLayers(){lines.length=0},getBounds(){return {}}};
 const route={code:'Ok',routes:[{duration:600,distance:1609.344,geometry:{type:'LineString',coordinates:[[-96.8,33],[-96.7,33.1]]}}]};
 const requestJson=(provider,url,options={})=>{
  const pending=deferred(),kind=provider==='nominatim'?'geocode':url.includes('/table/')?'table':'route';
  requests.push({provider,url,options,kind,...pending});
  if(kind==='route'&&!deferRoutes)pending.resolve(route);
  return pending.promise; // Deliberately ignore AbortSignal: stale writes still must be guarded.
 };
 const ctx={console,URLSearchParams,URL,AbortController,setTimeout,clearTimeout,DOMException,
  document:{getElementById:element,addEventListener(){}},DISTRICT_REGISTRY:{},
  home:null,homeRouteLayer:null,refreshHomeOffice(){},noteCommuteRouteDistance:d=>distances.push(d),
  clearCommuteRouteDistance:()=>{distances.length=0},
  workDestinationIcon:()=>({}),WorkplaceDestinations:null,
  TxProviderRequests:{requestJson},
  __group:group,__map:{removeLayer(){},stop(){},setView(){},fitBounds(){}},
  L:{marker(point){pins.push(point);return {addTo(){return this},bindPopup(){return this}}},
   divIcon:()=>({}),layerGroup(){return {clearLayers(){lines.length=0},addTo(){return this}}},geoJSON(geometry){return {getBounds(){return {}},addTo(){lines.push(geometry);return this}}}}
 };
 ctx.window=ctx;vm.createContext(ctx);
 // Real operation controller (when present) from the existing first-party guard.
 vm.runInContext(fs.readFileSync(path.join(root,'features/commute/provider-requests.js'),'utf8'),ctx);
 ctx.TxProviderRequests={requestJson};
 vm.runInContext(source,ctx);
 if(loadHome)vm.runInContext(fs.readFileSync(path.join(root,'home-lookup-v2.js'),'utf8'),ctx);
 vm.runInContext("map=__map;routeGroup=__group;drawCommute=()=>{};drawTable=()=>{};showSavedCommute=()=>{};toast=()=>{};",ctx);
 const start=source.indexOf("el('destination').oninput=");
 const end=source.indexOf(file==='dashboard-main.js'?";el('officeSelect').onchange":";el('boundaryFile').onchange",start);
 if(start>=0&&end>start)vm.runInContext("globalThis.__input="+source.slice(start+"el('destination').oninput=".length,end),ctx);
 else ctx.__input=()=>{}; // Legacy reviewed entry has no input invalidation yet.
 const run=s=>vm.runInContext(s,ctx);
 if(loadHome){
  ctx.__homeLookup=()=>{const pending=deferred();requests.push({kind:'home-geocode',...pending});return pending.promise};
  run("home={ll:[33,-96.8],address:'synthetic home'};geocodeAddress=__homeLookup;renderHome=()=>{};drawSchools=()=>{};drawList=()=>{};");
 }
 function change(value){element('destination').value=value;ctx.__input()}
 function changeZip(){
  run("renderData=()=>{};drawZip=()=>{};drawList=()=>{};drawSchools=()=>{};renderSchoolZoneMapHint=()=>{};syncMapSize=()=>{};");
  ctx.selectZip('75024',false);
 }
 const geocode=(label='A')=>[{lat:'33.1',lon:'-96.7',display_name:'synthetic destination '+label}];
 const table={code:'Ok',durations:Array.from({length:11},()=>[600])};
 return {ctx,requests,lines,distances,pins,element,run,change,changeZip,geocode,table,route,
  state:()=>JSON.parse(run('JSON.stringify(state)'))};
}
test('home: changing ZIP during geocoding cannot submit or commit old home route',async()=>{
 const h=harness('dashboard-main.js',{loadHome:true}),task=h.ctx.calculateHomeCommute();
 h.changeZip();h.requests.find(r=>r.kind==='home-geocode').resolve([{location:{x:-96.7,y:33.1}}]);await task;
 assert.equal(h.requests.filter(r=>r.kind==='route').length,0);assert.equal(h.lines.length,0);assert.equal(h.distances.length,0);
});
test('home: switching to a ZIP calculation cancels an in-flight home route',async()=>{
 const h=harness('dashboard-main.js',{loadHome:true,deferRoutes:true}),task=h.ctx.calculateHomeCommute();
 h.requests[0].resolve([{location:{x:-96.7,y:33.1}}]);await flush();const old=h.requests.find(r=>r.kind==='route');
 h.run('home=null');const current=h.ctx.calcCommute();
 old.resolve(h.route);await task;assert.equal(h.lines.length,0);assert.equal(h.distances.length,0);
 h.requests.find(r=>r.kind==='geocode').resolve(h.geocode());await flush();h.requests.find(r=>r.kind==='table').resolve(h.table);await flush();
 h.requests.filter(r=>r.kind==='route'&&r!==old).forEach(r=>r.resolve(h.route));await current;
 assert.equal(h.distances.length,1);
});
test('home: a current route still commits distance and restores its button',async()=>{
 const h=harness('dashboard-main.js',{loadHome:true}),task=h.ctx.calculateHomeCommute();
 h.requests[0].resolve([{location:{x:-96.7,y:33.1}}]);await task;
 assert.equal(h.lines.length,1);assert.equal(h.distances.length,1);assert.equal(h.element('homeRoute').disabled,false);
});
for(const file of ['dashboard-main.js','features/reviewed-bootstrap.js']){
 test(file+': destination edit prevents a late geocoder from restoring old result',async()=>{
  const h=harness(file),task=h.ctx.calcCommute();
  await flush();const old=h.requests[0];h.change('200 Example B Dr, Plano, TX');
  old.resolve(h.geocode());await flush();
  for(const r of h.requests.filter(r=>r.kind==='table'))r.resolve(h.table);
  await task;
  assert.equal(h.state().dest,null);assert.deepEqual(h.state().times,{});
  assert.equal(h.pins.length,0);assert.equal(h.lines.length,0);
 });
 test(file+': clear prevents late table, pin, status and distance writes',async()=>{
  const h=harness(file),task=h.ctx.calcCommute();h.requests[0].resolve(h.geocode());await flush();
  const table=h.requests.find(r=>r.kind==='table');assert.ok(table);
  h.change('');const status=h.element('routeStatus').textContent;
  table.resolve(h.table);await task;
  assert.deepEqual(h.state().times,{});assert.equal(h.state().dest,null);
  assert.equal(h.element('routeStatus').textContent,status);assert.equal(h.lines.length,0);assert.equal(h.distances.length,0);
 });
 test(file+': late route cannot paint or refill cost after edit',async()=>{
  const h=harness(file,{deferRoutes:true}),task=h.ctx.calcCommute();
  h.requests[0].resolve(h.geocode());await flush();
  h.requests.find(r=>r.kind==='table').resolve(h.table);await flush();
  const route=h.requests.find(r=>r.kind==='route');assert.ok(route);
  h.change('200 Example B Dr, Plano, TX');route.resolve(h.route);await task;await flush();
  assert.equal(h.lines.length,0);assert.equal(h.distances.length,0);
 });
 test(file+': ZIP change during geocode prevents attaching result to new origin',async()=>{
  const h=harness(file),task=h.ctx.calcCommute();h.changeZip();h.requests[0].resolve(h.geocode());await flush();
  for(const r of h.requests.filter(r=>r.kind==='table'))r.resolve(h.table);
  await task;
  assert.equal(h.state().zip,'75024');assert.equal(h.state().dest,null);assert.deepEqual(h.state().times,{});
 });
 test(file+': newest calculation survives old error completion',async()=>{
  const h=harness(file),first=h.ctx.calcCommute(),old=h.requests[0];
  h.change('200 Example B Dr, Plano, TX');const latest=h.ctx.calcCommute();
  h.requests.find(r=>r!==old&&r.kind==='geocode').resolve(h.geocode('B'));await flush();
  h.requests.find(r=>r.kind==='table').resolve(h.table);await latest;
  const status=h.element('routeStatus').textContent;
  old.reject(new Error('synthetic old failure'));await first;
  assert.equal(h.state().dest.address,'synthetic destination B');
  assert.equal(h.element('routeStatus').textContent,status);
 });
 test(file+': repeated submit while same calculation is pending sends one lookup',async()=>{
  const h=harness(file),first=h.ctx.calcCommute(),second=h.ctx.calcCommute();
  assert.equal(h.requests.filter(r=>r.kind==='geocode').length,1);
  h.requests[0].resolve(h.geocode());await flush();
  h.requests.find(r=>r.kind==='table').resolve(h.table);await Promise.all([first,second]);
  assert.equal(h.element('calcCommute').disabled,false);
 });
 test(file+': successful current calculation still draws route and time',async()=>{
  const h=harness(file),task=h.ctx.calcCommute();h.requests[0].resolve(h.geocode());await flush();
  h.requests.find(r=>r.kind==='table').resolve(h.table);await task;await flush();
  assert.equal(h.state().times['75093'],10);assert.ok(h.lines.length>0);
 });
}

