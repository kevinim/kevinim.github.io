'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../scripts/prosper-official-tax-grid-parity.cjs');
function square(x,y){return [[x-.003,y-.003],[x+.003,y-.003],[x+.003,y+.003],[x-.003,y+.003],[x-.003,y-.003]];}
function zone(schoolCode,grade,x,y){return {
 properties:{schoolCode,gradeLevel:grade},
 geometry:{type:'MultiPolygon',coordinates:[[square(x,y)]]}
};}
const point=[-96.8,33.23];
const features=[
 zone('101','elementary',point[0],point[1]),
 zone('041','middle',point[0]+.03,point[1]+.03),
 zone('001','high',point[0]+.03,point[1]+.03)
];
test('public finder endpoint restricted to deterministic synthetic coordinates, not home address',()=>{
 const u=new URL(api.queryUrl(point));
 assert.equal(u.protocol,'https:');
 assert.equal(u.hostname,'www.infofinderi.com');
 assert.match(u.pathname,/SearchRequest.asmx\/SearchLocation$/);
 assert.equal(u.searchParams.get('clientId'),'PI5FFG7RYZ1');
 assert.equal(u.searchParams.get('schoolId'),'-1');
 assert.equal(u.searchParams.get('gradeId'),'-1');
 assert.equal(u.searchParams.has('address'),false);
 assert.throws(()=>api.queryUrl([-120,40]));
 assert.throws(()=>api.queryUrl([null,33]));
});
test('published GIS code presence and missing-grade disagreement are independently counted',()=>{
 assert.deepEqual(api.compare(['101'],point,features),{
  allGISCodesReturned:true,returnedMissingGISGrade:false,returnedUnknownCampus:false
 });
 assert.deepEqual(api.compare(['101','041'],point,features),{
  allGISCodesReturned:true,returnedMissingGISGrade:true,returnedUnknownCampus:false
 });
 assert.equal(api.compare(['041'],point,features).allGISCodesReturned,false);
 assert.equal(api.compare(['101','999'],point,features).returnedUnknownCampus,true);
 assert.throws(()=>api.compare(['ownerAddress'],point,features));
});
test('bounded official map-click fetch fails closed and no school names are retained',async()=>{
 const mock=async()=>({ok:true,json:async()=>({resultCode:200,schools:[{
  schoolCode:101,schoolName:'PRIVATE-SOURCE-NOT-PERSISTED'}]})});
 assert.deepEqual(await api.look(point,mock),['101']);
 const bad=async()=>({ok:true,json:async()=>({resultCode:403,schools:[]})});
 await assert.rejects(api.look(point,bad),/malformed|rejected/);
});
test('aggregate official lookup report hides coordinates/campus details and tracks failures',async()=>{
 const selected=[{point,missing:'middle+high'},...Array.from({length:2},()=>({point,missing:'middle+high'}))];
 const ok=async()=>({ok:true,json:async()=>({resultCode:200,schools:[{schoolCode:101},{schoolCode:41}]})});
 const summary=await api.inspect(selected,features,ok);
 assert.equal(summary.qualifiedResidentialProsperTaxCategoryCells,3);
 assert.equal(summary.comparable,3);
 assert.equal(summary.allGISCodesReturned,3);
 assert.equal(summary.officialReturnedCampusInMissingGISGrade,3);
 assert.doesNotMatch(JSON.stringify(summary),/96\.8|PRIVATE|address|schoolCode|point/i);
 let calls=0;
 const nope=async()=>{calls++;throw Error('offline')};
 const partial=await api.inspect(selected,features,nope);
 assert.equal(partial.publicFinderUnavailable,3);
 assert.equal(partial.comparable,0);
 assert.equal(calls,6,'one bounded retry only for each synthetic public query');
});
