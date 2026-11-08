'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMonthlyCommute: calc, compareRouteCosts: compare } = require('../features/commute/cost-model.js');
const base = {
  daysPerMonth: 20, paymentMode:'tolltag', nttaRoadsUsed: true, expressLanesUsed:false,
  outboundMiles:20, returnMiles:25, milesPerGallon:30, fuelPricePerGallon:3.00, parkingPerDayUsd:0,
  outboundNttaTollTagUsd:1.25, returnNttaTollTagUsd:1.75
};
test('directional TollTag costs + fuel, months and annual', () => {
  const r = calc(base);
  assert.equal(r.status,'ESTIMATE');
  assert.deepEqual(r.components,{nttaPerMonthUsd:60,expressPerMonthUsd:0,tollPerMonthUsd:60,
    fuelPerMonthUsd:90,parkingPerMonthUsd:0,totalPerMonthUsd:150,totalPerYearUsd:1800});
});
test('NTTA ZipCash twice TollTag and autopay 25% less than ZipCash', () => {
  assert.equal(calc({...base,paymentMode:'zipcash'}).components.nttaPerMonthUsd,120);
  assert.equal(calc({...base,paymentMode:'zipcash_autopay'}).components.nttaPerMonthUsd,90);
});
test('TEXpress quote is not multiplied by NTTA ZipCash factor', () => {
  const r=calc({...base,paymentMode:'zipcash',expressLanesUsed:true,outboundExpressUsd:2.10,returnExpressUsd:3.20});
  assert.equal(r.components.nttaPerMonthUsd,120);
  assert.equal(r.components.expressPerMonthUsd,106);
  assert.equal(r.components.totalPerMonthUsd,316);
});
test('unknown toll is null, not silently zero', () => {
  const r=calc({...base,returnNttaTollTagUsd:null});
  assert.equal(r.status,'INCOMPLETE_QUOTE');
  assert.equal(r.components.tollPerMonthUsd,null);
  assert.equal(r.components.totalPerMonthUsd,null);
  assert.equal(r.components.fuelPerMonthUsd,90);
  assert.deepEqual(r.missingQuotes,['returnNttaTollTagUsd']);
});
test('explicitly toll-free route costs only fuel and parking', () => {
  const r=calc({...base,nttaRoadsUsed:false,expressLanesUsed:false,
    outboundNttaTollTagUsd:undefined,returnNttaTollTagUsd:undefined,parkingPerDayUsd:4});
  assert.equal(r.components.tollPerMonthUsd,0);
  assert.equal(r.components.totalPerMonthUsd,170);
});
test('zero office days are valid, no fabricated toll quote', () => {
  const r=calc({...base,daysPerMonth:0,outboundNttaTollTagUsd:null});
  assert.equal(r.components.fuelPerMonthUsd,0);
  assert.equal(r.components.totalPerMonthUsd,null);
});
test('asymmetric distances and gas/parking plus annual projection', () => {
  const r=calc({...base,outboundMiles:15,returnMiles:30,parkingPerDayUsd:5.55});
  assert.equal(r.components.fuelPerMonthUsd,90);
  assert.equal(r.components.parkingPerMonthUsd,111);
  assert.equal(r.components.totalPerYearUsd,3132);
});
test('bad inputs rejected without NaN, unchecked toll roads rejected', () => {
  for(const change of [{milesPerGallon:0},{daysPerMonth:-1},{daysPerMonth:9.5},
    {fuelPricePerGallon:NaN},{nttaRoadsUsed:undefined},{expressLanesUsed:undefined},
    {outboundNttaTollTagUsd:-1},{outboundMiles:'not a number'}]){
    assert.throws(()=>calc({...base,...change}));
  }
});
test('route comparison does not invent time saved',()=>{
  const free={...base,nttaRoadsUsed:false,outboundNttaTollTagUsd:null,returnNttaTollTagUsd:null};
  const result=compare(base,free);
  assert.equal(result.premiumPerMonthUsd,60);
  assert.equal(result.minutesSavedPerMonth,null);
  assert.equal(result.dollarsPerHourSaved,null);
  const timed=compare(base,free,{minutesSavedPerRoundTrip:30});
  assert.equal(timed.minutesSavedPerMonth,600);
  assert.equal(timed.dollarsPerHourSaved,6);
});
test('quotes unknown do not produce misleading savings',()=>{
  const result=compare(base,{...base,returnNttaTollTagUsd:undefined},{minutesSavedPerRoundTrip:30});
  assert.equal(result.premiumPerMonthUsd,null);
  assert.equal(result.dollarsPerHourSaved,null);
});
