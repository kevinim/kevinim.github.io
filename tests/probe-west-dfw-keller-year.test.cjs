'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {yearQueryUrl,readYearResponse,classifyObservedYears,fetchYears}=require('../scripts/probe-west-dfw-keller-year.cjs');

test('GIS probe whitelists four Keller boundary layers and excludes geometry',()=>{
 for(const id of [2,3,4,5]){
  const u=new URL(yearQueryUrl(id));
  assert.equal(u.protocol,'https:');
  assert.equal(u.hostname,'arcgis.cityofkeller.com');
  assert.equal(u.searchParams.get('returnGeometry'),'false');
  assert.equal(u.searchParams.get('outFields'),'SCHL_YEAR');
  assert.equal(u.searchParams.get('returnDistinctValues'),'true');
  assert.equal(u.searchParams.get('where'),'1=1');
 }
 for(const invalid of [0,1,6,99,'2',null])assert.throws(()=>yearQueryUrl(invalid),/layer_not_allowed/);
});
test('Keller 2018-19 unique year correctly stays historical and not current',()=>{
 const years=readYearResponse({features:[{attributes:{SCHL_YEAR:'2018-19'}}]});
 assert.deepEqual(years,['2018-19']);
 assert.equal(classifyObservedYears(years),'HISTORICAL_2018_19_CONFIRMED');
});
test('a future academic year cannot be silently promoted to current zones',()=>{
 const years=readYearResponse({features:[
  {attributes:{SCHL_YEAR:'2018-19'}},{attributes:{SCHL_YEAR:'2026-27'}}
 ]});
 assert.equal(classifyObservedYears(years),'REVIEW_REQUIRED_SOURCE_CHANGED');
 assert.equal(classifyObservedYears(['2026-27']),'REVIEW_REQUIRED_SOURCE_CHANGED');
});
test('malformed source payload fails rather than inventing a year',()=>{
 for(const v of [{},{error:{message:'no access'}},{features:[]},{features:[{attributes:{SCHL_YEAR:'never'}}]},
  {features:[{attributes:{SCHL_YEAR:2026}}]}])
  assert.throws(()=>readYearResponse(v),/arcgis_year/);
});
test('fetch uses metadata-only URL, a bounded response and controlled method',async()=>{
 const data={features:[{attributes:{SCHL_YEAR:'2018-19'}}]};
 const calls=[];
 const result=await fetchYears(3,async(url,opts)=>{
  calls.push({url:String(url),method:opts.method,accept:opts.headers.Accept});
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 });
 assert.deepEqual(result,['2018-19']);
 assert.equal(calls[0].method,'GET');
 assert.equal(calls[0].accept,'application/json');
 assert.match(calls[0].url,/returnGeometry=false/);
});
test('oversized remote responses fail closed',async()=>{
 await assert.rejects(()=>fetchYears(2,async()=>new Response('X'.repeat(65000),{status:200})),
  /response_size_exceeded/);
});
