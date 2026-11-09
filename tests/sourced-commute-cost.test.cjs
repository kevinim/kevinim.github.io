'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const model=require('../features/commute/sourced-cost-core.js');
const fuel=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/aaa-dfw-fuel-prices.json'),'utf8'));
const counties=JSON.parse(fs.readFileSync(path.join(__dirname,'..','county-scopes.json'),'utf8'));
const date=new Date('2026-11-09T12:00:00Z');
test('verified AAA 2026-11-08 snapshot distinguishes Collin / Dallas from Tarrant metro',()=>{
 const allen=model.getLocalFuel({snapshot:fuel,counties,zip:'75013',grade:'regular',now:date});
 assert.deepEqual([allen.status,allen.metro,allen.price,allen.priceDate],
  ['available','Dallas',3.3431,'2026-11-08']);
 const westlake=model.getLocalFuel({snapshot:fuel,counties,zip:'76092',grade:'regular',now:date});
 assert.equal(westlake.metro,'Fort Worth-Arlington');
 assert.equal(westlake.price,3.3749);
 const premium=model.getLocalFuel({snapshot:fuel,counties,zip:'75013',grade:'premium',now:date});
 assert.equal(premium.price,4.1342);
 assert.equal(model.getLocalFuel({snapshot:fuel,counties,zip:'99999',now:date}).price,null);
});
test('stale or malformed gas price is never sold as live or zero',()=>{
 assert.equal(model.getLocalFuel({snapshot:fuel,counties,zip:'75013',
   now:new Date('2026-12-12T12:00:00Z')}).status,'stale');
 assert.equal(model.getLocalFuel({snapshot:fuel,counties,zip:'75013',
   grade:'electricity',now:date}).price,null);
 const corrupt=structuredClone(fuel);corrupt.metro.Dallas.regular=-1;
 assert.equal(model.getLocalFuel({snapshot:corrupt,counties,zip:'75013',now:date}).status,'invalid-price');
});
test('EPA menu/value API supports a year-make-model-option chain',()=>{
 assert.match(model.apiMenuUrl('make',{year:2017}),/menu\/make\?year=2017$/);
 assert.match(model.apiMenuUrl('model',{year:2017,make:'Honda'}),/make=Honda/);
 assert.match(model.apiMenuUrl('options',{year:2017,make:'Honda',model:'Accord'}),/model=Accord/);
 assert.equal(model.vehicleUrl(38145),'https://www.fueleconomy.gov/ws/rest/vehicle/38145');
 assert.throws(()=>model.apiMenuUrl('options',{year:0,make:'Honda',model:'Accord'}));
 assert.deepEqual(model.normalizeMenu({menuItem:[{text:'Honda',value:'Honda'}]}),[{text:'Honda',value:'Honda'}]);
 assert.deepEqual(model.normalizeMenu({menuItem:{text:'2017',value:'2017'}}),[{text:'2017',value:'2017'}]);
});
test('EPA fuel type and combined MPG are validated, EV does not fake gasoline MPG',()=>{
 assert.deepEqual(model.vehicleInfo({comb08:30,year:2017,make:'Honda',
    model:'Accord',fuelType1:'Regular Gasoline'}).mpg,30);
 assert.equal(model.vehicleInfo({comb08:27,fuelType1:'Premium Gasoline'}).grade,'premium');
 assert.equal(model.vehicleInfo({comb08:35,fuelType1:'Diesel'}).grade,'diesel');
 assert.equal(model.vehicleInfo({comb08:0,fuelType1:'Electricity'}).status,'unsupported');
 assert.equal(model.vehicleInfo({comb08:null,fuelType1:'Gasoline'}).status,'unsupported');
});
test('sourced fuel subtotal only; never fabricate an unknown toll or full monthly route cost',()=>{
 const cost=model.estimateKnownFuel({outboundMiles:20,returnMiles:20,mpg:30,gasPrice:3.3431,days:20,
   oneWayMinutes:25});
 assert.equal(cost.monthlyFuelUsd,89.15);
 assert.equal(cost.oneWayMinutes,25);
 assert.equal(cost.tollUsd,null);assert.equal(cost.totalUsd,null);
 assert.equal(model.estimateKnownFuel({outboundMiles:20,returnMiles:20,mpg:null,gasPrice:3.3,days:20}).status,'incomplete');
 const scenarios=model.renderScenarios({fuel:cost});
 assert.equal(scenarios.fast.minutes,25);
 assert.equal(scenarios.avoid.minutes,null);
 assert.equal(scenarios.avoid.totalUsd,null);
 assert.equal(scenarios.comparisonReady,false);
});
test('TollTag payment factors apply only to NTTA, never to variable TEXpress prices',()=>{
 assert.equal(model.paymentPolicy('tolltag').nttaFactor,1);
 assert.equal(model.paymentPolicy('zipcash').nttaFactor,2);
 assert.equal(model.paymentPolicy('zipcash_autopay').nttaFactor,1.5);
 for(const v of ['tolltag','zipcash','zipcash_autopay'])assert.equal(model.paymentPolicy(v).expressFactor,null);
 assert.equal(model.paymentPolicy('unknown'),null);
});
test('route deep links are distinct and only disclose map coordinates upon click',()=>{
 const p=[33.10,-96.80],dest=[33.08,-96.82];
 const fast=model.directionsLink(p,dest);
 const cheap=model.directionsLink(p,dest,{avoidTolls:true});
 assert.equal(new URL(fast).searchParams.get('avoid'),null);
 assert.equal(new URL(cheap).searchParams.get('avoid'),'tolls');
 assert.equal(new URL(cheap).searchParams.get('travelmode'),'driving');
 assert.equal(model.directionsLink(null,dest),null);
 const back=model.directionsLink(p,dest,{reverse:true});
 assert.equal(new URL(back).searchParams.get('origin'),'33.080000,-96.820000');
});
test('same-origin isolation: CSP preserves script hash and allows only official EPA APIs, no personal data',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'..','features/commute/sourced-cost-ui.js'),'utf8');
 assert.ok(html.includes('features/commute/sourced-cost-ui.js?v=1'));
 assert.ok(html.includes('features/commute/sourced-cost-core.js?v=1'));
 assert.ok(html.includes('https://www.fueleconomy.gov'));
 assert.ok(html.includes("script-src-attr 'none'"));
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|innerHTML\s*=/);
 assert.ok(js.includes('smartLegacyAdvanced'));
 assert.ok(js.includes('Google 지도에서 유료도로 회피'));
 assert.ok(js.includes('NTTA 주소별 공식 Toll Calculator'));
 assert.ok(js.includes('TEXpress TxDOT 변동요금'));
});
