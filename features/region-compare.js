'use strict';
/* Compare 2–3 ZIP contexts. Address candidates, school assignment, hazards and map internals are untouched. */
(function(){
 const model=window.RegionCompareCore,assessment=window.AreaAssessmentCore;
 if(!model||!assessment)return;
 const $=id=>document.getElementById(id);
 let available=[],byZip=new Map(),chosen=[],showThird=true,county=null,noaa=null,crime=null,queued=false,sourceError=false,sourceStarted=false;
 const selectors=[];
 function n(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e}
 function announce(message){if($('regionCompareStatus'))$('regionCompareStatus').textContent=message}
 function summaryText(){
   const label=$('regionCompareSummaryMeta');
   if(label)label.textContent=chosen.slice(0,showThird?3:2).join(' · ')+' · ZIP 비교';
 }
 function sourceOptions(){
   if(typeof DATA==='undefined'||!Array.isArray(DATA))return;
   const records=DATA.filter(d=>model.validZip(d?.z));
   const signature=records.map(x=>x.z).join(',');
   if(available.join(',')===signature)return;
   const uniq=new Set(),clean=records.filter(d=>!uniq.has(d.z)&&uniq.add(d.z));
   available=clean.map(d=>d.z);byZip=new Map(clean.map(d=>[d.z,d]));
   chosen=model.uniqueCandidates(chosen.length?chosen:model.DEFAULT_ZIPS,available);
   if(chosen.length<2)return;
   selectors.forEach((select,i)=>{
     select.replaceChildren();
     for(const d of clean){
       const option=n('option','',d.z+' · '+(typeof displayPlace==='function'?displayPlace(d.name):d.name));
       option.value=d.z;select.append(option);
     }
     select.value=chosen[i]||'';
   });
 }
 function school(zip){
   try{
     if(typeof state==='undefined'||!Array.isArray(state.schools)||!state.ratingIndex||
        typeof geometryContains!=='function'||typeof scoreRecord!=='function')return null;
     const polygon=state.polys?.[zip];
     if(!polygon?.toGeoJSON)return null;
     const geometry=polygon.toGeoJSON(),features=geometry.features||(geometry?[geometry]:[]);
     return assessment.summarizeSchools(state.schools,ll=>
       features.some(f=>f?.geometry&&geometryContains([ll[1],ll[0]],f.geometry)),
       s=>scoreRecord(s.name,s.district)?.rating);
   }catch(error){console.warn('Compare school coverage unavailable:',error);return null}
 }
 function columns(){
   return chosen.slice(0,showThird?3:2).map(zip=>{
     const d=byZip.get(zip);
     return model.buildColumn(d,{assessment,county,noaa,crime,school:school(zip),
       commute:typeof state!=='undefined'?state.times?.[zip]:null,
       hasDestination:Boolean($('destination')?.value?.trim())});
   });
 }
 function fill(){
   queued=false;
   const table=$('regionCompareTable');if(!table||!$('regionCompare')?.open)return;
   sourceOptions();
   const cols=columns();
   if(cols.length<2||cols.some(c=>!c))return;
   selectors.forEach((select,i)=>{
     select.value=chosen[i]||'';
     select.disabled=!showThird&&i===2;
     select.closest('.region-compare-picker').hidden=!showThird&&i===2;
   });
   $('regionCompareThird').textContent=showThird?'세 번째 지역 제외':'세 번째 지역 추가';
   summaryText();
   table.caption.textContent=cols.length+'개 ZIP의 지역 통계 및 출처 비교 · 개별 주택 판정 아님';
   const thead=table.tHead||table.createTHead();thead.replaceChildren();
   const header=n('tr');
   const corner=n('th','region-compare-metric','비교 항목');corner.scope='col';header.append(corner);
   for(const c of cols){
     const th=n('th','region-compare-head');th.scope='col';
     th.append(n('strong','',c.zip+' · '+(typeof displayPlace==='function'?displayPlace(c.name):c.name)));
     const open=n('button','region-compare-map-link','지도에서 보기');open.type='button';open.dataset.mapZip=c.zip;
     open.setAttribute('aria-label','ZIP '+c.zip+' 지도에서 보기');
     th.append(open);header.append(th);
   }
   thead.append(header);
   const tbody=table.tBodies[0]||table.createTBody();tbody.replaceChildren();
   let lastGroup='';
   for(const row of model.ROWS){
     if(row.group!==lastGroup){
       lastGroup=row.group;
       const group=n('tr','region-compare-group'),th=n('th','',lastGroup);
       th.scope='rowgroup';th.colSpan=cols.length+1;group.append(th);tbody.append(group);
     }
     const tr=n('tr');const th=n('th','region-compare-metric',row.label);th.scope='row';tr.append(th);
     for(const c of cols){
       const fact=c.rows[row.key],td=n('td','region-compare-data');
       td.append(n('strong','region-compare-value',fact.value),n('span','region-compare-note',fact.note));
       tr.append(td);
     }
     tbody.append(tr);
   }
 }
 function schedule(){if(queued)return;queued=true;window.setTimeout(fill,100)}
 function choose(slot,value){
   if(!available.includes(value)||chosen.some((z,i)=>i!==slot&&i<(showThird?3:2)&&z===value)){
     announce('같은 ZIP을 중복 선택할 수 없습니다. 다른 지역을 선택하세요.');
     selectors[slot].value=chosen[slot];return;
   }
   chosen[slot]=value;announce(value+' 지역을 비교에 반영했습니다.');schedule();
 }
 function fromMap(){
   const zip=$('zipSelect')?.value;
   if(!available.includes(zip)){announce('현재 지도 ZIP의 비교 자료를 확인할 수 없습니다.');return}
   if(chosen.slice(0,showThird?3:2).includes(zip)){announce(zip+'는 이미 선택한 지역입니다.');return}
   if(!showThird)showThird=true;
   chosen[2]=zip;announce(zip+'를 후보 C에 넣었습니다.');schedule();
 }
 function mount(){
   const quick=$('areaQuickAssessment'),main=document.querySelector('.main');
   if(!main||$('regionCompare'))return;
   const section=n('details','region-compare');section.id='regionCompare';
   const summary=n('summary','region-compare-summary');summary.id='regionCompareTitle';
   const summaryTitle=n('span','region-compare-summary-title','지역 나란히 비교');
   const summaryMeta=n('span','region-compare-summary-hint','Allen · Frisco · West Plano · 필요할 때 펼치기');
   summaryMeta.id='regionCompareSummaryMeta';
   const summaryArrow=n('span','region-compare-summary-chevron','열기');
   summary.append(summaryTitle,summaryMeta,summaryArrow);
   section.append(summary);
   const content=n('div','region-compare-content');
   section.setAttribute('aria-labelledby','regionCompareTitle');
   const top=n('div','region-compare-heading'),intro=n('div');
   const h=n('h3','','지역 비교 상세');intro.append(h);
   intro.append(n('p','region-compare-intro',
      '선택한 2~3개 지역을 같은 항목으로 비교합니다. 지도·주택 후보 비교 기능과 별개입니다.'));
   const add=n('button','region-compare-add','현재 지도 지역 넣기');add.id='regionCompareAddCurrent';add.type='button';
   top.append(intro,add);content.append(top);
   const pickers=n('div','region-compare-pickers');
   for(let i=0;i<3;i++){
     const label=n('label','region-compare-picker');
     const select=n('select','region-compare-select');select.dataset.slot=String(i);
     select.setAttribute('aria-label','지역 비교 후보 '+model.slots[i]);selectors.push(select);
     label.append(n('span','','후보 '+model.slots[i]),select);pickers.append(label);
   }
   const toggle=n('button','region-compare-third','세 번째 지역 제외');
   toggle.type='button';toggle.id='regionCompareThird';pickers.append(toggle);
   content.append(pickers);
   const scroll=n('div','region-compare-table-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');
   scroll.setAttribute('aria-label','지역별 2~3개 ZIP 비교 표');
   const table=n('table','region-compare-table');table.id='regionCompareTable';
   const caption=n('caption','','지역 통계 비교');caption.id='regionCompareCaption';table.append(caption);
   scroll.append(table);content.append(scroll);
   content.append(n('p','region-compare-foot',
     'ACS 2024 ZCTA 추정 · TEA 2026 예비 · FBI 2025 도시 전체 신고율 · NOAA 2024–25 카운티 보고 건수. 같은 카운티의 기록은 여러 ZIP에 중복 표시됩니다. ZIP별 위험도·거주지 배정 학교를 뜻하지 않습니다.'));
   const status=n('p','region-compare-status','');status.id='regionCompareStatus';
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');content.append(status);
   section.append(content);
   if(quick)quick.after(section);else main.before(section);
   selectors.forEach((select,i)=>select.addEventListener('change',e=>choose(i,e.target.value)));
   toggle.addEventListener('click',()=>{
     if(showThird){showThird=false;announce('후보 A와 B를 비교합니다.')}
     else{
       showThird=true;
       if(chosen.slice(0,2).includes(chosen[2]))chosen[2]=available.find(z=>!chosen.slice(0,2).includes(z))||chosen[2];
       announce('세 번째 지역을 추가했습니다.');
     }
     schedule();
   });
   add.addEventListener('click',fromMap);
   section.addEventListener('toggle',()=>{
     summaryArrow.textContent=section.open?'접기':'열기';
     if(section.open){
       if(!sourceStarted){sourceStarted=true;load()}
       schedule();
     }
   });
   section.addEventListener('click',e=>{
     const button=e.target.closest('button[data-map-zip]');
     if(!button||!section.contains(button)||!byZip.has(button.dataset.mapZip))return;
     const zip=button.dataset.mapZip;
     if(typeof selectZip==='function')selectZip(zip);
     else{const select=$('zipSelect');if(select){select.value=zip;select.dispatchEvent(new Event('change',{bubbles:true}))}}
     announce(zip+' 지도로 이동했습니다.');
     (document.querySelector('.mapbox')||$('map'))?.scrollIntoView({behavior:'smooth',block:'start'});
   });
 }
 async function load(){
   const src=[['county','./county-scopes.json'],['noaa','./data/area-noaa-counts-2024-2025.json'],
              ['crime','./data/dfw-crime-zip-cities-2023-2025.json']];
   const outcomes=await Promise.allSettled(src.map(async ([name,url])=>{
     const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw Error(name+' HTTP '+r.status);
     const data=await r.json();
     if(name==='county'&&!data?.zipCounty)throw Error('County schema');
     if(name==='noaa'&&(!Array.isArray(data?.summary)||data?.years?.join(',')!=='2024,2025'))throw Error('NOAA schema');
     if(name==='crime'&&(!data?.zips||!data?.cities||data.metadata?.years?.at(-1)!==2025))throw Error('Crime schema');
     return [name,data];
   }));
   let failed=0;
   for(const outcome of outcomes){
     if(outcome.status==='fulfilled'){
       const [name,data]=outcome.value;if(name==='county')county=data;else if(name==='noaa')noaa=data;else crime=data;
     }else{failed++;console.warn('ZIP comparison data unavailable:',outcome.reason)}
   }
   if(failed)announce(failed+'개 자료 연결에 실패했습니다. 해당 항목은 확인 필요로 표시합니다.');
   schedule();
 }
 function init(){
   mount();if(!$('regionCompare'))return;
   sourceOptions();chosen=model.uniqueCandidates(model.DEFAULT_ZIPS,available);
   selectors.forEach((select,i)=>{select.value=chosen[i]||''});
   summaryText();
   // Defaults to collapsed. Source fetch and large table layout wait for user expansion.
   for(const id of ['schoolList','zipInsights','routeStatus','mapLoadStatus']){
     const element=$(id);
     if(element)new MutationObserver(schedule).observe(element,{childList:true,characterData:true,subtree:true});
   }
   if($('zipSelect')){
     new MutationObserver(schedule).observe($('zipSelect'),{childList:true});
     $('zipSelect').addEventListener('change',schedule);
   }
   $('destination')?.addEventListener('input',schedule);
   $('destination')?.addEventListener('change',schedule);
   $('officeSelect')?.addEventListener('change',schedule);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
