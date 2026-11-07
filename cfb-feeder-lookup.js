'use strict';
// CFB 2026-27 official feeder *paths*, not geolocated residence assignments.
// The independent GuideK12 address finder was not verified to return
// property-specific zoned campuses on 2026-11-07. Never infer residence from
// a feeder table, a school point, or an unfiltered list of campuses.
function cfbFeederKey(value){
 return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/\b(?:elementary|school|campus)\b/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function cfbOfficialFeederValid(data){
 return data?.academicYearExplicit==='2026–27'
  &&data?.notAddressSchoolLookup===true
  &&data?.notParcelGeometries===true
  &&Array.isArray(data?.rows)&&data.rows.length===21
  &&data.rows.every(r=>r?.zonedElementary&&r?.middle&&r?.high)
  &&data?.crossSourceAudit?.conflictingRows===1
  &&data?.officialSourceConflicts?.some(x=>x.school==='Farmers Branch'&&x.status==='unresolved-do-not-auto-assign');
}
function cfbFeederByElementary(name,reference){
 if(!cfbOfficialFeederValid(reference))return {status:'source-unavailable'};
 const key=cfbFeederKey(name);
 if(!key)return {status:'no-school-selected'};
 const matches=reference.rows.filter(row=>cfbFeederKey(row.zonedElementary)===key);
 if(matches.length!==1)return {status:matches.length?'ambiguous':'school-not-found'};
 const row=matches[0];
 if(row.feederVerification==='conflicting-official-sources'
  ||reference.officialSourceConflicts.some(x=>cfbFeederKey(x.school)===key)){
  return {status:'official-disagreement',elementary:row.zonedElementary,
   sourceKind:'official-feeder-only',propertyAssignmentVerified:false};
 }
 return {status:'feeder-reference',elementary:row.zonedElementary,middle:row.middle,high:row.high,
  sourceKind:'official-feeder-only',propertyAssignmentVerified:false,schoolYear:'2026–27'};
}
function initCfbFeederLookup(){
 const section=document.getElementById('cfbFeederSection');
 const select=document.getElementById('cfbElementary');
 const output=document.getElementById('cfbFeederResult');
 const status=document.getElementById('cfbFeederStatus');
 const overview=document.getElementById('cfbFeederAll');
 if(!section||!select||!output||!status)return;
 let dataset=null,request=null;
 const node=(tag,txt)=>{const e=document.createElement(tag);e.textContent=String(txt||'');return e};
 function renderAll(){
  if(!overview||!dataset)return;
  overview.replaceChildren();
  const table=node('table','');table.className='data-table';
  const head=node('thead',''),hrow=node('tr','');
  for(const label of ['초등 · 교육청에서 확인', '중학교 · 진학표 참고', '고등학교 · 진학표 참고']){
   const th=node('th',label);th.scope='col';hrow.appendChild(th);
  }
  head.appendChild(hrow);table.appendChild(head);
  const body=node('tbody','');
  for(const row of dataset.rows){
   const result=cfbFeederByElementary(row.zonedElementary,dataset);
   const tr=node('tr','');
   tr.appendChild(node('td',row.zonedElementary));
   if(result.status==='feeder-reference'){
    tr.appendChild(node('td',result.middle));
    tr.appendChild(node('td',result.high));
   }else{
    tr.appendChild(node('td','공식 자료 충돌 · 확인 필요'));
    tr.appendChild(node('td','자동 판단 중단'));
   }
   body.appendChild(tr);
  }
  table.appendChild(body);overview.appendChild(table);
 }
 function render(){
  output.replaceChildren();
  const r=cfbFeederByElementary(select.value,dataset);
  if(r.status==='no-school-selected'){status.textContent='배정된 초등학교를 알고 있을 때 선택하세요.';return}
  if(r.status==='official-disagreement'){
   output.appendChild(node('strong','교육청 공식 자료 간 불일치 · 진학 학교 자동 표기 중단'));
   output.appendChild(node('p','Farmers Branch Elementary: 서로 다른 2026–27 교육청 자료에서 중학교·고등학교 진학 경로가 다릅니다. CFB Student Services에 현재 주소·학년을 확인하세요.'));
   status.textContent='공식 자료 충돌 · 학교 판단 보류';return;
  }
  if(r.status!=='feeder-reference'){status.textContent='해당 학교의 검증된 진학표가 없습니다.';return}
  output.appendChild(node('strong',r.elementary+' Elementary'));
  const dl=node('dl','');dl.className='lisd-campus-grid';
  for(const [label,value] of [['중학교 · 참고 진학 경로',r.middle],['고등학교 · 참고 진학 경로',r.high]]){dl.appendChild(node('dt',label));dl.appendChild(node('dd',value))}
  output.appendChild(dl);
  output.appendChild(node('p','2026–27 교육청 공식 진학표의 중·고등 경로입니다. 주소 배정 결과가 아니며, Pre-K·이중언어·전학·건물별 예외는 별도 확인해야 합니다.'));
  status.textContent='공식 2026–27 진학표 참고 · 해당 주택 주소 배정은 미검증';
 }
 function load(){
  if(request)return;
  status.textContent='CFB 2026–27 교육청 진학표를 불러오는 중…';
  request=fetch('./cfb-official-feeder-reference-2026.json',{cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
   .then(d=>{
    if(!cfbOfficialFeederValid(d))throw Error('CFB feeder source changed');
    dataset=d;
    for(const row of d.rows){
     const option=document.createElement('option');option.value=row.zonedElementary;option.textContent=row.zonedElementary+' Elementary';
     select.appendChild(option);
    }
    renderAll();
    render();
   }).catch(err=>{dataset=null;status.textContent='공식 진학표를 불러오지 못했습니다. 교육청에 직접 확인하세요.';console.warn('CFB feeder load',err)});
 }
 section.addEventListener('toggle',()=>{if(section.open)load()});
 select.addEventListener('focus',load);
 select.addEventListener('change',render);
 select.addEventListener('input',render);
 // 21-row JSON is small. Eager loading avoids browsers/embedded clients that
 // fail to dispatch the details.toggle event before the user selects a campus.
 load();
}
if(typeof module!=='undefined')module.exports={cfbFeederKey,cfbOfficialFeederValid,cfbFeederByElementary};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',initCfbFeederLookup);
