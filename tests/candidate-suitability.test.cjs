'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {addCandidate,removeCandidate,normalizedCandidateAddress,parseCandidateMinutes,
  updateCandidateMinutes,candidateSuitability,orderedCandidateSuitability}=require('../candidate-compare.js');

const home=(address='100 Example St, Plano, TX 75093')=>({
  address,typedAddress:address,ll:[33.03,-96.77],
  geocodeQuality:{usableForSchoolCandidate:true}
});
const fact=(row,id)=>row.find(x=>x.id===id);

test('max three transient home candidates, normalized duplicates, and removal',()=>{
  let rows=[];
  for(const address of ['100 Oak St','200 Maple St','300 Elm St'])rows=addCandidate(rows,home(address));
  assert.equal(rows.length,3);
  assert.equal(addCandidate(rows,home('400 Main St')).length,3);
  assert.equal(addCandidate(rows,home(' 100   OAK st ')).length,3);
  assert.deepEqual(removeCandidate(rows,1).map(x=>x.address),['100 Oak St','300 Elm St']);
  assert.equal(normalizedCandidateAddress(' 100   OAK st '),'100 oak st');
});
test('missing or invalid coordinates cannot enter address comparison',()=>{
  assert.equal(addCandidate([],{address:'No Location',ll:[NaN,-96]}).length,0);
  assert.equal(addCandidate([],{address:'No Location',ll:[33]}).length,0);
  assert.equal(addCandidate([],{address:'',ll:[33,-96]}).length,0);
  assert.equal(addCandidate([],null).length,0);
});
test('input minutes reject 0, NaN, decimals, infinity and >240; blank clears',()=>{
  for(const input of [undefined,null,'','  ','0','-1','1.3','241','Infinity','not a number'])
    assert.equal(parseCandidateMinutes(input),null,String(input));
  for(const input of ['1','30',42,'240'])assert.equal(parseCandidateMinutes(input),Number(input));
});
test('manual travel input is independent for each candidate and remains in memory',()=>{
  const initial=[home('A'),home('B')];
  const rows=updateCandidateMinutes(initial,0,'commute','29');
  assert.equal(rows[0].travelMinutes.commute,29);
  assert.equal(rows[1].travelMinutes,undefined);
  assert.equal(initial[0].travelMinutes,undefined);
  assert.equal(updateCandidateMinutes(rows,0,'commute','')[0].travelMinutes.commute,null);
  assert.equal(updateCandidateMinutes(rows,-1,'commute',20),rows);
  assert.equal(updateCandidateMinutes(rows,1,'not-a-field',20),rows);
});
test('no reference GIS or TEA rating can certify E/M/H at a residence',()=>{
  const statuses=['current','finder-current','reference','unverified-year',
    'conditional-finder-only','unavailable','error'];
  for(const status of statuses){
    const school=fact(candidateSuitability({...home(),schoolGrades:['A','A','A']},{status}),'school');
    assert.equal(school.state,'unknown',status);
    assert.match(school.value,/미확인/);
  }
});
test('boundary, conflicting and split-apartment school evidence stays unresolved',()=>{
  for(const status of ['conflict','apartment-split-review','feeder-review',
    'boundary-review','finder-boundary-review','needs-address-verification']){
    const school=fact(candidateSuitability(home(),{status}),'school');
    assert.equal(school.state,'conflict',status);
  }
  assert.equal(fact(candidateSuitability(home(),{status:'loading'}),'school').state,'loading');
});
test('30 minutes is a user-input threshold, never measured drive-time',()=>{
  const x=home();
  assert.equal(fact(candidateSuitability(x,{}),'commute').state,'unknown');
  x.travelMinutes={commute:30};
  const at=fact(candidateSuitability(x,{}),'commute');
  assert.equal(at.state,'entered-met');
  assert.match(at.value,/입력 기준/);
  assert.match(at.note,/사용자 입력/);
  x.travelMinutes={commute:31};
  assert.equal(fact(candidateSuitability(x,{}),'commute').state,'entered-over');
});
test('church and ballet have user-entered minutes but no fabricated target',()=>{
  const rows=candidateSuitability({...home(),travelMinutes:{church:16,ballet:28}},{});
  for(const id of ['church','ballet']){
    assert.equal(fact(rows,id).state,'entered');
    assert.match(fact(rows,id).note,/기준 미설정/);
  }
  assert.equal(fact(rows,'hazards').state,'unknown');
  assert.equal(fact(rows,'healthcare').state,'unknown');
});
test('priority reorders criteria without aggregate score or demographic steering',()=>{
  const facts=candidateSuitability(home(),{});
  const reordered=orderedCandidateSuitability(facts,'ballet');
  assert.equal(reordered[0].id,'ballet');
  assert.equal(reordered.length,7);
  assert.equal(facts[0].id,'school');
  assert.deepEqual(orderedCandidateSuitability(facts,'invalid'),facts);
  assert.equal(facts.some(f=>/indian|korean|ethnic/i.test(f.id)),false);
});
test('UI retains original map navigation, in-memory data, CSP-safe stylesheet and accessible inputs',()=>{
  const source=fs.readFileSync(path.join(root,'candidate-compare.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'features/candidate-suitability.css'),'utf8');
  assert.match(source,/let comparisons = \[\]/);
  assert.match(source,/useHomeCandidate\(\{address:item.address/);
  assert.match(source,/data-candidate-minutes/);
  assert.match(source,/candidate-demographics/);
  assert.match(source,/demographicsExpanded/);
  assert.match(source,/aria-label="후보 /);
  assert.match(source,/data-candidate-suitability-css/);
  assert.match(source,/candidate-suitability\.css\?v=2/);
  assert.match(css,/html\[data-theme="dark"\]/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/focus-visible/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|sendBeacon|document\.cookie/);
  assert.doesNotMatch(source,/fetch\(|XMLHttpRequest/);
});


test('rental and photos are transient self-reports, not verified home rankings',()=>{
 const {parseCandidateRent,updateCandidateHousing,housingCandidateFact}=require('../candidate-compare.js');
 const base=[home('A'),home('B')];
 assert.equal(housingCandidateFact(base[0]).state,'unknown');
 for(const raw of ['',null,'0','-1','200.5','30001','Infinity'])assert.equal(parseCandidateRent(raw),null);
 assert.equal(parseCandidateRent('2500'),2500);
 const changed=updateCandidateHousing(base,0,'monthlyRent','2450');
 assert.equal(base[0].homeNotes,undefined);
 assert.equal(changed[1].homeNotes,undefined);
 assert.match(housingCandidateFact(changed[0]).value,/\$2,450/);
 const marked=updateCandidateHousing(changed,0,'photosReviewed',true);
 assert.match(housingCandidateFact(marked[0]).value,/사진 검토 표시/);
 assert.match(housingCandidateFact(marked[0]).note,/별도 확인/);
 assert.equal(updateCandidateHousing(base,10,'monthlyRent','2000'),base);
 assert.equal(updateCandidateHousing(base,0,'unknown','2000'),base);
 const signals=candidateSuitability(marked[0],{status:'current'});
 assert.equal(fact(signals,'school').state,'unknown');
 assert.equal(fact(signals,'housing').state,'entered');
 assert.equal(orderedCandidateSuitability(signals,'housing')[0].id,'housing');
 const source=fs.readFileSync(path.join(root,'candidate-compare.js'),'utf8');
 assert.doesNotMatch(source,/localStorage|sessionStorage|sendBeacon|XMLHttpRequest/);
 assert.match(source,/housingExpanded/);
 assert.match(source,/data-candidate-photos/);
});
