'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..'),read=p=>readFileSync(join(root,p),'utf8');
const index=read('index.html')+'\n'+read('dashboard-main.js'),home=read('home-lookup-v2.js');
const css=read('features/dashboard-extras.css'),extras=read('features/dashboard-extras.js');
const {workDestinationIcon}=require('../features/commute/workplace-marker.js');
const {calculateMonthlyCommute}=require('../features/commute/cost-model.js');

test('workplace briefcase marker shared by home and ZIP route',()=>{
 const icon=workDestinationIcon({divIcon:x=>x});
 assert.ok(icon.html.includes('업무 목적지'));
 assert.ok(icon.html.includes('<svg'));
 assert.equal(icon.iconAnchor[1],48);
 assert.equal(index.includes('window.workDestinationIcon(L)'),true);
 assert.equal(home.includes('window.workDestinationIcon(L)'),true);
 assert.ok(!home.includes('<span class="route-label">목적지</span>'),'old home marker remains');
 assert.ok(!index.includes('html:\'<span class="route-label">목적지</span>\''),'old ZIP target marker remains');
 assert.ok(css.includes('.work-pin-body'));
});

test('functional scripts and source files are loaded without an extra map library',()=>{
 for(const file of ['features/dashboard-extras.css?v=3','features/commute/workplace-marker.js?v=1',
 'features/commute/cost-model.js?v=1','features/dashboard-extras.js?v=1']){
  assert.ok(index.includes(file),file+' not loaded');
 }
 assert.ok(extras.includes("getElementById"));
 assert.ok(extras.includes('tollCostPanel'));
 assert.ok(extras.includes('healthcarePanel'));
 assert.ok(extras.includes('gridResiliencePanel'));
 assert.ok(extras.includes('hospitalEdOnly'));
 assert.ok(extras.includes('LOCAL_EVIDENCE_NOT_AVAILABLE')===false);
 assert.ok(extras.includes('TXT-CURRENT-API')===false);
});
test('toll math matches 20 office-day route and omitted quotes do not produce total',()=>{
 const base={daysPerMonth:20,paymentMode:'tolltag',nttaRoadsUsed:true,expressLanesUsed:false,
 outboundNttaTollTagUsd:1.25,returnNttaTollTagUsd:1.75,
 outboundMiles:20,returnMiles:25,milesPerGallon:30,fuelPricePerGallon:3,parkingPerDayUsd:0};
 assert.equal(calculateMonthlyCommute(base).components.totalPerMonthUsd,150);
 assert.equal(calculateMonthlyCommute({...base,returnNttaTollTagUsd:null}).components.totalPerMonthUsd,null);
});
test('existing controls and school map logic remain present',()=>{
 for(const id of ['homeAddress','homeClear','schoolOverlay','historicOverlay',
   'referenceBoundaryOverlay','levels','ratingFilter','calcCommute','officeSelect','destination','crimeMapToggle']){
  assert.equal((index.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(index.includes('L.map(\'map\''));
 assert.ok(index.includes('createCrimeCityMap?.'));
 assert.ok(index.includes('createFemaHazardOverlay?.'));
 assert.ok(index.includes('./home-lookup-v2.js?v=17'));
 assert.ok(home.includes("window.noteCommuteRouteDistance?.(data.routes?.[0]?.distance,'home')"));
 assert.ok(index.includes("window.noteCommuteRouteDistance?.(j.routes?.[0]?.distance,'zip')"));
});
