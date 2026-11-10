'use strict';
/* Denton district school-site points are NOT household attendance zones.
 * This panel references original published PDFs on a school click. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DentonCampusMarkerInfo=api;
 if(root&&typeof document!=='undefined'){
  const boot=()=>api.start(document);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
 }
})(typeof window!=='undefined'?window:null,function(){
 const DISTRICT='061901',YEAR='2024–25';
 let evidence=null,exceptions=null,loadState='pending',bound=false;
 function qualifyId(id){return typeof id==='string'&&/^061901\d{3}$/.test(id)}
 function statusFor(id){
  if(!qualifyId(id))return {state:'unknown',label:'학교 ID 확인 필요'};
  if(loadState!=='ready')return {state:'loading',label:'학교 위치 출처 검증 자료를 확인하지 못했습니다'};
  if(evidence?.has(id))return {
   state:'historical-two-source',
   label:'2024–25 학교 위치 · TEA/NCES 두 출처 교차검증 (현행 위치·배정 미인증)',
   year:YEAR
  };
  const e=exceptions?.get(id);
  if(e)return {state:'historical-exception',
   label:'학교 주소 확인 · 현재 학교 마커 좌표 미인증 (8개 예외 중 하나)',
   year:YEAR,address:e.publicCampusAddress,
   reason:e.historicalPointDiscrepancy,
   note:e.currentYearOfficialPdfAddressDiscrepancy?'공식 PDF와 현재 학교 안내의 우편번호가 서로 다릅니다.':''
  };
  return {state:'unknown',label:'학교 위치 출처를 확인하지 못했습니다'};
 }
 function string(el,text){el.textContent=String(text||'');return el}
 function appendAnchor(parent,doc,label,url){
  const a=doc.createElement('a');a.className='cardlink';
  a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  a.textContent=label;parent.appendChild(a);
 }
 function makeSection(doc,school,id){
  const pdf=typeof window!=='undefined'?window.DentonZonePdfReference:globalThis?.DentonZonePdfReference;
  const row=pdf?.ROWS.find(x=>x.id===id);
  if(!row)return null; // Unmatched / retired site must never inherit another school's PDF.
  const ref=pdf.lookup({district:DISTRICT,type:row.level},id);
  if(!ref||ref.id!==id||!pdf.validPdf(ref.url))return null;
  const result=statusFor(id),section=doc.createElement('section');
  section.id='dentonCampusProvenance';section.className='small-note denton-campus-provenance';
  section.dataset.campusId=id;section.dataset.pointStatus=result.state;
  section.appendChild(string(doc.createElement('strong'),'Denton ISD · '+row.name+' 공식 2026–27 학교별 지도'));
  section.appendChild(string(doc.createElement('p'),
   '학교 건물 마커는 배정구역이 아닙니다. '+result.label+
   ' · 이 PDF를 열어도 실제 주소별 2026–27 배정이 자동으로 인증되는 것은 아닙니다.'));
  if(result.address){
   const a=result.address;
   section.appendChild(string(doc.createElement('p'),'공식 학교 주소: '+a.street+', '+a.city+', '+a.state+' '+a.zip+
    (result.note?' · '+result.note:'')));
  }
  appendAnchor(section,doc,row.name+' · 공식 2026–27 PDF 경계 원본',ref.url);
  appendAnchor(section,doc,'Denton School Locator · 주소별 배정 확인',pdf.LOCATOR);
  section.appendChild(string(doc.createElement('small'),
   '출처: Denton ISD 2026–27 학교별 공식 PDF · 2024–25 NCES/TEA 학교 위치. GIS 경계·현재 위치·등록 자격 인증이 아닙니다.'));
  return section;
 }
 function rowForSelected(s,ratings,pdf){
  if(s?.district!==DISTRICT||!Array.isArray(pdf?.ROWS))return null;
  const id=s.id||((typeof ratings==='function'?ratings(s.name,s.district)?.id:null)||'');
  if(!qualifyId(id))return null;
  const row=pdf.ROWS.find(x=>x.id===id);
  return row&&['elementary','middle','high'].includes(row.level)?row:null;
 }
 function syncTypes(){
  // This is only school *grade-level* classification from exact published
  // campus ID; existing NCES marker coordinates are never altered.
  if(typeof window==='undefined'||typeof state==='undefined'||!state?.schools||typeof scoreRecord!=='function')return 0;
  const pdf=window.DentonZonePdfReference;if(!pdf?.ROWS)return 0;
  const byId=new Map(pdf.ROWS.map(r=>[r.id,r]));
  let changes=0;
  for(const s of state.schools){
   if(s.district!==DISTRICT)continue;
   const id=s.id||scoreRecord(s.name,s.district)?.id;
   const row=byId.get(id);if(!row)continue;
   if(s.type!==row.level){s.type=row.level;changes++}
   if(s.id!==id){s.id=id;changes++}
   const quality=statusFor(id).state;
   const provenance=quality==='historical-two-source'?'two-source-historical':
    quality==='historical-exception'?'unreviewed-historical':null;
   if(provenance&&s.campusPointReview!==provenance){s.campusPointReview=provenance;changes++}
  }
  if(changes&&typeof drawSchools==='function'&&typeof drawList==='function'){
   drawSchools();drawList();
  }
  return changes;
 }
 function refresh(doc){
  if(typeof window==='undefined'||typeof state==='undefined')return;
  const panel=doc.getElementById('detailContent');if(!panel)return;
  const pdf=window.DentonZonePdfReference;
  const selected=state.selectedSchool;
  if(!selected||selected.district!==DISTRICT)return;
  const row=rowForSelected(selected,(name,d)=>typeof scoreRecord==='function'?scoreRecord(name,d):null,pdf);
  if(!row)return;
  const existing=doc.getElementById('dentonCampusProvenance');
  if(existing?.dataset.campusId===row.id&&existing.dataset.pointStatus===statusFor(row.id).state)return;
  existing?.remove();
  const block=makeSection(doc,selected,row.id);
  if(!block)return;
  const hr=panel.querySelector('hr.rule');
  if(hr)panel.insertBefore(block,hr);else panel.appendChild(block);
 }
 async function load(){
  if(typeof window==='undefined'||!window.DentonZonePdfReference)return;
  try{
   const [a,b,c]=await Promise.all([
    fetch('./data/denton-campus-public-points-2026.json',{cache:'no-store'}),
    fetch('./data/denton-eight-campus-coordinate-exceptions-2026.json',{cache:'no-store'}),
    fetch('./nces-locations-2024.json',{cache:'no-store'})
   ]);
   if(![a,b,c].every(x=>x.ok))throw Error('Denton public point audit unavailable');
   const points=await a.json(),extra=await b.json(),nces=await c.json();
   if(extra.schemaVersion!==1||extra.district!==DISTRICT||
    extra.eightCurrentCampusCoordinatesVerified!==false||extra.readyForProduction!==false||
    !Array.isArray(extra.exceptions)||extra.exceptions.length!==8||
    !Array.isArray(nces.data))throw Error('Invalid exception review state');
   const reviewed=window.DentonCampusPointQuality.validate(points,
    new Map(nces.data.map(x=>[x.id,x])),window.DentonZonePdfReference.ROWS);
   const excluded=new Set(points.excludedIds);
   const ex=new Map(extra.exceptions.map(x=>[x.id,x]));
   if(reviewed.size!==31||ex.size!==8||[...ex.keys()].some(id=>!excluded.has(id)||reviewed.has(id)))
    throw Error('Denton 31/8 campus review counts inconsistent');
   evidence=reviewed;exceptions=ex;loadState='ready';
  }catch(err){loadState='unavailable';console.warn('Denton school-site provenance:',err)}
 }
 function start(doc){
  if(bound)return;bound=true;
  const panel=doc.getElementById('detailContent'),schoolList=doc.getElementById('schoolList');
  if(panel&&typeof MutationObserver!=='undefined'){
   let busy=false;
   const obs=new MutationObserver(()=>{
    if(busy)return;busy=true;
    try{refresh(doc)}finally{busy=false}
   });
   obs.observe(panel,{childList:true,subtree:true});
  }
  if(schoolList&&typeof MutationObserver!=='undefined'){
   const obs=new MutationObserver(()=>{syncTypes();refresh(doc)});
   obs.observe(schoolList,{childList:true});
  }
  syncTypes();
  load().then(()=>{syncTypes();refresh(doc)});
 }
 return Object.freeze({DISTRICT,YEAR,statusFor,rowForSelected,makeSection,load,start,refresh,syncTypes,
  get loadState(){return loadState}});
});
