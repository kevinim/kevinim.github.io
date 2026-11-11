'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const batch=require('../data/tea-peims-2025-26/plano-isd.json');
const inventory=require('../tea-ratings-2026.json').data;
const groups=['black','hispanic','white','native','asian','pacific','multi'];
const scope=inventory.filter(x=>x.district==='PISD');
test('Plano campus identities and TEA year/provenance remain exact',()=>{
  assert.equal(batch.schoolYear,'2025-26');
  assert.equal(batch.teaDistrictId,'043910');
  assert.equal(batch.stagingProvenance.releaseEligible,false);
  assert.equal(batch.stagingProvenance.independentRawCsvParity,'pending');
  const u=new URL(batch.sourceUrl);
  assert.equal(u.hostname,'rptsvr1.tea.texas.gov');
  assert.equal(u.searchParams.get('key'),'043910');
  assert.equal(u.searchParams.get('endyear'),'26');
  assert.equal(u.searchParams.get('grouping'),'e');
  assert.equal(scope.length,69);
  assert.deepEqual(Object.keys(batch.campuses).sort(),scope.map(x=>x.id).sort());
  for(const school of scope){
    assert.match(school.id,/^\\d{9}$/);
    assert.equal(batch.campuses[school.id].district,'PISD');
    assert.equal(batch.campuses[school.id].name,school.officialName);
  }
});
test('Plano masks are never converted into zeros or percentages',()=>{
  const totals={published:0,suppressed:0,'not-listed':0};
  for(const record of Object.values(batch.campuses)){
    assert.deepEqual(Object.keys(record.counts).sort(),groups.slice().sort());
    for(const group of groups){
      const cell=record.counts[group];
      assert.ok(['published','suppressed','not-listed'].includes(cell.status));
      totals[cell.status]++;
      if(cell.status==='published'){
        assert.ok(Number.isSafeInteger(cell.count)&&cell.count>=0);
        assert.equal(cell.publishedMask,undefined);
      }else{
        assert.equal(cell.count,undefined);
        if(cell.status==='suppressed')assert.equal(cell.publishedMask,'<10');
      }
    }
    assert.equal(Object.values(record.counts).every(c=>c.status==='published'),false);
  }
  assert.deepEqual(totals,{"published":286,"suppressed":132,"not-listed":65});
  assert.deepEqual(totals,batch.cellStatusTotals);
  assert.equal(Object.keys(batch.campuses).length,69);
});
