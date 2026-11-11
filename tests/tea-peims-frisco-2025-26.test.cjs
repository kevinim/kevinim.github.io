'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const batch=require('../data/tea-peims-2025-26/frisco-isd.json');
const inventory=require('../tea-ratings-2026.json').data;
const groups=['black','hispanic','white','native','asian','pacific','multi'];
const scope=inventory.filter(x=>x.district==='FISD');
test('Frisco: exact 9-digit IDs, names, school year, official TEA link',()=>{
  assert.equal(batch.schoolYear,'2025-26');
  assert.equal(batch.teaDistrictId,'043905');
  assert.equal(batch.stagingProvenance.releaseEligible,false);
  assert.equal(batch.stagingProvenance.independentRawCsvParity,'pending');
  const u=new URL(batch.sourceUrl);
  assert.equal(u.hostname,'rptsvr1.tea.texas.gov');
  assert.equal(u.searchParams.get('key'),'043905');
  assert.equal(u.searchParams.get('endyear'),'26');
  assert.equal(u.searchParams.get('grouping'),'e');
  assert.equal(scope.length,76);
  assert.deepEqual(Object.keys(batch.campuses).sort(),scope.map(x=>x.id).sort());
  for(const r of scope){
    assert.match(r.id,/^[0-9]{9}$/);
    assert.equal(batch.campuses[r.id].district,'FISD');
    assert.equal(batch.campuses[r.id].name,r.officialName);
  }
});
test('Frisco: only published integer counts, no masked or inferred data',()=>{
  const totals={published:0,suppressed:0,'not-listed':0};
  for(const p of Object.values(batch.campuses)){
    assert.deepEqual(Object.keys(p.counts).sort(),groups.slice().sort());
    for(const k of groups){
      const c=p.counts[k];
      assert.ok(['published','suppressed','not-listed'].includes(c.status));
      totals[c.status]++;
      if(c.status==='published'){
        assert.ok(Number.isSafeInteger(c.count)&&c.count>=0);
        assert.equal(c.publishedMask,undefined);
      }else{
        assert.equal(c.count,undefined);
        if(c.status==='suppressed')assert.match(c.publishedMask,/^<[1-9][0-9]*$/);
      }
    }
    assert.equal(Object.values(p.counts).every(c=>c.status==='published'),false);
  }
  assert.deepEqual(totals,{"published":341,"suppressed":132,"not-listed":59});
  assert.deepEqual(totals,batch.cellStatusTotals);
  assert.equal(Object.keys(batch.campuses).length,76);
});
