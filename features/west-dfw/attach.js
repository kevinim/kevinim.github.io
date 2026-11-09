'use strict';
// Strict-CSP compatible adapter. The SHA-256-locked main inline script is NOT edited.
// This code attaches UI after the existing application initializes and never
// passes a residence, school location, or query string to an official Finder.
(function(root){
 const ZIP_SHORTCUTS=Object.freeze(['76092','76262','76248','76034','76051','76052','76247']);
 const stateInfo={panel:'waiting',mounted:false,schoolLinkCount:0,lastDistrict:null};
 const doc=root.document;
 let detailObserver=null;
 let schoolObserver=null;
 let detailScheduled=false;
 let refreshScheduled=false;
 function appReady(){
  const select=doc.getElementById('zipSelect');
  return !!select&&!!doc.getElementById('schoolList')&&
   ZIP_SHORTCUTS.every(z=>select.querySelector('option[value="'+z+'"]'));
 }
 function getSchools(){
  try{return typeof state!=='undefined'&&Array.isArray(state.schools)?state.schools:[]}catch{return []}
 }
 function getZips(){
  try{return typeof DATA!=='undefined'&&Array.isArray(DATA)?DATA:[]}catch{return []}
 }
 function selectArea(z){
  if(!ZIP_SHORTCUTS.includes(z)||!appReady())return false;
  const selector=doc.getElementById('schoolScope');
  selector.value='zip';
  if(typeof state!=='undefined'&&!state.showSchools){
   state.showSchools=true;
   const checkbox=doc.getElementById('schoolOverlay');
   if(checkbox)checkbox.checked=true;
  }
  selectZip(z);
  return true;
 }
 function enhanceSelectedSchool(){
  const detail=doc.getElementById('detailContent');
  const selected=typeof state!=='undefined'?state.selectedSchool:null;
  const entry=selected&&root.WestSchoolOfficialFinder?.lookup(selected.district);
  if(!detail||!entry||!root.TrustedLinkPolicy)return false;
  const safe=root.TrustedLinkPolicy.official(entry.url);
  if(!safe)return false;
  const zone=detail.querySelector('#zoneNotice');
  if(!zone)return false;
  // The original link is the next element after the zone notice. Upgrade it
  // to the official campus lookup without rewriting CSP-protected main JS.
  const original=zone.nextElementSibling;
  if(original?.tagName==='A'&&original.dataset.westDfwOfficial!=='1'){
   original.href=safe;
   original.textContent=entry.label+' ↗';
   original.rel='noopener noreferrer';
   original.target='_blank';
   original.dataset.westDfwOfficial='1';
  }
  if(!zone.querySelector('.west-dfw-direct-lookup')){
   root.WestSchoolOfficialFinder.addToMissingBoundaryNote(doc,zone,selected.district);
  }
  stateInfo.lastDistrict=selected.district;
  stateInfo.schoolLinkCount=zone.querySelectorAll('.west-dfw-direct-lookup').length;
  return !!original&&stateInfo.schoolLinkCount===1;
 }
 function scheduleDetail(){
  if(detailScheduled)return;
  detailScheduled=true;
  root.queueMicrotask(()=>{
   detailScheduled=false;
   try{enhanceSelectedSchool()}catch{stateInfo.lastDistrict=null}
  });
 }
 function scheduleCountRefresh(){
  if(refreshScheduled)return;
  refreshScheduled=true;
  root.queueMicrotask(()=>{
   refreshScheduled=false;
   try{root.WestDFWPanel?.refreshCounts()}catch{}
  });
 }
 async function mount(){
  if(stateInfo.mounted)return;
  stateInfo.mounted=true;
  stateInfo.panel='loading';
  const box=doc.getElementById('westDfwPanel');
  const schools=doc.getElementById('schoolList');
  const detail=doc.getElementById('detailContent');
  if(!box||!schools||!detail||!root.WestDFWPanel||!root.WestSchoolOfficialFinder){
   stateInfo.panel='unavailable';
   return;
  }
  const out=await root.WestDFWPanel.mount({
   document:doc,
   getZips,
   getSchools,
   onSelectZip:selectArea,
   fetchFn:(...args)=>root.fetch(...args)
  });
  if(!out.ready){
   stateInfo.panel='unavailable';
   return;
  }
  stateInfo.panel='ready';
  schoolObserver=new MutationObserver(scheduleCountRefresh);
  schoolObserver.observe(schools,{childList:true});
  detailObserver=new MutationObserver(scheduleDetail);
  detailObserver.observe(detail,{childList:true,subtree:true});
  scheduleDetail();
  scheduleCountRefresh();
 }
 function initialize(){
  if(!doc.getElementById('westDfwPanel'))return;
  const started=Date.now();
  function waitForMain(){
   if(appReady()){
    mount().catch(()=>{
     stateInfo.panel='unavailable';
     const status=doc.getElementById('westDfwStatus');
     if(status)status.textContent='서부 학군 공식 링크를 불러오지 못했습니다. 교육청 공식 웹사이트를 이용하세요.';
    });
    return;
   }
   if(Date.now()-started>20000){
    stateInfo.panel='unavailable';
    const status=doc.getElementById('westDfwStatus');
    if(status)status.textContent='지역 데이터 로딩을 확인할 수 없습니다. 기존 학교 검색과 공식 교육청 사이트를 이용하세요.';
    return;
   }
   root.setTimeout(waitForMain,120);
  }
  waitForMain();
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
 root.WestDFWIntegration=Object.freeze({status:()=>({...stateInfo}),enhanceSelectedSchool});
})(window);
