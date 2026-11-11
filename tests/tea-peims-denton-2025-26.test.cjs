'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const data=require('../data/tea-peims-2025-26/denton-isd.json');
const inventory=require('../tea-ratings-2026.json').data;
const eligible=inventory.filter(x=>x.district==='061901');
const groups=['black','hispanic','white','native','asian','pacific','multi'];
test('Denton exact TEA campus inventory and source-year join',()=>{
  assert.equal(data.schemaVersion,1);
  assert.equal(data.schoolYear,'2025-26');
  assert.equal(data.teaDistrictId,'061901');
  assert.equal(data.stagingProvenance.releaseEligible,false);
  assert.equal(data.stagingProvenance.independentRawCsvParity,'pending');
  const url=new URL(data.sourceUrl);
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,'rptsvr1.tea.texas.gov');
  assert.equal(url.searchParams.get('_program'),'adhoc.addispatch.sas');
  assert.equal(url.searchParams.get('endyear'),'26');
  assert.equal(url.searchParams.get('grouping'),'e');
  assert.equal(url.searchParams.get('key'),'061901');
  assert.equal(eligible.length,46);
  assert.deepEqual(Object.keys(data.campuses).sort(),eligible.map(x=>x.id).sort());
  for(const r of eligible){
    assert.match(r.id,/^[0-9]{9}$/);
    assert.equal(data.campuses[r.id].name,r.officialName);
    assert.equal(data.campuses[r.id].district,'061901');
    assert.equal(r.id.slice(0,6),'061901');
  }
});
test('Denton source cells preserve released counts, masked thresholds, and unlisted fields',()=>{
  const totals={published:0,suppressed:0,'not-listed':0},complete=[];
  for(const [id,r] of Object.entries(data.campuses)){
    assert.deepEqual(Object.keys(r.counts).sort(),groups.slice().sort());
    if(groups.every(k=>r.counts[k].status==='published'))complete.push(id);
    for(const group of groups){
      const v=r.counts[group];
      assert.ok(Object.hasOwn(totals,v.status));
      totals[v.status]++;
      if(v.status==='published'){
        assert.ok(Number.isSafeInteger(v.count)&&v.count>=0);
        assert.equal(v.publishedMask,undefined);
      } else {
        assert.equal(v.count,undefined,'masked or unlisted count must never be invented');
        if(v.status==='suppressed')assert.match(v.publishedMask,/^<[1-9][0-9]*$/);
        if(v.status==='not-listed')assert.equal(v.publishedMask,undefined);
      }
    }
  }
  assert.deepEqual(totals,{"published":193,"suppressed":91,"not-listed":38});
  assert.deepEqual(data.cellStatusTotals,totals);
  assert.deepEqual(data.completeSevenCategoryCampusIds,complete);
  assert.equal(Object.keys(data.campuses).length,46);
});
